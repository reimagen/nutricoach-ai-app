import React from 'react';
import { AppState } from '../state/AppState';
import { useVoiceAgent } from '../hooks/useVoiceAgent';
import { AppAction } from '../state/actions';

interface MainProps {
  state: AppState;
  agent: ReturnType<typeof useVoiceAgent>;
  dispatch: React.Dispatch<AppAction>;
}

export const Main: React.FC<MainProps> = ({ state, agent, dispatch }) => {
  return (
    <main className="flex-grow p-4 overflow-y-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold">MacroMate</h1>
        <p className="text-lg text-gray-600">Your AI-powered nutrition coach</p>
      </div>
      <div className="mt-8">
        <h2 className="text-2xl font-bold">Conversation</h2>
        <div className="mt-4 space-y-4">
          {state.transcript.map((entry, index) => (
            <div key={index} className={`p-4 rounded-lg ${
              entry.source === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-900'
            }`}>
              <p><strong>{entry.source === 'user' ? 'You' : 'MacroMate'}:</strong> {entry.text}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};