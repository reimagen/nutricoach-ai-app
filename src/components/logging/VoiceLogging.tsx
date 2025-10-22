'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Loader2, Save, X } from 'lucide-react';
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
      recognitionRef.current.continuous = false; // Stop after first final result
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(finalTranscript || interimTranscript);
        if (finalTranscript) {
            handleAnalysis(finalTranscript);
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
      toast({
        variant: 'destructive',
        title: 'Browser Not Supported',
        description: 'Your browser does not support the required voice APIs.',
      });
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const handleAnalysis = async (textToAnalyze: string) => {
    if (!textToAnalyze) return;
    setIsLoading(true);
    setAnalysisResult(null);
    try {
      const result = await estimateMacros({ mealDescription: textToAnalyze });
      setAnalysisResult({ ...result, description: textToAnalyze });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: 'Could not analyze the meal description.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setAnalysisResult(null);
      setTranscript('');
      recognitionRef.current?.start();
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
        source: 'voice',
        mealCategory: 'unknown', // Placeholder as this flow doesn't categorize
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
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log with your voice</CardTitle>
        <CardDescription>
          Click the microphone, describe your meal, and let AI do the rest.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <Button
          size="lg"
          className={`h-20 w-20 rounded-full ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary'}`}
          onClick={toggleRecording}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Mic className="h-8 w-8" />}
        </Button>
        <p className="min-h-[2rem] text-muted-foreground">
          {isRecording ? 'Listening...' : 'Click to start recording'}
        </p>

        {(transcript && !analysisResult) && (
          <p className="text-lg p-4 bg-muted rounded-md">{transcript}</p>
        )}
        
        {isLoading && !analysisResult && (
           <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Analyzing your meal...</p>
          </div>
        )}

        {analysisResult && (
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
