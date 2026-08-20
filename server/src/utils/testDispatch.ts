import { supabase } from "../services/supabase";
import { findBestGuardian } from "../services/dispatch";

async function run() {
  console.log("🧪 Starting Smart Dispatch Test...");

  // 1. Fetch available & verified Guardians to verify database contents
  const { data: guardians, error } = await supabase
    .from("guardians")
    .select("id, user_id, latitude, longitude, available, is_verified, total_rescues, last_active")
    .eq("available", true)
    .eq("is_verified", true);

  if (error) {
    console.error("❌ Failed to fetch guardians:", error);
    return;
  }

  console.log(`ℹ️ Found ${guardians?.length ?? 0} active, verified Guardians in database:`);
  if (guardians) {
    for (const g of guardians) {
      console.log(`   - ID: ${g.id}, Rescues: ${g.total_rescues}, Coordinates: (${g.latitude}, ${g.longitude}), Last Active: ${g.last_active}`);
    }
  }

  // 2. Simulate ranking for a dummy report close to the Guardian's Greater Noida location
  const reportLat = 28.47;
  const reportLon = 77.48;
  const reportId = "6ac9fce9-0efc-47b5-816d-755ce774eacc"; // Valid UUID format
  const severities = ["Low", "High", "Critical"];

  for (const sev of severities) {
    console.log(`\n--- Ranking candidates for ${sev} Severity ---`);
    const best = await findBestGuardian(reportId, reportLat, reportLon, sev, 50);
    if (best) {
      console.log(`✅ Best Candidate: ${best.id}`);
      console.log(`   - Distance: ${best.distance_km} km (Distance Score: ${best.distance_score})`);
      console.log(`   - Experience: ${best.total_rescues} rescues (Experience Score: ${best.experience_score})`);
      console.log(`   - Availability Score: ${best.availability_score}`);
      console.log(`   - Fairness Score: ${best.fairness_score}`);
      console.log(`   - Final Dispatch Score: ${best.dispatch_score}`);
    } else {
      console.log("⚠️ No candidates matched within radius.");
    }
  }
}

run().catch(console.error);
