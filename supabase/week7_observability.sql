begin;
create table public.llm_providers (
 id uuid primary key default gen_random_uuid(), name text not null unique check(length(name) between 1 and 100),
 adapter text not null default 'gemini' check(adapter in ('gemini')), enabled boolean not null default true,
 notes text not null default '' check(length(notes)<=2000), created_at timestamptz not null default now()
);
create table public.llm_models (
 id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.llm_providers(id) on delete restrict,
 name text not null check(length(name) between 1 and 100), model_key text not null unique check(model_key ~ '^[A-Za-z0-9._-]{1,100}$'),
 enabled boolean not null default true, temperature numeric not null default 0.9 check(temperature between 0 and 2),
 notes text not null default '' check(length(notes)<=2000), created_at timestamptz not null default now()
);
create table public.prompt_chains (
 id uuid primary key default gen_random_uuid(), name text not null unique, description text not null,
 model_id uuid not null references public.llm_models(id) on delete restrict, created_at timestamptz not null default now()
);
create table public.prompt_chain_steps (
 id uuid primary key default gen_random_uuid(), chain_id uuid not null references public.prompt_chains(id) on delete cascade,
 position integer not null check(position>0), name text not null, kind text not null check(kind in ('caption','illustration')),
 instruction text not null, unique(chain_id,position), created_at timestamptz not null default now()
);
create table public.prompt_chain_mix (
 id uuid primary key default gen_random_uuid(), chain_id uuid not null unique references public.prompt_chains(id) on delete restrict,
 weight integer not null default 100 check(weight between 0 and 1000), enabled boolean not null default true,
 updated_at timestamptz not null default now()
);
create table public.terms (
 id uuid primary key default gen_random_uuid(), term text not null unique check(length(term) between 1 and 100),
 definition text not null check(length(definition) between 1 and 2000), enabled boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.ai_generation_examples (
 id uuid primary key default gen_random_uuid(), title text not null check(length(title) between 1 and 100),
 scene text not null check(length(scene) between 10 and 300), style text not null check(style in ('dry','chaotic','wholesome')),
 caption text not null check(length(caption) between 1 and 500), prompt text not null check(length(prompt) between 1 and 20000),
 enabled boolean not null default true, created_at timestamptz not null default now()
);
create table public.generation_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 source text not null check(source in ('rating-app','admin-draft')), scene text not null check(length(scene) between 10 and 300),
 style text not null check(style in ('dry','chaotic','wholesome')), with_image boolean not null,
 chain_id uuid references public.prompt_chains(id) on delete set null, chain_name text not null,
 model_key text not null, status text not null default 'running' check(status in ('running','drafted','succeeded','failed')),
 generation_id uuid references public.generations(id) on delete set null,
 duration_ms integer check(duration_ms>=0), error text check(length(error)<=2000),
 created_at timestamptz not null default now(), finished_at timestamptz
);
create index generation_requests_user_created on public.generation_requests(user_id,created_at desc);
create table public.llm_responses (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.generation_requests(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, model_key text not null,
 prompt text not null check(length(prompt)<=50000), response_text text not null default '' check(length(response_text)<=150000),
 status text not null check(status in ('succeeded','failed')), duration_ms integer not null check(duration_ms>=0),
 input_tokens integer, output_tokens integer, total_tokens integer, error text check(length(error)<=2000),
 created_at timestamptz not null default now()
);
create index llm_responses_request on public.llm_responses(request_id);
create table public.allowed_signup_domains (
 id uuid primary key default gen_random_uuid(), domain text not null unique check(domain=lower(domain) and domain ~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$'),
 notes text not null default '' check(length(notes)<=2000), enabled boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.whitelisted_emails (
 id uuid primary key default gen_random_uuid(), email text not null unique check(email=lower(email) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 notes text not null default '' check(length(notes)<=2000), enabled boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.images (
 id uuid primary key default gen_random_uuid(), bucket text not null check(bucket in ('avatars','caption-images','admin-images')),
 path text not null check(length(path) between 1 and 500), label text not null check(length(label) between 1 and 150),
 alt_text text not null default '' check(length(alt_text)<=600), prompt text not null default '' check(length(prompt)<=20000),
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), unique(bucket,path)
);

-- Only existing Google superadmins may inspect or manage the new admin resources.
do $$ declare t text; begin
 foreach t in array array['llm_providers','llm_models','prompt_chains','prompt_chain_steps','prompt_chain_mix','terms','ai_generation_examples','generation_requests','llm_responses','allowed_signup_domains','whitelisted_emails','images'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public, anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy "Admins read" on public.%I for select to authenticated using ((select public.is_superadmin()))',t);
 end loop;
 foreach t in array array['llm_providers','llm_models','terms','ai_generation_examples','allowed_signup_domains','whitelisted_emails','images'] loop
  execute format('grant insert, update, delete on public.%I to authenticated',t);
  execute format('create policy "Admins create" on public.%I for insert to authenticated with check ((select public.is_superadmin()))',t);
  execute format('create policy "Admins update" on public.%I for update to authenticated using ((select public.is_superadmin())) with check ((select public.is_superadmin()))',t);
  execute format('create policy "Admins delete" on public.%I for delete to authenticated using ((select public.is_superadmin()))',t);
 end loop;
end $$;
grant update(weight,enabled,updated_at) on public.prompt_chain_mix to authenticated;
create policy "Admins update mix" on public.prompt_chain_mix for update to authenticated using ((select public.is_superadmin())) with check ((select public.is_superadmin()));

-- Runtime writes are scoped to the logged-in user; telemetry reads remain admin-only.
grant insert on public.generation_requests, public.llm_responses to authenticated;
grant update(status,generation_id,duration_ms,error,finished_at) on public.generation_requests to authenticated;
create policy "Own requests insert" on public.generation_requests for insert to authenticated with check(user_id=(select auth.uid()));
create policy "Own requests update" on public.generation_requests for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
-- SELECT is needed for PostgREST UPDATE and is limited to the request owner.
create policy "Own requests select" on public.generation_requests for select to authenticated using(user_id=(select auth.uid()));
create policy "Own response insert" on public.llm_responses for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.generation_requests r where r.id=request_id and r.user_id=(select auth.uid())));

insert into public.llm_providers(id,name,adapter,notes) values('70000000-0000-4000-8000-000000000001','Google Gemini','gemini','Credentials are stored in Vercel environment variables, never in this table.');
insert into public.llm_models(id,provider_id,name,model_key,notes) values('70000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000001','Gemini Flash Lite','gemini-3.5-flash-lite','The existing caption and SVG illustration model.');
insert into public.prompt_chains(id,name,description,model_id) values
 ('70000000-0000-4000-8000-000000000003','City scene','The original scene-first caption direction, followed by optional illustration instructions. Both steps are compiled into one structured model call.','70000000-0000-4000-8000-000000000002'),
 ('70000000-0000-4000-8000-000000000004','Tiny city story','An alternate character-first framing. Both steps are compiled into one structured model call.','70000000-0000-4000-8000-000000000002');
insert into public.prompt_chain_steps(chain_id,position,name,kind,instruction) values
 ('70000000-0000-4000-8000-000000000003',1,'Write the caption','caption','Write one original social caption about this New York City moment. Focus on a specific surprising detail in the scene.'),
 ('70000000-0000-4000-8000-000000000004',1,'Find the tiny story','caption','Write one original social caption about this New York City moment. Find a tiny relatable story in the people or objects in the scene; do not invent facts about real people.'),
 ('70000000-0000-4000-8000-000000000003',2,'Illustrate the moment (optional)','illustration','Create an original detailed editorial SVG illustration of the scene. Make the NYC setting recognizable with meaningful city details, foreground, middle ground and background. Use 25 to 55 thoughtfully placed shapes and a warm paper, navy, teal and coral palette.'),
 ('70000000-0000-4000-8000-000000000004',2,'Illustrate the tiny story (optional)','illustration','Create an original detailed editorial SVG illustration of the scene. Emphasize the main character or object and surround it with recognizable NYC details. Use 25 to 55 thoughtfully placed shapes in a warm paper, navy, teal and coral palette.');
insert into public.prompt_chain_mix(chain_id,weight,enabled) values
 ('70000000-0000-4000-8000-000000000003',100,true),('70000000-0000-4000-8000-000000000004',0,false);
insert into public.terms(term,definition) values('NYC','New York City. Use concrete scene details rather than generic tourist stereotypes.');

insert into public.ai_generation_examples(title,scene,style,caption,prompt)
select 'Existing community take',scene,style,caption,prompt from public.generations order by created_at limit 1;

-- Return only enabled runtime context, with weighted selection. No API keys are returned.
create function public.generation_context(p_style text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.prompt_chains; m public.llm_models; result jsonb; begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_style not in ('dry','chaotic','wholesome') then raise exception 'Invalid vibe'; end if;
 select pc.* into c from public.prompt_chains pc join public.prompt_chain_mix x on x.chain_id=pc.id join public.llm_models lm on lm.id=pc.model_id join public.llm_providers lp on lp.id=lm.provider_id
 where x.enabled and x.weight>0 and lm.enabled and lp.enabled order by -ln(greatest(random(),0.000001))/x.weight limit 1;
 if c.id is null then raise exception 'No enabled prompt chain and model. Ask an administrator to check the mix.'; end if;
 select * into m from public.llm_models where id=c.model_id;
 result:=jsonb_build_object('chain',to_jsonb(c),'model',to_jsonb(m),'steps',coalesce((select jsonb_agg(to_jsonb(s) order by position) from public.prompt_chain_steps s where s.chain_id=c.id),'[]'::jsonb),
 'terms',coalesce((select jsonb_agg(to_jsonb(t)) from (select term,definition from public.terms where enabled order by term limit 30)t),'[]'::jsonb),
 'examples',coalesce((select jsonb_agg(to_jsonb(e)) from (select scene,style,caption,prompt from public.ai_generation_examples where enabled and style=p_style order by created_at desc limit 3)e),'[]'::jsonb));
 return result;
end $$;
revoke all on function public.generation_context(text) from public,anon,authenticated;
grant execute on function public.generation_context(text) to authenticated;

-- Keep the last usable chain available, including when models/providers are disabled.
create function public.check_live_generation_config() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.prompt_chain_mix x join public.prompt_chains c on c.id=x.chain_id join public.llm_models m on m.id=c.model_id join public.llm_providers p on p.id=m.provider_id where x.enabled and x.weight>0 and m.enabled and p.enabled) then
  raise exception 'Keep at least one enabled chain with positive weight and an enabled model/provider.' using errcode='23514';
 end if; return null;
end $$;
create constraint trigger usable_mix after insert or update or delete on public.prompt_chain_mix deferrable initially deferred for each row execute function public.check_live_generation_config();
create constraint trigger usable_models after update or delete on public.llm_models deferrable initially deferred for each row execute function public.check_live_generation_config();
create constraint trigger usable_providers after update or delete on public.llm_providers deferrable initially deferred for each row execute function public.check_live_generation_config();

create function public.update_prompt_mix(p_rows jsonb) returns void language plpgsql security definer set search_path='' as $$
declare r jsonb; begin
 if not public.is_superadmin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)<>(select count(*) from public.prompt_chain_mix) or (select count(distinct x->>'id') from jsonb_array_elements(p_rows)x)<>jsonb_array_length(p_rows) then raise exception 'Refresh the mix before saving'; end if;
 for r in select * from jsonb_array_elements(p_rows) loop
  update public.prompt_chain_mix set weight=(r->>'weight')::int,enabled=(r->>'enabled')::boolean,updated_at=now() where id=(r->>'id')::uuid;
  if not found then raise exception 'Unknown chain'; end if;
 end loop;
end $$;
revoke all on function public.update_prompt_mix(jsonb) from public,anon,authenticated;
grant execute on function public.update_prompt_mix(jsonb) to authenticated;

-- Existing accounts keep access. Empty lists mean open Google signup; active entries restrict NEW accounts.
create function public.check_signup_allowlist() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.allowed_signup_domains where enabled) or exists(select 1 from public.whitelisted_emails where enabled) then
  if not exists(select 1 from public.whitelisted_emails where enabled and email=lower(new.email)) and not exists(select 1 from public.allowed_signup_domains where enabled and domain=split_part(lower(new.email),'@',2)) then
   raise exception 'This email is not on the signup allowlist. Contact the site administrator.' using errcode='42501';
  end if;
 end if; return new;
end $$;
create trigger enforce_signup_allowlist before insert on auth.users for each row execute function public.check_signup_allowlist();
revoke all on function public.check_signup_allowlist(),public.check_live_generation_config() from public,anon,authenticated;

-- Inventory the existing files without moving them or changing bucket privacy.
insert into public.images(bucket,path,label,alt_text,prompt,created_by,created_at)
select o.bucket_id,o.name,left(coalesce(g.scene,'Profile photo'),150),coalesce(g.image_description,''),coalesce(g.image_prompt,''),coalesce(g.created_by,p.id),o.created_at
from storage.objects o left join public.generations g on o.bucket_id='caption-images' and g.image_path=o.name left join public.profiles p on o.bucket_id='avatars' and p.avatar_path=o.name
where o.bucket_id in ('avatars','caption-images') on conflict(bucket,path) do nothing;
update public.images set label=left(label,150);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('admin-images','admin-images',false,5242880,array['image/jpeg','image/png','image/webp','image/gif']) on conflict(id) do nothing;
create policy "Admins inspect image files" on storage.objects for select to authenticated using(bucket_id in ('avatars','caption-images','admin-images') and (select public.is_superadmin()));
create policy "Admins upload managed images" on storage.objects for insert to authenticated with check(bucket_id='admin-images' and (select public.is_superadmin()) and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Admins update managed images" on storage.objects for update to authenticated using(bucket_id='admin-images' and (select public.is_superadmin())) with check(bucket_id='admin-images' and (select public.is_superadmin()));
create policy "Admins delete managed images" on storage.objects for delete to authenticated using(bucket_id in ('avatars','admin-images') and (select public.is_superadmin()));

create function public.register_own_image(p_bucket text,p_path text,p_alt text default '',p_prompt text default '') returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or p_bucket not in ('avatars','caption-images') or split_part(p_path,'/',1)<>auth.uid()::text or not exists(select 1 from storage.objects where bucket_id=p_bucket and name=p_path) then raise exception 'Image not found or not owned by you' using errcode='42501'; end if;
 insert into public.images(bucket,path,label,alt_text,prompt,created_by) values(p_bucket,p_path,case when p_bucket='avatars' then 'Profile photo' else 'AI city illustration' end,left(coalesce(p_alt,''),600),left(coalesce(p_prompt,''),20000),auth.uid())
 on conflict(bucket,path) do update set alt_text=excluded.alt_text,prompt=excluded.prompt;
end $$;
revoke all on function public.register_own_image(text,text,text,text) from public,anon,authenticated;
grant execute on function public.register_own_image(text,text,text,text) to authenticated;
create function public.protect_referenced_image() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (old.bucket='avatars' and exists(select 1 from public.profiles where avatar_path=old.path)) or (old.bucket='caption-images' and exists(select 1 from public.generations where image_path=old.path)) then
  raise exception 'This image is in use. Change its profile or media reference before deleting it.' using errcode='23503'; end if; return old;
end $$;
create trigger referenced_image_delete before delete on public.images for each row execute function public.protect_referenced_image();
revoke all on function public.protect_referenced_image() from public,anon,authenticated;
commit;
