import Link from "next/link";
import {
  resourceRows,
  referenceLabels,
  observationTime,
} from "@/lib/resource-data";
import { PageHeading } from "@/app/components/page-heading";
export default async function Observability() {
  const [requests, responses, refs] = await Promise.all([
    resourceRows("generation_requests"),
    resourceRows("llm_responses"),
    referenceLabels(),
  ]);
  const observedAt = await observationTime();
  const lastDay = requests.filter(
    (r) => Date.parse(String(r.created_at)) >= observedAt - 86400000,
  );
  const finished = lastDay.filter((r) =>
    ["succeeded", "drafted", "failed"].includes(String(r.status)),
  );
  const success = finished.filter((r) => r.status !== "failed");
  const timed = success
    .map((r) => Number(r.duration_ms))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const p95 = timed.length ? timed[Math.ceil(timed.length * 0.95) - 1] : null;
  const recent = [...requests]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 8);
  const tokens = responses.reduce((s, r) => s + Number(r.total_tokens ?? 0), 0);
  return (
    <main className="page">
      <PageHeading
        eyebrow="Generation health"
        title="From scene to response."
        description="Trace real generation activity across the public app and admin drafts. Metrics below use the last 24 hours; token totals include all recorded responses."
        action={
          <Link className="button primary" href="/media/new">
            + Generate a draft
          </Link>
        }
      />
      <section className="metrics">
        {[
          ["Requests", lastDay.length, "Last 24 hours"],
          [
            "Completion rate",
            finished.length
              ? `${Math.round((100 * success.length) / finished.length)}%`
              : "—",
            `${finished.length} completed requests`,
          ],
          [
            "95th percentile",
            p95 === null ? "—" : `${(p95 / 1000).toFixed(1)} s`,
            "Successful and draft request duration",
          ],
          [
            "Reported tokens",
            tokens.toLocaleString(),
            "Only tokens reported by the provider",
          ],
        ].map(([label, value, note]) => (
          <article className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Recent requests</h2>
            <p>Open a request to inspect its exact model response.</p>
          </div>
          <Link className="text-link" href="/manage/requests">
            All requests ↗
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Scene</th>
                <th>Source / user</th>
                <th>Chain</th>
                <th>Status</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link
                      className="table-title"
                      href={`/manage/requests/${r.id}`}
                    >
                      {String(r.scene)}
                    </Link>
                    <small className="block-muted">
                      {new Date(String(r.created_at)).toLocaleString("en-US", {
                        timeZone: "America/New_York",
                      })}
                    </small>
                  </td>
                  <td>
                    {String(r.source)}
                    <small className="block-muted">
                      {refs[String(r.user_id)]?.label ?? "Deleted user"}
                    </small>
                  </td>
                  <td>{String(r.chain_name)}</td>
                  <td>
                    <span className={`status-pill ${r.status}`}>
                      {String(r.status)}
                    </span>
                    {r.status === "running" &&
                      Date.parse(String(r.created_at)) <
                        observedAt - 120000 && (
                        <small className="block-muted">
                          Possibly interrupted
                        </small>
                      )}
                  </td>
                  <td>
                    {r.duration_ms == null
                      ? "In progress"
                      : `${(Number(r.duration_ms) / 1000).toFixed(2)} s`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!recent.length && (
          <p className="empty">
            No observed requests yet. Generate a new take to start the trace.
          </p>
        )}
      </section>
      <div className="dashboard-grid lower">
        <section className="panel">
          <h2>What’s in a trace?</h2>
          <ol className="trace-guide">
            <li>
              <strong>Request</strong>
              <p>
                Scene, vibe, requesting user, image choice and selected chain.
              </p>
            </li>
            <li>
              <strong>Compiled instructions</strong>
              <p>
                Ordered chain steps, vibe direction, vocabulary and curated
                examples.
              </p>
            </li>
            <li>
              <strong>Model response</strong>
              <p>
                Exact prompt and output, model ID, duration and available token
                usage.
              </p>
            </li>
            <li>
              <strong>Outcome</strong>
              <p>
                Published take, editable admin draft, or a recorded failure.
              </p>
            </li>
          </ol>
        </section>
        <section className="panel">
          <h2>Configuration shortcuts</h2>
          <div className="shortcut-list">
            {[
              [
                "mix",
                "Prompt chain mix",
                "Route new requests between instruction sequences.",
              ],
              ["terms", "Terms", "Give generations useful local context."],
              [
                "examples",
                "AI generation examples",
                "Show the model what a good take looks like.",
              ],
              [
                "models",
                "Models & providers",
                "Review the available generation runtime.",
              ],
              [
                "responses",
                "LLM responses",
                "Inspect model output and failures.",
              ],
            ].map(([slug, title, desc]) => (
              <Link href={`/manage/${slug}`} key={slug}>
                <strong>{title} ↗</strong>
                <span>{desc}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <p className="small muted">
        Observation starts with the Week 7 release. A compiled chain uses one
        structured model call; the illustration step is included only when
        requested. Historical takes are preserved without fabricated timing or
        token data.
      </p>
    </main>
  );
}
