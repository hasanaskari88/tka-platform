create or replace function private.protect_exam_proctor_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $function$
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    if tg_op = 'INSERT' then
      if coalesce(new.proctor_violation_count, 0) <> 0
        or coalesce(new.proctor_auto_paused, false)
        or new.proctor_pause_reason is not null
        or new.proctor_last_violation_at is not null
      then
        raise exception 'Proctor fields can only be initialized by the trusted server.';
      end if;
    elsif
      old.proctor_violation_count is distinct from new.proctor_violation_count
      or old.proctor_auto_paused is distinct from new.proctor_auto_paused
      or old.proctor_pause_reason is distinct from new.proctor_pause_reason
      or old.proctor_last_violation_at is distinct from new.proctor_last_violation_at
    then
      raise exception 'Proctor fields can only be changed by the trusted server.';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists protect_exam_proctor_fields on public.exam_sessions;
create trigger protect_exam_proctor_fields
before insert or update on public.exam_sessions
for each row execute function private.protect_exam_proctor_fields();

create or replace function private.protect_exam_proctor_settings()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $function$
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    if tg_op = 'INSERT' then
      if coalesce(new.proctor_enabled, false)
        or new.proctor_require_fullscreen is distinct from true
        or coalesce(new.proctor_max_violations, 3) <> 3
      then
        raise exception 'Proctor settings can only be initialized by the trusted server.';
      end if;
    elsif
      old.proctor_enabled is distinct from new.proctor_enabled
      or old.proctor_require_fullscreen is distinct from new.proctor_require_fullscreen
      or old.proctor_max_violations is distinct from new.proctor_max_violations
    then
      raise exception 'Proctor settings can only be changed by the trusted server.';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists protect_exam_proctor_settings on public.exams;
create trigger protect_exam_proctor_settings
before insert or update on public.exams
for each row execute function private.protect_exam_proctor_settings();
