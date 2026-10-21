import { loadAdminData, displayName, displayDate } from "@/lib/data";
import { PageHeading } from "@/app/components/page-heading";
export default async function Users({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const [data, params] = await Promise.all([loadAdminData(), searchParams]);
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const users = data.profiles.filter(
    (p) =>
      (!q || `${displayName(p)} ${p.email}`.toLowerCase().includes(q)) &&
      (!params.role ||
        params.role === "all" ||
        p.is_superadmin === (params.role === "admin")),
  );
  return (
    <main className="page">
      <PageHeading
        eyebrow="The people behind the takes"
        title="Users & profiles"
        description="Read member profiles, sign-in activity, and participation. Administrator access is assigned in the database."
      />
      <form className="filters">
        <label className="search">
          <span className="sr-only">Search users</span>
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search name or email…"
          />
        </label>
        <label>
          <span className="sr-only">Role</span>
          <select name="role" defaultValue={params.role ?? "all"}>
            <option value="all">All members</option>
            <option value="admin">Superadmins</option>
            <option value="member">Members</option>
          </select>
        </label>
        <button className="button secondary">Filter users</button>
      </form>
      <section className="panel">
        <div className="panel-heading">
          <h2>Member directory</h2>
          <span className="pill">{users.length} members</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Last sign-in</th>
                <th>Takes</th>
                <th>Votes</th>
              </tr>
            </thead>
            <tbody>
              {users.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{displayName(p)}</strong>
                    <small className="cell-note">{p.email}</small>
                    <small className="cell-note mono">{p.id}</small>
                  </td>
                  <td>
                    <span
                      className={`badge ${p.is_superadmin ? "wholesome" : ""}`}
                    >
                      {p.is_superadmin ? "Superadmin" : "Member"}
                    </span>
                  </td>
                  <td>{displayDate(p.created_at)}</td>
                  <td>{displayDate(p.last_sign_in_at)}</td>
                  <td>
                    {data.media.filter((m) => m.created_by === p.id).length}
                  </td>
                  <td>
                    {data.ratings.filter((v) => v.user_id === p.id).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length && (
            <p className="empty">No members match this search.</p>
          )}
        </div>
      </section>
    </main>
  );
}
