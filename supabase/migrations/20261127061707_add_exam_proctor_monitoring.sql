alter table public.exams
  add column if not exists proctor_enabled boolean not null default false,
  add column if not exists proctor_require_fullscreen boolean not null default true,
  add column if not exists proctor_max_violations integer not null default 3;

alter table public.exam_sessions
  add column if not exists proctor_violation_count integer not null default 0,
  add column if not exists proctor_auto_paused boolean not null default false,
  add column if not exists proctor_pause_reason text,
  add column if not exists proctor_last_violation_at timestamptz;

create table if not exists public.exam_proctor_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.exam_sessions(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('tab_hidden', 'fullscreen_exit')),
  violation_number integer not null check (violation_number > 0),
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);

create index if not exists exam_proctor_events_session_time_idx on public.exam_proctor_events(session_id, occurred_at desc);
create index if not exists exam_proctor_events_exam_time_idx on public.exam_proctor_events(exam_id, occurred_at desc);
alter table public.exam_proctor_events enable row level security;
revoke all on table public.exam_proctor_events from anon, authenticated;
grant all on table public.exam_proctor_events to service_role;

create or replace function private.protect_exam_proctor_fields()
returns trigger language plpgsql
set search_path = pg_catalog, public, private
as $function$
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role'
    and (
      old.proctor_violation_count is distinct from new.proctor_violation_count
      or old.proctor_auto_paused is distinct from new.proctor_auto_paused
      or old.proctor_pause_reason is distinct from new.proctor_pause_reason
      or old.proctor_last_violation_at is distinct from new.proctor_last_violation_at
    )
  then
    raise exception 'Proctor fields can only be changed by the trusted server.';
  end if;
  return new;
end;
$function$;

drop trigger if exists protect_exam_proctor_fields on public.exam_sessions;
create trigger protect_exam_proctor_fields before update on public.exam_sessions
for each row execute function private.protect_exam_proctor_fields();

create or replace function public.record_exam_proctor_event(p_session_id uuid,p_user_id uuid,p_event_type text)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public
as $function$
declare
  v_session public.exam_sessions%rowtype;
  v_exam public.exams%rowtype;
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_limit integer;
  v_duplicate boolean;
  v_paused boolean := false;
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    raise exception 'Trusted server access required.';
  end if;
  if p_event_type not in ('tab_hidden','fullscreen_exit') then raise exception 'Invalid proctor event type.'; end if;

  select * into v_session from public.exam_sessions where id=p_session_id for update;
  if not found or v_session.user_id is distinct from p_user_id then raise exception 'Exam session not found for this participant.'; end if;
  if v_session.status <> 'ongoing' then
    return jsonb_build_object('accepted',false,'status',v_session.status,'violation_count',coalesce(v_session.proctor_violation_count,0),'paused',false);
  end if;

  select * into v_exam from public.exams where id=v_session.exam_id;
  if not found or not coalesce(v_exam.proctor_enabled,false) then
    return jsonb_build_object('accepted',false,'status',v_session.status,'violation_count',coalesce(v_session.proctor_violation_count,0),'paused',false,'disabled',true);
  end if;

  select exists(select 1 from public.exam_proctor_events e where e.session_id=p_session_id and e.occurred_at >= v_now - interval '2 seconds') into v_duplicate;
  if v_duplicate then
    return jsonb_build_object('accepted',false,'duplicate',true,'status',v_session.status,'violation_count',coalesce(v_session.proctor_violation_count,0),'paused',v_session.status='paused');
  end if;

  v_count := coalesce(v_session.proctor_violation_count,0)+1;
  v_limit := greatest(1,least(50,coalesce(v_exam.proctor_max_violations,3)));
  insert into public.exam_proctor_events(session_id,exam_id,user_id,event_type,violation_number,occurred_at)
  values(p_session_id,v_session.exam_id,p_user_id,p_event_type,v_count,v_now);

  if v_count >= v_limit then
    v_paused := true;
    update public.exam_sessions
    set proctor_violation_count=v_count,proctor_last_violation_at=v_now,
        proctor_auto_paused=true,
        proctor_pause_reason='Batas pelanggaran pengawasan tercapai ('||v_count||'/'||v_limit||'). Menunggu pemeriksaan dan izin admin.',
        status='paused'
    where id=p_session_id;
  else
    update public.exam_sessions set proctor_violation_count=v_count,proctor_last_violation_at=v_now where id=p_session_id;
  end if;

  return jsonb_build_object('accepted',true,'event_type',p_event_type,'violation_count',v_count,'max_violations',v_limit,'paused',v_paused,'status',case when v_paused then 'paused' else 'ongoing' end);
end;
$function$;

revoke all on function public.record_exam_proctor_event(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.record_exam_proctor_event(uuid,uuid,text) to service_role;
