"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isCaptionStyle } from "@/lib/caption-styles";
import { sanitizeIllustration } from "@/lib/illustration";
import { generateObserved, finishGeneration } from "@/lib/generation-runtime";
const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
export type Draft = {
  requestId: string;
  caption: string;
  prompt: string;
  model: string;
  imageSvg: string;
  imageDescription: string;
  imagePrompt: string;
};
export type EditorState = { error: string | null };

export async function generateDraft(
  scene: string,
  style: string,
  withImage: boolean,
): Promise<{ error: string; draft?: never } | { error: null; draft: Draft }> {
  const { supabase, user } = await requireAdmin();
  if (
    typeof scene !== "string" ||
    scene.trim().length < 10 ||
    scene.length > 300 ||
    !isCaptionStyle(style)
  )
    return {
      error: "Describe a scene in 10–300 characters and choose a vibe.",
    };
  const { count, error } = await supabase
    .from("generation_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 3600000).toISOString());
  if (error) return { error: "Generation history could not be loaded." };
  if ((count ?? 0) >= 20)
    return {
      error:
        "You have reached 20 generation requests this hour. Try again later.",
    };
  try {
    const draft = await generateObserved(
      supabase,
      user.id,
      scene.trim(),
      style,
      withImage,
      "admin-draft",
    );
    await finishGeneration(
      supabase,
      draft.requestId,
      "drafted",
      draft.startedAt,
    );
    return { error: null, draft };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "AI generation could not finish.",
    };
  }
}

export async function saveMedia(
  _previous: EditorState,
  form: FormData,
): Promise<EditorState> {
  const { supabase, user } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const scene = String(form.get("scene") ?? "").trim();
  const style = String(form.get("style") ?? "");
  const caption = String(form.get("caption") ?? "").trim();
  const prompt = String(form.get("prompt") ?? "").trim();
  const model = String(form.get("model") ?? "").trim();
  const svg = String(form.get("imageSvg") ?? "");
  const alt = String(form.get("imageDescription") ?? "").trim();
  const imagePrompt = String(form.get("imagePrompt") ?? "");
  if (id && !uuid.test(id)) return { error: "Invalid media record." };
  if (
    scene.length < 10 ||
    scene.length > 300 ||
    !isCaptionStyle(style) ||
    !caption ||
    caption.length > 500 ||
    !prompt ||
    prompt.length > 20000 ||
    !model ||
    model.length > 100 ||
    alt.length > 600 ||
    imagePrompt.length > 20000 ||
    svg.length > 131072
  )
    return {
      error:
        "Check the scene (10–300 characters), caption (1–500), vibe, saved prompt, and model.",
    };
  if (svg && !imagePrompt.trim())
    return { error: "Save the illustration prompt along with the image." };
  let uploadedPath: string | null = null;
  let destination = id;
  try {
    if (id) {
      const { data, error } = await supabase
        .from("generations")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      if (error || !data)
        return { error: "This take no longer exists or could not be read." };
    }
    if (svg) {
      const clean = sanitizeIllustration(svg);
      uploadedPath = `${user.id}/${randomUUID()}.svg`;
      const { error } = await supabase.storage
        .from("caption-images")
        .upload(uploadedPath, Buffer.from(clean), {
          contentType: "image/svg+xml",
        });
      if (error)
        return { error: "The illustration couldn't be saved. Try again." };
    }
    const values = {
      scene,
      style,
      caption,
      prompt,
      model,
      image_description: alt || null,
      image_prompt: imagePrompt || null,
      ...(uploadedPath ? { image_path: uploadedPath } : {}),
    };
    if (id) {
      const { error } = await supabase
        .from("generations")
        .update(values)
        .eq("id", id);
      if (error) {
        if (uploadedPath)
          await supabase.storage.from("caption-images").remove([uploadedPath]);
        return { error: "The take couldn't be updated. Please try again." };
      }
    } else {
      destination = randomUUID();
      const { error } = await supabase
        .from("generations")
        .insert({ id: destination, created_by: user.id, ...values });
      if (error) {
        if (uploadedPath)
          await supabase.storage.from("caption-images").remove([uploadedPath]);
        return { error: "The take couldn't be created. Please try again." };
      }
    }
  } catch {
    if (uploadedPath)
      await supabase.storage.from("caption-images").remove([uploadedPath]);
    return { error: "The database request failed. Your draft is still here." };
  }
  if (uploadedPath)
    await supabase.rpc("register_own_image", {
      p_bucket: "caption-images",
      p_path: uploadedPath,
      p_alt: alt,
      p_prompt: imagePrompt,
    });
  const requestId = String(form.get("requestId") ?? "");
  if (uuid.test(requestId)) {
    await supabase
      .from("generation_requests")
      .update({ status: "succeeded", generation_id: destination })
      .eq("id", requestId)
      .eq("user_id", user.id)
      .eq("status", "drafted");
  }
  revalidatePath("/", "layout");
  redirect(`/media/${destination}?saved=1`);
}

export async function deleteMedia(
  _previous: EditorState,
  form: FormData,
): Promise<EditorState> {
  const { supabase } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (!uuid.test(id) || form.get("confirmation") !== "DELETE")
    return { error: "Type DELETE to confirm this permanent deletion." };
  const { data: item, error: readError } = await supabase
    .from("generations")
    .select("id,image_path")
    .eq("id", id)
    .maybeSingle();
  if (readError || !item)
    return { error: "This take no longer exists or couldn't be loaded." };
  const { data: removed, error } = await supabase
    .from("generations")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || removed?.length !== 1)
    return { error: "The take couldn't be deleted. Please try again." };
  if (item.image_path)
    await supabase
      .from("images")
      .delete()
      .eq("bucket", "caption-images")
      .eq("path", item.image_path);
  const cleanup = item.image_path
    ? await supabase.storage.from("caption-images").remove([item.image_path])
    : null;
  revalidatePath("/", "layout");
  redirect(`/media?deleted=1${cleanup?.error ? "&cleanup=warning" : ""}`);
}
