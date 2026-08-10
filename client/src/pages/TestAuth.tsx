import { supabase } from "../lib/supabase";

export default function TestAuth() {
  const checkSession = async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    console.log("Session:", session);
    console.log("Access Token:", session?.access_token);
    console.log("User ID:", session?.user?.id);
    console.log("Error:", error);
    
  };

  return (
    <div className="p-5">
      <button
        onClick={checkSession}
        className="rounded bg-blue-600 px-4 py-2 text-white"
      >
        Check Auth Session
      </button>
    </div>
  );
}