'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Loader2, Save, X, Bot } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { estimateMacros, EstimateMacrosOutput } from '@/ai/ai-macro-estimation';
import { useAuth } from '@/hooks/useAuth'; 
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Textarea } from '@/components/ui/textarea';

export default function VoiceLogging() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<EstimateMacrosOutput & { description: string } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth(); 

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
          setIsRecording(false);
        }
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
      }

      recognitionRef.current.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
            toast({
              variant: 'destructive',
              title: 'Speech Recognition Error',
              description: event.error,
            });
        }
        setIsRecording(false);
      };
    } else {
      console.warn("Speech Recognition not supported by this browser.");
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [toast]);

  const handleAnalysis = async () => {
    if (!transcript) {
        toast({
            variant: 'destructive',
            title: 'No Description',
            description: 'Please type or speak a meal description first.',
        });
        return;
    }
    setIsLoading(true);
    setAnalysisResult(null);
    try {
      const result = await estimateMacros({ mealDescription: transcript });
      if (isNaN(result.estimatedKcal)) {
        throw new Error("AI failed to return valid numbers.");
      }
      setAnalysisResult({ ...result, description: transcript });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: 'Could not analyze the meal description. Please try rephrasing.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
        toast({
            variant: 'destructive',
            title: 'Browser Not Supported',
            description: 'Your browser does not support the required voice APIs.',
        });
        return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      handleCancel();
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSaveMeal = async () => {
    if (!analysisResult || !user) return;
    
    const db = getFirestore();
    try {
      await addDoc(collection(db, "meals"), {
        userId: user.uid,
        createdAt: serverTimestamp(),
        description: analysisResult.description,
        source: 'voice', // can be text or voice
        mealCategory: 'unknown', // This simplified flow doesn't categorize
        totalMacros: {
            caloriesKcal: analysisResult.estimatedKcal,
            proteinG: analysisResult.estimatedProteinGrams,
            carbohydrateG: analysisResult.estimatedCarbGrams,
            fatG: analysisResult.estimatedFatGrams
        },
        items: [{
            name: analysisResult.description,
            macros: {
                caloriesKcal: analysisResult.estimatedKcal,
                proteinG: analysisResult.estimatedProteinGrams,
                carbohydrateG: analysisResult.estimatedCarbGrams,
                fatG: analysisResult.estimatedFatGrams
            }
        }]
      });
      toast({
        title: 'Meal Saved!',
        description: `Your meal has been added to your log.`,
      });
      handleCancel();
    } catch (error) {
      console.error("Error saving meal: ", error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save your meal. Please try again.',
      });
    }
  };

  const handleCancel = () => {
    setAnalysisResult(null);
    setTranscript('');
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log with Text or Voice</CardTitle>
        <CardDescription>
          Type or speak a description of your meal and let AI do the rest.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analysisResult ? (
          <div className="space-y-4">
            <Textarea 
              placeholder="e.g., 'For breakfast I had two scrambled eggs, a slice of whole wheat toast with avocado, and a black coffee.'"
              rows={5}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              disabled={isLoading || isRecording}
            />
            <div className="flex items-center justify-center gap-4">
               <Button
                  onClick={handleAnalysis}
                  disabled={isLoading || isRecording || !transcript}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Bot className="mr-2 h-4 w-4" />
                  )}
                  Analyze Meal
                </Button>
                <p className="text-sm text-muted-foreground">or</p>
                <Button
                    size="icon"
                    className={`rounded-full ${isRecording ? 'bg-red-500 hover:bg-red-600' : ''}`}
                    onClick={toggleRecording}
                    disabled={isLoading}
                    title="Log with voice"
                >
                    <Mic className="h-5 w-5" />
                </Button>
            </div>
            {isRecording && <p className="text-center text-sm text-primary">Listening...</p>}
          </div>
        ) : (
          <Card className="text-left">
            <CardHeader>
              <CardTitle>Confirm Your Meal</CardTitle>
              <CardDescription>{analysisResult.description}</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Calories</p>
                        <p className="text-2xl font-bold">{Math.round(analysisResult.estimatedKcal)}</p>
                        <p className="text-xs text-muted-foreground">kcal</p>
                    </div>
                     <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Protein</p>
                        <p className="text-2xl font-bold">{Math.round(analysisResult.estimatedProteinGrams)}</p>
                        <p className="text-xs text-muted-foreground">grams</p>
                    </div>
                     <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Carbs</p>
                        <p className="text-2xl font-bold">{Math.round(analysisResult.estimatedCarbGrams)}</p>
                        <p className="text-xs text-muted-foreground">grams</p>
                    </div>
                     <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Fat</p>
                        <p className="text-2xl font-bold">{Math.round(analysisResult.estimatedFatGrams)}</p>
                        <p className="text-xs text-muted-foreground">grams</p>
                    </div>
               </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSaveMeal} disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" /> Save Meal
              </Button>
            </CardFooter>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
