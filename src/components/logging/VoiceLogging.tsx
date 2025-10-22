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
import { voiceMealLogging, VoiceMealLoggingOutput } from '@/ai/flows/voice-meal-logging';
// This server action would save the meal to Firestore
// import { saveMealEntry } from '@/lib/actions';

export default function VoiceLogging() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<VoiceMealLoggingOutput | null>(null);
  const { toast } = useToast();

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
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
        setTranscript(finalTranscript + interimTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        toast({
          variant: 'destructive',
          title: 'Speech Recognition Error',
          description: event.error,
        });
        setIsRecording(false);
      };
    } else {
        toast({
          variant: 'destructive',
          title: 'Browser Not Supported',
          description: 'Your browser does not support voice recognition.',
        });
    }

    return () => {
        if(recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }
  }, [toast]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      if (transcript) handleAnalysis();
    } else {
      setTranscript('');
      setAnalysisResult(null);
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };
  
  const handleAnalysis = async () => {
    if (!transcript) return;
    setIsLoading(true);
    try {
      const result = await voiceMealLogging({ speechText: transcript });
      setAnalysisResult(result);
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

  const handleSaveMeal = async () => {
    if (!analysisResult) return;
    // await saveMealEntry({ ... }); // Server action call
    toast({
      title: 'Meal Saved!',
      description: `${analysisResult.mealDescription} has been added to your log.`,
    });
    setAnalysisResult(null);
    setTranscript('');
  };
  
  const handleCancel = () => {
      setAnalysisResult(null);
      setTranscript('');
  }

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
          <Mic className="h-8 w-8" />
        </Button>
        <p className="min-h-[2rem] text-muted-foreground">{isRecording ? "Listening..." : "Click to start recording"}</p>
        
        {transcript && !analysisResult && (
          <p className="text-lg p-4 bg-muted rounded-md">{transcript}</p>
        )}
        
        {isLoading && (
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Analyzing your meal...</p>
            </div>
        )}

        {analysisResult && (
            <Card className="text-left">
                <CardHeader>
                    <CardTitle>Confirm Your Meal</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="font-semibold">{analysisResult.mealDescription}</p>
                    <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                        <p><strong>Calories:</strong> {analysisResult.estimatedMacros.caloriesKcal} kcal</p>
                        <p><strong>Protein:</strong> {analysisResult.estimatedMacros.proteinG} g</p>
                        <p><strong>Carbs:</strong> {analysisResult.estimatedMacros.carbohydrateG} g</p>
                        <p><strong>Fat:</strong> {analysisResult.estimatedMacros.fatG} g</p>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleCancel}>
                        <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button onClick={handleSaveMeal}>
                        <Save className="mr-2 h-4 w-4" /> Save Meal
                    </Button>
                </CardFooter>
            </Card>
        )}
      </CardContent>
    </Card>
  );
}
