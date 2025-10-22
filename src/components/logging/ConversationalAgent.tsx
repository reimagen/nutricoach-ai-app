'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { conversationalMealLogging } from '@/ai/flows/conversational-meal-logging';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { Bot, Mic, User } from 'lucide-react';

enum ListeningState {
  IDLE, // Not listening, waiting for user to start
  LISTENING, // Actively listening for user input
  PROCESSING, // AI is processing the input
  RESPONDING, // AI is speaking
}

export default function ConversationalAgent() {
  const [listeningState, setListeningState] = useState(ListeningState.IDLE);
  const [conversation, setConversation] = useState<{ actor: 'user' | 'ai'; text: string }[]>([]);
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const conversationHistoryRef = useRef<string[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef<string>('');

  const speak = async (text: string) => {
    setListeningState(ListeningState.RESPONDING);
    try {
      // Use the existing text-to-speech flow
      const { media } = await textToSpeech(text);
      if (audioRef.current) {
        audioRef.current.src = media;
        audioRef.current.play();
      }
      setConversation(prev => [...prev, { actor: 'ai', text: text }]);
      conversationHistoryRef.current.push(`AI: ${text}`);
    } catch (error) {
      console.error('Error generating speech:', error);
      toast({
        variant: 'destructive',
        title: 'Speech Generation Failed',
        description: 'Could not generate audio for the response.',
      });
      // Even if speech fails, go back to listening
      setListeningState(ListeningState.LISTENING);
    }
  };

  const handleQuery = async (query: string) => {
    if (!query) {
      setListeningState(ListeningState.LISTENING);
      return;
    }
    setListeningState(ListeningState.PROCESSING);
    setConversation(prev => [...prev, { actor: 'user', text: query }]);
    conversationHistoryRef.current.push(`User: ${query}`);

    try {
      const result = await conversationalMealLogging({
        userQuery: query,
        conversationHistory: conversationHistoryRef.current,
      });

      await speak(result.response);

      if (result.isEndOfConversation) {
        conversationHistoryRef.current = [];
        // The onended audio event will handle transitioning back to listening
      }

    } catch (error) {
      console.error('Error in conversational flow:', error);
      await speak("Sorry, I ran into an issue. Let's try that again.");
    }
  };

  const processSpeech = (event: any) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    let interimTranscript = '';
    finalTranscriptRef.current = '';

    for (let i = 0; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscriptRef.current += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    
    // You could update the UI with the interim transcript here if desired

    if (finalTranscriptRef.current) {
        handleQuery(finalTranscriptRef.current.trim());
    } else {
        // If there's no final transcript, set a timer to process the interim one after a pause.
        // This handles cases where the user pauses mid-sentence.
        silenceTimerRef.current = setTimeout(() => {
            if (interimTranscript.trim()) {
                handleQuery(interimTranscript.trim());
            } else if (listeningState === ListeningState.LISTENING) {
                // If there's truly no speech, just keep listening
            }
        }, 1200); // 1.2 seconds of silence triggers processing
    }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        variant: 'destructive',
        title: 'Browser Not Supported',
        description: 'Your browser does not support the Web Speech API.',
      });
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.continuous = true; // Keep listening even after user pauses
    recognition.interimResults = true;

    recognition.onresult = processSpeech;

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
        toast({
          variant: "destructive",
          title: "Voice Error",
          description: `An error occurred: ${event.error}. Please try again.`
        });
        setListeningState(ListeningState.IDLE);
        recognition.stop();
      }
    };
    
    recognition.onend = () => {
        // If the service stops for any reason and we weren't trying to stop it, restart it.
        if (listeningState !== ListeningState.IDLE && listeningState !== ListeningState.PROCESSING) {
           try {
               recognition.start();
           } catch(e) {
               // This can happen if the user navigates away
               console.error("Could not restart recognition service.", e);
               setListeningState(ListeningState.IDLE);
           }
        }
    };

    if (audioRef.current) {
        audioRef.current.onended = () => {
            // After AI is done speaking, immediately go back to listening
            setListeningState(ListeningState.LISTENING);
        };
    }

    // Cleanup function
    return () => {
      recognition?.stop();
      if (audioRef.current) audioRef.current.pause();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run this once


  const toggleConversation = () => {
    if (listeningState === ListeningState.IDLE) {
      setListeningState(ListeningState.LISTENING);
      recognitionRef.current.start();
      setConversation([]);
      conversationHistoryRef.current = [];
      toast({ title: 'Conversation started.', description: "I'm listening." });
    } else {
      setListeningState(ListeningState.IDLE);
      recognitionRef.current.stop();
      if (audioRef.current) audioRef.current.pause();
      toast({ title: 'Conversation ended.' });
    }
  };

  const getStatus = () => {
      switch(listeningState) {
          case ListeningState.IDLE:
              return "Click the mic to start a conversation.";
          case ListeningState.LISTENING:
              return `Listening... Speak when you're ready.`;
          case ListeningState.PROCESSING:
              return "Thinking...";
          case ListeningState.RESPONDING:
              return "Responding...";
          default:
              return "Click the mic to begin."
      }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversational Logging</CardTitle>
        <CardDescription>
          Have a natural, hands-free conversation to log your meals. No wake word needed after starting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <div className="flex justify-center">
            <button
                className={`h-24 w-24 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out
                    ${listeningState === ListeningState.LISTENING ? 'bg-green-500 text-white shadow-lg scale-110' 
                    : listeningState !== ListeningState.IDLE ? 'bg-blue-500 text-white'
                    : 'bg-muted text-muted-foreground'}`}
                onClick={toggleConversation}
            >
                <Mic className="h-10 w-10" />
            </button>
        </div>
        <p className="min-h-[2rem] text-muted-foreground">{getStatus()}</p>
        
        <div className="space-y-4 pt-4 text-left max-h-96 overflow-y-auto pr-4">
            {conversation.map((entry, index) => (
                <div key={index} className={`flex items-start gap-3 ${entry.actor === 'user' ? 'justify-end' : ''}`}>
                    {entry.actor === 'ai' && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Bot className="h-5 w-5" />
                        </div>
                    )}
                    <div className={`rounded-lg p-3 max-w-[80%] shadow-sm ${entry.actor === 'ai' ? 'bg-muted' : 'bg-accent text-accent-foreground'}`}>
                        <p>{entry.text}</p>
                    </div>
                     {entry.actor === 'user' && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                            <User className="h-5 w-5" />
                        </div>
                    )}
                </div>
            ))}
        </div>

        <audio ref={audioRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
