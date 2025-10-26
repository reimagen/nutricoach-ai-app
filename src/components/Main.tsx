
'use client';

import React from 'react';
import { useAppContext } from '../context/AppContext';

// This is the correct and final version of this component.
// It takes no props and gets everything it needs from the context.
export const Main: React.FC = () => {
  const { state } = useAppContext(); // Use the context to get the app state

  return (
    <div className="flex-grow p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold">MacroMate</h1>
        <p className="text-lg text-gray-600">Your AI-powered nutrition coach</p>
      </div>
      <div className="mt-8">
        <h2 className="text-2xl font-bold">Conversation</h2>
        <div className="mt-4 space-y-4">
          {state.transcript.map((entry, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${entry.source === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-900'}`}>
              <p>
                <strong>{entry.source === 'user' ? 'You' : 'MacroMate'}:</strong> {entry.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
