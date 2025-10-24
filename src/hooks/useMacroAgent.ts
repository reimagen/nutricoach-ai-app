
'use client';

import {useState, useRef, useCallback} from 'react';

// --- Helper Functions for Audio Processing ---

// Float32 to PCM-16
function decode(p_f32: Float32Array): Int16Array {
  const pcm = new Int16Array(p_f32.length);
  for (let i = 0; i < p_f32.length; i++) {
    pcm[i] = Math.floor(p_f32[i] * 32768);
  }
  return pcm;
}

// --- React Hook ---

export type ConversationTurn = {
  actor: 'user' | 'ai';
  text: string;
};

export enum AgentStatus {
  IDLE,
  CONNECTING,
  CONNECTED,
  DISCONNECTING,
  ERROR,
}

export const useMacroAgent = () => {
  const [status, setStatus] = useState<AgentStatus>(AgentStatus.IDLE);
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);


  const disconnect = useCallback(async () => {
    if (status === AgentStatus.IDLE || status === AgentStatus.DISCONNECTING) return;
    
    setStatus(AgentStatus.DISCONNECTING);
    try {
        // Abort the ongoing fetch request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        // Disconnect Web Audio API nodes
        processorRef.current?.disconnect();
        sourceRef.current?.disconnect();

        // Stop microphone tracks
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());

        // Close the audio context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            await audioContextRef.current.close();
        }
    } catch (e: any) {
        console.error('Error during disconnect:', e);
        setError('An error occurred while disconnecting.');
    } finally {
        // Clear all refs
        audioContextRef.current = null;
        processorRef.current = null;
        sourceRef.current = null;
        mediaStreamRef.current = null;
        setStatus(AgentStatus.IDLE);
        console.log('Disconnected');
    }
}, [status]);


  const connect = useCallback(async () => {
    if (status === AgentStatus.CONNECTED || status === AgentStatus.CONNECTING) {
      console.log('Already connected or connecting.');
      return;
    }

    setStatus(AgentStatus.CONNECTING);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      const audioContext = new AudioContext({sampleRate: 16000});
      audioContextRef.current = audioContext;

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
        },
      });

      sourceRef.current = audioContext.createMediaStreamSource(
        mediaStreamRef.current
      );

      const processor = audioContext.createScriptProcessor(1024, 1, 1);
      processorRef.current = processor;
      sourceRef.current.connect(processor);
      processor.connect(audioContext.destination);
      
      const { readable, writable } = new TransformStream();
      const writer = writable.createWriter();

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (status === AgentStatus.CONNECTED || status === AgentStatus.CONNECTING) {
          const pcm = decode(e.inputBuffer.getChannelData(0));
          writer.write(pcm.buffer);
        }
      };

      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: readable,
        signal: abortControllerRef.current.signal,
        //@ts-ignore - duplex is a new Fetch API feature
        duplex: 'half' 
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} ${errorText}`);
      }

      setStatus(AgentStatus.CONNECTED);
      console.log("Connection established");

      // Handle the response stream from the server
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Could not get response body reader.");
      }

      const playbackAudioContext = new AudioContext({ sampleRate: 24000 });
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
            console.log("Stream finished.");
            break;
        }

        try {
            const decodedData = await playbackAudioContext.decodeAudioData(value.buffer);
            const source = playbackAudioContext.createBufferSource();
            source.buffer = decodedData;
            source.connect(playbackAudioContext.destination);
            source.start();
        } catch(e) {
            // This might not be audio data, but a text chunk
            try {
                const textChunk = new TextDecoder().decode(value);
                const data = JSON.parse(textChunk);
                if(data.text) {
                     setTranscript(prev => [...prev, {actor: 'ai', text: data.text}]);
                }
            } catch (textError) {
                console.warn("Received a chunk that was not audio or valid JSON text.", textError);
            }
        }
      }

    } catch (e: any) {
        console.error('Failed to connect:', e);
        const errorMessage = e.name === 'AbortError' 
            ? 'Connection aborted.' 
            : (e.message.includes('permission denied') 
                ? 'Microphone permission denied. Please enable it in your browser settings.'
                : `Failed to connect: ${e.message}`);
        setError(errorMessage);
        setStatus(AgentStatus.ERROR);
        await disconnect();
    }
  }, [disconnect, status]);
  
  const resetTranscript = () => {
    setTranscript([]);
  }

  const updateUserTranscript = (text: string) => {
    setTranscript(prev => [...prev, { actor: 'user', text }]);
  }

  return {status, transcript, error, connect, disconnect, updateUserTranscript, resetTranscript};
};
