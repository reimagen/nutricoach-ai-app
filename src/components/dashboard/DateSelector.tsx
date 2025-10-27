'use client';

import { useState } from 'react';
import { format, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateSelectorProps {
  date: Date;
  setDate: (date: Date) => void;
}

export const DateSelector = ({ date, setDate }: DateSelectorProps) => {
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const formattedDate = format(date, 'EEEE, MMMM d');

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(startOfDay(selectedDate));
      setCalendarOpen(false);
    }
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="flex items-center gap-2">
           <h2 className="text-2xl font-bold font-headline">{formattedDate}</h2>
            <Popover open={isCalendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={"ghost"}
                        size="icon"
                        className={cn('h-8 w-8', !date && 'text-muted-foreground')}
                    >
                        <CalendarIcon className="h-5 w-5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    initialFocus
                />
                </PopoverContent>
            </Popover>
        </div>
        <p className="text-muted-foreground">Select a date to view your log.</p>
      </div>
    </div>
  );
};
