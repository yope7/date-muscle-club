import { WorkoutRecord } from "./workout";

export interface UserProfile {
  id: string;
  displayName?: string;
  photoURL?: string;
  username: string;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
  workouts?: WorkoutRecord[];
}
