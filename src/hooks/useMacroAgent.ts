'use client';

import {useState, useRef, useCallback} from 'react';
import {GoogleGenerativeAI} from '@google/generative-ai';

// --- Helper Functions for Audio Processing ---

// PCM-16 to Float32
function encode(p_pcm) {
  const f32 = new Float32Array(p_pcm.length);
  for (let i = 0; i < p_pcm.length; i++) {
    f32[i] = p_pcm[i] / 32768;
  }
  return f32;
}

// Float32 to PCM-16
function decode(p_f32) {
  const pcm = new Int16Array(p_f32.length);
  for (let i = 0; i < p_f32.length; i++) {
    pcm[i] = Math.floor(p_f32[i] * 32768);
  }
  return pcm;
}

async function decodeAudioData(audioData) {
  const audioContext = new AudioContext({sampleRate: 24000});
  const decoded = await audioContext.decodeAudioData(audioData);
  return decoded.getChannelData(0);
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

  const aiRef = useRef<any>(null);
  const connectionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const disconnect = useCallback(async () => {
    if (!connectionRef.current && !mediaStreamRef.current) return;
    setStatus(AgentStatus.DISCONNECTING);
    try {
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      // Only close the audio context if it exists and is not already closed
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close();
      }
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      
      // If connection exists and has a close method
      if (connectionRef.current && typeof connectionRef.current.close === 'function') {
        await connectionRef.current.close();
      }

    } catch (e: any) {
      console.error('Error during disconnect:', e);
      // Don't set an error message on a normal disconnect
    } finally {
      connectionRef.current = null;
      audioContextRef.current = null;
      processorRef.current = null;
      sourceRef.current = null;
      mediaStreamRef.current = null;
      setStatus(AgentStatus.IDLE);
    }
  }, []);

  const connect = useCallback(async () => {
    if (connectionRef.current) {
      console.log('Already connected.');
      return;
    }

    setStatus(AgentStatus.CONNECTING);
    setError(null);

    try {
      // This is insecure and should be handled on the server.
      // For this prototype, we'll proceed, but in a real app,
      // you would have a server endpoint that manages the API key.
      if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
        throw new Error('This app requires a Gemini API key. Please add NEXT_PUBLIC_GEMINI_API_KEY to your .env.local file.');
      }
      aiRef.current = new GoogleGenerativeAI(
        process.env.NEXT_PUBLIC_GEMINI_API_KEY
      );


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

      const callbacks = {
        onopen: () => {
          console.log('Connection opened');
          setStatus(AgentStatus.CONNECTED);
        },
        onmessage: async (res: any) => {
          if (res.response.speech?.audio) {
            // Need to create a new audio context for playback if the main one is closed or closing
            const playbackAudioContext = new AudioContext({sampleRate: 24000});
            const audioData = res.response.speech.audio.content;
            const decodedData = await playbackAudioContext.decodeAudioData(audioData.buffer);
            const source = playbackAudioContext.createBufferSource();
            source.buffer = decodedData;
            source.connect(playbackAudioContext.destination);
            source.start();
            source.onended = () => {
              playbackAudioContext.close();
            }
          }
          if (res.response.text) {
            setTranscript(prev => [...prev, {actor: 'ai', text: res.response.text}]);
          }
        },
        onclose: () => {
          console.log('Connection closed');
          disconnect();
        },
        onerror: (err: any) => {
          console.error('Connection error:', err);
          setError('A connection error occurred.');
          setStatus(AgentStatus.ERROR);
          disconnect();
        },
      };

      connectionRef.current = await aiRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        history: transcript.map(t => ({
          role: t.actor === 'ai' ? 'model' : 'user',
          parts: [{ text: t.text }]
        })),
        callbacks,
        audio: {
          input: {sampleRate: 16000},
          output: {
            sampleRate: 24000,
            encoding: 'LINEAR16', 
            voice: 'Zephyr',
          },
        },
      });

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (connectionRef.current && status === AgentStatus.CONNECTED) {
          const pcm = decode(e.inputBuffer.getChannelData(0));
          connectionRef.current.send(pcm);
        }
      };
    } catch (e: any)
    {
      console.error('Failed to connect:', e);
      const errorMessage = e.message.includes('permission denied') 
        ? 'Microphone permission denied. Please enable it in your browser settings.'
        : `Failed to connect: ${e.message}`;
      setError(errorMessage);
      setStatus(AgentStatus.ERROR);
      await disconnect();
    }
  }, [disconnect, status, transcript]);
  
  const resetTranscript = () => {
    setTranscript([]);
  }

  const updateUserTranscript = (text: string) => {
    setTranscript(prev => [...prev, { actor: 'user', text }]);
  }

  return {status, transcript, error, connect, disconnect, updateUserTranscript, resetTranscript};
};
