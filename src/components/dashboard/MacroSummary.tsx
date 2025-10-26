
import { Macros } from '@/types';
import { MacroCard } from './MacroCard';

interface MacroSummaryProps {
  targets: Macros;
  current: Macros;
}

export default function MacroSummary({ targets, current }: MacroSummaryProps) {
  const safeTargets = targets || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const safeCurrent = current || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MacroCard
        title="Calories"
        current={safeCurrent.calories}
        target={safeTargets.calories}
        unit="kcal"
        colorVar="var(--chart-1)"
      />
      <MacroCard
        title="Protein"
        current={safeCurrent.protein}
        target={safeTargets.protein}
        unit="g"
        colorVar="var(--chart-2)"
      />
      <MacroCard
        title="Carbs"
        current={safeCurrent.carbs}
        target={safeTargets.carbs}
        unit="g"
        colorVar="var(--chart-4)"
      />
      <MacroCard
        title="Fat"
        current={safeCurrent.fat}
        target={safeTargets.fat}
        unit="g"
        colorVar="var(--chart-5)"
      />
    </div>
  );
}
