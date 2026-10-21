import Link from "next/link";
import { loadAdminData, scoresFor, displayName, dayKey } from "@/lib/data";
import { PageHeading } from "@/app/components/page-heading";
export default async function Dashboard() {
  const { media, ratings, profiles, observedAt } = await loadAdminData();
  const up = ratings.filter((r) => r.value === 1).length;
  const rated = media.filter((m) =>
    ratings.some((r) => r.generation_id === m.id),
  ).length;
  const voters = new Set(ratings.map((r) => r.user_id)).size;
  const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.parse(observedAt) - (6 - i) * 86400000);
    const key = dayKey(d);
    return {
      label: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        timeZone: "America/New_York",
      }).format(d),
      key,
      media: media.filter((m) => dayKey(new Date(m.created_at)) === key).length,
      votes: ratings.filter((r) => dayKey(new Date(r.created_at)) === key)
        .length,
    };
  });
  const maxDay = Math.max(1, ...days.flatMap((d) => [d.media, d.votes]));
  const ranked = media
    .map((m) => ({ ...m, ...scoresFor(m.id, ratings) }))
    .sort((a, b) => b.score - a.score || b.count - a.count);
  const closest = ranked
    .filter((m) => m.up > 0 && m.down > 0)
    .sort(
      (a, b) => Math.abs(a.score) / a.count - Math.abs(b.score) / b.count,
    )[0];
  return (
    <main className="page">
      <PageHeading
        eyebrow="The bigger picture"
        title="What’s landing?"
        description="A live look at the people, takes, and reactions shaping Sidewalk Takes."
        action={
          <Link className="button primary" href="/media/new">
            + Create AI media
          </Link>
        }
      />
      <section className="metrics" aria-label="Summary statistics">
        {[
          [
            "AI takes",
            media.length,
            `${media.filter((m) => !!m.image_path).length} with an AI illustration`,
          ],
          ["Community members", profiles.length, `${voters} have cast a vote`],
          [
            "Votes cast",
            ratings.length,
            `${up} up · ${ratings.length - up} down`,
          ],
          [
            "Approval rate",
            `${pct(up, ratings.length)}%`,
            ratings.length ? "Upvotes as a share of all votes" : "No votes yet",
          ],
        ].map(([label, value, note]) => (
          <article className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>The last seven days</h2>
              <p>New takes and votes · New York time</p>
            </div>
            <div className="legend">
              <span className="dot teal" /> Takes <span className="dot coral" />{" "}
              Votes
            </div>
          </div>
          <div
            className="activity-chart"
            role="img"
            aria-label={days
              .map((d) => `${d.label}: ${d.media} takes and ${d.votes} votes`)
              .join("; ")}
          >
            {days.map((d) => (
              <div className="chart-day" key={d.key}>
                <div className="bar-pair">
                  <div
                    className="bar teal"
                    style={{ height: `${(d.media / maxDay) * 145}px` }}
                    title={`${d.media} takes`}
                  >
                    <span>{d.media}</span>
                  </div>
                  <div
                    className="bar coral"
                    style={{ height: `${(d.votes / maxDay) * 145}px` }}
                    title={`${d.votes} votes`}
                  >
                    <span>{d.votes}</span>
                  </div>
                </div>
                <span>{d.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel quality-panel">
          <p className="eyebrow">The audience pulse</p>
          <h2>Are people joining in?</h2>
          <div className="progress-stat">
            <div>
              <span>Voting participation</span>
              <strong>{pct(voters, profiles.length)}%</strong>
            </div>
            <progress value={voters} max={Math.max(1, profiles.length)} />
            <small>
              {voters} of {profiles.length} members have voted
            </small>
          </div>
          <div className="progress-stat">
            <div>
              <span>Content with feedback</span>
              <strong>{pct(rated, media.length)}%</strong>
            </div>
            <progress value={rated} max={Math.max(1, media.length)} />
            <small>
              {rated} of {media.length} takes have at least one vote
            </small>
          </div>
          <p className="insight">
            {media.length - rated
              ? `${media.length - rated} takes are still waiting for their first reaction.`
              : "Every take has heard from the crowd."}
          </p>
        </section>
      </div>
      <div className="dashboard-grid lower">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Which vibe wins?</h2>
              <p>Approval by tone, with sample sizes</p>
            </div>
          </div>
          <div className="vibe-stats">
            {["dry", "chaotic", "wholesome"].map((style) => {
              const items = media.filter((m) => m.style === style);
              const ids = new Set(items.map((m) => m.id));
              const votes = ratings.filter((r) => ids.has(r.generation_id));
              const ups = votes.filter((r) => r.value === 1).length;
              return (
                <div key={style}>
                  <span className={`badge ${style}`}>{style}</span>
                  <strong>
                    {votes.length ? `${pct(ups, votes.length)}%` : "—"}
                  </strong>
                  <small>
                    {items.length} takes · {votes.length} votes
                  </small>
                  <progress value={ups} max={Math.max(1, votes.length)} />
                </div>
              );
            })}
          </div>
          <p className="small muted">
            Small samples can swing quickly. These are descriptive counts, not
            predictions.
          </p>
        </section>
        <section className="panel spotlight">
          <p className="eyebrow">The closest call</p>
          {closest ? (
            <>
              <blockquote>{closest.caption}</blockquote>
              <p>
                {closest.up} upvotes · {closest.down} downvotes
              </p>
              <Link className="text-link" href={`/media/${closest.id}`}>
                Inspect this take ↗
              </Link>
            </>
          ) : (
            <>
              <h2>No split opinions yet.</h2>
              <p>
                A take appears here when it has both upvotes and downvotes. The
                most evenly split take gets the spotlight.
              </p>
              <Link className="text-link" href="/ratings">
                Explore all ratings ↗
              </Link>
            </>
          )}
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>The takes people like</h2>
            <p>Ranked by net score, then number of votes</p>
          </div>
          <Link className="text-link" href="/media">
            All media ↗
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Take</th>
                <th>Creator</th>
                <th>Vibe</th>
                <th>Votes</th>
                <th>Net score</th>
              </tr>
            </thead>
            <tbody>
              {ranked.slice(0, 5).map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link className="table-title" href={`/media/${item.id}`}>
                      {item.caption}
                    </Link>
                  </td>
                  <td>
                    {displayName(
                      profiles.find((p) => p.id === item.created_by),
                    )}
                  </td>
                  <td>
                    <span className={`badge ${item.style}`}>{item.style}</span>
                  </td>
                  <td>{item.count}</td>
                  <td>
                    <strong className="score">
                      {item.score > 0 ? "+" : ""}
                      {item.score}
                    </strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!media.length && (
            <p className="empty">
              No AI media yet. Create the first take to bring this dashboard to
              life.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
