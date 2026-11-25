create extension if not exists pg_cron with schema pg_catalog;

alter table public.exam_sessions
  add column if not exists force_submit_requested_at timestamptz,
  add column if not exists force_submit_deadline_at timestamptz,
  add column if not exists force_submit_request_id uuid,
  add column if not exists force_submit_state text,
  add column if not exists force_submit_responded_at timestamptz;

alter table public.exam_sessions
  alter column submitted_at drop default,
  alter column completed_at drop default;

alter table public.exam_sessions
  drop constraint if exists exam_sessions_force_submit_state_check;
alter table public.exam_sessions
  add constraint exam_sessions_force_submit_state_check
  check (force_submit_state is null or force_submit_state in ('requested', 'responded', 'timed_out', 'completed'));

create index if not exists exam_sessions_force_submit_deadline_idx
  on public.exam_sessions (force_submit_deadline_at)
  where force_submit_state = 'requested';

create schema if not exists private;

create or replace function private.finalize_timed_out_force_submissions()
returns integer language plpgsql
set search_path = pg_catalog, public, private
as $$
declare
  session_row record;
  question_row record;
  answer_row record;
  user_json jsonb;
  correct_json jsonb;
  correct_key text;
  correct_len integer;
  correct_count integer;
  wrong_count integer;
  matrix_count integer;
  question_points numeric;
  question_max numeric;
  auto_max numeric;
  total_earned numeric;
  total_correct integer;
  finalized integer := 0;
begin
  for session_row in
    select id, exam_id from public.exam_sessions
    where status in ('ongoing', 'paused')
      and force_submit_state = 'requested'
      and force_submit_deadline_at <= now()
    order by force_submit_deadline_at
    for update skip locked
  loop
    auto_max := 0; total_earned := 0; total_correct := 0;
    for question_row in
      select id, question_type, max_score, correct_option, correct_answer, correct_answers
      from public.questions where exam_id = session_row.exam_id
        and coalesce(question_type, 'multiple_choice') not in ('essay', 'uraian')
    loop
      question_max := coalesce(nullif(question_row.max_score, 0), 1);
      auto_max := auto_max + question_max;
      question_points := 0; correct_json := question_row.correct_answers;
      user_json := null; correct_count := 0; wrong_count := 0; correct_len := 0; matrix_count := 0;
      select * into answer_row from public.answers
      where session_id = session_row.id and question_id = question_row.id limit 1;
      if answer_row.id is not null then
        begin
          user_json := answer_row.selected_answers;
          if user_json is null and answer_row.user_answer is not null then user_json := answer_row.user_answer::jsonb; end if;
        exception when others then user_json := null;
        end;
      end if;
      if coalesce(question_row.question_type, 'multiple_choice') = 'multiple_choice' then
        if upper(trim(coalesce(answer_row.selected_option, answer_row.user_answer, ''))) =
           upper(trim(coalesce(question_row.correct_option, question_row.correct_answer, '')))
           and trim(coalesce(question_row.correct_option, question_row.correct_answer, '')) <> '' then
          question_points := question_max;
        end if;
      elsif question_row.question_type = 'complex_multiple_choice' then
        if jsonb_typeof(correct_json) = 'array' then
          select count(*) into correct_len from jsonb_array_elements(correct_json);
          if jsonb_typeof(user_json) = 'array' then
            select count(*) into correct_count from jsonb_array_elements_text(user_json) chosen(value)
            where exists (select 1 from jsonb_array_elements_text(correct_json) expected(value) where upper(trim(expected.value)) = upper(trim(chosen.value)));
            select count(*) into wrong_count from jsonb_array_elements_text(user_json) chosen(value)
            where not exists (select 1 from jsonb_array_elements_text(correct_json) expected(value) where upper(trim(expected.value)) = upper(trim(chosen.value)));
          end if;
        end if;
        if correct_len > 0 then question_points := question_max * greatest(0, correct_count - wrong_count)::numeric / correct_len; end if;
      elsif question_row.question_type = 'true_false_matrix' then
        if jsonb_typeof(correct_json) = 'object' then
          for correct_key in select jsonb_object_keys(correct_json) loop
            matrix_count := matrix_count + 1;
            if lower(trim(coalesce(user_json ->> correct_key, ''))) = lower(trim(coalesce(correct_json ->> correct_key, ''))) then correct_count := correct_count + 1; end if;
          end loop;
        end if;
        if matrix_count > 0 then question_points := question_max * correct_count::numeric / matrix_count; end if;
      end if;
      total_earned := total_earned + question_points;
      if question_points >= question_max - 0.000001 then total_correct := total_correct + 1; end if;
      update public.answers set points_earned = question_points
      where session_id = session_row.id and question_id = question_row.id;
    end loop;
    update public.exam_sessions
    set status = 'completed',
        score = case when auto_max > 0 then round((total_earned / auto_max) * 100, 2) else 0 end,
        total_correct = total_correct,
        completed_at = now(), submitted_at = now(), end_time = now(),
        force_submit_state = 'timed_out'
    where id = session_row.id and status in ('ongoing', 'paused') and force_submit_state = 'requested';
    if found then finalized := finalized + 1; end if;
  end loop;
  return finalized;
end;
$$;

select cron.schedule('tka-force-submit-timeout', '30 seconds', 'select private.finalize_timed_out_force_submissions();');
