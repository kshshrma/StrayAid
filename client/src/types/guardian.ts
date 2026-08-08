export interface Guardian {
  id: string;

  user_id: string;

  name: string;

  phone: string;

  city: string;

  latitude: number | null;

  longitude: number | null;

  available: boolean;

  profile_image: string | null;

  total_rescues: number;

  bio: string | null;

  experience: string | null;

  is_verified: boolean;

  last_active: string;

  created_at: string;

  updated_at: string;
}