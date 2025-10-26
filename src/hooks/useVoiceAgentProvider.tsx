'use client';

import React, { createContext, useContext } from 'react';
import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import type { VoiceAgentState } from '@/hooks/useVoiceAgent';

const VoiceAgentContext = createContext<VoiceAgentState | undefined>(undefined);

export const VoiceAgentProvider = ({ children }: { children: React.ReactNode }) => {
  const agentState = useVoiceAgent();

  return (
    <VoiceAgentContext.Provider value={agentState}>
      {children}
    </VoiceAgentContext.Provider>
  );
};

export const useSharedVoiceAgent = () => {
  const context = useContext(VoiceAgentContext);
  if (context === undefined) {
    throw new Error('useSharedVoiceAgent must be used within a VoiceAgentProvider');
  }
  return context;
};
