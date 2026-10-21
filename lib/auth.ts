import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireGoogleUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.provider !== "google") redirect("/login");
  return { supabase, user };
}
export async function requireAdmin() {
  const { supabase, user } = await requireGoogleUser();
  // Recheck the database on every protected read and mutation, not just at login.
  const { data, error } = await supabase.rpc("is_superadmin");
  if (error || data !== true) redirect("/access-denied");
  return { supabase, user };
}
