import { requireGoogleUser } from "@/lib/auth";
import { signOut } from "@/app/actions";
export default async function AccessDenied() {
  await requireGoogleUser();
  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand">
          Sidewalk Takes<span>.</span>
        </div>
        <span className="pill">Administrator access required</span>
        <h1>
          This workspace
          <br />
          is restricted.
        </h1>
        <p>
          You&apos;re signed in with Google, but this account hasn&apos;t been
          approved as an administrator. No admin data has been loaded.
        </p>
        <form action={signOut}>
          <button className="button primary">
            Sign out and switch account
          </button>
        </form>
        <a
          className="back-link"
          href="https://hello-world-nextjs-vercel.vercel.app/"
        >
          Visit the public rating app ↗
        </a>
      </section>
    </main>
  );
}
