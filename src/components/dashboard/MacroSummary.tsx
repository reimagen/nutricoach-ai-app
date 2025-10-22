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
  colorClass,
}: {
  title: string;
  current: number;
  target: number;
  unit: string;
  colorClass: string;
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
        <Progress value={percentage} className="mt-2 h-2" indicatorClassName={colorClass} />
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
        colorClass="bg-red-500"
      />
      <MacroCard
        title="Protein"
        current={data.protein.current}
        target={data.protein.target}
        unit="g"
        colorClass="bg-sky-500"
      />
      <MacroCard
        title="Carbs"
        current={data.carbs.current}
        target={data.carbs.target}
        unit="g"
        colorClass="bg-amber-500"
      />
      <MacroCard
        title="Fat"
        current={data.fat.current}
        target={data.fat.target}
        unit="g"
        colorClass="bg-violet-500"
      />
    </div>
  );
}

// Add custom progress indicator colors
// This is a bit of a hack as Progress component does not support color variants by default.
// A better way would be to customize the Progress component.
// For now, this global style will do.
const customStyle = `
.bg-red-500 { background-color: hsl(0 100% 50%); }
.dark .bg-red-500 { background-color: hsl(0 100% 60%); }
.bg-sky-500 { background-color: hsl(200 100% 50%); }
.dark .bg-sky-500 { background-color: hsl(200 100% 60%); }
.bg-amber-500 { background-color: hsl(39, 100%, 50%); }
.dark .bg-amber-500 { background-color: hsl(39, 100%, 55%); }
.bg-violet-500 { background-color: hsl(260 100% 60%); }
.dark .bg-violet-500 { background-color: hsl(260 100% 70%); }
`;
if (typeof window !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = customStyle;
    document.head.appendChild(styleSheet);
}
