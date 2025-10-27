'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GOAL_TYPES, ACTIVITY_LEVELS, GOAL_TYPE_DETAILS, GOAL_BASED_PROTEIN_TARGETS, TIMEZONES } from "@/constants";
import { updateUser, resetUserProfile } from "@/lib/api/user";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
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

  // Optional fields for bodyweight-based goals
  proteinPerBodyweight: z.coerce.number().optional(),
  remainingCarbs: z.coerce.number().optional(),
  remainingFat: z.coerce.number().optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfileForm() {
  const { user, loading, forceReload } = useAuth();
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      gender: undefined,
      age: undefined,
      height: undefined,
      heightFt: undefined,
      heightIn: undefined,
      weight: undefined,
      unit: 'metric',
      activityLevel: undefined,
      goalType: undefined,
      timezone: undefined,
      proteinPerBodyweight: undefined,
      remainingCarbs: 50, // Default to 50/50 split
      remainingFat: 50,
    },
  });

  const goalType = form.watch('goalType');
  const isBodyweightGoal = goalType && GOAL_TYPE_DETAILS[goalType]?.calculationStrategy === 'bodyweight';

  const carbPercentage = form.watch('remainingCarbs') ?? 50;
  const unit = form.watch('unit');
  const heightFt = form.watch('heightFt');
  const heightIn = form.watch('heightIn');

  useEffect(() => {
    if (unit === 'imperial' && heightFt !== undefined && heightIn !== undefined) {
      const feet = heightFt || 0;
      const inches = heightIn || 0;
      form.setValue('height', (feet * 12) + inches, { shouldDirty: true, shouldValidate: true });
    }
  }, [heightFt, heightIn, unit, form]);
  
  useEffect(() => {
    // Only reset the form if the user's profile data has been loaded
    if (user?.userProfile || user?.userGoal) {
      const { userProfile, userGoal } = user;
      const bodyweightGoal = userGoal?.calculationStrategy === 'bodyweight' ? (userGoal as BodyweightGoal) : null;
  
      let heightFtValue, heightInValue;
      if (userProfile?.unit === 'imperial' && userProfile?.height) {
        heightFtValue = Math.floor(userProfile.height / 12);
        heightInValue = userProfile.height % 12;
      }
  
      form.reset({
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
        remainingCarbs: bodyweightGoal?.remainingSplit?.carbs ? bodyweightGoal.remainingSplit.carbs * 100 : 50,
        remainingFat: bodyweightGoal?.remainingSplit?.fat ? bodyweightGoal.remainingSplit.fat * 100 : 50,
        timezone: userProfile?.timezone,
      });
    }
  }, [user?.userProfile, user?.userGoal, form.reset]);
  
  useEffect(() => {
    if (goalType && isBodyweightGoal) {
      const recommendedProtein = GOAL_BASED_PROTEIN_TARGETS[goalType]?.target ?? 1.2;
      form.setValue('proteinPerBodyweight', recommendedProtein);
    }
  }, [goalType, isBodyweightGoal, form]);

  useEffect(() => {
    // This hook is for auto-detecting and setting the timezone for new users
    // or users who haven't set a timezone yet.
    if (user && !user.userProfile?.timezone) {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // We only set the value if it's not already been set by the user (or form.reset)
      if (detectedTimezone && TIMEZONES.includes(detectedTimezone) && !form.getValues('timezone')) {
        form.setValue('timezone', detectedTimezone);
      }
    }
  }, [user, form]); // Dependencies: user object and form instance

  async function onSubmit(data: ProfileFormValues) {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }

    const {
      name,
      gender,
      age,
      weight,
      unit,
      activityLevel,
      goalType,
      proteinPerBodyweight,
      remainingCarbs,
      remainingFat,
      timezone,
    } = data;
    
    // Recalculate height in case it changed
    let height = data.height;
    if (unit === 'imperial') {
        const feet = data.heightFt || 0;
        const inches = data.heightIn || 0;
        height = (feet * 12) + inches;
    }


    const userProfile: UserProfile = {
      name,
      gender,
      age,
      height,
      weight,
      unit,
      activityLevel,
      timezone,
    };

    const goalDetails = GOAL_TYPE_DETAILS[goalType];
    let userGoal: Partial<UserGoal> = { // Use Partial to build the object
      type: goalType,
      calculationStrategy: goalDetails.calculationStrategy,
      adjustmentPercentage: goalDetails.adjustmentPercentage,
    };
    
    if (goalDetails.calculationStrategy === 'bodyweight' && isBodyweightGoal) {
      if(proteinPerBodyweight) {
        const bodyweightGoal: Partial<BodyweightGoal> = {
          proteinPerBodyweight: proteinPerBodyweight,
          remainingSplit: {
            carbs: (remainingCarbs ?? 50) / 100,
            fat: (remainingFat ?? 50) / 100,
          },
        };
        userGoal = {...userGoal, ...bodyweightGoal};
      }
    }

    try {
      await updateUser(user.uid, { userProfile, userGoal: userGoal as UserGoal });
      toast({ title: "Success!", description: "Your profile has been updated." });
      forceReload(); // This will re-fetch the user data and update the macro cards
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
      await forceReload(); // Force a reload of user data from the hook
      toast({ title: "Profile Reset", description: "Your profile data has been cleared." });
    } catch (error) {
      console.error("Error resetting profile:", error);
      toast({ title: "Error", description: "Could not reset profile.", variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Jane Doe" {...field} />
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
                  <Input type="number" placeholder="25" {...field} value={field.value ?? ''} />
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
                <Select onValueChange={field.onChange} value={field.value}>
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
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Units</FormLabel>
                 <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                        // When units change, clear the other system's height fields
                        if (value === 'metric') {
                          form.setValue('heightFt', undefined);
                          form.setValue('heightIn', undefined);
                        } else {
                          form.setValue('height', undefined);
                        }
                      }}
                      value={field.value}
                      className="flex items-center space-x-4 pt-2"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="metric" id="metric" />
                        </FormControl>
                        <FormLabel htmlFor="metric" className="font-normal">Metric</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="imperial" id="imperial" />
                        </FormControl>
                        <FormLabel htmlFor="imperial" className="font-normal">Imperial</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {unit === 'metric' ? (
            <FormField
              control={form.control}
              name="height"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Height (cm)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="175" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="heightFt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (ft)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="5" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="heightIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>(in)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="9" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight ({unit === 'metric' ? 'kg' : 'lbs'})</FormLabel>
                <FormControl>
                  <Input type="number" placeholder={unit === 'metric' ? '70' : '154'} {...field} value={field.value ?? ''} />
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
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your activity level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ACTIVITY_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
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
              <FormLabel>Primary Goal</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your primary fitness goal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {GOAL_TYPES.map(goal => (
                    <SelectItem key={goal} value={goal}>{GOAL_TYPE_DETAILS[goal].description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {isBodyweightGoal && (
          <div className="space-y-8 rounded-md border p-4">
            <h3 className="text-lg font-medium font-headline">Bodyweight-Based Macro Calculation</h3>
            <p className="text-sm text-muted-foreground">
              This calculation method uses your bodyweight to set a protein target first, then splits the remaining calories between carbs and fat.
            </p>
            <FormField
              control={form.control}
              name="proteinPerBodyweight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Protein per Bodyweight ({form.getValues('unit') === 'metric' ? 'g/kg' : 'g/lb'})</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remainingCarbs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Carb / Fat Split</FormLabel>
                   <FormControl>
                     <div>
                        <Slider
                          defaultValue={[50]}
                          value={[carbPercentage]}
                          onValueChange={(value) => {
                            form.setValue('remainingCarbs', value[0]);
                            form.setValue('remainingFat', 100 - value[0]);
                          }}
                          max={100}
                          step={5}
                          className="my-4"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{`Carbs: ${carbPercentage}%`}</span>
                          <span>{`Fat: ${100 - carbPercentage}%`}</span>
                        </div>
                     </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your timezone" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between">
          <Button type="submit" disabled={loading}>Update Profile</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isResetting}>
                Reset Profile
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently reset your profile and goal data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>Yes, reset</AlertDialogAction>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </form>
    </Form>
  );
}
