import Link from "next/link";
import { loadAdminData, displayName, displayDate } from "@/lib/data";
import { PageHeading } from "@/app/components/page-heading";
export default async function Ratings({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; vote?: string }>;
}) {
  const [data, params] = await Promise.all([loadAdminData(), searchParams]);
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const media = new Map(data.media.map((m) => [m.id, m]));
  const users = new Map(data.profiles.map((p) => [p.id, p]));
  const rows = data.ratings.filter(
    (r) =>
      (!params.vote ||
        params.vote === "all" ||
        r.value === (params.vote === "up" ? 1 : -1)) &&
      (!q ||
        `${media.get(r.generation_id)?.caption} ${displayName(users.get(r.user_id))} ${users.get(r.user_id)?.email}`
          .toLowerCase()
          .includes(q)),
  );
  return (
    <main className="page">
      <PageHeading
        eyebrow="Every reaction, accounted for"
        title="Ratings"
        description="Inspect persisted upvotes and downvotes, the member who cast each vote, and the correct AI take."
      />
      <div className="mini-metrics">
        <span>
          <strong>{data.ratings.filter((r) => r.value === 1).length}</strong>{" "}
          Upvotes
        </span>
        <span>
          <strong>{data.ratings.filter((r) => r.value === -1).length}</strong>{" "}
          Downvotes
        </span>
        <span>
          <strong>{new Set(data.ratings.map((r) => r.user_id)).size}</strong>{" "}
          Unique voters
        </span>
      </div>
      <form className="filters">
        <label className="search">
          <span className="sr-only">Search ratings</span>
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search captions or members…"
          />
        </label>
        <label>
          <span className="sr-only">Vote type</span>
          <select name="vote" defaultValue={params.vote ?? "all"}>
            <option value="all">All reactions</option>
            <option value="up">Upvotes</option>
            <option value="down">Downvotes</option>
          </select>
        </label>
        <button className="button secondary">Filter ratings</button>
      </form>
      <section className="panel">
        <div className="panel-heading">
          <h2>Rating ledger</h2>
          <span className="pill">{rows.length} votes</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reaction</th>
                <th>AI take</th>
                <th>Member</th>
                <th>Cast</th>
                <th>Last changed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span
                      className={`badge ${r.value === 1 ? "wholesome" : "chaotic"}`}
                    >
                      {r.value === 1 ? "↑ Upvote" : "↓ Downvote"}
                    </span>
                  </td>
                  <td>
                    <Link
                      className="table-title"
                      href={`/media/${r.generation_id}`}
                    >
                      {media.get(r.generation_id)?.caption ?? r.generation_id}
                    </Link>
                  </td>
                  <td>
                    {displayName(users.get(r.user_id))}
                    <small className="cell-note">
                      {users.get(r.user_id)?.email}
                    </small>
                  </td>
                  <td>{displayDate(r.created_at)}</td>
                  <td>{displayDate(r.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="empty">No votes match this view.</p>}
        </div>
      </section>
    </main>
  );
}
