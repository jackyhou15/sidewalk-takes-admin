import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHeading } from "@/app/components/page-heading";
import { MediaEditor } from "@/app/components/media-editor";
export const maxDuration = 60;
export default async function NewMedia() {
  await requireAdmin();
  return (
    <main className="page editor-page">
      <Link className="back-link" href="/media">
        ← All AI media
      </Link>
      <PageHeading
        eyebrow="From idea to the board"
        title="Create an AI take"
        description="Give the AI a scene, choose a vibe, then review and publish the result."
      />
      <section className="panel">
        <MediaEditor />
      </section>
    </main>
  );
}
