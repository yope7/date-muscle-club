import React from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { WorkoutRecord } from '@/types/workout';

interface Props {
  workouts: WorkoutRecord[];
}

export const MaxWeightChart = ({ workouts }: Props) => {
  const data = workouts
    .map(workout => ({
      date: workout.date.toDate(),
      maxWeight: Math.max(...workout.sets.map(set => set.weight)),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => format(new Date(date), 'M/d', { locale: ja })}
            stroke="#9CA3AF"
          />
          <YAxis stroke="#9CA3AF" />
          <Tooltip
            contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
            labelFormatter={(date) => format(new Date(date), 'yyyy年M月d日', { locale: ja })}
            formatter={(value) => [`${value}kg`, '最高重量']}
          />
          <Line
            type="monotone"
            dataKey="maxWeight"
            stroke="#EF4444"
            strokeWidth={2}
            dot={{ fill: '#EF4444' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}; 