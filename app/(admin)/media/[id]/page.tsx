/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { loadAdminData, scoresFor, displayDate } from "@/lib/data";
import { PageHeading } from "@/app/components/page-heading";
import { MediaEditor, DeleteMedia } from "@/app/components/media-editor";
export const maxDuration = 60;
export default async function EditMedia({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const [{ id }, query, data] = await Promise.all([
    params,
    searchParams,
    loadAdminData(),
  ]);
  const item = data.media.find((m) => m.id === id);
  if (!item) notFound();
  const score = scoresFor(id, data.ratings);
  return (
    <main className="page editor-page">
      <Link className="back-link" href="/media">
        ← All AI media
      </Link>
      <PageHeading
        eyebrow="Review, refine, publish"
        title="Edit AI media"
        description={`Created ${displayDate(item.created_at)} · ↑ ${score.up} upvotes · ↓ ${score.down} downvotes`}
      />
      {query.saved === "1" && (
        <p className="notice success" role="status">
          Saved. This take is now available on the public rating board.
        </p>
      )}
      {item.image_path && (
        <div className="existing-image">
          <img
            src={
              supabase.storage
                .from("caption-images")
                .getPublicUrl(item.image_path).data.publicUrl
            }
            alt={item.image_description ?? item.scene}
            width={800}
            height={600}
          />
          <p className="small muted">
            Current AI illustration. It stays unless you generate a new one.
          </p>
        </div>
      )}
      <section className="panel">
        <MediaEditor item={item} />
      </section>
      <DeleteMedia id={id} ratings={score.count} />
    </main>
  );
}
