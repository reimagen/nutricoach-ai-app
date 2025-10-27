import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { educationData } from '@/data/education';

export default function EducationCard() {
  const today = new Date().getDate() % 30;
  const todaysLesson = educationData[today];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-accent" />
            <CardTitle className="font-headline">Today's Nutrition Insight</CardTitle>
        </div>
        <CardDescription>{todaysLesson.title}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">
          {todaysLesson.content.substring(0, 150)}...
        </p>
      </CardContent>
      <div className="p-6 pt-0">
          <Link href="/education">
            <Button variant="outline" className="w-full">
                Learn More <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
      </div>
    </Card>
  );
}
