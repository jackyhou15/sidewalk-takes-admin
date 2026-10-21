"use client";
/* eslint-disable @next/next/no-img-element */
import { useActionState, useState, useTransition } from "react";
import { saveMedia, generateDraft, deleteMedia } from "@/app/media-actions";
import { captionStyles, type CaptionStyle } from "@/lib/caption-styles";
import type { Media } from "@/lib/data";
export function MediaEditor({ item }: { item?: Media }) {
  const [state, action, saving] = useActionState(saveMedia, {
    error: null as string | null,
  });
  const [generating, startGeneration] = useTransition();
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [scene, setScene] = useState(item?.scene ?? "");
  const [style, setStyle] = useState<CaptionStyle>(
    (item?.style as CaptionStyle) ?? "dry",
  );
  const [caption, setCaption] = useState(item?.caption ?? "");
  const [prompt, setPrompt] = useState(item?.prompt ?? "");
  const [model, setModel] = useState(item?.model ?? "gemini-3.5-flash-lite");
  const [imageSvg, setImageSvg] = useState("");
  const [imageDescription, setImageDescription] = useState(
    item?.image_description ?? "",
  );
  const [imagePrompt, setImagePrompt] = useState(item?.image_prompt ?? "");
  const [withImage, setWithImage] = useState(false);
  const pending = saving || generating;
  function generate() {
    setGenerationError(null);
    startGeneration(async () => {
      const result = await generateDraft(scene, style, withImage);
      if (result.error !== null) {
        setGenerationError(result.error);
        return;
      }
      setCaption(result.draft.caption);
      setPrompt(result.draft.prompt);
      setModel(result.draft.model);
      setImageSvg(result.draft.imageSvg);
      if (withImage || !item?.image_path) {
        setImageDescription(result.draft.imageDescription);
        setImagePrompt(result.draft.imagePrompt);
      }
    });
  }
  return (
    <form action={action} className="editor-form">
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <input type="hidden" name="imageSvg" value={imageSvg} />
      <fieldset disabled={pending}>
        <legend>01 / Scene & tone</legend>
        <label>
          City moment
          <textarea
            name="scene"
            minLength={10}
            maxLength={300}
            value={scene}
            onChange={(e) => setScene(e.target.value)}
            placeholder="Describe a specific moment in New York…"
            required
          />
        </label>
        <label>
          Caption vibe
          <select
            name="style"
            value={style}
            onChange={(e) => setStyle(e.target.value as CaptionStyle)}
          >
            {Object.entries(captionStyles).map(([key, vibe]) => (
              <option key={key} value={key}>
                {vibe.label}
              </option>
            ))}
          </select>
        </label>
        <div className="tone-help">
          <strong>{captionStyles[style].description}</strong>
          <p>Example: {captionStyles[style].example}</p>
        </div>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={withImage}
            onChange={(e) => setWithImage(e.target.checked)}
          />{" "}
          Generate a new AI illustration too
        </label>
        <button
          className="button secondary"
          type="button"
          onClick={generate}
          disabled={scene.trim().length < 10 || pending}
        >
          {generating ? "Generating draft…" : "Generate AI draft ↗"}
        </button>
        <p className="small muted">
          Review the draft before publishing. Generated prompts are kept with
          the take.
          {item?.image_path && !withImage
            ? " The existing illustration and its prompt will be kept."
            : ""}
        </p>
        {generationError && (
          <p className="notice error" role="alert">
            {generationError}
          </p>
        )}
      </fieldset>
      <fieldset disabled={pending}>
        <legend>02 / Review & publish</legend>
        <label>
          Caption
          <textarea
            name="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            minLength={1}
            maxLength={500}
            required
            placeholder="Generate a draft above, or paste an AI-generated caption."
          />
        </label>
        <label>
          Model
          <input
            name="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            maxLength={100}
            required
          />
        </label>
        <label>
          Saved AI prompt
          <textarea
            name="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={20000}
            required
          />
        </label>
        {imageSvg && (
          <figure className="draft-preview">
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(imageSvg)}`}
              alt={imageDescription || "Generated illustration preview"}
              width={800}
              height={600}
            />
            <figcaption>
              New AI illustration · saved as a Storage file when published
            </figcaption>
          </figure>
        )}
        <label>
          Image description
          <input
            name="imageDescription"
            value={imageDescription}
            onChange={(e) => setImageDescription(e.target.value)}
            maxLength={600}
          />
        </label>
        <label>
          Saved illustration prompt
          <textarea
            name="imagePrompt"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            maxLength={20000}
          />
        </label>
      </fieldset>
      {state.error && (
        <p className="notice error" role="alert">
          {state.error}
        </p>
      )}
      <div className="editor-submit">
        <p className="small muted">
          {item
            ? "Changes will appear on the public rating board."
            : "Publishing creates a new row in the shared media database."}
        </p>
        <button className="button primary" disabled={pending} type="submit">
          {saving ? "Saving…" : item ? "Save changes" : "Publish AI media"}
        </button>
      </div>
    </form>
  );
}
export function DeleteMedia({ id, ratings }: { id: string; ratings: number }) {
  const [state, action, pending] = useActionState(deleteMedia, {
    error: null as string | null,
  });
  return (
    <details className="danger-zone">
      <summary>Delete this take</summary>
      <p>
        This permanently deletes the media record, its illustration, {ratings}{" "}
        linked ratings, and any saved references. It cannot be undone.
      </p>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <label>
          Type DELETE to confirm
          <input
            name="confirmation"
            required
            pattern="DELETE"
            placeholder="DELETE"
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
          {pending ? "Deleting…" : "Permanently delete this take"}
        </button>
      </form>
    </details>
  );
}
