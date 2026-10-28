"use client";
/* eslint-disable @next/next/no-img-element */
import { useActionState, useRef, useState } from "react";
import {
  prepareImageUpload,
  saveImage,
  deleteImage,
} from "@/app/image-actions";
import type { Row } from "@/lib/resources";
export function ImageEditor({
  item,
  preview,
}: {
  item?: Row;
  preview?: string;
}) {
  const [state, action, pending] = useActionState(saveImage, { error: null });
  const [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [path, setPath] = useState(""),
    [localPreview, setPreview] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    setPath("");
    setUploading(true);
    try {
      const result = await prepareImageUpload(file.type, file.size);
      if (result.error || !result.signedUrl || !result.path)
        throw Error(result.error ?? "Upload could not start.");
      const response = await fetch(result.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type, "x-upsert": "false" },
        body: file,
      });
      if (!response.ok) throw Error("Upload failed. Please try again.");
      setPath(result.path);
      setPreview(URL.createObjectURL(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      if (input.current) input.current.value = "";
    } finally {
      setUploading(false);
    }
  }
  return (
    <form action={action} className="editor-form compact-editor">
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <input type="hidden" name="path" value={path} />
      {!item && (
        <label>
          Upload image
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => upload(e.target.files?.[0])}
            disabled={pending || uploading}
          />
          <small>
            JPG, PNG, WebP or GIF · up to 5 MB · stored privately in Supabase
            Storage.
          </small>
        </label>
      )}
      {(preview || localPreview) && (
        <figure className="image-preview">
          <img
            src={localPreview || preview}
            alt={String(item?.alt_text || "Image preview")}
          />
        </figure>
      )}
      {uploading && <p role="status">Uploading image…</p>}
      {path && (
        <p className="notice success" role="status">
          Image uploaded. Add its details and save.
        </p>
      )}
      <fieldset disabled={pending || uploading}>
        <legend>Image details</legend>
        <label>
          Title
          <input
            name="label"
            defaultValue={String(item?.label ?? "")}
            required
            maxLength={150}
          />
        </label>
        <label>
          Accessible description
          <textarea
            name="alt_text"
            defaultValue={String(item?.alt_text ?? "")}
            maxLength={600}
          />
        </label>
        <label>
          AI prompt (if AI generated)
          <textarea
            name="prompt"
            defaultValue={String(item?.prompt ?? "")}
            maxLength={20000}
          />
        </label>
      </fieldset>
      {(error || state.error) && (
        <p role="alert" className="notice error">
          {error || state.error}
        </p>
      )}
      <button
        className="button primary"
        disabled={pending || uploading || (!item && !path)}
      >
        {pending
          ? "Saving…"
          : item
            ? "Save image details"
            : "Create image record"}
      </button>
    </form>
  );
}
export function ImageDelete({ id, inUse }: { id: string; inUse: boolean }) {
  const [state, action, pending] = useActionState(deleteImage, { error: null });
  return (
    <details className="danger-zone">
      <summary>Delete image</summary>
      <p>
        {inUse
          ? "Deleting this image also removes its photo reference from linked profiles or takes. User profiles, captions and votes are kept. The file and its metadata are permanently deleted."
          : "Permanently deletes the file and its metadata. This cannot be undone."}
      </p>
      <form action={action}>
        <input name="id" type="hidden" value={id} />
        <label>
          Type DELETE to confirm
          <input
            name="confirmation"
            pattern="DELETE"
            required
            autoComplete="off"
            disabled={pending}
          />
        </label>
        {state.error && (
          <p className="notice error" role="alert">
            {state.error}
          </p>
        )}
        <button className="button danger" disabled={pending}>
          Permanently delete image
        </button>
      </form>
    </details>
  );
}
