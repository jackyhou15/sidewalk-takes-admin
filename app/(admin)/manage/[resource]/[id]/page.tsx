import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { resourceFor, labelFor, type Row } from "@/lib/resources";
import { resourceRows, referenceLabels } from "@/lib/resource-data";
import { PageHeading } from "@/app/components/page-heading";
import {
  ResourceEditor,
  ResourceDelete,
} from "@/app/components/resource-editor";
export default async function ResourceDetail({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string; id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { resource: slug, id } = await params;
  const spec = resourceFor(slug);
  if (!spec) notFound();
  const { supabase } = await requireAdmin();
  const isNew = id === "new";
  if (isNew && spec.mode !== "crud") notFound();
  let item: Row | undefined;
  if (!isNew) {
    if (!/^[\da-f-]{36}$/i.test(id)) notFound();
    const { data, error } = await supabase
      .from(spec.table)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw Error("This record could not be loaded.");
    if (!data) notFound();
    item = data as Row;
  }
  const refs = await referenceLabels();
  const options: Record<string, { value: string; label: string }[]> = {};
  for (const f of spec.fields.filter((f) => f.reference)) {
    const rows = await resourceRows(f.reference!);
    options[f.reference!] = rows.map((r) => ({
      value: r.id,
      label: String(r.name),
    }));
  }
  const search = await searchParams;
  return (
    <main className="page">
      <Link className="back-link" href={`/manage/${slug}`}>
        ← {spec.title}
      </Link>
      <PageHeading
        eyebrow={
          isNew
            ? "Create record"
            : spec.mode === "crud"
              ? "Manage record"
              : "Inspect record"
        }
        title={
          isNew
            ? `New ${spec.singular.toLowerCase()}`
            : (slug === "requests" || slug === "responses" ? spec.singular : String(item?.[spec.label] ?? spec.singular))
        }
        description={spec.description}
      />
      {spec.note && <p className="notice">{spec.note}</p>}
      {search.saved && (
        <p className="notice success" role="status">
          Saved to Supabase.
        </p>
      )}
      {spec.mode === "crud" ? (
        <>
          <section className="panel">
            <ResourceEditor
              slug={slug}
              spec={spec}
              item={item}
              options={options}
            />
          </section>
          {item && (
            <ResourceDelete
              slug={slug}
              id={id}
              name={String(item[spec.label])}
            />
          )}
        </>
      ) : (
        <section className="panel">
          <dl className="record-details">
            {Object.entries(item!).map(([key, val]) => (
              <div key={key}>
                <dt>{labelFor(key)}</dt>
                <dd>
                  {refs[String(val)] ? (
                    <Link className="text-link" href={refs[String(val)].href}>
                      {refs[String(val)].label} ↗
                    </Link>
                  ) : val === null ? (
                    "Not recorded"
                  ) : typeof val === "boolean" ? (
                    val ? (
                      "Yes"
                    ) : (
                      "No"
                    )
                  ) : (
                    <pre>{key.endsWith("_at") ? new Date(String(val)).toLocaleString("en-US",{timeZone:"America/New_York",timeZoneName:"short"}) : key === "duration_ms" ? `${(Number(val)/1000).toFixed(2)} seconds` : String(val)}</pre>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {slug === "requests" && (
            <Link
              className="button secondary"
              href={`/manage/responses?q=${id}`}
            >
              View this request’s LLM responses ↗
            </Link>
          )}
          {slug === "prompt-chains" && (
            <Link
              className="button secondary"
              href={`/manage/prompt-chain-steps?q=${id}`}
            >
              View ordered steps ↗
            </Link>
          )}
        </section>
      )}
      {item && spec.mode === "crud" && (
        <p className="small muted">
          Record ID: {id} · Created {String(item.created_at)}
        </p>
      )}
    </main>
  );
}
