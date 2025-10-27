'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { GOAL_TYPE_DETAILS, GOAL_BASED_PROTEIN_TARGETS, TIMEZONES } from "@/constants";
import { updateUser, resetUserProfile } from "@/lib/api/user";
import { useToast } from "@/hooks/use-toast";
import { UserProfile, UserGoal, BodyweightGoal } from "@/types";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  gender: z.enum(['male', 'female', 'other'], { required_error: "Please select a gender." }),
  age: z.coerce.number().min(1, { message: "Please enter a valid age." }),
  height: z.coerce.number().min(1, { message: "Please enter a valid height." }).optional(),
  heightFt: z.coerce.number().optional(),
  heightIn: z.coerce.number().optional(),
  weight: z.coerce.number().min(1, { message: "Please enter a valid weight." }),
  unit: z.enum(['metric', 'imperial'], { required_error: "Please select a unit system." }),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'veryActive'], { required_error: "Please select an activity level." }),
  goalType: z.enum(['weight-loss', 'weight-gain', 'maintenance', 'muscle-gain'], { required_error: "Please select a goal." }),
  timezone: z.string().optional(),
  proteinPerBodyweight: z.coerce.number().optional(),
  remainingCarbs: z.coerce.number().optional(),
  remainingFat: z.coerce.number().optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function useProfileForm() {
  const { user, loading, forceReload } = useAuth();
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);

  const bodyweightGoal = user?.userGoal?.calculationStrategy === 'bodyweight' ? (user.userGoal as BodyweightGoal) : null;
  const initialCarbs = bodyweightGoal?.remainingSplit?.carbs;
  const initialFat = bodyweightGoal?.remainingSplit?.fat;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.userProfile?.name ?? '',
      gender: user?.userProfile?.gender,
      age: user?.userProfile?.age,
      height: user?.userProfile?.height,
      weight: user?.userProfile?.weight,
      unit: user?.userProfile?.unit ?? 'metric',
      activityLevel: user?.userProfile?.activityLevel,
      goalType: user?.userGoal?.type,
      timezone: user?.userProfile?.timezone,
      proteinPerBodyweight: bodyweightGoal?.proteinPerBodyweight,
      remainingCarbs: typeof initialCarbs === 'number' ? initialCarbs * 100 : 50,
      remainingFat: typeof initialFat === 'number' ? initialFat * 100 : 50,
    },
  });

  const { setValue, getValues, reset, watch } = form;

  useEffect(() => {
    if (user) {
      const { userProfile, userGoal } = user;
      const bodyweightGoal = userGoal?.calculationStrategy === 'bodyweight' ? (userGoal as BodyweightGoal) : null;
      let heightFtValue, heightInValue;
      if (userProfile?.unit === 'imperial' && userProfile?.height) {
        heightFtValue = Math.floor(userProfile.height / 12);
        heightInValue = userProfile.height % 12;
      }
      const resetCarbs = bodyweightGoal?.remainingSplit?.carbs;
      const resetFat = bodyweightGoal?.remainingSplit?.fat;
      reset({
        name: userProfile?.name ?? '',
        gender: userProfile?.gender,
        age: userProfile?.age,
        height: userProfile?.height,
        heightFt: heightFtValue,
        heightIn: heightInValue,
        weight: userProfile?.weight,
        unit: userProfile?.unit ?? 'metric',
        activityLevel: userProfile?.activityLevel,
        goalType: userGoal?.type,
        proteinPerBodyweight: bodyweightGoal?.proteinPerBodyweight,
        remainingCarbs: typeof resetCarbs === 'number' ? resetCarbs * 100 : 50,
        remainingFat: typeof resetFat === 'number' ? resetFat * 100 : 50,
        timezone: userProfile?.timezone,
      });
    }
  }, [user, reset]);

  const goalType = watch('goalType');
  const isBodyweightGoal = goalType && GOAL_TYPE_DETAILS[goalType]?.calculationStrategy === 'bodyweight';
  const unit = watch('unit');
  const heightFt = watch('heightFt');
  const heightIn = watch('heightIn');

  useEffect(() => {
    if (unit === 'imperial' && heightFt !== undefined && heightIn !== undefined) {
      const feet = heightFt || 0;
      const inches = heightIn || 0;
      setValue('height', (feet * 12) + inches, { shouldDirty: true, shouldValidate: true });
    }
  }, [heightFt, heightIn, unit, setValue]);
  
  useEffect(() => {
    if (goalType && isBodyweightGoal) {
      const recommendedProtein = GOAL_BASED_PROTEIN_TARGETS[goalType]?.target ?? 1.2;
      setValue('proteinPerBodyweight', recommendedProtein);
    }
  }, [goalType, isBodyweightGoal, setValue]);

  useEffect(() => {
    if (user && !user.userProfile?.timezone) {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detectedTimezone && TIMEZONES.includes(detectedTimezone) && !getValues('timezone')) {
        setValue('timezone', detectedTimezone);
      }
    }
  }, [user, getValues, setValue]);

  async function onSubmit(data: ProfileFormValues) {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }

    let height = data.height;
    if (data.unit === 'imperial') {
        const feet = data.heightFt || 0;
        const inches = data.heightIn || 0;
        height = (feet * 12) + inches;
    }

    const userProfile: UserProfile = {
      name: data.name,
      gender: data.gender,
      age: data.age,
      height,
      weight: data.weight,
      unit: data.unit,
      activityLevel: data.activityLevel,
      timezone: data.timezone,
    };

    const goalDetails = GOAL_TYPE_DETAILS[data.goalType];
    let userGoal: Partial<UserGoal> = { 
      type: data.goalType,
      calculationStrategy: goalDetails.calculationStrategy,
      adjustmentPercentage: goalDetails.adjustmentPercentage,
    };
    
    if (goalDetails.calculationStrategy === 'bodyweight' && isBodyweightGoal && data.proteinPerBodyweight) {
      const bodyweightGoal: Partial<BodyweightGoal> = {
        proteinPerBodyweight: data.proteinPerBodyweight,
        remainingSplit: {
          carbs: (data.remainingCarbs ?? 50) / 100,
          fat: (data.remainingFat ?? 50) / 100,
        },
      };
      userGoal = {...userGoal, ...bodyweightGoal};
    }

    try {
      await updateUser(user.uid, { userProfile, userGoal: userGoal as UserGoal });
      toast({ title: "Success!", description: "Your profile has been updated." });
      forceReload(); 
    } catch (error) {
      console.error("Error updating profile: ", error);
      toast({ title: "Error", description: "Failed to update profile. Please try again.", variant: "destructive" });
    }
  }

  async function handleReset() {
    if (!user) return;
    setIsResetting(true);
    try {
      await resetUserProfile(user.uid);
      await forceReload();
      toast({ title: "Profile Reset", description: "Your profile data has been cleared." });
    } catch (error) {
      console.error("Error resetting profile:", error);
      toast({ title: "Error", description: "Could not reset profile.", variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  }

  return {
    form,
    loading,
    isResetting,
    onSubmit,
    handleReset,
  };
}
