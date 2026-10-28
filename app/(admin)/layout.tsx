import Link from "next/link";
import { AdminNav } from "@/app/components/admin-nav";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "@/app/actions";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAdmin();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          Sidewalk Takes<span>.</span>
        </Link>
        <span className="workspace-label">THE ADMIN WORKSPACE</span>
        <AdminNav />
        <div className="sidebar-bottom">
          <a
            href="https://hello-world-nextjs-vercel.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            Open rating app ↗
          </a>
          <div className="admin-identity">
            <span className="avatar">{user.email?.[0].toUpperCase()}</span>
            <div>
              <strong>Superadmin</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <form action={signOut}>
            <button className="sign-out">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-header">
          <span>Sidewalk Takes / Control room</span>
          <span className="secure-badge">● Google verified · Admin access</span>
        </header>
        {children}
        <footer>
          Sidewalk Takes Admin <span>Live data · New York time</span>
        </footer>
      </div>
    </div>
  );
}
