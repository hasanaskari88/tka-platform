-- Use PostgreSQL time as the authority for exam timing and answer persistence.
create or replace function public.get_database_time()
returns timestamptz
language sql
volatile
security invoker
set search_path = pg_catalog
as $$
  select clock_timestamp();
$$;

grant execute on function public.get_database_time() to anon, authenticated;

create or replace function private.set_exam_session_server_timestamps()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_now timestamptz := clock_timestamp();
begin
  if tg_op = 'INSERT' then
    -- Never trust the participant device clock for a new session.
    new.start_time := v_now;

    if new.status = 'paused' then
      new.paused_at := v_now;
    elsif new.status = 'completed' then
      new.completed_at := v_now;
      new.submitted_at := v_now;
      new.end_time := v_now;
    end if;

    if new.force_submit_state = 'requested' then
      new.force_submit_requested_at := v_now;
      new.force_submit_deadline_at := v_now + interval '5 minutes';
      new.force_submit_request_id := gen_random_uuid();
      new.force_submit_responded_at := null;
    elsif new.force_submit_state = 'responded' then
      new.force_submit_responded_at := v_now;
    end if;

    return new;
  end if;

  -- Pause and resume durations are measured from database timestamps.
  if old.status = 'ongoing' and new.status = 'paused' then
    new.paused_at := v_now;
  elsif old.status = 'paused' and new.status in ('ongoing', 'completed') then
    if old.paused_at is not null then
      new.paused_duration_seconds :=
        coalesce(old.paused_duration_seconds, 0)
        + greatest(0, floor(extract(epoch from (v_now - old.paused_at)))::integer);
    else
      new.paused_duration_seconds := coalesce(old.paused_duration_seconds, 0);
    end if;
    new.paused_at := null;
  end if;

  -- A new request always receives a fresh server-generated five-minute window.
  if old.force_submit_state is distinct from new.force_submit_state then
    if new.force_submit_state = 'requested' then
      new.force_submit_requested_at := v_now;
      new.force_submit_deadline_at := v_now + interval '5 minutes';
      new.force_submit_request_id := gen_random_uuid();
      new.force_submit_responded_at := null;
    elsif new.force_submit_state = 'responded' then
      new.force_submit_responded_at := v_now;
    end if;
  end if;

  -- All completion timestamps for a status transition share one database time.
  if old.status is distinct from new.status and new.status = 'completed' then
    new.completed_at := v_now;
    new.submitted_at := v_now;
    new.end_time := v_now;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_exam_sessions_server_timestamps on public.exam_sessions;
create trigger trg_exam_sessions_server_timestamps
before insert or update on public.exam_sessions
for each row
execute function private.set_exam_session_server_timestamps();

create or replace function private.set_answer_server_updated_at()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists trg_answers_server_updated_at on public.answers;
create trigger trg_answers_server_updated_at
before insert or update on public.answers
for each row
execute function private.set_answer_server_updated_at();
