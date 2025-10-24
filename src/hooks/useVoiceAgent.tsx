
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, Chat, Part } from '@google/genai';
import { AppAction, ActionType } from '../state/actions';
import { SYSTEM_INSTRUCTION, FUNCTION_DECLARATIONS } from '../lib/constants';
import { User } from '../lib/types';
import * as api from '../lib/api';

// The `LiveSession` type is not exported by the library, so we define a minimal
// interface based on the methods used in this file.
interface LiveSession {
  sendToolResponse(response: {
    functionResponses: {
      id: string;
      name: string;
      response: any;
    };
  }): void;
  sendRealtimeInput(input: { media: Blob }): void;
  close(): void;
}

// Helper functions for audio encoding/decoding
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


export const useVoiceAgent = (dispatch: React.Dispatch<AppAction>, user: User) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isProcessingText, setIsProcessingText] = useState(false);
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const chatSessionRef = useRef<Chat | null>(null);
  const hasConnectedSuccessfully = useRef(false);


  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const audioPlaybackQueue = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const isConnected = status === 'connected';

  // --- Core Tool Execution Logic ---
  const _executeTool = useCallback(async (fc: any) => {
    let result: any;

    const functionDecl = FUNCTION_DECLARATIONS.find(d => d.name === fc.name);
    if (!functionDecl) {
        console.error(`Unknown function call received: ${fc.name}`);
        result = { status: 'ERROR', message: `Function ${fc.name} is not defined.` };
        return { id: fc.id, name: fc.name, response: result };
    }

    const requiredParams = functionDecl.parameters.required || [];
    const missingParams = requiredParams.filter(param => fc.args[param] === undefined || fc.args[param] === null);

    if (missingParams.length > 0) {
        console.error(`Tool call ${fc.name} is missing required arguments: ${missingParams.join(', ')}`, fc.args);
        result = { status: 'ERROR', message: `Call failed. Missing required fields: ${missingParams.join(', ')}. You must ask the user for this information again.` };
        return { id: fc.id, name: fc.name, response: result };
    }

    if (fc.name === 'updateUserGoalAndProfile') {
      const { age, gender, weightKg, heightCm, activityLevel, unitSystem, goalType, grammaticalGoal, targetCalories, targetProtein, targetCarbs, targetFat, bmr, tdee } = fc.args;
      
      const newUser: User = {
        profile: { age, gender, weightKg, heightCm, activityLevel, unitSystem, bmr, tdee },
        goal: {
          type: goalType,
          grammaticalString: grammaticalGoal,
          macros: { calories: targetCalories, protein: targetProtein, carbs: targetCarbs, fat: targetFat },
        },
      };

      try {
        const formattedUser = api.formatUserForUpdate(newUser);
        dispatch({ type: ActionType.SET_USER, payload: formattedUser });
        result = { status: 'SUCCESS', message: 'User profile and goals have been updated successfully.' };
      } catch (error) {
          console.error('Error dispatching user update:', error);
          result = { status: 'ERROR', message: 'An internal error occurred while updating the profile.' };
      }

    } else if (fc.name === 'logFoodIntake') {
      const { foodName, calories, protein, carbs, fat, category } = fc.args;
      try {
        const newFoodItem = api.createFoodItem({
          name: foodName,
          macros: { calories, protein, carbs, fat },
          category: category,
        });
        const today = new Date().toISOString().split('T')[0];
        dispatch({ type: ActionType.ADD_FOOD_ITEM, payload: { date: today, food: newFoodItem } });
        result = { status: 'SUCCESS', message: `${foodName} has been logged.` };
      } catch (error) {
          console.error('Error dispatching food log:', error);
          result = { status: 'ERROR', message: 'An internal error occurred while logging the food item.' };
      }
    }
    
    // FIX: The tool response was being incorrectly nested and stringified.
    // The model expects a simple object as the response. This change ensures
    // the result is sent back in the correct format, fixing the logging bug.
    return { id: fc.id, name: fc.name, response: result };
  }, [dispatch]);
  
  const disconnect = useCallback(() => {
    sessionPromiseRef.current?.then(session => session.close()).catch(console.error);
    sessionPromiseRef.current = null;
    
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    
    mediaStreamSourceRef.current?.disconnect();
    mediaStreamSourceRef.current = null;

    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;

    inputAudioContextRef.current?.close().catch(console.error);
    inputAudioContextRef.current = null;

    outputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current = null;
  }, []);

  // --- Text-based Interaction ---
  const sendMessage = useCallback(async (text: string) => {
    if (!process.env.API_KEY) {
        alert('API_KEY environment variable not set.');
        return;
    }
    setIsProcessingText(true);
    dispatch({ type: ActionType.UPDATE_TRANSCRIPT, payload: { source: 'user', text } });
    dispatch({ type: ActionType.FINALIZE_TRANSCRIPT, payload: { source: 'user' } });

    try {
        if (!chatSessionRef.current) {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const userContext = user.goal
                ? `CONTEXT: The user has a personalized goal set up. Their daily calorie target is ${user.goal.macros.calories} kcal.`
                : `CONTEXT: The user does NOT have a goal set up. They can either log food directly or ask to create a plan.`;
            const dynamicSystemInstruction = `${userContext}\n\n${SYSTEM_INSTRUCTION}`;
            
            chatSessionRef.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: dynamicSystemInstruction,
                    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
                },
            });
        }
        
        let response = await chatSessionRef.current.sendMessage({ message: text });
        let functionCalls = response.functionCalls;
        
