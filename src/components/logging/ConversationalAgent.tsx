
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { extractMealInfo } from '@/ai/flows/extract-meal-info';
import { photoMealLogging } from '@/ai/flows/photo-meal-logging';
import { MealInfo } from '@/ai/shared-types';
import { Bot, Mic, User, Save, X, Loader2, Power, Paperclip, Send, BrainCircuit } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useMacroAgent, AgentStatus, ConversationTurn } from '@/hooks/useMacroAgent';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ConversationalAgent() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mealData, setMealData] = useState<MealInfo | null>(null);
  const [textInput, setTextInput] = useState('');
  const { toast } = useToast();
  const { status, transcript, error, connect, disconnect, updateUserTranscript, setTranscript } = useMacroAgent();
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
            const newMealData = await photoMealLogging({ photoDataUri: dataUri });

            if (newMealData.items.length === 0) {
              setTranscript(prev => [...prev, { actor: 'ai', text: "I couldn't quite identify any food in that photo. Could you try another picture or describe the meal for me?" }]);
              return;
            }
            
            setMealData(newMealData);
            setTranscript(prev => [...prev, { actor: 'ai', text: `Based on the photo, I've logged: ${newMealData.mealDescription}. You can make changes by typing or speaking, or save it as is.` }]);
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

  const processConversation = async () => {
    const conversationText = transcript.map(t => `${t.actor}: ${t.text}`).join('\n');
    
    if (!conversationText || !user) {
      toast({ variant: 'destructive', title: 'Processing Failed', description: 'There is no conversation to process.' });
      return;
    }
    setIsProcessing(true);

    try {
      const extractedMealData = await extractMealInfo({
        conversationHistory: conversationText,
      });

      if (!extractedMealData || extractedMealData.items.length === 0) {
        setTranscript(prev => [...prev, { actor: 'ai', text: "I didn't find enough information to log a meal from our conversation. Please describe what you ate, like 'I had two eggs and a coffee for breakfast'." }]);
        return;
      }
      
      setMealData(extractedMealData);
      setTranscript(prev => [...prev, { actor: 'ai', text: `I've analyzed our conversation and drafted this meal. Feel free to make more changes or save it.` }]);

    } catch (error) {
      console.error("Failed to extract meal info:", error);
      toast({ variant: 'destructive', title: 'Extraction Failed', description: 'I couldn\'t figure out the meal from our conversation.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!mealData || !user) {
      toast({ variant: 'destructive', title: 'Save Failed', description: "There's no meal data to save." });
      return;
    };
     if (!mealData.mealCategory || mealData.mealCategory === 'unknown') {
      toast({ variant: 'destructive', title: 'Category Missing', description: "Please select a meal category before saving." });
      return;
    }

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'meals'), {
        userId: user.uid,
        description: mealData.mealDescription,
        mealCategory: mealData.mealCategory,
        items: mealData.items,
        macros: mealData.totalMacros,
        source: 'conversation',
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Meal Saved!', description: `Your ${mealData.mealCategory} has been logged.` });
      reset();
    } catch (error) {
       console.error("Failed to save meal:", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save your meal to the database.' });
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    disconnect();
    setTranscript([]);
    setTextInput('');
    setMealData(null);
    setIsSaving(false);
    setIsProcessing(false);
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
    <Card className="flex flex-col h-[80vh]">
      <CardHeader>
        <CardTitle>Log Your Meal</CardTitle>
        <CardDescription>
          Start a conversation, type, or upload a photo. The AI will build your meal log as you go.
        </CardDescription>
      </CardHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 flex-grow min-h-0">
        {/* Left Side: Conversation */}
        <div className="flex flex-col border-r">
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
          <CardFooter className="pt-4 border-t flex flex-col gap-4">
             <div className="flex w-full items-start space-x-2">
                <Textarea
                    placeholder="Type what you ate or click the mic..."
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
                    disabled={isLoading}
                />
                <Button onClick={handleTextInputSend} disabled={isLoading || !textInput.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" ref={fileInputRef} disabled={isLoading} />
                <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                    <Paperclip className="h-4 w-4" />
                </Button>
                 <Button size="icon" variant={buttonState.variant} onClick={handleToggleConnection} disabled={buttonState.disabled}>
                    {buttonState.icon}
                 </Button>
            </div>
             {status === AgentStatus.CONNECTED && (
                <div className="flex items-center text-sm text-green-500 w-full">
                  <span className="relative flex h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                  Live Conversation Active
                </div>
              )}
          </CardFooter>
        </div>

        {/* Right Side: Meal Details */}
        <div className="flex flex-col">
          <CardContent className="flex-grow space-y-4 text-left max-h-full overflow-y-auto px-4 pt-6">
              <h3 className="font-headline text-lg">Meal Details</h3>
              {mealData ? (
                 <div className="space-y-4">
                  <Select 
                    value={mealData.mealCategory === 'unknown' ? undefined : mealData.mealCategory}
                    onValueChange={(value: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
                      setMealData(prev => prev ? { ...prev, mealCategory: value } : null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Meal Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="space-y-2">
                    {mealData.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                        <p className="font-medium text-sm flex-1">{item.name}</p>
                        <div className="grid grid-cols-4 gap-x-3 text-xs text-right text-muted-foreground w-2/3">
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
                    <div className="grid grid-cols-4 gap-x-3 text-sm text-right w-2/3">
                      <span>{Math.round(mealData.totalMacros.caloriesKcal)}kcal</span>
                      <span>{Math.round(mealData.totalMacros.proteinG)}g P</span>
                      <span>{Math.round(mealData.totalMacros.carbohydrateG)}g C</span>
                      <span>{Math.round(mealData.totalMacros.fatG)}g F</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                   <BrainCircuit className="w-16 h-16 mb-4" />
                  <p>Your meal details will appear here as you describe them.</p>
                </div>
              )}
          </CardContent>
          <CardFooter className="pt-4 border-t flex flex-col items-end gap-2">
            <div className="flex w-full justify-end gap-2">
                <Button variant="ghost" onClick={reset} disabled={isLoading}>
                    <X className="mr-2 h-4 w-4" />
                    Reset
                </Button>
                <Button onClick={processConversation} disabled={isLoading || transcript.length === 0}>
                    <BrainCircuit className="mr-2 h-4 w-4" />
                    Process Conversation
                </Button>
                <Button onClick={handleConfirmSave} disabled={isLoading || !mealData}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Meal
                </Button>
            </div>
            <p className="text-xs text-muted-foreground text-right w-full">Use "Process Conversation" to analyze text/voice, then "Save Meal".</p>
          </CardFooter>
        </div>
      </div>
    </Card>
  );
}

    