import "server-only";
import { requireAdmin } from "@/lib/auth";
import { type Row } from "@/lib/resources";
export async function resourceRows(table: string) {
  const { supabase } = await requireAdmin();
  const rows: Row[] = [];
  const columns: Record<string, string> = {
    llm_responses:
      "id,request_id,user_id,model_key,status,duration_ms,input_tokens,output_tokens,total_tokens,error,created_at",
    ai_generation_examples: "id,title,scene,style,caption,enabled,created_at",
    images: "id,bucket,path,label,alt_text,created_by,created_at",
  };
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from(table)
      .select(columns[table] ?? "*")
      .order("id")
      .range(page * 500, page * 500 + 499);
    if (error)
      throw Error("This section could not be loaded. Refresh and try again.");
    rows.push(...(data as unknown as Row[]));
    if (data.length < 500) return rows;
  }
}
export async function referenceLabels() {
  const { supabase } = await requireAdmin();
  const labels: Record<string, { label: string; href: string }> = {};
  const groups = [
    ["llm_providers", "providers", "name"],
    ["llm_models", "models", "name"],
    ["prompt_chains", "prompt-chains", "name"],
    ["generation_requests", "requests", "scene"],
    ["generations", "media", "caption"],
  ] as const;
  await Promise.all(
    groups.map(async ([table, slug, key]) => {
      const { data, error } = await supabase
        .from(table)
        .select(`id,${key}`)
        .limit(1000);
      if (error) throw Error("Related records could not be loaded.");
      for (const row of (data ?? []) as unknown as Row[]) {
        labels[row.id] = {
          label: String(row[key]),
          href:
            slug === "media" ? `/media/${row.id}` : `/manage/${slug}/${row.id}`,
        };
      }
    }),
  );
  const { data, error } = await supabase.rpc("admin_profiles");
  if (error) throw Error("Users could not be loaded.");
  for (const p of data ?? [])
    labels[p.id] = {
      label: p.email,
      href: `/users?q=${encodeURIComponent(p.email)}`,
    };
  return labels;
}

export async function observationTime() {
  return Date.now();
}
