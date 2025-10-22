'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2, Save, X } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { photoMealLogging, PhotoMealLoggingOutput } from '@/ai/flows/photo-meal-logging';
import Image from 'next/image';

export default function PhotoLogging() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PhotoMealLoggingOutput | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalysisResult(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalysis = async () => {
    if (!previewUrl) return;
    setIsLoading(true);
    try {
      const result = await photoMealLogging({ photoDataUri: previewUrl });
      setAnalysisResult(result);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: 'Could not analyze the meal photo.',
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
      description: `Your meal has been added to your log.`,
    });
    resetState();
  };

  const resetState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log with a photo</CardTitle>
        <CardDescription>
          Upload a photo of your meal and let AI estimate the macros.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          ref={fileInputRef}
        />
        {!previewUrl && (
            <div
                className="flex justify-center items-center flex-col gap-4 border-2 border-dashed border-muted-foreground/50 rounded-lg p-12 cursor-pointer hover:bg-muted"
                onClick={() => fileInputRef.current?.click()}
            >
                <Camera className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">Click to upload a photo</p>
            </div>
        )}
        
        {previewUrl && (
          <div className="relative w-full aspect-video rounded-md overflow-hidden">
            <Image src={previewUrl} alt="Meal preview" layout="fill" objectFit="cover" />
          </div>
        )}
        
        {selectedFile && !analysisResult && (
          <Button onClick={handleAnalysis} disabled={isLoading} className="w-full">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Analyze Meal
          </Button>
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
                </CardHeader>
                <CardContent>
                    <p className="font-semibold">Identified Items:</p>
                    <ul className="list-disc list-inside text-muted-foreground">
                        {analysisResult.foodItems.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                    <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                        <p><strong>Calories:</strong> {analysisResult.macroEstimates.calories} kcal</p>
                        <p><strong>Protein:</strong> {analysisResult.macroEstimates.protein} g</p>
                        <p><strong>Carbs:</strong> {analysisResult.macroEstimates.carbs} g</p>
                        <p><strong>Fat:</strong> {analysisResult.macroEstimates.fat} g</p>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline" onClick={resetState}>
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
