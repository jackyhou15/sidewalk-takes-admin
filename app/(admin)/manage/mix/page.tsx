import Link from "next/link";
import { resourceRows } from "@/lib/resource-data";
import { PageHeading } from "@/app/components/page-heading";
import { MixEditor } from "@/app/components/resource-editor";
export default async function Mix({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [mix, chains, models, providers, search] = await Promise.all([
    resourceRows("prompt_chain_mix"),
    resourceRows("prompt_chains"),
    resourceRows("llm_models"),
    resourceRows("llm_providers"),
    searchParams,
  ]);
  const rows = mix.map((r) => {
    const c = chains.find((c) => c.id === r.chain_id)!;
    const m = models.find((m) => m.id === c.model_id);
    const p = providers.find((p) => p.id === m?.provider_id);
    return {
      ...r,
      enabled: Boolean(r.enabled),
      weight: Number(r.weight),
      name: String(c.name),
      description: String(c.description),
      available: Boolean(m?.enabled && p?.enabled),
    };
  });
  const total = rows
    .filter((r) => r.enabled && r.available)
    .reduce((s, r) => s + Number(r.weight), 0);
  return (
    <main className="page">
      <PageHeading
        eyebrow="Generation routing"
        title="Prompt chain mix"
        description="Control which instruction sequence handles new generations. Changes are saved together and apply to both apps immediately."
        action={
          <Link href="/manage/prompt-chains" className="button secondary">
            Inspect chains ↗
          </Link>
        }
      />
      {search.saved && (
        <p className="notice success" role="status">
          Prompt chain mix saved. New requests use these weights.
        </p>
      )}
      <section className="panel">
        <h2>Current traffic distribution</h2>
        <p className="muted">
          Weights are relative, not percentages. Disabled chains or models
          receive no traffic. Keep at least one usable chain.
        </p>
        <div className="distribution">
          {rows.map((r) => (
            <div key={r.id}>
              <strong>{r.name}</strong>
              <progress
                value={r.enabled && r.available ? Number(r.weight) : 0}
                max={Math.max(1, total)}
              />
              <span>
                {r.enabled && r.available && total
                  ? Math.round((100 * Number(r.weight)) / total)
                  : 0}
                %{!r.available ? " · model unavailable" : ""}
              </span>
            </div>
          ))}
        </div>
        <MixEditor rows={rows} />
      </section>
    </main>
  );
}
