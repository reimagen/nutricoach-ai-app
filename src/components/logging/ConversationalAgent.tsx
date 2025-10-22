'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { conversationalMealLogging, ConversationalMealLoggingOutput } from '@/ai/flows/conversational-meal-logging';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { Bot, Mic, User } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';


enum ListeningState {
  IDLE, // Not listening, waiting for user to start
  LISTENING, // Actively listening for user input
  PROCESSING, // AI is processing the input
  RESPONDING, // AI is speaking
}

export default function ConversationalAgent() {
  const { user } = useAuth();
  const [listeningState, setListeningState] = useState(ListeningState.IDLE);
  const [conversation, setConversation] = useState<{ actor: 'user' | 'ai'; text: string }[]>([]);
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const conversationHistoryRef = useRef<string[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const [lastMealData, setLastMealData] = useState<ConversationalMealLoggingOutput['mealToLog'] | null>(null);

  const speak = async (text: string) => {
    setListeningState(ListeningState.RESPONDING);
    try {
      const { media } = await textToSpeech(text);
      if (audioRef.current) {
        audioRef.current.src = media;
        audioRef.current.play();
      }
      setConversation(prev => [...prev, { actor: 'ai', text: text }]);
      conversationHistoryRef.current.push(`AI: ${text}`);
    } catch (error) {
      console.error('Error generating speech:', error);
      toast({
        variant: 'destructive',
        title: 'Speech Generation Failed',
        description: 'Could not generate audio for the response.',
      });
      setListeningState(ListeningState.LISTENING);
    }
  };

  const handleSaveMeal = async (mealData: ConversationalMealLoggingOutput['mealToLog']) => {
      if (!mealData || !user) return;

      try {
        await addDoc(collection(db, 'users', user.uid, 'meals'), {
          uid: user.uid,
          description: mealData.mealDescription,
          mealCategory: mealData.mealCategory,
          items: mealData.items,
          macros: mealData.totalMacros,
          source: 'conversation',
          createdAt: serverTimestamp(),
        });
        toast({
          title: 'Meal Saved!',
          description: `Your ${mealData.mealCategory} has been added to your log.`,
        });
      } catch(error) {
        console.error("Failed to save meal:", error);
        toast({
          variant: 'destructive',
          title: 'Save Failed',
          description: 'Could not save your meal to the database.',
        });
      }
  };

  const handleQuery = async (query: string) => {
    if (!query) {
      setListeningState(ListeningState.LISTENING);
      return;
    }
    setListeningState(ListeningState.PROCESSING);
    setConversation(prev => [...prev, { actor: 'user', text: query }]);
    conversationHistoryRef.current.push(`User: ${query}`);

    try {
      const result = await conversationalMealLogging({
        userQuery: query,
        conversationHistory: conversationHistoryRef.current,
      });
      
      setLastMealData(result.mealToLog ?? null);
      
      await speak(result.response);

      if (result.isEndOfConversation) {
        if (result.mealToLog) {
            await handleSaveMeal(result.mealToLog);
        }
        conversationHistoryRef.current = [];
      }

    } catch (error) {
      console.error('Error in conversational flow:', error);
      await speak("Sorry, I ran into an issue. Let's try that again.");
    }
  };

  const processSpeech = (event: any) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    let interimTranscript = '';
    finalTranscriptRef.current = '';

    for (let i = 0; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscriptRef.current += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    
    if (finalTranscriptRef.current) {
        handleQuery(finalTranscriptRef.current.trim());
        finalTranscriptRef.current = '';
        recognitionRef.current?.stop();
    } else {
        silenceTimerRef.current = setTimeout(() => {
            if (interimTranscript.trim()) {
                handleQuery(interimTranscript.trim());
                recognitionRef.current?.stop();
            }
        }, 1200); 
    }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        variant: 'destructive',
        title: 'Browser Not Supported',
        description: 'Your browser does not support the Web Speech API.',
      });
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.continuous = true; 
    recognition.interimResults = true;

    recognition.onresult = processSpeech;

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
        toast({
          variant: "destructive",
          title: "Voice Error",
          description: `An error occurred: ${event.error}. Please try again.`
        });
        setListeningState(ListeningState.IDLE);
        if(recognitionRef.current) recognitionRef.current.stop();
      }
    };
    
    recognition.onend = () => {
        if (listeningState === ListeningState.LISTENING) {
           try {
               if(recognitionRef.current) recognitionRef.current.start();
           } catch(e) {
               console.error("Could not restart recognition service.", e);
               setListeningState(ListeningState.IDLE);
           }
        }
    };

    if (audioRef.current) {
        audioRef.current.onended = () => {
            // After AI is done speaking, immediately go back to listening
            setListeningState(ListeningState.LISTENING);
        };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (audioRef.current) audioRef.current.pause();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [listeningState]); // Rerun setup if listeningState changes to attach correct onended handler


  useEffect(() => {
    if(listeningState === ListeningState.LISTENING) {
        try {
            recognitionRef.current?.start();
        } catch(e) {
            // This might be called if the component is in a weird state
            console.error("Could not start recognition", e);
        }
    } else {
        recognitionRef.current?.stop();
    }
  }, [listeningState]);


  const toggleConversation = () => {
    if (listeningState === ListeningState.IDLE) {
      setListeningState(ListeningState.LISTENING);
       // Only clear conversation visuals and history if it's a new session
      conversationHistoryRef.current = [];
      setConversation([]);
      setLastMealData(null);
      toast({ title: 'Conversation started.', description: "I'm listening." });
    } else {
      setListeningState(ListeningState.IDLE);
      if (audioRef.current) audioRef.current.pause();
      conversationHistoryRef.current = [];
      setLastMealData(null);
      toast({ title: 'Conversation ended.' });
    }
  };

  const getStatus = () => {
      switch(listeningState) {
          case ListeningState.IDLE:
              return "Click the mic to start a conversation.";
          case ListeningState.LISTENING:
              return `Listening... Speak when you're ready.`;
          case ListeningState.PROCESSING:
              return "Thinking...";
          case ListeningState.RESPONDING:
              return "Responding...";
          default:
              return "Click the mic to begin."
      }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversational Logging</CardTitle>
        <CardDescription>
          Have a natural, hands-free conversation to log your meals. No wake word needed after starting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <div className="flex justify-center">
            <button
                className={`h-24 w-24 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out
                    ${listeningState === ListeningState.LISTENING ? 'bg-green-500 text-white shadow-lg scale-110' 
                    : listeningState !== ListeningState.IDLE ? 'bg-blue-500 text-white'
                    : 'bg-muted text-muted-foreground'}`}
                onClick={toggleConversation}
            >
                <Mic className="h-10 w-10" />
            </button>
        </div>
        <p className="min-h-[2rem] text-muted-foreground">{getStatus()}</p>
        
        <div className="space-y-4 pt-4 text-left max-h-96 overflow-y-auto pr-4">
            {conversation.map((entry, index) => (
                <div key={index} className={`flex items-start gap-3 ${entry.actor === 'user' ? 'flex-row-reverse' : ''}`}>
                    {entry.actor === 'ai' && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                            <Bot className="h-5 w-5" />
                        </div>
                    )}
                    <div className={`rounded-lg p-3 max-w-[80%] shadow-sm ${entry.actor === 'ai' ? 'bg-muted' : 'bg-accent text-accent-foreground'}`}>
                        <p>{entry.text}</p>
                    </div>
                     {entry.actor === 'user' && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground shrink-0">
                            <User className="h-5 w-5" />
                        </div>
                    )}
                </div>
            ))}
        </div>

        <audio ref={audioRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
