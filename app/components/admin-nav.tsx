"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const groups = [
  {
    label: "Community",
    items: [
      ["/", "Overview"],
      ["/users", "Users & profiles"],
      ["/media", "AI media"],
      ["/ratings", "Ratings"],
      ["/images", "Images"],
    ],
  },
  {
    label: "Observability",
    items: [
      ["/observability", "Generation health"],
      ["/manage/requests", "Generation requests"],
      ["/manage/responses", "LLM responses"],
    ],
  },
  {
    label: "Generation setup",
    items: [
      ["/manage/prompt-chains", "Prompt chains"],
      ["/manage/prompt-chain-steps", "Prompt chain steps"],
      ["/manage/mix", "Prompt chain mix"],
      ["/manage/terms", "Terms"],
      ["/manage/examples", "AI generation examples"],
      ["/manage/models", "LLM models"],
      ["/manage/providers", "LLM providers"],
    ],
  },
  {
    label: "Signup access",
    items: [
      ["/manage/domains", "Allowed signup domains"],
      ["/manage/emails", "Whitelisted emails"],
    ],
  },
];
export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin navigation">
      {groups.map((g) => (
        <div className="nav-group" key={g.label}>
          <p>{g.label}</p>
          {g.items.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                (
                  href === "/"
                    ? path === "/"
                    : path === href || path.startsWith(`${href}/`)
                )
                  ? "page"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
