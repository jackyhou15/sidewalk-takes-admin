/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { loadAdminData, scoresFor, displayName, displayDate } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { PageHeading } from "@/app/components/page-heading";
export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    vibe?: string;
    deleted?: string;
    cleanup?: string;
  }>;
}) {
  const [data, params] = await Promise.all([loadAdminData(), searchParams]);
  const { supabase } = await requireAdmin();
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const items = data.media.filter(
    (m) =>
      (!q || `${m.caption} ${m.scene}`.toLowerCase().includes(q)) &&
      (!params.vibe || params.vibe === "all" || m.style === params.vibe),
  );
  return (
    <main className="page">
      <PageHeading
        eyebrow="Curate the conversation"
        title="AI media"
        description="Create new AI takes, inspect the saved prompts, and update or delete content on the public rating board."
        action={
          <Link className="button primary" href="/media/new">
            + Create AI media
          </Link>
        }
      />
      {params.deleted === "1" && (
        <p className="notice success" role="status">
          The take and its linked ratings and saves were deleted.
          {params.cleanup === "warning"
            ? " The image could not be removed from Storage; its record has been deleted."
            : ""}
        </p>
      )}
      <form className="filters">
        <label className="search">
          <span className="sr-only">Search media</span>
          <input
            name="q"
            type="search"
            defaultValue={params.q ?? ""}
            placeholder="Search takes or city moments…"
          />
        </label>
        <label>
          <span className="sr-only">Caption vibe</span>
          <select name="vibe" defaultValue={params.vibe ?? "all"}>
            <option value="all">All vibes</option>
            <option value="dry">Dry</option>
            <option value="chaotic">Chaotic</option>
            <option value="wholesome">Wholesome</option>
          </select>
        </label>
        <button className="button secondary">Filter media</button>
      </form>
      <div className="media-grid">
        {items.map((item) => {
          const score = scoresFor(item.id, data.ratings);
          return (
            <article className="media-card" key={item.id}>
              {item.image_path && (
                <img
                  className="media-image"
                  src={
                    supabase.storage
                      .from("caption-images")
                      .getPublicUrl(item.image_path).data.publicUrl
                  }
                  alt={item.image_description ?? item.scene}
                  width={800}
                  height={600}
                />
              )}
              <div className="media-card-body">
                <div className="between">
                  <span className={`badge ${item.style}`}>{item.style}</span>
                  <span className="small muted">
                    {displayDate(item.created_at)}
                  </span>
                </div>
                <blockquote>{item.caption}</blockquote>
                <p className="small muted">{item.scene}</p>
                <div className="media-card-bottom">
                  <span className="small">
                    ↑ {score.up} · ↓ {score.down}
                    <small className="cell-note">
                      {displayName(
                        data.profiles.find((p) => p.id === item.created_by),
                      )}
                    </small>
                  </span>
                  <Link className="button secondary" href={`/media/${item.id}`}>
                    View & edit ↗
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!items.length && (
        <section className="panel empty">
          <h2>No takes found.</h2>
          <p>Try a different search, or create a new AI take.</p>
          <Link className="button primary" href="/media/new">
            Create AI media
          </Link>
        </section>
      )}
    </main>
  );
}
