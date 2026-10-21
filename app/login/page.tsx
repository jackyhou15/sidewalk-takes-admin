import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.app_metadata?.provider === "google") {
    const { data: allowed } = await supabase.rpc("is_superadmin");
    if (allowed === true) redirect("/");
    redirect("/access-denied");
  }
  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand">
          Sidewalk Takes<span>.</span>
        </div>
        <span className="pill">Admin workspace</span>
        <h1>
          A little perspective.
          <br />A clearer overview.
        </h1>
        <p>
          Manage the takes, understand your community, and see what&apos;s
          landing.
        </p>
        <Link className="button primary" href="/auth/sign-in">
          Continue with Google <span>↗</span>
        </Link>
        {error && (
          <p className="notice error" role="alert">
            Sign-in didn&apos;t complete. Please try Google sign-in again.
          </p>
        )}
        <p className="small">Access is limited to approved administrators.</p>
        <a
          className="back-link"
          href="https://hello-world-nextjs-vercel.vercel.app/"
        >
          ← Back to the rating app
        </a>
      </section>
      <aside className="login-art">
        <span>SIDEWALK / CONTROL ROOM</span>
        <strong>NYC</strong>
        <p>
          The whole city has a take.
          <br />
          Here&apos;s the bigger picture.
        </p>
        <span>CREATE · CURATE · UNDERSTAND</span>
      </aside>
    </main>
  );
}
