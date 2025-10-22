import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface MacroData {
  current: number;
  target: number;
}

interface MacroSummaryProps {
  data: {
    calories: MacroData;
    protein: MacroData;
    carbs: MacroData;
    fat: MacroData;
  };
}

const MacroCard = ({
  title,
  current,
  target,
  unit,
  colorVar,
}: {
  title: string;
  current: number;
  target: number;
  unit: string;
  colorVar: string;
}) => {
  const percentage = target > 0 ? (current / target) * 100 : 0;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {Math.round(current)} / {target}
          <span className="text-xs text-muted-foreground">{unit}</span>
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

export default function MacroSummary({ data }: MacroSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MacroCard
        title="Calories"
        current={data.calories.current}
        target={data.calories.target}
        unit="kcal"
        colorVar="var(--chart-1)"
      />
      <MacroCard
        title="Protein"
        current={data.protein.current}
        target={data.protein.target}
        unit="g"
        colorVar="var(--chart-2)"
      />
      <MacroCard
        title="Carbs"
        current={data.carbs.current}
        target={data.carbs.target}
        unit="g"
        colorVar="var(--chart-4)"
      />
      <MacroCard
        title="Fat"
        current={data.fat.current}
        target={data.fat.target}
        unit="g"
        colorVar="var(--chart-5)"
      />
    </div>
  );
}
