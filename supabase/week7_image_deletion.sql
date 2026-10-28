-- Image CRUD must also work for files currently used by a profile or take.
-- Only photo references are cleared; users, takes and ratings are preserved.
begin;
create or replace function public.admin_delete_image(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare img public.images;
begin
 if not public.is_superadmin() then raise exception 'Google administrator access required' using errcode='42501';end if;
 select * into img from public.images where id=p_id for update;
 if img.id is null then raise exception 'Image not found' using errcode='P0002';end if;
 if img.bucket='avatars' then
  update public.profiles set avatar_path=null,updated_at=now() where avatar_path=img.path;
 elsif img.bucket='caption-images' then
  update public.generations set image_path=null,image_description=null,image_prompt=null where image_path=img.path;
 end if;
 delete from public.images where id=p_id;
 return jsonb_build_object('bucket',img.bucket,'path',img.path);
end $$;
revoke all on function public.admin_delete_image(uuid) from public,anon,authenticated;
grant execute on function public.admin_delete_image(uuid) to authenticated;
commit;
