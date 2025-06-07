import { 
  getUserWorkouts,
  getWorkoutByDate,
  addWorkout,
  updateWorkout,
  deleteWorkout
} from '../firestore';
import { db } from '../firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

// Firestoreのモック
jest.mock('../firebase', () => ({
  db: {},
}));

describe('Firestore Functions', () => {
  const mockUserId = 'test-user-id';
  const mockWorkout = {
    date: new Date('2024-03-15'),
    sets: [
      { weight: 60, reps: 10 },
      { weight: 65, reps: 8 }
    ],
    memo: 'テストメモ',
    tags: ['テスト']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserWorkouts', () => {
    it('should fetch workouts for a user', async () => {
      const mockDocs = [{
        id: 'workout-1',
        data: () => ({
          date: Timestamp.fromDate(new Date('2024-03-15')),
          sets: mockWorkout.sets,
          memo: mockWorkout.memo,
          tags: mockWorkout.tags
        })
      }];

      (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

      const workouts = await getUserWorkouts(mockUserId);
      expect(workouts).toHaveLength(1);
      expect(workouts[0].id).toBe('workout-1');
      expect(workouts[0].sets).toEqual(mockWorkout.sets);
    });
  });

  describe('getWorkoutByDate', () => {
    it('should fetch workout for a specific date', async () => {
      const mockDocs = [{
        id: 'workout-1',
        data: () => ({
          date: Timestamp.fromDate(new Date('2024-03-15')),
          sets: mockWorkout.sets,
          memo: mockWorkout.memo,
          tags: mockWorkout.tags
        })
      }];

      (getDocs as jest.Mock).mockResolvedValue({ 
        empty: false,
        docs: mockDocs 
      });

      const workout = await getWorkoutByDate(mockUserId, new Date('2024-03-15'));
      expect(workout).not.toBeNull();
      expect(workout?.id).toBe('workout-1');
      expect(workout?.sets).toEqual(mockWorkout.sets);
    });

    it('should return null when no workout exists for the date', async () => {
      (getDocs as jest.Mock).mockResolvedValue({ 
        empty: true,
        docs: [] 
      });

      const workout = await getWorkoutByDate(mockUserId, new Date('2024-03-15'));
      expect(workout).toBeNull();
    });
  });

  // 他のテストケースも同様に実装...
}); 