import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function TestConnection() {
  useEffect(() => {
    async function test() {
      const { data, error } = await supabase.auth.getSession();

      console.log("Data:", data);
      console.log("Error:", error);
    }

    test();
  }, []);

  return <h1>Testing Supabase...</h1>;
}