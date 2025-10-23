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
    if (!connectionRef.current) return;
    setStatus(AgentStatus.DISCONNECTING);
    try {
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      audioContextRef.current?.close();
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      await connectionRef.current.close();
    } catch (e: any) {
      console.error('Error during disconnect:', e);
      setError('Failed to disconnect cleanly.');
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
      if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
        throw new Error('Missing GEMINI_API_KEY environment variable.');
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
          setTranscript([]); // Reset transcript on new connection
        },
        onmessage: async (res: any) => {
          if (res.response.speech?.audio) {
            const audioData = res.response.speech.audio.content;
            const decodedData = await decodeAudioData(audioData.buffer);
            const source = audioContext.createBufferSource();
            const audioBuffer = audioContext.createBuffer(
              1,
              decodedData.length,
              24000
            );
            audioBuffer.copyToChannel(decodedData, 0);
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
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
        // Optional, but recommended.
        history: [],
        callbacks,
        audio: {
          input: {sampleRate: 16000},
          output: {
            sampleRate: 24000,
            encoding: 'LINEAR16', // Use 'LINEAR16' instead of 'MP3'
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
    } catch (e: any) {
      console.error('Failed to connect:', e);
      setError(
        e.message.includes('permission denied')
          ? 'Microphone permission denied.'
          : 'Failed to connect.'
      );
      setStatus(AgentStatus.ERROR);
      await disconnect();
    }
  }, [disconnect, status]);

  const updateUserTranscript = (text: string) => {
    setTranscript(prev => [...prev, { actor: 'user', text }]);
  }

  return {status, transcript, error, connect, disconnect, updateUserTranscript};
};
