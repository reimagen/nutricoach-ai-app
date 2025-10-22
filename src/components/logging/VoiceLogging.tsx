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
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth hook
import { getFirestore, collection, addDoc } from "firebase/firestore"; // Import firestore functions

export default function VoiceLogging() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<VoiceMealLoggingOutput | null>(null);
  const [isAwaitingClarification, setIsAwaitingClarification] = useState(false);
  const [originalTranscript, setOriginalTranscript] = useState('');
  const { toast } = useToast();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { user } = useAuth(); // Get the current user


  const recognitionRef = useRef<any>(null);

  const speak = async (text: string) => {
    try {
      const { media } = await textToSpeech(text);
      setAudioUrl(media);
    } catch (error) {
       console.error('Error generating speech:', error);
       toast({
         variant: 'destructive',
         title: 'Speech Generation Failed',
         description: 'Could not generate audio for the response.',
       });
       // Fallback to browser's built-in speech synthesis
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        }
    }
  };

  useEffect(() => {
    if (audioUrl && audioRef.current) {
        audioRef.current.play().catch(e => console.error("Audio playback failed", e));
    }
  }, [audioUrl]);


  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && 'speechSynthesis' in window) {
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
        description: 'Your browser does not support the required voice APIs.',
      });
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      // Ensure any speaking is stopped when the component unmounts
      if (audioRef.current) {
        audioRef.current.pause();
        setAudioUrl(null);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [toast]);

  const handleAnalysis = async (textToAnalyze: string) => {
    if (!textToAnalyze) return;
    setIsLoading(true);
    if (isAwaitingClarification) {
      setAnalysisResult(null);
    }
    try {
      const result = await voiceMealLogging({ speechText: textToAnalyze });
      
      // Make the AI speak its response!
      await speak(result.mealDescription);
      
      setAnalysisResult(result);
      if (result.mealCategory === 'unknown') {
        setIsAwaitingClarification(true);
        setOriginalTranscript(textToAnalyze);
      } else {
        setIsAwaitingClarification(false);
        setOriginalTranscript('');
      }
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
      // STOP recording
      recognitionRef.current.stop();
      setIsRecording(false);
       // Stop any speaking that might be happening
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (isAwaitingClarification) {
        const combinedTranscript = `${originalTranscript}. The user clarified that this was for ${transcript}.`;
        handleAnalysis(combinedTranscript);
      } else {
        if (transcript) {
          handleAnalysis(transcript);
        }
      }
    } else {
      // START recording
      if (!isAwaitingClarification) {
        setAnalysisResult(null);
        setTranscript('');
        setOriginalTranscript('');
      } else {
        setTranscript('');
      }
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
        createdAt: new Date(),
        ...analysisResult,
      });
      toast({
        title: 'Meal Saved!',
        description: `Your ${analysisResult.mealCategory} has been added to your log.`,
      });
      setAnalysisResult(null);
      setTranscript('');
      setOriginalTranscript('');
      setIsAwaitingClarification(false);
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
    setOriginalTranscript('');
    setIsAwaitingClarification(false);
    if (audioRef.current) {
        audioRef.current.pause();
    }
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log with your voice</CardTitle>
        <CardDescription>
          {isAwaitingClarification
            ? 'The AI is waiting for your answer. Click the mic to respond.'
            : 'Click the microphone, describe your meal, and let AI do the rest.'}
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
        <p className="min-h-[2rem] text-muted-foreground">{isRecording ? 'Listening...' : (isAwaitingClarification ? 'Click to answer' : 'Click to start recording')}</p>

        {transcript && !analysisResult && (
          <p className="text-lg p-4 bg-muted rounded-md">{transcript}</p>
        )}

        {isLoading && !analysisResult && !isAwaitingClarification && (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Analyzing your meal...</p>
          </div>
        )}

        {analysisResult && (
          <Card className="text-left">
            <CardHeader>
              <CardTitle>Confirm Your Meal</CardTitle>
              <CardDescription>{analysisResult.mealDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {analysisResult.items.map((item, index) => (
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
                  <span>{analysisResult.totalMacros.caloriesKcal}kcal</span>
                  <span>{analysisResult.totalMacros.proteinG}g P</span>
                  <span>{analysisResult.totalMacros.carbohydrateG}g C</span>
                  <span>{analysisResult.totalMacros.fatG}g F</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSaveMeal} disabled={isAwaitingClarification || isLoading}>
                <Save className="mr-2 h-4 w-4" /> Save Meal
              </Button>
            </CardFooter>
          </Card>
        )}
        {audioUrl && <audio ref={audioRef} src={audioUrl} className="hidden" />}
      </CardContent>
    </Card>
  );
}
