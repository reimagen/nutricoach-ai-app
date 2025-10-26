
'use client';

import React, { useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { MealEntry, MealCategory } from '@/types/meal';

interface DailyLogTableProps {
  logEntries: MealEntry[];
}

export const DailyLogTable = ({ logEntries }: DailyLogTableProps) => {
  const groupedEntries = useMemo(() => {
    if (!logEntries) return {};
    return logEntries.reduce((acc, entry) => {
      const category = entry.mealCategory;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(entry);
      return acc;
    }, {} as { [key in MealCategory]?: MealEntry[] });
  }, [logEntries]);

  const mealOrder: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  if (!logEntries || logEntries.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-gray-50/50">
        <h3 className="text-lg font-semibold">No meals logged for this day.</h3>
        <p className="text-muted-foreground mt-2">
          Use the voice agent to log your first meal.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40%]">Description</TableHead>
          <TableHead>Calories</TableHead>
          <TableHead>Protein</TableHead>
          <TableHead>Carbs</TableHead>
          <TableHead>Fat</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mealOrder.map((category) => {
          const entries = groupedEntries[category];
          if (!entries) return null;

          return (
            <React.Fragment key={category}>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableCell colSpan={5} className="font-bold text-lg capitalize">
                  {category}
                </TableCell>
              </TableRow>
              {entries.map((entry) => (
                <React.Fragment key={entry.id}>
                  <TableRow className="bg-muted/20">
                    <TableCell className="font-semibold">
                      {entry.description}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {entry.macros.calories.toFixed(0)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {entry.macros.protein.toFixed(1)}g
                    </TableCell>
                    <TableCell className="font-semibold">
                      {entry.macros.carbs.toFixed(1)}g
                    </TableCell>
                    <TableCell className="font-semibold">
                      {entry.macros.fat.toFixed(1)}g
                    </TableCell>
                  </TableRow>
                  {entry.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="pl-8">{item.name}</TableCell>
                      <TableCell>{item.macros.calories.toFixed(0)}</TableCell>
                      <TableCell>{item.macros.protein.toFixed(1)}g</TableCell>
                      <TableCell>{item.macros.carbs.toFixed(1)}g</TableCell>
                      <TableCell>{item.macros.fat.toFixed(1)}g</TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
};
