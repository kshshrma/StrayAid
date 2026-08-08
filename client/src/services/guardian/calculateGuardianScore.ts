interface GuardianScoreInput {
  distance_km: number;
  total_rescues: number;
}

export function calculateGuardianScore({
  distance_km,
  total_rescues,
}: GuardianScoreInput): number {
  const distanceScore =
    Math.max(0, 100 - distance_km * 5);

  const experienceScore =
    Math.min(total_rescues * 2, 20);

  return (
    distanceScore +
    experienceScore
  );
}