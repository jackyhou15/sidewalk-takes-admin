# Sidewalk Takes — Admin

Week 6 admin area for the existing Sidewalk Takes rating app. This is a separate Next.js repository and Vercel project connected to the same Supabase database.

## Features

- Overview: real content/member/vote totals, approval, seven-day activity in New York time, participation, vibe comparison, closest split opinion and ranking.
- Users & profiles: read names, emails, role, account activity and participation; search/filter.
- AI media: generate an editable Gemini caption and optional SVG illustration; preserve generation prompts; create, read, edit and permanently delete database records.
- Ratings: read votes with their associated member and media; search/filter by direction.

## Authentication and authorization

Every admin data page and Server Action checks the verified Google user and calls `is_superadmin()` in the database. The layout alone is not the security boundary. Unauthorized users see a login or access-denied screen.

`supabase/week6_admin.sql` adds `profiles.is_superadmin`, default false. A database-owner migration bootstraps the existing project owner. The flag cannot be set by profile updates/upserts, even by an authenticated superadmin. No role-management UI, service-role key, or client-side allowlist is used. Database RLS also enforces media administration and private user/rating reads. The user directory function returns only the needed account fields after checking admin authorization.

Deploy with Vercel deployment protection disabled, while retaining the app's Google/admin checks.

## Setup

1. Install dependencies with `npm ci`.
2. Configure the values shown in `.env.example` locally and in Vercel. Never commit credentials.
3. Apply `supabase/week6_admin.sql` as the database owner to the existing Week 3–5 database. Review the bootstrap email before running it for another owner.
4. Add the exact admin origin plus `/auth/callback` to Supabase Auth's redirect allowlist. Google still redirects to the existing Supabase provider callback.
5. Run `npm run dev`; verify with `npm run lint` and `npm run build`.

Images are sanitized SVG files in Supabase Storage; only paths/descriptions/prompts are relational columns. Uploaded profile photos continue to use the original rating app's Storage workflow.

## Previous PM feedback retained

The public rating app explains each caption vibe, replaces “Private studio” with clear Create/My collection navigation, supports saving/pinning captions, and generates optional original AI illustrations with captions. This admin editor reuses those same vibe explanations and image generation conventions.

## Manual acceptance flow

- Signed out: every admin data route redirects to Google login without displaying records.
- Google account without the database flag: access denied, including direct URLs and mutations.
- Approved administrator: overview/user/rating reads work; generate and publish a take, edit it and verify the public board; delete only a disposable test record after confirmation.
- Database: ordinary users cannot set their admin flag, read another profile/vote, or update/delete media. Existing public profile updates and user votes remain functional.

Deleting media permanently cascades associated votes and saved references. The UI requires typing DELETE and shows the number of affected ratings.
