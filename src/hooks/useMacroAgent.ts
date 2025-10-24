
'use client';

import {useState, useRef, useCallback, useEffect} from 'react';

// This code will be injected into a Blob and used to create the AudioWorklet.
const workletCode = `
  class AudioRecorder extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
      const input = inputs[0];
      if (input.length > 0) {
        // Post the raw Float32Array data back to the main thread.
        // Convert to Int16 before posting
        const pcm16 = new Int16Array(input[0].length);
        for(let i = 0; i < input[0].length; i++) {
            pcm16[i] = Math.floor(input[0][i] * 32768);
        }
        this.port.postMessage(pcm16, [pcm16.buffer]);
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
    abortControllerRef.current = new AbortController();

    try {
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true },
      });
      mediaStreamRef.current = mediaStream;

      const workletURL = URL.createObjectURL(new Blob([workletCode], { type: 'application/javascript' }));
      await audioContext.audioWorklet.addModule(workletURL);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-recorder');
      workletNodeRef.current = workletNode;

      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(workletNode);
      // Not connecting to destination, as we only want to process and send.

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      
      workletNode.port.onmessage = (event: MessageEvent<Int16Array>) => {
        if (writer) {
            writer.write(event.data.buffer);
        }
      };

      const historyQuery = `?history=${encodeURIComponent(JSON.stringify(transcript.map(t => t.text)))}`;

      const response = await fetch(`/api/voice${historyQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: readable,
        signal: abortControllerRef.current.signal,
        //@ts-ignore
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
        let textToParse = '';

        try {
            // Append new chunk to accumulated text
            accumulatedText += textDecoder.decode(value, {stream: true});
            
            // Try to find a complete JSON object
            const jsonMatch = accumulatedText.match(/\{.*?\}/);

            if (jsonMatch) {
                const jsonString = jsonMatch[0];
                try {
                    const data = JSON.parse(jsonString);
                    if (data.text) {
                        setTranscript(prev => [...prev, { actor: 'ai', text: data.text }]);
                        isText = true;
                        // Remove the parsed JSON from the accumulator
                        accumulatedText = accumulatedText.substring(jsonMatch.index! + jsonString.length);
                    }
                } catch (e) {
                  // Incomplete JSON, wait for more data
                }
            }
        } catch (e) {
            // Not a JSON object, so we treat it as audio data.
        }

        if (!isText && playbackAudioContextRef.current) {
            try {
                // The server should be sending raw PCM audio, not a file format.
                // We need to construct an AudioBuffer from the raw PCM data.
                const audioBuffer = playbackAudioContextRef.current.createBuffer(
                  1, // 1 channel (mono)
                  value.byteLength / 2, // number of frames (16-bit PCM)
                  24000 // sample rate from Gemini
                );
                
                // Assuming the server sends 16-bit PCM, we convert to Float32
                const int16Data = new Int16Array(value.buffer);
                const float32Data = new Float32Array(int16Data.length);
                for (let i = 0; i < int16Data.length; i++) {
                    float32Data[i] = int16Data[i] / 32768.0;
                }

                audioBuffer.copyToChannel(float32Data, 0);

                const source = playbackAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(playbackAudioContextRef.current.destination);
                source.start();
            } catch (audioError) {
                console.warn("Could not decode or play audio chunk.", audioError);
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
        await disconnect();
    } finally {
      if (status === AgentStatus.CONNECTED) {
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
    setTranscript(prev => {
      const updatedTranscript = [...prev, newTurn];
      return updatedTranscript;
    });
  };

  return {status, transcript, error, connect, disconnect, updateUserTranscript, resetTranscript};
};
