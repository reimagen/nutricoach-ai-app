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


enum ConversationStatus {
  IDLE,
  LISTENING,
  PROCESSING,
  SPEAKING,
  FINALIZING,
}

type ConversationTurn = {
  actor: 'user' | 'ai';
  text: string;
};

export default function ConversationalAgent() {
  const { user } = useAuth();
  const [status, setStatus] = useState(ConversationStatus.IDLE);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [finalMealData, setFinalMealData] = useState<ConversationalMealLoggingOutput['mealToLog'] | null>(null);

  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const conversationHistoryRef = useRef<string[]>([]);

  // --- Core State Machine and Effects ---

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        variant: 'destructive',
        title: 'Browser Not Supported',
        description: 'Voice recognition is not available in your browser.',
      });
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        handleUserQuery(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
        toast({
          variant: "destructive",
          title: "Voice Error",
          description: `An error occurred: ${event.error}. Please try again.`
        });
      }
      setStatus(ConversationStatus.IDLE);
    };

    recognition.onend = () => {
      if (status === ConversationStatus.LISTENING) {
        setStatus(ConversationStatus.IDLE);
      }
    };

    if (audioRef.current) {
        audioRef.current.onended = () => {
            if (status === ConversationStatus.SPEAKING) {
                setStatus(ConversationStatus.IDLE);
            }
        };
    }
  }, [toast, status]);


  const handleUserQuery = async (query: string) => {
    if (!query || status === ConversationStatus.PROCESSING || status === ConversationStatus.SPEAKING) {
      return;
    }

    setStatus(ConversationStatus.PROCESSING);
    setConversation(prev => [...prev, { actor: 'user', text: query }]);
    conversationHistoryRef.current.push(`User: ${query}`);
    
    try {
      const result = await conversationalMealLogging({
        userQuery: query,
        conversationHistory: conversationHistoryRef.current,
      });
      
      conversationHistoryRef.current.push(`AI: ${result.response}`);
      setConversation(prev => [...prev, { actor: 'ai', text: result.response }]);

      if (result.mealToLog && result.mealToLog.mealCategory !== 'unknown') {
        setFinalMealData(result.mealToLog);
        setStatus(ConversationStatus.FINALIZING);
        speak(result.response);
      } else {
        speak(result.response);
      }

    } catch (error) {
      console.error('Error in conversational flow:', error);
      const errorMsg = "Sorry, I ran into a problem. Could you say that again?";
      setConversation(prev => [...prev, { actor: 'ai', text: errorMsg }]);
      speak(errorMsg);
    }
  };

  const speak = async (text: string) => {
    setStatus(ConversationStatus.SPEAKING);
    try {
      const { media } = await textToSpeech(text);
      if (audioRef.current) {
        audioRef.current.src = media;
        audioRef.current.play().catch(e => {
            console.error("Audio playback failed", e);
            setStatus(ConversationStatus.IDLE);
        });
      }
    } catch (error) {
      console.error('Error generating speech:', error);
      toast({
        variant: 'destructive',
        title: 'Speech Generation Failed',
        description: 'Could not generate audio for the response.',
      });
      setStatus(ConversationStatus.IDLE);
    }
  };

  // --- User Actions ---
  const toggleListening = () => {
    if (status === ConversationStatus.LISTENING) {
      recognitionRef.current?.stop();
      setStatus(ConversationStatus.IDLE);
    } else {
      resetConversation();
      setStatus(ConversationStatus.LISTENING);
      try {
        recognitionRef.current?.start();
      } catch(e) {
        console.error("Recognition start failed", e);
        setStatus(ConversationStatus.IDLE);
      }
    }
  };
  
  const handleTextInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
        if(status === ConversationStatus.IDLE) {
             resetConversation();
        }
      handleUserQuery(textInput.trim());
      setTextInput('');
    }
  };

  const handleSaveMeal = async () => {
    if (!finalMealData || !user) {
      toast({ variant: 'destructive', title: 'Save Failed', description: 'No meal data to save.' });
      return;
    }
    try {
      await addDoc(collection(db, 'meals'), {
        userId: user.uid,
        description: finalMealData.mealDescription,
        mealCategory: finalMealData.mealCategory,
        items: finalMealData.items,
        macros: finalMealData.totalMacros,
        source: 'conversation',
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Meal Saved!', description: `Your ${finalMealData.mealCategory} has been logged.` });
    } catch (error) {
      console.error("Failed to save meal:", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save your meal to the database.' });
    } finally {
      resetConversation();
    }
  };

  const resetConversation = () => {
    setStatus(ConversationStatus.IDLE);
    setConversation([]);
    conversationHistoryRef.current = [];
    setFinalMealData(null);
    setCurrentTranscript('');
    setTextInput('');
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
    }
    recognitionRef.current?.stop();
  };


  return (
    <Card className="flex flex-col h-[70vh]">
      <CardHeader>
        <CardTitle>Conversational Logging</CardTitle>
        <CardDescription>Have a natural, hands-free conversation to log your meals.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4 text-left max-h-full overflow-y-auto pr-4">
        {conversation.length === 0 && !finalMealData && (
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
       
        {finalMealData && (
          <Card className="text-left mt-4 border-accent">
            <CardHeader>
              <CardTitle>Confirm Your Meal</CardTitle>
              <CardDescription>
                I'm ready to log this as a {finalMealData.mealCategory}. Here's the breakdown:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {finalMealData.items.map((item, index) => (
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
                  <span>{Math.round(finalMealData.totalMacros.caloriesKcal)}kcal</span>
                  <span>{Math.round(finalMealData.totalMacros.proteinG)}g P</span>
                  <span>{Math.round(finalMealData.totalMacros.carbohydrateG)}g C</span>
                  <span>{Math.round(finalMealData.totalMacros.fatG)}g F</span>
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
              status === ConversationStatus.LISTENING ? "Listening..." :
              status === ConversationStatus.PROCESSING ? "Thinking..." :
              status === ConversationStatus.SPEAKING ? "..." :
              "Type or click the mic to talk"
            }
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={status !== ConversationStatus.IDLE}
          />
          <Button type="submit" size="icon" disabled={status !== ConversationStatus.IDLE}>
            <Send className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={status === ConversationStatus.LISTENING ? 'destructive' : 'outline'}
            onClick={toggleListening}
            disabled={status === ConversationStatus.PROCESSING || status === ConversationStatus.SPEAKING}
          >
            <Mic className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

    