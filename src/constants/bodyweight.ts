/**
 * This file contains constants related to bodyweight-based protein calculations.
 * The values are expressed in grams of protein per kilogram of bodyweight.
 */

interface ProteinTarget {
  target: number;
}

/**
 * Protein targets for various fitness goals, based on grams per kilogram of bodyweight.
 */
export const GOAL_BASED_PROTEIN_TARGETS: { [key: string]: ProteinTarget } = {
  'weight-loss': {
    target: 1.8,
  },
  'muscle-gain': {
    target: 1.6,
  },
  maintenance: {
    target: 1.2,
  },
};

/**
 * Fallback default protein target if a specific goal is not recognized.
 */
export const DEFAULT_PROTEIN_TARGET: ProteinTarget = {
  target: 1.2,
};
