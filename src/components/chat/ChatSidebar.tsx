'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSharedVoiceAgent } from '@/hooks/useVoiceAgentProvider';
import { Mic, SendHorizonal, Bot, User, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ChatSidebar() {
  const agent = useSharedVoiceAgent();
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [agent.transcript]);

  const handleSend = () => {
    if (inputValue.trim()) {
      agent.sendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleMicClick = () => {
    if (agent.isConnected) {
      agent.disconnect();
    } else {
      agent.connect();
    }
  };

  const getMicButtonClass = () => {
    if (agent.status === 'connecting') return 'bg-yellow-500 hover:bg-yellow-600';
    if (agent.isConnected) return 'bg-red-500 hover:bg-red-600';
    return 'bg-blue-500 hover:bg-blue-600';
  };

  const getStatusBadge = () => {
    switch (agent.status) {
      case 'idle':
        return <Badge variant="outline">Idle</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-500 text-white">Connecting...</Badge>;
      case 'listening':
        return <Badge className="bg-blue-500 text-white">Listening...</Badge>;
      case 'thinking':
        return <Badge className="bg-purple-500 text-white">Thinking...</Badge>;
      default:
        return null;
    }
  };

  return (
    <aside className="w-full lg:w-96 flex flex-col bg-slate-50 border-l border-slate-200 h-full">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center">
        <h2 className="text-xl font-bold font-headline">AI Agent</h2>
        {getStatusBadge()}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {agent.transcript.map((entry, index) => (
          <div key={index} className={cn('flex items-start gap-3', { 'justify-end': entry.source === 'user' })}>
            {entry.source === 'agent' && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <Bot size={20} />
              </div>
            )}
            <div className={cn('p-3 rounded-lg max-w-xs', {
              'bg-slate-200 text-slate-800': entry.source === 'user',
              'bg-white border border-slate-200': entry.source === 'agent'
            })}>
              <p className="text-sm">{entry.text}</p>
            </div>
            {entry.source === 'user' && (
               <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-slate-100">
                <User size={20} />
              </div>
            )}
          </div>
        ))}
         {agent.isProcessing && (
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <Bot size={20} />
                </div>
                <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
            </div>
        )}
      </div>
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex items-center bg-slate-100 rounded-full p-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-grow bg-transparent px-4 focus:outline-none text-slate-800 text-sm"
            disabled={agent.isConnected}
          />
          <button
            onClick={handleSend}
            className="p-3 text-white bg-green-500 rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!inputValue.trim() || agent.isConnected}
          >
            <SendHorizonal size={20} />
          </button>
          <button
            onClick={handleMicClick}
            className={`p-3 text-white rounded-full ml-2 transition-colors duration-200 ${getMicButtonClass()}`}
          >
            <Mic size={20} />
          </button>
        </div>
      </div>
    </aside>
  );
}
