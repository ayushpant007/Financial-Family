// demo.tsx
import {
  WorkoutSummaryCard,
  StatItem,
} from '@/components/ui/workout-summary-card';
import {
  BarChart3,
  Clock,
  Flame,
  Footprints,
} from 'lucide-react';
import React from 'react';

// Sample data for the demo
const workoutStats: StatItem[] = [
  {
    icon: <BarChart3 className="w-5 h-5" />,
    label: 'Distance',
    value: '13.11',
    unit: 'km',
    bgColor: 'bg-green-100 dark:bg-green-900/50',
    textColor: 'text-green-600 dark:text-green-400',
  },
  {
    icon: <Clock className="w-5 h-5" />,
    label: 'Duration',
    value: '1:10:00',
    unit: '',
    bgColor: 'bg-purple-100 dark:bg-purple-900/50',
    textColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    icon: <Flame className="w-5 h-5" />,
    label: 'Calories Burned',
    value: 940,
    unit: 'kcal',
    bgColor: 'bg-red-100 dark:bg-red-900/50',
    textColor: 'text-red-600 dark:text-red-400',
  },
  {
    icon: <Footprints className="w-5 h-5" />,
    label: 'Steps',
    value: 16000,
    unit: '',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/50',
    textColor: 'text-yellow-600 dark:text-yellow-400',
  },
];

export const WorkoutSummaryCardDemo = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <WorkoutSummaryCard
        date="Sun, Feb 5, 18:14"
        activity="Running"
        equipment="Performed on MyRun Treadmill"
        imageUrl="https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8cnVufGVufDB8fDB8fHww?q=80&w=2070&auto=format&fit=crop"
        avgSpeed="11.2 km/h"
        avgIncline="0%"
        stats={workoutStats}
        onLike={() => console.log('Liked!')}
        onDelete={() => console.log('Deleted!')}
        onClose={() => console.log('Closed!')}
      />
    </div>
  );
};

export default WorkoutSummaryCardDemo;
