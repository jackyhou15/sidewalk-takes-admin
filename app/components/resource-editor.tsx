"use client";
import { useActionState } from "react";
import { saveResource, deleteResource, saveMix } from "@/app/resource-actions";
import { type Resource, type Row } from "@/lib/resources";
export function ResourceEditor({
  slug,
  spec,
  item,
  options,
}: {
  slug: string;
  spec: Resource;
  item?: Row;
  options: Record<string, { value: string; label: string }[]>;
}) {
  const [state, action, pending] = useActionState(
    saveResource.bind(null, slug),
    { error: null },
  );
  return (
    <form action={action} className="editor-form compact-editor">
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <fieldset disabled={pending}>
        <legend>{item ? "Edit record" : "New record"}</legend>
        {spec.fields.map((f) => {
          const value = item?.[f.key] ?? f.default ?? "";
          return f.type === "boolean" ? (
            <label className="checkbox-field" key={f.key}>
              <input
                type="checkbox"
                name={f.key}
                defaultChecked={Boolean(value)}
              />
              {f.label}
            </label>
          ) : (
            <label key={f.key}>
              {f.label}
              {f.type === "textarea" ? (
                <textarea
                  name={f.key}
                  defaultValue={String(value)}
                  required={f.required}
                  minLength={f.min}
                  maxLength={f.max}
                  rows={f.key === "prompt" ? 7 : 4}
                />
              ) : f.type === "select" ? (
                <select
                  name={f.key}
                  defaultValue={String(value)}
                  required={f.required}
                >
                  <option value="" disabled>
                    Choose {f.label.toLowerCase()}
                  </option>
                  {(f.options ?? options[f.reference ?? ""] ?? []).map((o) => (
                    <option value={o.value} key={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name={f.key}
                  type={f.type ?? "text"}
                  defaultValue={String(value)}
                  required={f.required}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  minLength={f.type === "number" ? undefined : f.min}
                  maxLength={f.type === "number" ? undefined : f.max}
                />
              )}{" "}
              {f.help && <small>{f.help}</small>}
            </label>
          );
        })}
      </fieldset>
      {state.error && (
        <p role="alert" className="notice error">
          {state.error}
        </p>
      )}
      <button className="button primary" disabled={pending}>
        {pending
          ? "Saving…"
          : item
            ? "Save changes"
            : `Create ${spec.singular.toLowerCase()}`}
      </button>
    </form>
  );
}
export function ResourceDelete({
  slug,
  id,
  name,
}: {
  slug: string;
  id: string;
  name: string;
}) {
  const [state, action, pending] = useActionState(
    deleteResource.bind(null, slug),
    { error: null },
  );
  return (
    <details className="danger-zone">
      <summary>Delete this record</summary>
      <p>
        Permanently delete “{name}”? Records used elsewhere cannot be deleted.
        This cannot be undone.
      </p>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
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
          <p role="alert" className="notice error">
            {state.error}
          </p>
        )}
        <button disabled={pending} className="button danger">
          {pending ? "Deleting…" : "Permanently delete record"}
        </button>
      </form>
    </details>
  );
}
export function MixEditor({
  rows,
}: {
  rows: (Row & { name: string; description: string })[];
}) {
  const [state, action, pending] = useActionState(saveMix, { error: null });
  return (
    <form action={action} className="editor-form">
      <div className="mix-grid">
        {rows.map((r) => (
          <fieldset disabled={pending} key={r.id}>
            <legend>{r.name}</legend>
            <p className="muted">{r.description}</p>
            <label className="checkbox-field">
              <input
                type="checkbox"
                name={`enabled-${r.id}`}
                defaultChecked={Boolean(r.enabled)}
              />
              Enabled for new requests
            </label>
            <label>
              Traffic weight
              <input
                type="number"
                name={`weight-${r.id}`}
                defaultValue={Number(r.weight)}
                min={0}
                max={1000}
                step={1}
                required
              />
            </label>
          </fieldset>
        ))}
      </div>
      {state.error && (
        <p className="notice error" role="alert">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="button primary">
        {pending ? "Saving…" : "Save prompt chain mix"}
      </button>
    </form>
  );
}
