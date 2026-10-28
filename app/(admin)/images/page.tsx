/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { resourceRows } from "@/lib/resource-data";
import { PageHeading } from "@/app/components/page-heading";
export default async function Images({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    bucket?: string;
    deleted?: string;
    cleanup?: string;
  }>;
}) {
  const { supabase } = await requireAdmin();
  const [all, search] = await Promise.all([
    resourceRows("images"),
    searchParams,
  ]);
  const q = (search.q ?? "").toLowerCase();
  const rows = all
    .filter(
      (r) =>
        (!q || JSON.stringify(r).toLowerCase().includes(q)) &&
        (!search.bucket || r.bucket === search.bucket),
    )
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const previews = await Promise.all(
    rows.map(async (r) => {
      const { data } = await supabase.storage
        .from(String(r.bucket))
        .createSignedUrl(String(r.path), 900);
      return data?.signedUrl;
    }),
  );
  return (
    <main className="page">
      <PageHeading
        eyebrow="Image library"
        title="Images, in one place."
        description="Manage uploaded photos and AI illustrations. Private files stay private and are shown with temporary signed links."
        action={
          <Link className="button primary" href="/images/new">
            + Upload image
          </Link>
        }
      />
      {search.deleted && (
        <p className="notice success">Image record deleted.</p>
      )}
      {search.cleanup && (
        <p className="notice error">
          The record was deleted, but the Storage file could not be removed.
          Check Supabase Storage for the remaining file.
        </p>
      )}
      <section className="panel">
        <form className="toolbar">
          <label className="search-label">
            Search images
            <input type="search" name="q" defaultValue={search.q ?? ""} />
          </label>
          <label>
            Storage bucket
            <select name="bucket" defaultValue={search.bucket ?? ""}>
              <option value="">All buckets</option>
              <option value="avatars">Profile photos (private)</option>
              <option value="caption-images">AI illustrations (public)</option>
              <option value="admin-images">Admin uploads (private)</option>
            </select>
          </label>
          <button className="button secondary">Filter</button>
        </form>
        <p className="small muted">
          {rows.length} images · image files are stored in Storage, not in
          relational rows.
        </p>
        <div className="image-grid">
          {rows.map((r, i) => (
            <Link className="image-card" key={r.id} href={`/images/${r.id}`}>
              {previews[i] ? (
                <img src={previews[i]} alt={String(r.alt_text || r.label)} />
              ) : (
                <div className="image-missing">Preview unavailable</div>
              )}
              <div>
                <span className="badge">{String(r.bucket)}</span>
                <h2>{String(r.label)}</h2>
                <span className="text-link">View / edit ↗</span>
              </div>
            </Link>
          ))}
        </div>
        {!rows.length && (
          <p className="empty">
            No matching images. Upload the first image above.
          </p>
        )}
      </section>
    </main>
  );
}
