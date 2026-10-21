-- Run as database owner after week6_admin.sql. All content mutations roll back.
begin;
select set_config('request.jwt.claims', jsonb_build_object('sub',
  (select p.id from public.profiles p where not p.is_superadmin limit 1),
  'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text, true);
set local role authenticated;
do $$
declare n integer; allowed boolean := false;
begin
  if auth.uid() is null then raise exception 'A non-admin test member is required'; end if;
  if public.is_superadmin() then raise exception 'Ordinary member was accepted as admin'; end if;
  begin perform public.admin_profiles(); exception when insufficient_privilege then allowed := true; end;
  if not allowed then raise exception 'Ordinary member could read the admin directory'; end if;
  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'Ordinary member could read other profiles'; end if;
  select count(*) into n from public.votes where user_id <> auth.uid();
  if n <> 0 then raise exception 'Ordinary member could read other ratings'; end if;
  allowed := false;
  begin update public.profiles set is_superadmin=true where id=auth.uid(); exception when insufficient_privilege then allowed := true; end;
  if not allowed then raise exception 'Ordinary member could change the admin flag'; end if;
  insert into public.profiles(id,first_name,last_name,avatar_path,updated_at)
    select id,first_name,last_name,avatar_path,updated_at from public.profiles where id=auth.uid()
    on conflict(id) do update set id=excluded.id,first_name=excluded.first_name,
      last_name=excluded.last_name,avatar_path=excluded.avatar_path,updated_at=excluded.updated_at;
  get diagnostics n=row_count;
  if n <> 1 then raise exception 'Ordinary profile editing stopped working'; end if;
  update public.generations set caption=caption;
  get diagnostics n=row_count;
  if n <> 0 then raise exception 'Ordinary member could update media'; end if;
  delete from public.generations;
  get diagnostics n=row_count;
  if n <> 0 then raise exception 'Ordinary member could delete media'; end if;
end;
$$;
reset role;
select set_config('request.jwt.claims', jsonb_build_object('sub',
  (select p.id from public.profiles p where p.is_superadmin limit 1),
  'role','authenticated','app_metadata',jsonb_build_object('provider','google'))::text, true);
set local role authenticated;
do $$
declare test_id uuid := gen_random_uuid(); n integer;
begin
  if not public.is_superadmin() then raise exception 'Approved Google admin was denied'; end if;
  select count(*) into n from public.admin_profiles();
  if n < 1 then raise exception 'Admin directory is empty'; end if;
  insert into public.generations(id,created_by,scene,style,caption,prompt,model)
    values(test_id,auth.uid(),'Week 6 transactional verification scene','dry','Transactional test caption','Verification only; rolled back','verification');
  update public.generations set caption='Updated transactional test caption' where id=test_id;
  get diagnostics n=row_count;
  if n <> 1 then raise exception 'Admin update failed'; end if;
  insert into public.votes(generation_id,user_id,value) values(test_id,auth.uid(),1);
  delete from public.generations where id=test_id;
  get diagnostics n=row_count;
  if n <> 1 then raise exception 'Admin delete failed'; end if;
  if exists(select 1 from public.votes where generation_id=test_id) then raise exception 'Linked rating was not removed'; end if;
end;
$$;
reset role;
-- Even the approved account must have a Google-provider session.
select set_config('request.jwt.claims', jsonb_build_object('sub',
  (select p.id from public.profiles p where p.is_superadmin limit 1),
  'role','authenticated','app_metadata',jsonb_build_object('provider','email'))::text, true);
set local role authenticated;
do $$ begin
  if public.is_superadmin() then raise exception 'Non-Google session was accepted'; end if;
end; $$;
reset role;
rollback;
select 'PASS: member privacy, immutable role, profile compatibility, admin CRUD, rating cascade, and Google-only admin authorization' as verification;
