"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page">
      <section className="panel empty">
        <h1>Something didn&apos;t load.</h1>
        <p>
          The database request failed. Your changes haven&apos;t been discarded.
        </p>
        <button className="button primary" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
