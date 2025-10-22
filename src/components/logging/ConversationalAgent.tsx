'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { conversationalMealLogging, ConversationalMealLoggingOutput } from '@/ai/flows/conversational-meal-logging';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { Bot, Mic, User, Save, X, Send } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


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
  const [lastMealData, setLastMealData] = useState<ConversationalMealLoggingOutput['mealToLog'] | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [textInput, setTextInput] = useState('');

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
      setListeningState(ListeningState.IDLE);
    }
  };

  const handleSaveMeal = async () => {
    if (!lastMealData || !user) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'User or meal data is missing.',
      });
      return;
    }
    setIsFinalizing(false);
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
    } catch (error) {
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
      if (listeningState === ListeningState.LISTENING) {
        setListeningState(ListeningState.LISTENING);
      } else {
        setListeningState(ListeningState.IDLE);
      }
      return;
    }

    setListeningState(ListeningState.PROCESSING);
    setConversation(prev => [...prev, { actor: 'user', text: query }]);
    conversationHistoryRef.current.push(`User: ${query}`);
    setCurrentTranscript('');
    setTextInput('');

    try {
      const fullConversation = isFinalizing && lastMealData
        ? [...conversationHistoryRef.current.slice(0, -1), `User: ${lastMealData.mealDescription} ${query}`]
        : conversationHistoryRef.current;

      const result = await conversationalMealLogging({
        userQuery: query,
        conversationHistory: fullConversation,
      });

      if (result.mealToLog && result.mealToLog.mealCategory !== 'unknown') {
        // This is the final step, meal is ready to be logged.
        setLastMealData(result.mealToLog);
        setIsFinalizing(true);
        setListeningState(ListeningState.IDLE);
        await speak(result.response);
      } else if (result.mealToLog) {
        // This is the first step, meal details gathered, but category is missing.
        setLastMealData(result.mealToLog);
        await speak(result.response);
      } else {
        // This is a general conversation turn, no meal data yet.
        await speak(result.response);
        if (result.isEndOfConversation) {
          setListeningState(ListeningState.IDLE);
        }
      }

    } catch (error) {
      console.error('Error in conversational flow:', error);
      await speak("Sorry, I ran into an issue. Let's try that again.");
      setListeningState(ListeningState.IDLE);
    }
  };

  const processSpeech = (event: any) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    let interimTranscript = '';
    let finalTranscriptForThisSegment = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscriptForThisSegment += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    setCurrentTranscript(prev => prev + interimTranscript);

    if (finalTranscriptForThisSegment.trim()) {
      recognitionRef.current?.stop();
      handleQuery(finalTranscriptForThisSegment.trim());
    } else {
      silenceTimerRef.current = setTimeout(() => {
        if (currentTranscript.trim() && listeningState === ListeningState.LISTENING) {
          recognitionRef.current?.stop();
          handleQuery(currentTranscript.trim());
        }
      }, 1500);
    }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
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
          recognitionRef.current?.stop();
        }
      };

      recognition.onend = () => {
        if (listeningState === ListeningState.LISTENING) {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            console.error("Could not restart recognition service.", e);
            setListeningState(ListeningState.IDLE);
          }
        }
      };
    }


    if (audioRef.current) {
      audioRef.current.onended = () => {
        if (!isFinalizing && listeningState === ListeningState.RESPONDING) {
          setListeningState(ListeningState.IDLE);
        }
      };
    }

    return () => {
      recognitionRef.current?.stop();
      if (audioRef.current) audioRef.current.pause();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [isFinalizing, listeningState, toast]);


  useEffect(() => {
    if (listeningState === ListeningState.LISTENING) {
      try {
        setCurrentTranscript('');
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Could not start recognition", e);
        if (e instanceof DOMException && e.name === 'NotAllowedError') {
          toast({
            variant: 'destructive',
            title: 'Microphone Access Denied',
            description: 'Please allow microphone access in your browser settings.',
          });
        }
        setListeningState(ListeningState.IDLE);
      }
    } else {
      recognitionRef.current?.stop();
    }
  }, [listeningState, toast]);

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
    setCurrentTranscript('');
  }

  const toggleListening = () => {
    if (listeningState === ListeningState.LISTENING) {
        setListeningState(ListeningState.IDLE);
    } else {
        setListeningState(ListeningState.LISTENING);
    }
  }

  const handleTextInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      handleQuery(textInput.trim());
    }
  };

  return (
    <Card className="flex flex-col h-[70vh]">
      <CardHeader>
        <CardTitle>Conversational Logging</CardTitle>
        <CardDescription>
          Have a natural, hands-free conversation to log your meals.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4 text-left max-h-full overflow-y-auto pr-4">
        {conversation.length === 0 && !isFinalizing && (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <Bot className="w-16 h-16 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Start the conversation by typing or using the mic.</p>
            </div>
        )}

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
        {currentTranscript && listeningState === ListeningState.LISTENING && (
          <div className="flex items-start gap-3 justify-end">
            <div className="rounded-lg p-3 max-w-[80%] shadow-sm bg-accent/50 text-accent-foreground">
              <p>{currentTranscript}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground shrink-0">
              <User className="h-5 w-5" />
            </div>
          </div>
        )}

        {isFinalizing && lastMealData && (
          <Card className="text-left mt-4 border-accent">
            <CardHeader>
              <CardTitle>Confirm Your Meal</CardTitle>
              <CardDescription>
                I've logged this as a {lastMealData.mealCategory}. Here is the breakdown:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {lastMealData.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                    <p className="font-medium">{item.name}</p>
                    <div className="grid grid-cols-4 gap-x-2 text-xs text-right">
                      <span>{Math.round(item.macros.caloriesKcal)}kcal</span>
                      <span>{Math.round(item.macros.proteinG)}g P</span>
                      <span>{Math.round(item.macros.carbohydrateG)}g C</span>
                      <span>{Math.round(item.macros.fatG)}g F</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded-lg font-bold">
                <p>Total</p>
                <div className="grid grid-cols-4 gap-x-2 text-sm text-right">
                  <span>{Math.round(lastMealData.totalMacros.caloriesKcal)}kcal</span>
                  <span>{Math.round(lastMealData.totalMacros.proteinG)}g P</span>
                  <span>{Math.round(lastMealData.totalMacros.carbohydrateG)}g C</span>
                  <span>{Math.round(lastMealData.totalMacros.fatG)}g F</span>
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
      <CardFooter>
        <form onSubmit={handleTextInputSubmit} className="flex w-full items-center space-x-2">
          <Input
            type="text"
            placeholder={
              listeningState === ListeningState.LISTENING 
                ? "Listening..." 
                : isFinalizing 
                ? "Confirm, cancel, or make changes"
                : "Type your message..."
            }
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={listeningState === ListeningState.PROCESSING || listeningState === ListeningState.RESPONDING}
          />
          <Button type="submit" size="icon" disabled={listeningState !== ListeningState.IDLE && listeningState !== ListeningState.LISTENING}>
            <Send className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={listeningState === ListeningState.LISTENING ? 'destructive' : 'outline'}
            onClick={toggleListening}
            disabled={listeningState === ListeningState.PROCESSING || listeningState === ListeningState.RESPONDING}
          >
            <Mic className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
