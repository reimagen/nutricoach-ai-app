'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { conversationalMealLogging } from '@/ai/flows/conversational-meal-logging';
import { extractMealInfo, MealInfo } from '@/ai/flows/extract-meal-info';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { Bot, Mic, User, Save, X, Send, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

enum AgentStatus {
  IDLE,
  LISTENING,
  PROCESSING_CONVERSATION,
  PROCESSING_SAVE,
  SPEAKING,
  CONFIRMING,
}

type ConversationTurn = {
  actor: 'user' | 'ai';
  text: string;
};

export default function ConversationalAgent() {
  const { user } = useAuth();
  const [status, setStatus] = useState(AgentStatus.IDLE);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [textInput, setTextInput] = useState('');
  const [finalMealData, setFinalMealData] = useState<MealInfo | null>(null);

  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const conversationHistoryRef = useRef<string[]>([]);
  const wakeWordTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        recognition.stop();
        handleUserQuery(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
        toast({
          variant: 'destructive',
          title: 'Voice Error',
          description: `An error occurred: ${event.error}. Please try again.`,
        });
      }
      setStatus(AgentStatus.IDLE);
    };
    
    recognition.onend = () => {
      if (status === AgentStatus.LISTENING) {
        setStatus(AgentStatus.IDLE);
      }
    };

    if (audioRef.current) {
      audioRef.current.onended = () => {
        if (status === AgentStatus.SPEAKING) {
           setStatus(AgentStatus.IDLE);
        }
      };
    }
  }, [toast, status]);


  const handleUserQuery = async (query: string) => {
    if (!query || status === AgentStatus.PROCESSING_CONVERSATION || status === AgentStatus.SPEAKING) {
      return;
    }
    
    stopAll();
    setStatus(AgentStatus.PROCESSING_CONVERSATION);
    setConversation(prev => [...prev, { actor: 'user', text: query }]);
    conversationHistoryRef.current.push(`User: ${query}`);

    try {
      const result = await conversationalMealLogging({
        userQuery: query,
        conversationHistory: conversationHistoryRef.current,
      });

      conversationHistoryRef.current.push(`AI: ${result}`);
      setConversation(prev => [...prev, { actor: 'ai', text: result }]);
      await speak(result);
    } catch (error) {
      console.error('Error in conversational flow:', error);
      const errorMsg = "Sorry, I'm having trouble processing that. Could you try rephrasing?";
      setConversation(prev => [...prev, { actor: 'ai', text: errorMsg }]);
      await speak(errorMsg);
    }
  };

  const speak = async (text: string) => {
    try {
      setStatus(AgentStatus.SPEAKING);
      const { media } = await textToSpeech(text);
      if (audioRef.current) {
        audioRef.current.src = media;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Error generating speech:', error);
      toast({
        variant: 'destructive',
        title: 'Speech Generation Failed',
        description: 'Could not generate audio for the response.',
      });
      setStatus(AgentStatus.IDLE);
    }
  };
  
  const stopAll = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
     if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
    }
     if (wakeWordTimeoutRef.current) {
      clearTimeout(wakeWordTimeoutRef.current);
      wakeWordTimeoutRef.current = null;
    }
  };

  const toggleListening = () => {
    if (status === AgentStatus.LISTENING) {
      stopAll();
      setStatus(AgentStatus.IDLE);
    } else {
      stopAll();
      setStatus(AgentStatus.LISTENING);
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Recognition start failed", e);
        setStatus(AgentStatus.IDLE);
      }
    }
  };
  
  const handleTextInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      handleUserQuery(textInput.trim());
      setTextInput('');
    }
  };

  const processAndSaveMeal = async () => {
    if (!conversationHistoryRef.current.length || !user) {
      toast({ variant: 'destructive', title: 'Save Failed', description: 'There is no conversation to save.' });
      return;
    }
    setStatus(AgentStatus.PROCESSING_SAVE);

    try {
      const mealData = await extractMealInfo({
        conversationHistory: conversationHistoryRef.current.join('\n'),
      });

      if (!mealData || !mealData.mealCategory || mealData.mealCategory === 'unknown' || mealData.items.length === 0) {
        const errorMsg = "I don't have enough information to log a meal yet. Please describe what you ate, and for which meal (breakfast, lunch, dinner, or snack).";
        setConversation(prev => [...prev, { actor: 'ai', text: errorMsg }]);
        await speak(errorMsg);
        setStatus(AgentStatus.IDLE);
        return;
      }
      
      setFinalMealData(mealData);
      setStatus(AgentStatus.CONFIRMING);

    } catch (error) {
      console.error("Failed to extract meal info:", error);
      toast({ variant: 'destructive', title: 'Extraction Failed', description: 'I couldn\'t figure out the meal from our conversation.' });
      setStatus(AgentStatus.IDLE);
    }
  };

  const handleConfirmSave = async () => {
    if (!finalMealData || !user) return;

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
    stopAll();
    setStatus(AgentStatus.IDLE);
    setConversation([]);
    conversationHistoryRef.current = [];
    setFinalMealData(null);
    setTextInput('');
  };

  const isProcessing = status === AgentStatus.PROCESSING_CONVERSATION || status === AgentStatus.PROCESSING_SAVE;


  return (
    <Card className="flex flex-col h-[70vh]">
      <CardHeader>
        <CardTitle>Conversational Logging</CardTitle>
        <CardDescription>
            {status === AgentStatus.CONFIRMING
              ? "Please review the meal details below."
              : "Have a natural conversation to log your meal. Click 'Save' when you're done."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4 text-left max-h-full overflow-y-auto pr-4">
        {conversation.length === 0 && status !== AgentStatus.CONFIRMING && (
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
       
        {status === AgentStatus.CONFIRMING && finalMealData && (
          <Card className="text-left mt-4 border-accent">
            <CardHeader>
              <CardTitle>Confirm Your Meal</CardTitle>
              <CardDescription>
                Ready to log this as {finalMealData.mealCategory}. Is this correct?
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
              <Button variant="outline" onClick={() => setStatus(AgentStatus.IDLE)}>
                <X className="mr-2 h-4 w-4" /> Go Back
              </Button>
              <Button onClick={handleConfirmSave}>
                <Save className="mr-2 h-4 w-4" /> Confirm & Save
              </Button>
            </CardFooter>
          </Card>
        )}
        <audio ref={audioRef} className="hidden" />
      </CardContent>
      <CardFooter className="pt-4 border-t">
        {status !== AgentStatus.CONFIRMING ? (
            <div className="flex w-full items-center space-x-2">
                <form onSubmit={handleTextInputSubmit} className="flex-grow flex items-center space-x-2">
                    <Input
                        type="text"
                        placeholder={
                            status === AgentStatus.LISTENING ? "Listening..." :
                            isProcessing ? "Thinking..." :
                            status === AgentStatus.SPEAKING ? "..." :
                            "Type or click the mic to talk"
                        }
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        disabled={status !== AgentStatus.IDLE && status !== AgentStatus.LISTENING}
                    />
                    <Button type="submit" size="icon" disabled={status !== AgentStatus.IDLE}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
                 <Button
                    type="button"
                    size="icon"
                    variant={status === AgentStatus.LISTENING ? 'destructive' : 'outline'}
                    onClick={toggleListening}
                    disabled={isProcessing || status === AgentStatus.SPEAKING}
                >
                    <Mic className="h-4 w-4" />
                </Button>
                 <Button
                    type="button"
                    onClick={processAndSaveMeal}
                    disabled={isProcessing || status === AgentStatus.SPEAKING || conversation.length === 0}
                >
                    {status === AgentStatus.PROCESSING_SAVE ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Save
                </Button>
            </div>
        ) : (
             <div className="w-full text-center text-muted-foreground">
                Confirm or go back to continue the conversation.
            </div>
        )}
      </CardFooter>
    </Card>
  );
}
