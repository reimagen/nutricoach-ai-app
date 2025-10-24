
'use client';

import {useState, useRef, useCallback, useEffect} from 'react';

// This code will be injected into a Blob and used to create the AudioWorklet.
const workletCode = `
  class AudioRecorder extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
      const input = inputs[0];
      if (input.length > 0) {
        // Post the raw Float32Array data back to the main thread.
        const pcm16 = new Int16Array(input[0].length);
        for(let i = 0; i < input[0].length; i++) {
            // We are using a 16-bit signed integer, so we scale the float value.
            let s = Math.max(-1, Math.min(1, input[0][i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
      }
      return true; // Keep the processor alive.
    }
  }
  registerProcessor('audio-recorder', AudioRecorder);
`;

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
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const playbackAudioContextRef = useRef<AudioContext | null>(null);

  const disconnect = useCallback(async () => {
    if (status === AgentStatus.IDLE || status === AgentStatus.DISCONNECTING) return;
    
    setStatus(AgentStatus.DISCONNECTING);
    console.log('Disconnecting...');

    try {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());

        workletNodeRef.current?.disconnect();
        if (audioContextRef.current?.state !== 'closed') {
            await audioContextRef.current?.close();
        }
        if (playbackAudioContextRef.current?.state !== 'closed') {
            await playbackAudioContextRef.current?.close();
        }
    } catch (e: any) {
        console.error('Error during disconnect:', e);
    } finally {
        mediaStreamRef.current = null;
        workletNodeRef.current = null;
        audioContextRef.current = null;
        playbackAudioContextRef.current = null;
        
        setStatus(AgentStatus.IDLE);
        console.log('Disconnected cleanly.');
    }
  }, [status]);


  const connect = useCallback(async () => {
    if (status === AgentStatus.CONNECTED || status === AgentStatus.CONNECTING) {
      console.log('Already connected or connecting.');
      return;
    }

    setStatus(AgentStatus.CONNECTING);
    setError(null);
    setTranscript([]); // Clear transcript on new connection
    abortControllerRef.current = new AbortController();

    try {
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true },
      });
      mediaStreamRef.current = mediaStream;

      const workletURL = URL.createObjectURL(new Blob([workletCode], { type: 'application/javascript' }));
      await audioContextRef.current.audioWorklet.addModule(workletURL);
      const workletNode = new AudioWorkletNode(audioContextRef.current, 'audio-recorder');
      workletNodeRef.current = workletNode;

      const source = audioContextRef.current.createMediaStreamSource(mediaStream);
      source.connect(workletNode);
      // We don't connect to destination, as we only want to process and send.

      const { readable, writable } = new TransformStream();
      
      workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        const writer = writable.getWriter();
        writer.write(new Uint8Array(event.data));
        writer.releaseLock();
      };

      const historyQuery = `?history=${encodeURIComponent(JSON.stringify(transcript.map(t => t.text)))}`;

      const response = await fetch(`/api/voice${historyQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: readable,
        signal: abortControllerRef.current.signal,
        //@ts-ignore - duplex is a valid option in modern browsers
        duplex: 'half' 
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status} ${await response.text()}`);
      }

      setStatus(AgentStatus.CONNECTED);
      console.log("Connection established. Streaming...");

      const reader = response.body.getReader();
      playbackAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      let accumulatedText = '';
      const textDecoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
            console.log("Server stream finished.");
            break;
        }

        let isText = false;
        try {
            const decodedChunk = textDecoder.decode(value, {stream: true});
            accumulatedText += decodedChunk;
            
            // It's possible to receive multiple JSON objects in one chunk
            let boundary = accumulatedText.indexOf('}{');
            while (boundary !== -1) {
                const jsonString = accumulatedText.substring(0, boundary + 1);
                accumulatedText = accumulatedText.substring(boundary + 1);
                
                try {
                    const data = JSON.parse(jsonString);
                    if (data.text) {
                        setTranscript(prev => [...prev, { actor: 'ai', text: data.text }]);
                        isText = true;
                    }
                } catch(e) {
                  // Ignore parsing errors for partial objects
                }
                boundary = accumulatedText.indexOf('}{');
            }

            // Try to parse the remaining part
            if (accumulatedText.trim().startsWith('{') && accumulatedText.trim().endsWith('}')) {
                 try {
                    const data = JSON.parse(accumulatedText);
                    if (data.text) {
                        setTranscript(prev => [...prev, { actor: 'ai', text: data.text }]);
                        isText = true;
                        accumulatedText = '';
                    }
                } catch (e) {
                   // Incomplete JSON, wait for more data
                }
            }
        } catch (e) {
           // Not text, likely audio
        }

        if (!isText && playbackAudioContextRef.current) {
             try {
                // The data from Gemini is already PCM, so we can create a buffer
                const audioBuffer = await playbackAudioContextRef.current.decodeAudioData(value.buffer);
                const source = playbackAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(playbackAudioContextRef.current.destination);
                source.start();
            } catch (audioError) {
                // If decode fails, it's probably because it was a partial text chunk.
                // console.warn("Could not decode audio chunk, likely partial text.", audioError);
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
    } finally {
      if (status !== AgentStatus.IDLE) {
        await disconnect();
      }
    }
  }, [disconnect, status, transcript]);
  
  useEffect(() => {
    return () => {
      disconnect();
    }
  }, [disconnect]);

  const resetTranscript = () => {
    setTranscript([]);
  }

  const updateUserTranscript = (text: string) => {
    const newTurn: ConversationTurn = { actor: 'user', text };
    setTranscript(prev => [...prev, newTurn]);
  };

  return {status, transcript, error, connect, disconnect, updateUserTranscript, resetTranscript};
};
