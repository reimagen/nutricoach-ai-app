
import { AppLayout } from '@/components/layout/AppLayout';
import { NutritionDashboard } from '@/components/dashboard/NutritionDashboard';

export default function Home() {
  return (
    <AppLayout>
      <NutritionDashboard />
    </AppLayout>
  );
}
