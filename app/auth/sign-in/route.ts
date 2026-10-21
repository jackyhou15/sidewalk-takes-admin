import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const canonical =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? origin;
  if (origin !== canonical)
    return NextResponse.redirect(new URL("/auth/sign-in", canonical));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url)
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  return NextResponse.redirect(data.url);
}
