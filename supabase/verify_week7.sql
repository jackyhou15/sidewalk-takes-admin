-- Regression checks use a rollback: no test rows, permissions or mix changes persist.
begin;
select set_config('request.jwt.claims','{"sub":"c35e01e7-f315-40be-8b8b-5dc1e4cb3c17","app_metadata":{"provider":"google"}}',true);
set local role authenticated;
do $$
declare p uuid; m uuid; t uuid; e uuid; d uuid; w uuid; i uuid; r uuid; resp uuid; config jsonb; affected integer; mix jsonb;
begin
 if not public.is_superadmin() then raise exception 'Owner admin check failed'; end if;
 if (select count(*) from public.admin_profiles())<2 then raise exception 'User directory failed'; end if;
 config:=public.generation_context('dry');
 if config->'chain'->>'name' is null or jsonb_array_length(config->'steps')<2 then raise exception 'Runtime chain context failed'; end if;
 insert into public.llm_providers(name,adapter) values('Week7 rollback provider','gemini') returning id into p;
 update public.llm_providers set notes='Updated' where id=p;
 insert into public.llm_models(provider_id,name,model_key) values(p,'Rollback model','rollback-model') returning id into m;
 update public.llm_models set temperature=0.5 where id=m;
 insert into public.terms(term,definition) values('Rollback term','Test definition') returning id into t;
 update public.terms set definition='Updated definition' where id=t;
 insert into public.ai_generation_examples(title,scene,style,caption,prompt) values('Rollback example','A coffee cart outside Columbia.','dry','The cart has tenure.','Write one dry NYC caption.') returning id into e;
 update public.ai_generation_examples set title='Updated rollback example' where id=e;
 insert into public.allowed_signup_domains(domain) values('rollback.example.edu') returning id into d;
 update public.allowed_signup_domains set notes='Updated' where id=d;
 insert into public.whitelisted_emails(email) values('rollback@example.edu') returning id into w;
 update public.whitelisted_emails set notes='Updated' where id=w;
 insert into public.images(bucket,path,label,created_by) values('admin-images','rollback/metadata-only.png','Rollback metadata',auth.uid()) returning id into i;
 update public.images set alt_text='Updated description' where id=i;
 insert into public.generation_requests(user_id,source,scene,style,with_image,chain_id,chain_name,model_key) values(auth.uid(),'rating-app','A coffee cart outside Columbia.','dry',false,(config->'chain'->>'id')::uuid,config->'chain'->>'name',config->'model'->>'model_key') returning id into r;
 insert into public.llm_responses(request_id,user_id,model_key,prompt,response_text,status,duration_ms) values(r,auth.uid(),'rollback-model','Rollback test prompt','Rollback test response','succeeded',100) returning id into resp;
 update public.generation_requests set status='drafted',duration_ms=100,finished_at=now() where id=r;
 if not exists(select 1 from public.llm_responses where id=resp) then raise exception 'Response read failed'; end if;
 if not exists(select 1 from public.images where id=i and alt_text='Updated description') then raise exception 'Image metadata update failed'; end if;
 select jsonb_agg(jsonb_build_object('id',id,'weight',weight,'enabled',enabled)) into mix from public.prompt_chain_mix;
 perform public.update_prompt_mix(mix);
 set constraints all immediate;
 begin
  update public.prompt_chain_mix set enabled=false;
  raise exception 'FAIL: disabling the final live chain was allowed';
 exception when check_violation then null; end;
 begin
  update public.llm_models set enabled=false where id='70000000-0000-4000-8000-000000000002';
  raise exception 'FAIL: disabling the active model was allowed';
 exception when check_violation then null; end;
 begin
  delete from public.llm_models where id='70000000-0000-4000-8000-000000000002';
  raise exception 'FAIL: deleting a referenced model was allowed';
 exception when foreign_key_violation then null; end;
 delete from public.images where id=i; get diagnostics affected=row_count;if affected<>1 then raise exception 'Image delete failed';end if;
 delete from public.ai_generation_examples where id=e;get diagnostics affected=row_count;if affected<>1 then raise exception 'Example delete failed';end if;
 delete from public.terms where id=t;get diagnostics affected=row_count;if affected<>1 then raise exception 'Term delete failed';end if;
 delete from public.allowed_signup_domains where id=d;get diagnostics affected=row_count;if affected<>1 then raise exception 'Domain delete failed';end if;
 delete from public.whitelisted_emails where id=w;get diagnostics affected=row_count;if affected<>1 then raise exception 'Email delete failed';end if;
 delete from public.llm_models where id=m;get diagnostics affected=row_count;if affected<>1 then raise exception 'Model delete failed';end if;
 delete from public.llm_providers where id=p;get diagnostics affected=row_count;if affected<>1 then raise exception 'Provider delete failed';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"015d072e-ed8f-4674-a1bf-5e41bc4a36c9","app_metadata":{"provider":"google"}}',true);
set local role authenticated;
do $$ begin if not public.is_superadmin() or (select count(*) from public.prompt_chains)<2 then raise exception 'Reviewer admin access failed';end if;end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"0e773495-cf13-42cd-99be-9f86fa7b73b4","app_metadata":{"provider":"google"}}',true);
set local role authenticated;
do $$ declare t text; n integer; begin
 if public.is_superadmin() then raise exception 'Member became admin';end if;
 foreach t in array array['llm_providers','llm_models','prompt_chains','prompt_chain_steps','prompt_chain_mix','terms','ai_generation_examples','llm_responses','allowed_signup_domains','whitelisted_emails','images'] loop
  execute format('select count(*) from public.%I',t) into n;if n<>0 then raise exception 'Member data leak: %',t;end if;
 end loop;
 if (public.generation_context('dry')->'chain'->>'id') is null then raise exception 'Member runtime config failed';end if;
 begin
  insert into public.terms(term,definition) values('Member forbidden','Forbidden');
  raise exception 'FAIL: member could create term';
 exception when insufficient_privilege then null;end;
 begin
  perform public.update_prompt_mix('[]'::jsonb);
  raise exception 'FAIL: member could update mix';
 exception when insufficient_privilege then null;end;
 begin
  update public.profiles set is_superadmin=true where id=auth.uid();
  raise exception 'FAIL: member escalated privileges';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform count(*) from public.generation_requests;raise exception 'FAIL: anonymous request access';exception when insufficient_privilege then null;end;
 begin perform public.generation_context('dry');raise exception 'FAIL: anonymous config access';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: admin CRUD, reviewer access, mix/model safety, member isolation, anonymous denial; no test data persisted.' as verification;
