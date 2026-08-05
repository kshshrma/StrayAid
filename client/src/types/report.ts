export interface Report {
  id: string;

  image_url: string;

  latitude: number;
  longitude: number;

  animal_type: string;
  severity: string;
  priority: string;
  ai_advice: string;

  status: string;

  assigned_guardian_id: string | null;

  assigned_at: string | null;
  accepted_at: string | null;
  enroute_at: string | null;
  rescued_at: string | null;
  completed_at: string | null;

  created_at: string;
}