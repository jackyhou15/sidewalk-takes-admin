import Link from "next/link";
export default function NotFound() {
  return (
    <main className="page">
      <section className="panel empty">
        <h1>That take isn’t here.</h1>
        <p>
          It may have been deleted. Return to the media library to keep working.
        </p>
        <Link className="button primary" href="/media">
          All AI media
        </Link>
      </section>
    </main>
  );
}
