
import { UserGoal } from '@/types';

type GoalType = UserGoal['type'];

interface GoalDetail {
  description: string;
  calculationStrategy: 'calories-percentage-based' | 'bodyweight';
  adjustmentPercentage: number;
}

export const GOAL_TYPES: GoalType[] = ['weight-loss', 'weight-gain', 'muscle-gain', 'maintenance'];

export const GOAL_TYPE_DETAILS: { [key in GoalType]: GoalDetail } = {
  'weight-loss': {
    description: 'Lose weight at a sustainable pace.',
    calculationStrategy: 'calories-percentage-based',
    adjustmentPercentage: -0.20,
  },
  'weight-gain': {
    description: 'Gain weight and build mass.',
    calculationStrategy: 'calories-percentage-based',
    adjustmentPercentage: 0.15,
  },
  'muscle-gain': {
    description: 'Build muscle while minimizing fat gain.',
    calculationStrategy: 'bodyweight',
    adjustmentPercentage: 0.10,
  },
  maintenance: {
    description: 'Maintain your current weight and physique.',
    calculationStrategy: 'calories-percentage-based',
    adjustmentPercentage: 0,
  },
};
