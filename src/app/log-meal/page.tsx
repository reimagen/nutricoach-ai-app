import AppLayout from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PhotoLogging from '@/components/logging/PhotoLogging';
import VoiceLogging from '@/components/logging/VoiceLogging';
import { Mic, Camera } from 'lucide-react';

export default function LogMealPage() {
  return (
    <AppLayout>
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Log Your Meal
        </h1>
      </div>
      <p className="text-muted-foreground">
        Log meals naturally — by speaking or snapping a photo.
      </p>
      <div className="mt-6">
        <Tabs defaultValue="voice" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="voice">
              <Mic className="mr-2 h-4 w-4" />
              Voice Logging
            </TabsTrigger>
            <TabsTrigger value="photo">
              <Camera className="mr-2 h-4 w-4" />
              Photo Logging
            </TabsTrigger>
          </TabsList>
          <TabsContent value="voice">
            <VoiceLogging />
          </TabsContent>
          <TabsContent value="photo">
            <PhotoLogging />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
