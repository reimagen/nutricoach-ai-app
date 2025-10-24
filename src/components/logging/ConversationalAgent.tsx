
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { extractMealInfo } from '@/ai/flows/extract-meal-info';
import { photoMealLogging } from '@/ai/flows/photo-meal-logging';
import { MealInfo } from '@/ai/shared-types';
import { Bot, Mic, User, Save, X, Loader2, Power, Paperclip, Send } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useMacroAgent, AgentStatus, ConversationTurn } from '@/hooks/useMacroAgent';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

enum View {
  CONVERSATION,
  CONFIRMING
}

export default function ConversationalAgent() {
  const { user } = useAuth();
  const [view, setView] = useState<View>(View.CONVERSATION);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalMealData, setFinalMealData] = useState<MealInfo | null>(null);
  const [textInput, setTextInput] = useState('');
  const { toast } = useToast();
  const { status, transcript, error, connect, disconnect, updateUserTranscript } = useMacroAgent();
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const handleToggleConnection = () => {
    if (status === AgentStatus.CONNECTED || status === AgentStatus.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  const handleTextInputSend = () => {
    if (!textInput.trim()) return;
    updateUserTranscript(textInput);
    setTextInput('');
  };
  
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    updateUserTranscript(`(Sent an image: ${file.name})`);

    try {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const dataUri = reader.result as string;
            const mealData = await photoMealLogging({ photoDataUri: dataUri });

            if (mealData.items.length === 0) {
              toast({
                variant: 'destructive',
                title: 'Photo Unclear',
                description: "I couldn't identify any food items in that photo. Please try another one or describe the meal.",
              });
              setIsProcessing(false);
              return;
            }

            setFinalMealData(mealData);
            setView(View.CONFIRMING);
        };
        reader.readAsDataURL(file);
    } catch (e) {
        console.error("Photo logging failed:", e);
        toast({ variant: 'destructive', title: 'Analysis Failed', description: 'There was an issue analyzing your photo.' });
    } finally {
        setIsProcessing(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  };

  const processAndSaveMeal = async () => {
    const conversationText = transcript.map(t => `${t.actor}: ${t.text}`).join('\n');
    
    if (!conversationText || !user) {
      toast({ variant: 'destructive', title: 'Save Failed', description: 'There is no conversation to save.' });
      return;
    }
    setIsProcessing(true);

    try {
      const mealData = await extractMealInfo({
        conversationHistory: conversationText,
      });

      if (!mealData || !mealData.mealCategory || mealData.mealCategory === 'unknown' || mealData.items.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Not Enough Info',
          description: "I don't have enough information to log a meal yet. Please describe what you ate, and for which meal (breakfast, lunch, dinner, or snack).",
        });
        setIsProcessing(false);
        return;
      }
      
      setFinalMealData(mealData);
      setView(View.CONFIRMING);

    } catch (error) {
      console.error("Failed to extract meal info:", error);
      toast({ variant: 'destructive', title: 'Extraction Failed', description: 'I couldn\'t figure out the meal from our conversation.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!finalMealData || !user) return;
    setIsSaving(true);
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
      resetConversation();
    } catch (error) {
       console.error("Failed to save meal:", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save your meal to the database.' });
    } finally {
      setIsSaving(false);
    }
  };


  const resetConversation = () => {
    disconnect();
    setTextInput('');
    setView(View.CONVERSATION);
    setFinalMealData(null);
    setIsSaving(false);
  };
  
  const getButtonState = () => {
    switch (status) {
      case AgentStatus.IDLE:
      case AgentStatus.ERROR:
        return { text: 'Start Conversation', icon: <Mic className="mr-2 h-4 w-4" />, variant: 'outline' as const, disabled: isProcessing };
      case AgentStatus.CONNECTING:
        return { text: 'Connecting...', icon: <Loader2 className="mr-2 h-4 w-4 animate-spin" />, variant: 'outline' as const, disabled: true };
      case AgentStatus.CONNECTED:
        return { text: 'End Conversation', icon: <Power className="mr-2 h-4 w-4" />, variant: 'destructive' as const, disabled: false };
      case AgentStatus.DISCONNECTING:
        return { text: 'Disconnecting...', icon: <Loader2 className="mr-2 h-4 w-4 animate-spin" />, variant: 'destructive' as const, disabled: true };
      default:
        return { text: 'Start Conversation', icon: <Mic className="mr-2 h-4 w-4" />, variant: 'outline' as const, disabled: isProcessing };
    }
  };

  const buttonState = getButtonState();
  const isLoading = isProcessing || isSaving || status === AgentStatus.CONNECTING || status === AgentStatus.DISCONNECTING;

  return (
    <Card className="flex flex-col h-[70vh]">
      <CardHeader>
        <CardTitle>Log Your Meal</CardTitle>
        <CardDescription>
            {view === View.CONFIRMING
              ? "Please review the meal details below."
              : "Describe your meal by typing, speaking, or uploading a photo."}
        </CardDescription>
      </CardHeader>

      {view === View.CONVERSATION ? (
        <>
          <CardContent className="flex-grow space-y-4 text-left max-h-full overflow-y-auto pr-4">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {transcript.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Bot className="w-16 h-16 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Log your meal to get started.</p>
              </div>
            )}
            
            {isLoading && transcript.length === 0 && (
               <div className="flex flex-col items-center justify-center h-full text-center">
                <Loader2 className="w-16 h-16 text-muted-foreground/50 animate-spin" />
                <p className="mt-4 text-muted-foreground">Processing...</p>
              </div>
            )}

            {transcript.map((entry, index) => (
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
            <div ref={conversationEndRef} />
          </CardContent>

          <CardFooter className="pt-4 border-t flex-col gap-4">
            <div className="flex w-full items-start space-x-2">
                <Textarea
                    placeholder="Type what you ate or click the mic to speak..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleTextInputSend();
                        }
                    }}
                    rows={1}
                    className="max-h-24"
                    disabled={isLoading || status === AgentStatus.CONNECTED}
                />
                <Button onClick={handleTextInputSend} disabled={isLoading || !textInput.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  ref={fileInputRef}
                  disabled={isLoading}
                />
                <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                    <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant={buttonState.variant}
                  onClick={handleToggleConnection}
                  disabled={buttonState.disabled}
                >
                  {buttonState.icon}
                </Button>
            </div>
            <div className="flex w-full items-center justify-between">
                {status === AgentStatus.CONNECTED && (
                    <div className="flex items-center text-sm text-green-500">
                      <span className="relative flex h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                      Live Conversation Active
                    </div>
                )}
                <Button
                    onClick={processAndSaveMeal}
                    disabled={transcript.length === 0 || isLoading}
                    variant="default"
                    size="sm"
                    className="ml-auto"
                >
                    {isProcessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Log Described Meal
                </Button>
            </div>
          </CardFooter>
        </>
      ) : (
        <>
          <CardContent>
            {finalMealData && (
              <Card className="text-left mt-4 border-accent">
                <CardHeader>
                  <CardTitle>Confirm Your Meal</CardTitle>
                  <CardDescription>
                    Ready to log this as {finalMealData.mealCategory === 'unknown' ? 'a meal' : finalMealData.mealCategory}. Is this correct?
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
              </Card>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setView(View.CONVERSATION)}>
                <X className="mr-2 h-4 w-4" /> Go Back
              </Button>
              <Button onClick={handleConfirmSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Confirm & Save
              </Button>
            </CardFooter>
        </>
      )}
    </Card>
  );
}
