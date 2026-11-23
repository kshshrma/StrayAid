// import dotenv from "dotenv";
// dotenv.config();

// import { createClient } from "@supabase/supabase-js";

// export const supabase = createClient(
//   process.env.SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );
import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

console.log("Supabase URL exists:", !!supabaseUrl);
console.log("Supabase URL format valid:", 
  !!supabaseUrl && /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/.test(supabaseUrl)
);
console.log("Supabase key exists:", !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}
if (supabaseUrl) {
  const parsed = new URL(supabaseUrl);
  console.log("Supabase project host:", parsed.host);
  console.log("Supabase URL path:", parsed.pathname);
}
export const supabase = createClient(supabaseUrl, supabaseKey);