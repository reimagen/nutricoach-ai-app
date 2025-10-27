'use client';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { GOAL_TYPES, GOAL_TYPE_DETAILS } from "@/constants";
import { useFormContext } from "react-hook-form";
import { ProfileFormValues } from "@/hooks/useProfileForm";

export function GoalsForm() {
  const { control, watch, setValue, getValues } = useFormContext<ProfileFormValues>();
  const goalType = watch("goalType");
  const isBodyweightGoal =
    goalType && GOAL_TYPE_DETAILS[goalType]?.calculationStrategy === "bodyweight";
  const carbPercentage = watch("remainingCarbs") ?? 50;

  return (
    <div className="space-y-8">
      <FormField
        control={control}
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
                {GOAL_TYPES.map((goal) => (
                  <SelectItem key={goal} value={goal}>
                    {GOAL_TYPE_DETAILS[goal].description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {isBodyweightGoal && (
        <div className="space-y-8 rounded-md border p-4">
          <h3 className="text-lg font-medium font-headline">
            Bodyweight-Based Macro Split
          </h3>
          <p className="text-sm text-muted-foreground">
            This method uses your bodyweight and goal to set a protein target,
            and recommends the calories split remaining between carbs and fat.
          </p>
          <FormField
            control={control}
            name="proteinPerBodyweight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Protein per Bodyweight (
                  {getValues("unit") === "metric" ? "g/kg" : "g/lb"})
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
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
                        setValue("remainingCarbs", value[0]);
                        setValue("remainingFat", 100 - value[0]);
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
    </div>
  );
}
