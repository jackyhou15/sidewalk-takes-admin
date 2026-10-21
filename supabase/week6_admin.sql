begin;
alter table public.profiles add column if not exists is_superadmin boolean not null default false;

-- Neither a forged profile update nor a profile upsert can grant admin access.
revoke insert, update on public.profiles from public, anon, authenticated;
grant insert (id, first_name, last_name, avatar_path, updated_at) on public.profiles to authenticated;
grant update (id, first_name, last_name, avatar_path, updated_at) on public.profiles to authenticated;

create or replace function public.protect_superadmin_flag()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('postgres', 'supabase_admin') and
    ((tg_op = 'INSERT' and new.is_superadmin) or
     (tg_op = 'UPDATE' and new.is_superadmin is distinct from old.is_superadmin)) then
    raise exception 'Administrator flags can only be changed by the database owner' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_superadmin_flag() from public, anon, authenticated;
drop trigger if exists protect_superadmin_flag on public.profiles;
create trigger protect_superadmin_flag before insert or update on public.profiles
for each row execute function public.protect_superadmin_flag();

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_superadmin from public.profiles p where p.id = (select auth.uid())), false)
    and coalesce((select auth.jwt())->'app_metadata'->>'provider' = 'google', false);
$$;
revoke all on function public.is_superadmin() from public, anon, authenticated;
grant execute on function public.is_superadmin() to authenticated;

drop policy if exists "Superadmins read profiles" on public.profiles;
create policy "Superadmins read profiles" on public.profiles for select to authenticated
using ((select public.is_superadmin()));

drop policy if exists "Superadmins manage media" on public.generations;
create policy "Superadmins manage media" on public.generations for all to authenticated
using ((select public.is_superadmin())) with check ((select public.is_superadmin()));
grant select, insert, update, delete on public.generations to authenticated;

drop policy if exists "Superadmins read ratings" on public.votes;
create policy "Superadmins read ratings" on public.votes for select to authenticated
using ((select public.is_superadmin()));

drop policy if exists "Superadmins remove caption images" on storage.objects;
create policy "Superadmins remove caption images" on storage.objects for delete to authenticated
using (bucket_id = 'caption-images' and (select public.is_superadmin()));

create or replace function public.admin_profiles()
returns table (id uuid, first_name text, last_name text, email text, is_superadmin boolean,
  created_at timestamptz, last_sign_in_at timestamptz, avatar_path text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_superadmin() then
    raise exception 'Google login and administrator access required' using errcode = '42501';
  end if;
  return query select p.id, p.first_name, p.last_name, u.email::text, p.is_superadmin,
    p.created_at, u.last_sign_in_at, p.avatar_path
    from public.profiles p join auth.users u on u.id = p.id order by p.created_at desc;
end;
$$;
revoke all on function public.admin_profiles() from public, anon, authenticated;
grant execute on function public.admin_profiles() to authenticated;

-- Bootstrap the existing project owner through the SQL editor, not through the app.
do $$
begin
  if not exists (select 1 from auth.users u join public.profiles p on p.id=u.id where u.email = 'jackyhoujy@gmail.com') then
    raise exception 'The project owner must sign in to the rating app first';
  end if;
end;
$$;
update public.profiles set is_superadmin = true
where id = (select id from auth.users where email = 'jackyhoujy@gmail.com');
commit;
