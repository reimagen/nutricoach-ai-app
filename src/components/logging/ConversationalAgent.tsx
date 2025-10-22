'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { conversationalMealLogging } from '@/ai/flows/conversational-meal-logging';
import { Bot, Mic, User } from 'lucide-react';

const WAKE_WORD = 'hey nutricoach';

enum ListeningState {
  IDLE, // Not listening
  WAITING_FOR_WAKE_WORD, // Listening for wake word
  LISTENING_FOR_QUERY, // Wake word detected, listening for user's command
  PROCESSING, // AI is thinking
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

  const speak = async (text: string) => {
    setListeningState(ListeningState.RESPONDING);
    try {
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
      setListeningState(ListeningState.WAITING_FOR_WAKE_WORD);
    }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        variant: 'destructive',
        title: 'Browser Not Supported',
        description: 'Your browser does not support the required voice APIs.',
      });
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join('')
        .toLowerCase();
      
      if (listeningState === ListeningState.WAITING_FOR_WAKE_WORD && transcript.includes(WAKE_WORD)) {
        console.log('Wake word detected!');
        setListeningState(ListeningState.LISTENING_FOR_QUERY);
        speak("I'm listening.");
      } else if (listeningState === ListeningState.LISTENING_FOR_QUERY) {
        // Reset silence timer on new speech
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        silenceTimerRef.current = setTimeout(() => {
          const lastIndex = transcript.lastIndexOf(WAKE_WORD);
          const query = lastIndex !== -1 ? transcript.substring(lastIndex + WAKE_WORD.length).trim() : transcript.trim();
          if (query) {
            handleQuery(query);
          }
        }, 1500); // 1.5 seconds of silence to trigger query
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error);
      }
    };
    
    recognitionRef.current.onend = () => {
        // The recognition service can sometimes stop. If we're not idle, restart it.
        if (listeningState !== ListeningState.IDLE) {
           try {
               recognitionRef.current?.start();
           } catch(e) {
               console.error("Could not restart recognition service: ", e);
           }
        }
    };

    if (audioRef.current) {
        audioRef.current.onended = () => {
            // After AI finishes speaking, go back to listening for wake word
            // unless the conversation is over, then it should start listening again
            setListeningState(ListeningState.WAITING_FOR_WAKE_WORD);
        };
    }

    return () => {
      recognitionRef.current?.stop();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listeningState, toast]);

  const handleQuery = async (query: string) => {
    if (!query) {
        setListeningState(ListeningState.WAITING_FOR_WAKE_WORD);
        return;
    };
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
        // Conversation is done, reset history for the next interaction
        conversationHistoryRef.current = [];
        // After speaking, the onended event will set state to WAITING_FOR_WAKE_WORD
      } 
      // If not end of conversation, the onended event will also set state to WAITING_FOR_WAKE_WORD
      // for the next turn.

    } catch (error) {
      console.error('Error in conversational flow:', error);
      await speak("Sorry, I ran into a problem. Please try again.");
    }
  };

  const toggleMainListening = () => {
    if (listeningState === ListeningState.IDLE) {
      setListeningState(ListeningState.WAITING_FOR_WAKE_WORD);
      recognitionRef.current.start();
      setConversation([]);
      conversationHistoryRef.current = [];
      toast({ title: 'Conversational agent activated.', description: `Say "${WAKE_WORD}" to start.` });
    } else {
      setListeningState(ListeningState.IDLE);
      recognitionRef.current.stop();
      toast({ title: 'Conversational agent deactivated.' });
    }
  };

  const getStatus = () => {
      switch(listeningState) {
          case ListeningState.IDLE:
              return "Click the mic to start the conversation.";
          case ListeningState.WAITING_FOR_WAKE_WORD:
              return `Listening for "${WAKE_WORD}"...`;
          case ListeningState.LISTENING_FOR_QUERY:
              return "Listening for your meal details...";
          case ListeningState.PROCESSING:
              return "Thinking...";
          case ListeningState.RESPONDING:
              return "Responding...";
          default:
              return "Click the mic to start."
      }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversational Logging</CardTitle>
        <CardDescription>
          Have a natural conversation with NutriCoach AI to log your meals.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <div className="flex justify-center">
            <button
                className={`h-24 w-24 rounded-full flex items-center justify-center transition-colors
                    ${listeningState !== ListeningState.IDLE ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}
                onClick={toggleMainListening}
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
                    <div className={`rounded-lg p-3 max-w-[80%] ${entry.actor === 'ai' ? 'bg-muted' : 'bg-accent text-accent-foreground'}`}>
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
