import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Workout } from '@/types/workout';

export const useWorkouts = () => {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('useWorkouts - user:', user);

    if (!user) {
      console.log('useWorkouts - no user, clearing workouts');
      setWorkouts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('useWorkouts - setting up Firestore query');
      const workoutsRef = collection(db, 'workouts');
      const q = query(
        workoutsRef,
        where('userId', '==', user.uid),
        orderBy('date', 'desc')
      );

      console.log('useWorkouts - starting snapshot listener');
      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('useWorkouts - received snapshot, docs count:', snapshot.docs.length);
        
        const workoutData = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('useWorkouts - processing doc:', doc.id, data);
          
          return {
            id: doc.id,
            userId: data.userId,
            date: data.date.toDate(),
            sets: data.sets,
            memo: data.memo,
            tags: data.tags,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          } as Workout;
        });

        console.log('useWorkouts - processed workout data:', workoutData);
        setWorkouts(workoutData);
        setLoading(false);
      }, (error) => {
        console.error('useWorkouts - Error fetching workouts:', error);
        setError('ワークアウトデータの取得に失敗しました');
        setLoading(false);
      });

      return () => {
        console.log('useWorkouts - cleaning up snapshot listener');
        unsubscribe();
      };
    } catch (error) {
      console.error('useWorkouts - Error setting up workouts listener:', error);
      setError('ワークアウトデータの取得に失敗しました');
      setLoading(false);
    }
  }, [user]);

  return { workouts, loading, error };
}; 