import { supabase } from "../../lib/supabase";

export function subscribeReports(
  callback: () => void
) {
  const channelId = `reports-sub-${Math.random().toString(36).slice(2, 9)}`;
  return supabase
    .channel(channelId)
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