// FIX: The original code mishandled function call responses.
// This updated loop correctly processes all function calls returned by the model
// and sends back the responses using the correct `{ message: Part[] }` structure for `sendMessage`.
        while (functionCalls && functionCalls.length > 0) {
            const functionResponses = await Promise.all(
                functionCalls.map(fc => _executeTool(fc))
            );
            
            const toolResponseParts: Part[] = functionResponses.map(
                (funcResponse) => ({
                    functionResponse: {
                        name: funcResponse.name,
                        response: funcResponse.response,
                    },
                })
            );
            
            response = await chatSessionRef.current.sendMessage({ message: toolResponseParts });
            functionCalls = response.functionCalls;
        }

        if (response.text) {
            dispatch({ type: ActionType.ADD_AGENT_TRANSCRIPT, payload: response.text });
            dispatch({ type: ActionType.FINALIZE_TRANSCRIPT, payload: { source: 'agent' } });
        }

    } catch (error) {
        console.error("Error sending text message:", error);
        dispatch({ type: ActionType.ADD_AGENT_TRANSCRIPT, payload: "Sorry, I encountered an error. Please try again." });
        dispatch({ type: ActionType.FINALIZE_TRANSCRIPT, payload: { source: 'agent' } });
    } finally {
        setIsProcessingText(false);
    }
  }, [dispatch, user, _executeTool]);


  // --- Voice-based Interaction (Live API) ---
  const connect = useCallback(async () => {
    if (!process.env.API_KEY) {
      alert('API_KEY environment variable not set.');
      return;
    }
    if (status === 'connected' || status === 'connecting') return;
    
    setStatus('connecting');
    dispatch({ type: ActionType.CLEAR_CONVERSATION });
    hasConnectedSuccessfully.current = false;

    try {
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;
      audioPlaybackQueue.current.clear();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const userContext = user.goal
        ? `CONTEXT: The user has a personalized goal set up.`
        : `CONTEXT: The user does NOT have a goal set up.`;
      const dynamicSystemInstruction = `${userContext}\n\n${SYSTEM_INSTRUCTION}`;

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          systemInstruction: dynamicSystemInstruction,
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          // FIX: The `endpointerConfig` property is not a valid property for `speechConfig`
          // in `live.connect` calls. It has been removed to fix the type error.
          // The API will use its default end-of-speech detection.
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
        },
        callbacks: {
          onopen: () => {
            hasConnectedSuccessfully.current = true;
            setStatus('connected');
            if (!inputAudioContextRef.current || !mediaStreamRef.current) return;
            mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then(session => session.sendRealtimeInput({ media: pcmBlob })).catch(console.error);
            };

            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              dispatch({ type: ActionType.UPDATE_TRANSCRIPT, payload: { source: 'user', text: message.serverContent.inputTranscription.text } });
            }
            if (message.serverContent?.turnComplete) {
              dispatch({ type: ActionType.FINALIZE_TRANSCRIPT, payload: { source: 'user' } });
            }
            if (message.serverContent?.outputTranscription) {
              dispatch({ type: ActionType.ADD_AGENT_TRANSCRIPT, payload: message.serverContent.outputTranscription.text });
            }
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                const functionResponse = await _executeTool(fc);
                sessionPromiseRef.current?.then(session => session.sendToolResponse({ functionResponses: functionResponse }));
              }
            }
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
               const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
               const source = outputAudioContextRef.current.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(outputAudioContextRef.current.destination);
               const currentTime = outputAudioContextRef.current.currentTime;
               const startTime = Math.max(currentTime, nextStartTimeRef.current);
               source.start(startTime);
               nextStartTimeRef.current = startTime + audioBuffer.duration;
               audioPlaybackQueue.current.add(source);
               source.onended = () => audioPlaybackQueue.current.delete(source);
            }
            if (message.serverContent?.interrupted) {
              audioPlaybackQueue.current.forEach(source => source.stop());
              audioPlaybackQueue.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('Session error:', e);
            dispatch({ type: ActionType.ADD_AGENT_TRANSCRIPT, payload: "An unexpected error occurred during the voice session." });
            dispatch({ type: ActionType.FINALIZE_TRANSCRIPT, payload: { source: 'agent' } });
            setStatus('error');
            disconnect();
          },
          onclose: () => {
             if (!hasConnectedSuccessfully.current) {
                const errorMessage = "Could not establish a voice connection. Please check your API key and network status, and ensure your microphone is working.";
                dispatch({ type: ActionType.ADD_AGENT_TRANSCRIPT, payload: errorMessage });
                dispatch({ type: ActionType.FINALIZE_TRANSCRIPT, payload: { source: 'agent' } });
                setStatus('error');
             } else {
                setStatus('idle');
             }
             disconnect();
          }
        },
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      let errorMessage = "Failed to start the microphone. Please ensure you have a microphone connected and have granted permission to use it.";
      if (error instanceof Error && error.name === 'NotAllowedError') {
          errorMessage = "Microphone access was denied. Please enable microphone permissions in your browser settings to use the voice feature.";
      }
      dispatch({ type: ActionType.ADD_AGENT_TRANSCRIPT, payload: errorMessage });
      dispatch({ type: ActionType.FINALIZE_TRANSCRIPT, payload: { source: 'agent' } });
      setStatus('error');
    }
  }, [status, dispatch, user, _executeTool, disconnect]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    isConnected,
    isProcessingText,
    connect,
    disconnect,
    sendMessage
  };
};
