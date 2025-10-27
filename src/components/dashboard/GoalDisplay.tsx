'use client';

import { GOAL_TYPE_DETAILS } from '@/constants/goals';
import { UserGoal } from '@/types';

interface GoalDisplayProps {
  goalType?: UserGoal['type'];
}

// A simple map to create more user-friendly goal descriptions for the UI.
const goalPhrases: { [key in UserGoal['type']]: string } = {
  'weight-loss': 'losing weight',
  'weight-gain': 'gaining weight',
  'muscle-gain': 'building muscle',
  maintenance: 'maintaining your current weight',
};

export const GoalDisplay = ({ goalType }: GoalDisplayProps) => {
  if (!goalType || !goalPhrases[goalType]) {
    return null;
  }

  const goalPhrase = goalPhrases[goalType];
  const strategy = GOAL_TYPE_DETAILS[goalType].calculationStrategy;

  let message;
  if (strategy === 'bodyweight') {
    message = `This daily macro split is optimized for your goal of ${goalPhrase}, with a protein target based on your bodyweight.`;
  } else {
    message = `This daily macro split is based on your goal of ${goalPhrase}.`;
  }

  return (
    <div className="text-center text-sm text-muted-foreground -mt-2">
      <p>{message}</p>
    </div>
  );
};
