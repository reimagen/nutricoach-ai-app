'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { conversationalMealLogging, ConversationalMealLoggingOutput } from '@/ai/flows/conversational-meal-logging';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { Bot, Mic, User, Save, X } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';


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
  const [isFinalizing, setIsFinalizing] = useState(false);

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

  const handleSaveMeal = async () => {
      if (!lastMealData || !user) return;

      try {
        await addDoc(collection(db, 'users', user.uid, 'meals'), {
          uid: user.uid,
          description: lastMealData.mealDescription,
          mealCategory: lastMealData.mealCategory,
          items: lastMealData.items,
          macros: lastMealData.totalMacros,
          source: 'conversation',
          createdAt: serverTimestamp(),
        });
        toast({
          title: 'Meal Saved!',
          description: `Your ${lastMealData.mealCategory} has been added to your log.`,
        });
      } catch(error) {
        console.error("Failed to save meal:", error);
        toast({
          variant: 'destructive',
          title: 'Save Failed',
          description: 'Could not save your meal to the database.',
        });
      } finally {
        resetConversation();
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
      
      if (result.mealToLog) {
        setLastMealData(result.mealToLog);
      }
      
      await speak(result.response);

      if (result.isEndOfConversation) {
        if (result.mealToLog) {
            setIsFinalizing(true);
            setListeningState(ListeningState.IDLE); // Stop listening to show confirmation
        } else {
            // General question answered, don't fully reset, just go back to listening.
            // A full reset can be done manually.
            setListeningState(ListeningState.IDLE);
        }
      }

    } catch (error) {
      console.error('Error in conversational flow:', error);
      await speak("Sorry, I ran into an issue. Let's try that again.");
    }
  };

  const processSpeech = (event: any) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = 0; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    
    if (finalTranscript.trim()) {
        handleQuery(finalTranscript.trim());
        if(recognitionRef.current) recognitionRef.current.stop();
    } else {
        silenceTimerRef.current = setTimeout(() => {
            if (interimTranscript.trim()) {
                handleQuery(interimTranscript.trim());
                 if(recognitionRef.current) recognitionRef.current.stop();
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

    if (!recognitionRef.current) {
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
    }


    if (audioRef.current) {
        audioRef.current.onended = () => {
            if (!isFinalizing) {
                setListeningState(ListeningState.LISTENING);
            }
        };
    }

    return () => {
      // Don't stop recognition here as it's managed by state
      if (audioRef.current) audioRef.current.pause();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [isFinalizing]); 


  useEffect(() => {
    if(listeningState === ListeningState.LISTENING) {
        try {
            recognitionRef.current?.start();
        } catch(e) {
            // This might be called if the component is in a weird state
            console.error("Could not start recognition", e);
            setListeningState(ListeningState.IDLE);
        }
    } else {
        recognitionRef.current?.stop();
    }
  }, [listeningState]);

  const resetConversation = () => {
    setListeningState(ListeningState.IDLE);
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
    };
    conversationHistoryRef.current = [];
    setConversation([]);
    setLastMealData(null);
    setIsFinalizing(false);
  }

  const toggleConversation = () => {
    if (listeningState === ListeningState.IDLE && !isFinalizing) {
      resetConversation(); // Clear old conversations before starting a new one
      setListeningState(ListeningState.LISTENING);
      toast({ title: 'Conversation started.', description: "I'm listening." });
    } else {
      resetConversation();
      toast({ title: 'Conversation ended.' });
    }
  };

  const getStatus = () => {
      if (isFinalizing) {
          return "Please review and confirm your meal below."
      }
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
          Have a natural, hands-free conversation to log your meals. The conversation will continue until the meal is logged.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        {!isFinalizing && (
          <>
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
          </>
        )}
        
        <div className="space-y-4 pt-4 text-left max-h-96 overflow-y-auto pr-4">
            {conversation.map((entry, index) => (
                <div key={index} className={`flex items-start gap-3 ${entry.actor === 'user' ? 'justify-end' : ''}`}>
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

        {isFinalizing && lastMealData && (
          <Card className="text-left mt-4">
            <CardHeader>
              <CardTitle>Confirm Your Meal</CardTitle>
              <CardDescription>{lastMealData.mealDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {lastMealData.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                    <p className="font-medium">{item.name}</p>
                    <div className="grid grid-cols-4 gap-x-2 text-xs text-right">
                      <span>{item.macros.caloriesKcal}kcal</span>
                      <span>{item.macros.proteinG}g P</span>
                      <span>{item.macros.carbohydrateG}g C</span>
                      <span>{item.macros.fatG}g F</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded-lg font-bold">
                <p>Total</p>
                <div className="grid grid-cols-4 gap-x-2 text-sm text-right">
                  <span>{lastMealData.totalMacros.caloriesKcal}kcal</span>
                  <span>{lastMealData.totalMacros.proteinG}g P</span>
                  <span>{lastMealData.totalMacros.carbohydrateG}g C</span>
                  <span>{lastMealData.totalMacros.fatG}g F</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetConversation}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSaveMeal}>
                <Save className="mr-2 h-4 w-4" /> Save Meal
              </Button>
            </CardFooter>
          </Card>
        )}

        <audio ref={audioRef} className="hidden" />
      </CardContent>
    </Card>
  );
}

    