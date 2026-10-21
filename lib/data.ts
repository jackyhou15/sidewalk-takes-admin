import "server-only";
import { requireAdmin } from "@/lib/auth";
export type Media = {
  id: string;
  created_by: string;
  scene: string;
  style: string;
  caption: string;
  prompt: string;
  model: string;
  image_path: string | null;
  image_description: string | null;
  image_prompt: string | null;
  created_at: string;
};
export type Rating = {
  id: number;
  generation_id: string;
  user_id: string;
  value: number;
  created_at: string;
  updated_at: string;
};
export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  is_superadmin: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  avatar_path: string | null;
};
export type AdminData = {
  media: Media[];
  ratings: Rating[];
  profiles: Profile[];
  observedAt: string;
};
export async function loadAdminData(): Promise<AdminData> {
  const { supabase } = await requireAdmin();
  // Page through the database so Supabase's row cap cannot silently truncate counts.
  async function allRows(table: "generations" | "votes") {
    const rows = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("id")
        .range(page * 500, page * 500 + 499);
      if (error)
        throw new Error(
          "The admin database could not be loaded. Please refresh.",
        );
      rows.push(...data);
      if (data.length < 500) return rows;
      page++;
    }
  }
  const [media, ratings, users] = await Promise.all([
    allRows("generations"),
    allRows("votes"),
    supabase.rpc("admin_profiles"),
  ]);
  if (users.error)
    throw new Error("The user directory could not be loaded. Please refresh.");
  return {
    observedAt: new Date().toISOString(),
    media: (media as Media[]).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    ),
    ratings: (ratings as Rating[]).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    ),
    profiles: users.data as Profile[],
  };
}
export function scoresFor(id: string, ratings: Rating[]) {
  const rows = ratings.filter((row) => row.generation_id === id);
  const up = rows.filter((row) => row.value === 1).length;
  return {
    up,
    down: rows.length - up,
    score: 2 * up - rows.length,
    count: rows.length,
  };
}
export function displayName(profile?: Profile) {
  return (
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    "Name not added"
  );
}
export function displayDate(date?: string | null) {
  return date
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(date))
    : "—";
}
export function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
