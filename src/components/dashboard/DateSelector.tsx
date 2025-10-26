
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
        <h2 className="text-2xl font-bold font-headline">{formattedDate}</h2>
        <p className="text-muted-foreground">Select a date to view your log.</p>
      </div>
      <Popover open={isCalendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              'w-[280px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(date, 'PPP')}
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
  );
};
