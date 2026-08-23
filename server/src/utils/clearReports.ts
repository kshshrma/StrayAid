import { supabase } from "../services/supabase";

async function clearReports() {
  console.log("🧹 Starting database cleanup of all reports and assignments...");

  // 1. Delete all rescue assignments
  const { error: assignError } = await supabase
    .from("rescue_assignments")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (assignError) {
    console.error("❌ Failed to delete rescue assignments:", assignError.message);
  } else {
    console.log("✅ Successfully deleted all rescue assignments.");
  }

  // 2. Delete all reports
  const { error: reportError } = await supabase
    .from("reports")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (reportError) {
    console.error("❌ Failed to delete reports:", reportError.message);
  } else {
    console.log("✅ Successfully deleted all reports.");
  }

  console.log("🧹 Database cleanup finished successfully!");
  process.exit(0);
}

clearReports();
