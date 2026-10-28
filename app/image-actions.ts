"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
const types: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
export async function prepareImageUpload(type: string, size: number) {
  const { supabase, user } = await requireAdmin();
  if (!types[type] || !Number.isFinite(size) || size < 1 || size > 5242880)
    return { error: "Choose a JPG, PNG, WebP or GIF up to 5 MB." };
  const path = `${user.id}/${randomUUID()}.${types[type]}`;
  const { data, error } = await supabase.storage
    .from("admin-images")
    .createSignedUploadUrl(path);
  if (error) return { error: "The upload could not be started." };
  return { error: null, path, signedUrl: data.signedUrl };
}
export async function saveImage(
  _prev: { error: string | null },
  form: FormData,
): Promise<{ error: string | null }> {
  const { supabase, user } = await requireAdmin();
  const id = String(form.get("id") ?? ""),
    path = String(form.get("path") ?? ""),
    label = String(form.get("label") ?? "").trim(),
    alt = String(form.get("alt_text") ?? "").trim(),
    prompt = String(form.get("prompt") ?? "").trim();
  if (
    !label ||
    label.length > 150 ||
    alt.length > 600 ||
    prompt.length > 20000 ||
    (id && !uuid.test(id))
  )
    return {
      error:
        "Add a title (up to 150 characters) and check the description and prompt.",
    };
  let destination = id;
  if (id) {
    const { error, data } = await supabase
      .from("images")
      .update({ label, alt_text: alt, prompt })
      .eq("id", id)
      .select("id")
      .single();
    if (error || !data)
      return { error: "The image details could not be updated." };
  } else {
    if (
      !path.startsWith(`${user.id}/`) ||
      !/^([\da-f-]{36})\/([\da-f-]{36})\.(jpg|png|webp|gif)$/.test(path)
    )
      return { error: "Upload a supported image first." };
    const { data: info, error: infoError } = await supabase.storage
      .from("admin-images")
      .info(path);
    if (
      infoError ||
      !info ||
      !types[info.contentType ?? ""] ||
      !info.size ||
      info.size > 5242880
    )
      return {
        error: "The uploaded file could not be verified. Choose it again.",
      };
    const { data, error } = await supabase
      .from("images")
      .insert({
        bucket: "admin-images",
        path,
        label,
        alt_text: alt,
        prompt,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error)
      return { error: "The image could not be saved. Please try again." };
    destination = data.id;
  }
  revalidatePath("/", "layout");
  redirect(`/images/${destination}?saved=1`);
}
export async function deleteImage(
  _prev: { error: string | null },
  form: FormData,
): Promise<{ error: string | null }> {
  const { supabase } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (!uuid.test(id) || form.get("confirmation") !== "DELETE")
    return { error: "Type DELETE to confirm." };
  const { data: item, error } = await supabase
    .from("images")
    .select("bucket,path")
    .eq("id", id)
    .single();
  if (error || !item) return { error: "The image could not be loaded." };
  const { data: removed, error: deleteError } = await supabase
    .from("images")
    .delete()
    .eq("id", id)
    .select("id");
  if (deleteError)
    return {
      error:
        deleteError.code === "23503"
          ? "This image is used by a profile or take. Change that reference before deleting the image."
          : "The image could not be deleted.",
    };
  if (removed?.length !== 1) return { error: "The image no longer exists." };
  const cleanup = await supabase.storage.from(item.bucket).remove([item.path]);
  revalidatePath("/", "layout");
  redirect(`/images?deleted=1${cleanup.error ? "&cleanup=warning" : ""}`);
}
