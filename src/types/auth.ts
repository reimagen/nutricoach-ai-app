
import { User } from './user';

export interface AuthContextType {
  user: (User & { uid: string; email: string | null; }) | null;
  loading: boolean;
  updateUser: (user: Partial<User>) => Promise<void>;
  forceReload: () => void;
  signOut: () => Promise<void>;
}
