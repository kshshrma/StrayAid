import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
  console.log("Fetching API schema...");
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
    });
    const schema = await response.json();
    console.log("Exposed Tables:", Object.keys(schema.paths || {}));
    console.log("Exposed Definitions:", Object.keys(schema.definitions || {}));
  } catch (error) {
    console.error("Failed to fetch schema:", error);
  }
}

test();
