'use client';

import {
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
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useFormContext } from "react-hook-form";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACTIVITY_LEVELS, TIMEZONES } from "@/constants";
import { useState } from "react";
import { ProfileFormValues } from "@/hooks/useProfileForm";

export function PersonalDetailsForm() {
  const { control, watch, setValue } = useFormContext<ProfileFormValues>();
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const unit = watch("unit");

  return (
    <div className="space-y-8">
      <FormField
        control={control}
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
          control={control}
          name="age"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Age</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="25"
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
          control={control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Units</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (value === "metric") {
                      setValue("heightFt", undefined);
                      setValue("heightIn", undefined);
                    } else {
                      setValue("height", undefined);
                    }
                  }}
                  value={field.value}
                  className="flex items-center space-x-4 pt-2"
                >
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <RadioGroupItem value="metric" id="metric" />
                    </FormControl>
                    <FormLabel htmlFor="metric" className="font-normal">
                      Metric
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <RadioGroupItem value="imperial" id="imperial" />
                    </FormControl>
                    <FormLabel htmlFor="imperial" className="font-normal">
                      Imperial
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {unit === "metric" ? (
          <FormField
            control={control}
            name="height"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Height (cm)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="175"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={control}
              name="heightFt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Height (ft)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="5"
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
              name="heightIn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>(in)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="9"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
        <FormField
          control={control}
          name="weight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Weight ({unit === "metric" ? "kg" : "lbs"})
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={unit === "metric" ? "70" : "154"}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
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
                {ACTIVITY_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="timezone"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Timezone</FormLabel>
            <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-[200px] justify-between",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value
                      ? TIMEZONES.find((timezone) => timezone === field.value)
                      : "Select timezone"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent
                className="w-[200px] p-0"
                align="start"
                side="bottom"
              >
                <Command>
                  <CommandInput placeholder="Search timezone..." />
                  <CommandEmpty>No timezone found.</CommandEmpty>
                  <CommandGroup className="max-h-60 overflow-y-auto">
                    {TIMEZONES.map((timezone) => (
                      <CommandItem
                        value={timezone}
                        key={timezone}
                        onSelect={() => {
                          setValue("timezone", timezone);
                          setTimezoneOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            timezone === field.value
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {timezone}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
