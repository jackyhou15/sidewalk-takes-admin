"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { resourceFor } from "@/lib/resources";
const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
export type ResourceState = { error: string | null };
function dbMessage(code: string, message: string) {
  if (code === "23505")
    return "That value already exists. Choose a different name, model ID, domain or email.";
  if (code === "23503")
    return "This record is used by another record. Remove or change that reference first.";
  if (code === "23514" && message.includes("Keep at least"))
    return "Keep at least one enabled chain with positive weight and an enabled model/provider.";
  if (code === "23514")
    return "One of the values is outside the accepted format or range. Check the form.";
  return "The change could not be saved. Refresh and try again.";
}
export async function saveResource(
  slug: string,
  _prev: ResourceState,
  form: FormData,
): Promise<ResourceState> {
  const { supabase } = await requireAdmin();
  const spec = resourceFor(slug);
  if (!spec || spec.mode !== "crud")
    return { error: "This section is read-only." };
  const id = String(form.get("id") ?? "");
  if (id && !uuid.test(id)) return { error: "Invalid record ID." };
  const values: Record<string, string | number | boolean> = {};
  for (const f of spec.fields) {
    if (f.type === "boolean") {
      values[f.key] = form.get(f.key) === "on";
      continue;
    }
    const raw = String(form.get(f.key) ?? "").trim();
    if (f.required && !raw) return { error: `${f.label} is required.` };
    if (f.type === "number") {
      const n = Number(raw);
      if (
        !Number.isFinite(n) ||
        (f.min !== undefined && n < f.min) ||
        (f.max !== undefined && n > f.max)
      )
        return { error: `Check ${f.label}.` };
      values[f.key] = n;
      continue;
    }
    if (
      (f.max !== undefined && raw.length > f.max) ||
      (f.min !== undefined && raw.length < f.min)
    )
      return { error: `Check the length of ${f.label}.` };
    if (f.options && !f.options.some((o) => o.value === raw))
      return { error: `Choose a valid ${f.label}.` };
    if (f.reference && !uuid.test(raw))
      return { error: `Choose a valid ${f.label}.` };
    values[f.key] = raw;
  }
  if (slug === "domains") {
    const domain = String(values.domain).toLowerCase();
    if (
      !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(
        domain,
      )
    )
      return {
        error: "Use a domain such as columbia.edu without @, URL or spaces.",
      };
    values.domain = domain;
  }
  if (slug === "emails") {
    const email = String(values.email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return { error: "Enter a valid email address." };
    values.email = email;
  }
  if (
    slug === "models" &&
    !/^[A-Za-z0-9._-]{1,100}$/.test(String(values.model_key))
  )
    return { error: "Enter a valid Gemini model ID." };
  const result = id
    ? await supabase
        .from(spec.table)
        .update(values)
        .eq("id", id)
        .select("id")
        .single()
    : await supabase.from(spec.table).insert(values).select("id").single();
  if (result.error)
    return { error: dbMessage(result.error.code, result.error.message) };
  revalidatePath("/", "layout");
  redirect(`/manage/${slug}/${result.data.id}?saved=1`);
}
export async function deleteResource(
  slug: string,
  _prev: ResourceState,
  form: FormData,
): Promise<ResourceState> {
  const { supabase } = await requireAdmin();
  const spec = resourceFor(slug);
  if (!spec || spec.mode !== "crud")
    return { error: "This section is read-only." };
  const id = String(form.get("id") ?? "");
  if (!uuid.test(id) || form.get("confirmation") !== "DELETE")
    return { error: "Type DELETE to confirm." };
  const { data, error } = await supabase
    .from(spec.table)
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return { error: dbMessage(error.code, error.message) };
  if (data.length !== 1) return { error: "This record no longer exists." };
  revalidatePath("/", "layout");
  redirect(`/manage/${slug}?deleted=1`);
}
export async function saveMix(
  _prev: ResourceState,
  form: FormData,
): Promise<ResourceState> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("prompt_chain_mix").select("id");
  if (error) return { error: "The mix could not be loaded." };
  const rows = [];
  for (const r of data) {
    const weight = Number(form.get(`weight-${r.id}`));
    if (!Number.isInteger(weight) || weight < 0 || weight > 1000)
      return { error: "Weights must be whole numbers from 0 to 1000." };
    rows.push({
      id: r.id,
      weight,
      enabled: form.get(`enabled-${r.id}`) === "on",
    });
  }
  if (!rows.some((r) => r.enabled && r.weight > 0))
    return { error: "Keep at least one enabled chain with a positive weight." };
  const result = await supabase.rpc("update_prompt_mix", { p_rows: rows });
  if (result.error)
    return { error: dbMessage(result.error.code, result.error.message) };
  revalidatePath("/", "layout");
  redirect("/manage/mix?saved=1");
}
