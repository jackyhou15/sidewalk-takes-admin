import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { PageHeading } from "@/app/components/page-heading";
import { ImageEditor, ImageDelete } from "@/app/components/image-editor";
import type { Row } from "@/lib/resources";
export default async function ImageDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  let item: Row | undefined,
    preview: string | undefined,
    inUse = false;
  if (id !== "new") {
    if (!/^[\da-f-]{36}$/i.test(id)) notFound();
    const { data, error } = await supabase
      .from("images")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw Error("The image could not be loaded.");
    if (!data) notFound();
    item = data as Row;
    const { data: signed } = await supabase.storage
      .from(String(item.bucket))
      .createSignedUrl(String(item.path), 900);
    preview = signed?.signedUrl;
    if (item.bucket === "avatars") {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { head: true, count: "exact" })
        .eq("avatar_path", item.path);
      if (error) throw Error("Image references could not be checked.");
      inUse = Boolean(count);
    }
    if (item.bucket === "caption-images") {
      const { count, error } = await supabase
        .from("generations")
        .select("id", { head: true, count: "exact" })
        .eq("image_path", item.path);
      if (error) throw Error("Image references could not be checked.");
      inUse = Boolean(count);
    }
  }
  const search = await searchParams;
  return (
    <main className="page">
      <Link className="back-link" href="/images">
        ← Images
      </Link>
      <PageHeading
        eyebrow="Image library"
        title={item ? String(item.label) : "Upload an image"}
        description={
          item
            ? "Update the title, accessible description and saved prompt. Deleting an image clears its photo references while keeping the user profile, caption and ratings."
            : "Upload a new image to private Storage, then save its metadata."
        }
      />
      {search.saved && (
        <p className="notice success" role="status">
          Image details saved.
        </p>
      )}
      <section className="panel">
        <ImageEditor item={item} preview={preview} />
        {item && (
          <p className="small muted">
            {String(item.bucket)} / {String(item.path)} ·{" "}
            {inUse ? "In use" : "No current profile or take reference"}
          </p>
        )}
      </section>
      {item && <ImageDelete id={id} inUse={inUse} />}
    </main>
  );
}
