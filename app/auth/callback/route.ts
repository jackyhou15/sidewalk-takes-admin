import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  if (!code)
    return NextResponse.redirect(new URL("/login?error=callback", origin));
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error)
    return NextResponse.redirect(new URL("/login?error=callback", origin));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.provider !== "google") {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=google", origin));
  }
  const { data: allowed, error: roleError } =
    await supabase.rpc("is_superadmin");
  return NextResponse.redirect(
    new URL(!roleError && allowed === true ? "/" : "/access-denied", origin),
  );
}
