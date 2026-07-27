import { supabase } from "../../lib/supabase";

export function subscribeReports(
  callback: () => void
) {
  return supabase
    .channel("reports-channel")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "reports",
      },
      () => {
        callback();
      }
    )
    .subscribe();
}