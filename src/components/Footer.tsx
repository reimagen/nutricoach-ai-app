import React from 'react';
import { useVoiceAgent } from '../hooks/useVoiceAgent';
import { TranscriptEntry } from '../state/AppState';

interface FooterProps {
  agent: ReturnType<typeof useVoiceAgent>;
  transcript: TranscriptEntry[];
}

export const Footer: React.FC<FooterProps> = ({ agent, transcript }) => {
  const lastUserEntry = transcript.filter(entry => entry.source === 'user').pop();

  return (
    <footer className="p-4 bg-gray-100 border-t border-gray-200">
      <div className="flex items-center justify-center">
        <button
          onClick={() => agent.isConnected ? agent.disconnect() : agent.connect()}
          className={`px-6 py-3 text-white font-bold rounded-full transition-colors duration-200 ${
            agent.isConnected ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
          }`}>
          {agent.isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </div>
      {lastUserEntry && (
        <div className="mt-2 text-center text-gray-600">
          <p><strong>You said:</strong> {lastUserEntry.text}</p>
        </div>
      )}
    </footer>
  );
};