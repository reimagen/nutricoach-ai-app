
'use client';

import {useState, useRef, useCallback, useEffect} from 'react';

// --- Public (but not exported) audio worklet script ---
// This code will be injected into a Blob and used to create the AudioWorklet.
// It runs in a separate thread, capturing audio without blocking the main UI thread.
const workletCode = `
  class AudioRecorder extends AudioWorkletProcessor {
    // This processor just passes the audio data through to the main thread.
    process(inputs, outputs, parameters) {
      const input = inputs[0];
      if (input.length > 0) {
        // Post the raw Float32Array data back to the main thread.
        this.port.postMessage(input[0]);
      }
      return true; // Keep the processor alive.
    }
  }
  registerProcessor('audio-recorder', AudioRecorder);
`;

// --- Type Definitions ---
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

// --- The Main React Hook ---
export const useMacroAgent = () => {
  const [status, setStatus] = useState<AgentStatus>(AgentStatus.IDLE);
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs to manage the audio and connection state
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const playbackAudioContextRef = useRef<AudioContext | null>(null);

  /**
   * Disconnects from the agent, stops audio processing, and cleans up resources.
   */
  const disconnect = useCallback(async () => {
    if (status === AgentStatus.IDLE || status === AgentStatus.DISCONNECTING) return;
    
    setStatus(AgentStatus.DISCONNECTING);
    console.log('Disconnecting...');

    try {
        // Abort any ongoing fetch requests.
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;

        // Stop the microphone tracks.
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());

        // Disconnect and close audio contexts.
        workletNodeRef.current?.disconnect();
        if (audioContextRef.current?.state !== 'closed') {
            await audioContextRef.current?.close();
        }
        if (playbackAudioContextRef.current?.state !== 'closed') {
            await playbackAudioContextRef.current?.close();
        }

    } catch (e: any) {
        console.error('Error during disconnect:', e);
        // We don't set a public error here as it's a cleanup step.
    } finally {
        // Reset all refs and state.
        mediaStreamRef.current = null;
        workletNodeRef.current = null;
        audioContextRef.current = null;
        playbackAudioContextRef.current = null;
        
        setStatus(AgentStatus.IDLE);
        console.log('Disconnected cleanly.');
    }
  }, [status]);


  /**
   * Connects to the agent, starts microphone capture, and establishes the two-way audio stream.
   */
  const connect = useCallback(async () => {
    if (status === AgentStatus.CONNECTED || status === AgentStatus.CONNECTING) {
      console.log('Already connected or connecting.');
      return;
    }

    setStatus(AgentStatus.CONNECTING);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      // --- 1. Set up Web Audio API ---
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true },
      });
      mediaStreamRef.current = mediaStream;

      // --- 2. Create the AudioWorklet ---
      // This is the modern, performant way to process audio off the main thread.
      const workletURL = URL.createObjectURL(new Blob([workletCode], { type: 'application/javascript' }));
      await audioContext.audioWorklet.addModule(workletURL);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-recorder');
      workletNodeRef.current = workletNode;

      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(workletNode);
      workletNode.connect(audioContext.destination); // Connect to output to avoid garbage collection

      // --- 3. Set up the Streaming Fetch ---
      const { readable, writable } = new TransformStream();
      const writer = writable.createWriter();
      
      // When the worklet sends audio data, write it to our transform stream.
      workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (writer) {
            const pcm16 = new Int16Array(event.data.length);
            for(let i = 0; i < event.data.length; i++) {
                pcm16[i] = Math.floor(event.data[i] * 32768);
            }
            writer.write(pcm16.buffer);
        }
      };

      const historyQuery = `?history=${encodeURIComponent(JSON.stringify(transcript))}`;

      const response = await fetch(`/api/voice${historyQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: readable,
        signal: abortControllerRef.current.signal,
        //@ts-ignore - duplex is a new Fetch API feature
        duplex: 'half' 
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status} ${await response.text()}`);
      }

      setStatus(AgentStatus.CONNECTED);
      console.log("Connection established. Streaming...");

      // --- 4. Handle the Response Stream from the Server ---
      const reader = response.body.getReader();
      playbackAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
            console.log("Server stream finished.");
            break;
        }

        // We try to parse it as JSON first. If it fails, we assume it's audio.
        // This is more robust than the previous try/catch on decodeAudioData.
        let isText = false;
        try {
            const textChunk = new TextDecoder().decode(value);
            const data = JSON.parse(textChunk);
            if(data.text) {
                 setTranscript(prev => [...prev, {actor: 'ai', text: data.text}]);
                 isText = true;
            }
        } catch (e) {
            // Not a JSON object, so we treat it as audio data.
        }

        if (!isText && playbackAudioContextRef.current) {
            try {
                const decodedData = await playbackAudioContextRef.current.decodeAudioData(value.buffer);
                const source = playbackAudioContextRef.current.createBufferSource();
                source.buffer = decodedData;
                source.connect(playbackAudioContextRef.current.destination);
                source.start();
            } catch (audioError) {
                console.warn("Could not decode audio chunk.", audioError);
            }
        }
      }
    } catch (e: any) {
        const errorMessage = e.name === 'AbortError' 
            ? 'Connection aborted by user.' 
            : (e.message.includes('permission denied') 
                ? 'Microphone permission denied. Please enable it in your browser settings.'
                : `Connection failed: ${e.message}`);
        console.error('Error in connect function:', e);
        setError(errorMessage);
        setStatus(AgentStatus.ERROR);
        // Ensure we clean up even if connection fails.
        await disconnect();
    } finally {
        // If the component unmounts while connected, this ensures cleanup.
        if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
            // This is a gentle disconnect if the process finishes without errors.
            await disconnect();
        }
    }
  }, [disconnect, status, transcript]);
  
  // Cleanup effect to disconnect on component unmount
  useEffect(() => {
    return () => {
      disconnect();
    }
  }, [disconnect]);

  const resetTranscript = () => {
    setTranscript([]);
  }

  const updateUserTranscript = (text: string) => {
    setTranscript(prev => [...prev, { actor: 'user', text }]);
  }

  return {status, transcript, error, connect, disconnect, updateUserTranscript, resetTranscript};
};
