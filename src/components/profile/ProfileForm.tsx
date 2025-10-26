
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateUser } from '@/lib/api/user';
import { UserProfile, UserGoal, BodyweightGoal } from '@/types';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  age: z.coerce.number().int().positive(),
  gender: z.enum(['male', 'female', 'other']),
  units: z.enum(['metric', 'imperial']).default('imperial'),
  height: z.coerce.number().positive(),
  weight: z.coerce.number().positive(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'veryActive']),
  goalType: z.enum(['weight-loss', 'maintenance', 'weight-gain', 'muscle-gain']),
  proteinPerBodyweight: z.coerce.number().positive(),
  remainingCarbs: z.coerce.number().min(0).max(100),
  remainingFat: z.coerce.number().min(0).max(100),
}).refine(data => data.remainingCarbs + data.remainingFat === 100, {
  message: "Carbs and Fat percentages must add up to 100",
  path: ["remainingCarbs"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const GOAL_ADJUSTMENT_PERCENTAGES = {
  'weight-loss': -0.20,
  'weight-gain': 0.15,
  'muscle-gain': 0.10,
  'maintenance': 0,
};

export default function ProfileForm() {
  const { user, loading, forceReload } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const bodyweightGoal = user?.userGoal?.calculationStrategy === 'bodyweight' ? user.userGoal as BodyweightGoal : undefined;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.userProfile?.name || '',
      age: user?.userProfile?.age || 0,
      gender: user?.userProfile?.gender || 'male',
      units: user?.userProfile?.units || 'imperial',
      height: user?.userProfile?.height || 0,
      weight: user?.userProfile?.weight || 0,
      activityLevel: user?.userProfile?.activityLevel || 'sedentary',
      goalType: user?.userGoal?.type || 'maintenance',
      proteinPerBodyweight: bodyweightGoal?.proteinPerBodyweight || 2.2,
      remainingCarbs: (bodyweightGoal?.remainingSplit?.carbs || 0.5) * 100,
      remainingFat: (bodyweightGoal?.remainingSplit?.fat || 0.5) * 100,
    },
  });

  async function onSubmit(data: ProfileFormValues) {
    if (!user) return;

    setError(null);
    setSuccess(null);

    const userProfile: UserProfile = {
        name: data.name,
        age: data.age,
        gender: data.gender,
        units: data.units,
        height: data.height,
        weight: data.weight,
        activityLevel: data.activityLevel,
    };

    const adjustmentPercentage = GOAL_ADJUSTMENT_PERCENTAGES[data.goalType];

    const userGoal: BodyweightGoal = {
        type: data.goalType,
        calculationStrategy: 'bodyweight',
        proteinPerBodyweight: data.proteinPerBodyweight,
        remainingSplit: {
            carbs: data.remainingCarbs / 100,
            fat: data.remainingFat / 100,
        },
        adjustmentPercentage,
    };

    try {
      await updateUser(user.uid, { userProfile, userGoal });
      forceReload();
      setSuccess("Your profile has been updated successfully!");
    } catch (error) {
      console.error("Error saving user data:", error);
      setError("There was an error updating your profile. Please try again.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert variant="success">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Age</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="25" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a gender" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="units"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Units</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select units" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="imperial">Imperial (lbs, in)</SelectItem>
                        <SelectItem value="metric">Metric (kg, cm)</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Height</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="70" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Weight</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="150" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <FormField
          control={form.control}
          name="activityLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activity Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your activity level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary (little or no exercise)</SelectItem>
                  <SelectItem value="light">Lightly active (light exercise/sports 1-3 days/week)</SelectItem>
                  <SelectItem value="moderate">Moderately active (moderate exercise/sports 3-5 days/week)</SelectItem>
                  <SelectItem value="active">Active (hard exercise/sports 6-7 days a week)</SelectItem>
                  <SelectItem value="veryActive">Very active (very hard exercise/physical job)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="goalType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fitness Goal</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your primary goal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="weight-loss">Weight Loss</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="weight-gain">Weight Gain</SelectItem>
                  <SelectItem value="muscle-gain">Muscle Gain</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
            <h3 class="text-lg font-medium">Bodyweight-Based Macro Calculation</h3>
            <FormField
                control={form.control}
                name="proteinPerBodyweight"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Protein per Bodyweight (g/kg or g/lb)</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="2.2" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                    control={form.control}
                    name="remainingCarbs"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Remaining Carbs (%)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="50" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="remainingFat"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Remaining Fat (%)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="50" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>

        <Button type="submit" disabled={loading}>Update Profile</Button>
      </form>
    </Form>
  );
}
