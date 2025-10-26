
'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface MacroCardProps {
  title: string;
  current: number;
  target: number;
  unit: string;
  colorVar: string;
}

export const MacroCard = ({ title, current, target, unit, colorVar }: MacroCardProps) => {
  const percentage = target > 0 ? (current / target) * 100 : 0;
  const currentRounded = Math.round(current);
  const targetRounded = Math.round(target);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {currentRounded} / {targetRounded}
          <span className="text-xs text-muted-foreground ml-1">{unit}</span>
        </div>
        <Progress
          value={percentage}
          className="mt-2 h-2"
          style={{ '--progress-color': `hsl(${colorVar})` } as React.CSSProperties}
          indicatorClassName="bg-[var(--progress-color)]"
        />
      </CardContent>
    </Card>
  );
};
