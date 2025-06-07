import React from 'react';
import { WorkoutRecord } from '@/types/workout';

interface Props {
  workouts: WorkoutRecord[];
}

export const PersonalRecords = ({ workouts }: Props) => {
  const getMaxWeight = () => {
    return workouts.reduce((max, workout) => {
      const workoutMax = Math.max(...workout.sets.map(set => set.weight));
      return Math.max(max, workoutMax);
    }, 0);
  };

  const getTotalVolume = () => {
    return workouts.reduce((total, workout) => {
      const workoutVolume = workout.sets.reduce((sum, set) => sum + (set.weight * set.reps), 0);
      return total + workoutVolume;
    }, 0);
  };

  const getMaxReps = () => {
    return workouts.reduce((max, workout) => {
      const workoutMaxReps = Math.max(...workout.sets.map(set => set.reps));
      return Math.max(max, workoutMaxReps);
    }, 0);
  };

  const getMaxVolumeInOneDay = () => {
    return workouts.reduce((max, workout) => {
      const workoutVolume = workout.sets.reduce((sum, set) => sum + (set.weight * set.reps), 0);
      return Math.max(max, workoutVolume);
    }, 0);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gray-700 p-4 rounded-lg">
        <h3 className="text-sm text-gray-400">最高重量</h3>
        <p className="text-2xl font-bold">{getMaxWeight()}kg</p>
      </div>
      <div className="bg-gray-700 p-4 rounded-lg">
        <h3 className="text-sm text-gray-400">最高回数</h3>
        <p className="text-2xl font-bold">{getMaxReps()}回</p>
      </div>
      <div className="bg-gray-700 p-4 rounded-lg">
        <h3 className="text-sm text-gray-400">総挙上量</h3>
        <p className="text-2xl font-bold">{getTotalVolume()}kg</p>
      </div>
      <div className="bg-gray-700 p-4 rounded-lg">
        <h3 className="text-sm text-gray-400">1日の最高挙上量</h3>
        <p className="text-2xl font-bold">{getMaxVolumeInOneDay()}kg</p>
      </div>
    </div>
  );
}; 