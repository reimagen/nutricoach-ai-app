
'use client';

import {useState, useRef, useCallback, useEffect} from 'react';

// This code will be injected into a Blob and used to create the AudioWorklet.
const workletCode = `
  class AudioRecorder extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
      const input = inputs[0];
      if (input.length > 0) {
        // Post the raw Float32Array data back to the main thread.
        // The underlying ArrayBuffer is transferred to the main thread.
        this.port.postMessage(input[0].buffer, [input[0].buffer]);
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
        
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());

        if (workletNodeRef.current) {
            workletNodeRef.current.port.onmessage = null;
            workletNodeRef.current.disconnect();
        }

        if (audioContextRef.current?.state !== 'closed') {
            await audioContextRef.current?.close();
        }
        if (playbackAudioContextRef.current?.state !== 'closed') {
            await playbackAudioContextRef.current?.close();
        }
    } catch (e: any) {
        console.error('Error during disconnect:', e);
    } finally {
        abortControllerRef.current = null;
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

      const { readable, writable } = new TransformStream<Uint8Array>();
      
      workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
        const pcm16 = new Int16Array(event.data.length);
        for (let i = 0; i < event.data.length; i++) {
            let s = Math.max(-1, Math.min(1, event.data[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const writer = writable.getWriter();
        writer.write(new Uint8Array(pcm16.buffer));
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
            
            let lastIndex = 0;
            let openBraces = 0;
            for (let i = 0; i < accumulatedText.length; i++) {
                if (accumulatedText[i] === '{') {
                    if (openBraces === 0) {
                        lastIndex = i;
                    }
                    openBraces++;
                } else if (accumulatedText[i] === '}') {
                    openBraces--;
                    if (openBraces === 0) {
                        const jsonString = accumulatedText.substring(lastIndex, i + 1);
                        try {
                            const data = JSON.parse(jsonString);
                             if (data.text) {
                                setTranscript(prev => {
                                  const lastTurn = prev[prev.length - 1];
                                  if (lastTurn && lastTurn.actor === 'ai' && !data.text.startsWith('I ') && !data.text.startsWith('Based ')) {
                                    const updatedTurn = { ...lastTurn, text: lastTurn.text + data.text };
                                    return [...prev.slice(0, -1), updatedTurn];
                                  }
                                  return [...prev, { actor: 'ai', text: data.text }];
                                });
                                isText = true;
                            }
                        } catch (e) {
                            // Not a valid JSON object, might be partial, ignore
                        }
                    }
                }
            }
            if (openBraces === 0) {
                accumulatedText = '';
            }
            
        } catch (e) {
           // Not text, likely audio
        }

        if (!isText && playbackAudioContextRef.current && value) {
             try {
                const audioBuffer = await playbackAudioContextRef.current.decodeAudioData(value.buffer);
                const sourceNode = playbackAudioContextRef.current.createBufferSource();
                sourceNode.buffer = audioBuffer;
                sourceNode.connect(playbackAudioContextRef.current.destination);
                sourceNode.start();
            } catch (audioError) {
                // console.warn("Could not decode audio chunk, likely partial text.", audioError);
            }
        }
      }
    } catch (e: any) {
        const errorMessage = e.name === 'AbortError' 
            ? 'Connection aborted by user.' 
            : (e.message.includes('permission')
                ? 'Microphone permission denied. Please enable it in your browser settings.'
                : `Connection failed: ${e.message}`);
        console.error('Error in connect function:', e);
        setError(errorMessage);
        setStatus(AgentStatus.ERROR);
    } finally {
      if (status !== AgentStatus.IDLE && status !== AgentStatus.DISCONNECTING) {
        await disconnect();
      }
    }
  }, [disconnect, status, transcript]);
  
  useEffect(() => {
    return () => {
      disconnect();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUserTranscript = (text: string) => {
    const newTurn: ConversationTurn = { actor: 'user', text };
    setTranscript(prev => [...prev, newTurn]);
  };

  return {status, transcript, error, connect, disconnect, updateUserTranscript, setTranscript};
};
