
import { calculateBMR } from '../calculateBMR';
import { UserProfile } from '@/types/user';

describe('calculateBMR', () => {
  it('should calculate BMR correctly for a male user with metric units', () => {
    const userProfile: UserProfile = {
      age: 30,
      gender: 'male',
      weight: 80,
      height: 180,
      unit: 'metric',
    };
    // Mifflin-St Jeor Equation: (10 * 80) + (6.25 * 180) - (5 * 30) + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(calculateBMR(userProfile)).toBe(1780);
  });

  it('should calculate BMR correctly for a female user with imperial units', () => {
    const userProfile: UserProfile = {
      age: 25,
      gender: 'female',
      weight: 135, // lbs
      height: 65, // inches
      unit: 'imperial',
    };
    // Convert to metric: weight = 135 * 0.453592 = 61.23492 kg, height = 65 * 2.54 = 165.1 cm
    // Mifflin-St Jeor Equation: (10 * 61.23492) + (6.25 * 165.1) - (5 * 25) - 161 = 612.3492 + 1031.875 - 125 - 161 = 1358.2242
    // Rounded = 1358
    expect(calculateBMR(userProfile)).toBe(1358);
  });

  it('should use the female formula as a default for \'other\' gender', () => {
    const userProfile: UserProfile = {
      age: 25,
      gender: 'other',
      weight: 135, // lbs
      height: 65, // inches
      unit: 'imperial',
    };
    // The expected value should be the same as the female calculation
    // Convert to metric: weight = 135 * 0.453592 = 61.23492 kg, height = 65 * 2.54 = 165.1 cm
    // Mifflin-St Jeor Equation (Female): (10 * 61.23492) + (6.25 * 165.1) - (5 * 25) - 161 = 1358.2242
    // Rounded = 1358
    expect(calculateBMR(userProfile)).toBe(1358);
  });

  it('should return 0 if weight is missing', () => {
    const userProfile: Partial<UserProfile> = {
      age: 30,
      gender: 'male',
      height: 180,
      unit: 'metric',
    };
    expect(calculateBMR(userProfile as UserProfile)).toBe(0);
  });

  it('should return 0 if height is missing', () => {
    const userProfile: Partial<UserProfile> = {
      age: 30,
      gender: 'male',
      weight: 80,
      unit: 'metric',
    };
    expect(calculateBMR(userProfile as UserProfile)).toBe(0);
  });

  it('should return 0 if age is missing', () => {
    const userProfile: Partial<UserProfile> = {
      gender: 'male',
      weight: 80,
      height: 180,
      unit: 'metric',
    };
    expect(calculateBMR(userProfile as UserProfile)).toBe(0);
  });

  it('should return 0 if gender is missing', () => {
    const userProfile: Partial<UserProfile> = {
      age: 30,
      weight: 80,
      height: 180,
      unit: 'metric',
    };
    expect(calculateBMR(userProfile as UserProfile)).toBe(0);
  });
});
