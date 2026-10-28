import Link from "next/link";
import { notFound } from "next/navigation";
import { resourceFor, labelFor, type Row } from "@/lib/resources";
import { resourceRows, referenceLabels } from "@/lib/resource-data";
import { PageHeading } from "@/app/components/page-heading";
export default async function ResourceList({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<{ q?: string; page?: string; deleted?: string }>;
}) {
  const { resource: slug } = await params;
  const spec = resourceFor(slug);
  if (!spec) notFound();
  const [rows, refs, search] = await Promise.all([
    resourceRows(spec.table),
    referenceLabels(),
    searchParams,
  ]);
  const q = (search.q ?? "").trim().toLowerCase();
  const filtered = rows
    .filter(
      (r) =>
        !q ||
        JSON.stringify(r).toLowerCase().includes(q) ||
        Object.values(r).some((v) =>
          refs[String(v)]?.label.toLowerCase().includes(q),
        ),
    )
    .sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    );
  if (slug === "prompt-chain-steps") filtered.sort((a,b)=>String(a.chain_id).localeCompare(String(b.chain_id))||Number(a.position)-Number(b.position));
  const page = Math.max(
    1,
    Math.min(
      Math.ceil(filtered.length / 25) || 1,
      Number.parseInt(search.page ?? "1") || 1,
    ),
  );
  const visible = filtered.slice((page - 1) * 25, page * 25);
  function cell(r: Row, key: string) {
    const val = r[key];
    if (val == null) return "—";
    if (typeof val === "boolean")
      return (
        <span className={`status-pill ${val ? "succeeded" : "running"}`}>
          {val ? "Enabled" : "Disabled"}
        </span>
      );
    if (key === "duration_ms") return `${(Number(val) / 1000).toFixed(2)} s`;
    if (key === "status")
      return <span className={`status-pill ${val}`}>{String(val)}</span>;
    if (refs[String(val)])
      return (
        <Link className="text-link" href={refs[String(val)].href}>
          {refs[String(val)].label}
        </Link>
      );
    return <span className="cell-clamp">{String(val)}</span>;
  }
  return (
    <main className="page">
      <PageHeading
        eyebrow="Admin database"
        title={spec.title}
        description={spec.description}
        action={
          spec.mode === "crud" ? (
            <Link className="button primary" href={`/manage/${slug}/new`}>
              + Create {spec.singular.toLowerCase()}
            </Link>
          ) : (
            <span className="badge">Read only</span>
          )
        }
      />
      {spec.note && <p className="notice">{spec.note}</p>}
      {search.deleted && (
        <p className="notice success" role="status">
          Record deleted.
        </p>
      )}
      <section className="panel">
        <form className="toolbar" method="get">
          <label className="search-label">
            Search {spec.title.toLowerCase()}
            <input
              type="search"
              name="q"
              defaultValue={search.q ?? ""}
              placeholder="Search records…"
            />
          </label>
          <button className="button secondary">Search</button>
          {q && (
            <Link className="text-link" href={`/manage/${slug}`}>
              Clear
            </Link>
          )}
        </form>
        <p className="small muted">
          {filtered.length} records · page {page} of{" "}
          {Math.ceil(filtered.length / 25) || 1}
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {spec.columns.map((key) => (
                  <th key={key}>{labelFor(key)}</th>
                ))}
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  {spec.columns.map((key) => (
                    <td key={key}>{cell(r, key)}</td>
                  ))}
                  <td>
                    <Link
                      className="text-link"
                      href={`/manage/${slug}/${r.id}`}
                    >
                      {spec.mode === "crud" ? "View / edit" : "Inspect"} ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <div className="empty">
            <h2>
              {q
                ? "No matching records."
                : `No ${spec.title.toLowerCase()} yet.`}
            </h2>
            <p>
              {q
                ? "Try a different search."
                : slug === "requests" || slug === "responses"
                  ? "Create a new take in either app to see its live execution here."
                  : spec.mode === "crud"
                    ? "Create the first record using the button above."
                    : "Records will appear when configured."}
            </p>
          </div>
        )}
        <div className="pagination">
          {page > 1 && (
            <Link
              className="button secondary"
              href={`?q=${encodeURIComponent(q)}&page=${page - 1}`}
            >
              ← Previous
            </Link>
          )}
          {page * 25 < filtered.length && (
            <Link
              className="button secondary"
              href={`?q=${encodeURIComponent(q)}&page=${page + 1}`}
            >
              Next →
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
