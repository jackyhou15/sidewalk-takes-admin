# Week 7 — Admin Panel with More Observability

## Where to find each requirement

- Users/profiles: **Users & profiles** (read only).
- Prompt chains and ordered steps: **Generation setup → Prompt chains / Prompt chain steps** (read only).
- Prompt chain mix: **Generation setup → Prompt chain mix** (read/update); relative weights affect real new requests in both apps. Changes save atomically; a usable chain must remain enabled.
- Terms: **Generation setup → Terms** (create/read/update/delete). Enabled definitions are used in prompts.
- AI media: **Community → AI media** (view and the existing create/edit/delete workflow).
- Generation requests: **Observability → Generation requests** (read), linked to model responses and published takes.
- AI generation examples: **Generation setup → AI generation examples** (create/read/update/delete). Up to three enabled examples matching the selected vibe are included in new prompts.
- LLM models/providers: **Generation setup → LLM models / LLM providers** (create/read/update/delete). Gemini is the installed adapter; API keys stay in environment variables. Referenced models/providers cannot be deleted.
- LLM responses: **Observability → LLM responses** (read exact prompt/output, model ID, duration, provider-reported token counts).
- Allowed signup domains / whitelisted emails: **Signup access** (create/read/update/delete). With no enabled entries signup remains open. Once entries are enabled, new accounts must match either list. Existing accounts retain access. No list entry grants admin access.
- Images: **Community → Images** (upload/create/read/edit metadata/delete files). Uploads go to private Supabase Storage; existing private avatars remain private. Deleting an in-use image clears its photo references while preserving profiles, captions and votes; deletion requires typing DELETE. Files are not stored as relational binary data.

## Real observability

**Generation health** summarizes the last 24 hours and links each request to its trace. Caption and optional illustration steps are compiled into one structured Gemini request. Logging starts with this release; historical timing, tokens and requests are not fabricated. Provider success and usable/published output are tracked separately.

## Access

Every protected route/read/action rechecks Google authentication and the current `profiles.is_superadmin` database flag. RLS also restricts the tables and Storage. The existing owner and Prasie retain their admin flags. Ordinary users only receive enabled runtime context and can write their own request logs; they cannot browse admin configuration or other users’ traces.

## Prior feedback

The public app retains the explanation and example for each vibe, **My collection** instead of Private studio, saved captions, and optional AI illustrations with accessible descriptions and saved prompts.

## Database setup

Apply `supabase/week7_observability.sql`, then `supabase/week7_image_deletion.sql` to the existing shared Supabase project. These migrations are already applied to production.

## Database verification

`supabase/verify_week7.sql` exercises admin CRUD, the reviewer’s access, referenced-model and last-live-chain protection, ordinary-member isolation, and anonymous denial inside a transaction that is rolled back.

## Verified on October 28, 2026

- Both repositories pass lint and production builds.
- Rollback integration checks pass for all new CRUD resources, owner/reviewer administrator access, member isolation, anonymous denial, signup allowlists, the last-live-chain guard, and referenced-image protection.
- Real public caption + SVG generation, admin draft generation and publishing, and the exact corresponding model responses were verified in the deployed apps.
- Switching the mix to the alternate chain changed the next actual request. The original City scene mix was restored afterward.
- A newly cast vote and saved caption survived a reload.
- Browser image upload, private signed preview, metadata editing, and deletion of both the image record and its Storage file passed. The admin-only image deletion RPC also handles referenced photos without deleting profiles, captions or votes. The temporary test image and disabled test term were removed after user confirmation.
- Unauthenticated requests to protected admin routes redirect to the app’s Google login page; the public board returns HTTP 200 without a session. Vercel deployment protection is disabled.
- Tracked files were checked for the actual configured Supabase and Gemini credential values; no matches were found, and `.env.local` is not tracked.
