export interface Guardian {
  id: string;
  user_id: string;

  latitude: number | null;
  longitude: number | null;

  available: boolean;

  created_at: string;
  updated_at: string;

  total_rescues: number;

  bio: string | null;
  experience: string | null;

  last_active: string | null;

  is_verified: boolean;
}

export interface CreateGuardianData {
  user_id: string;

  latitude?: number | null;
  longitude?: number | null;

  available?: boolean;

  bio?: string | null;
  experience?: string | null;
}