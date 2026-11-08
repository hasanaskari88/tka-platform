-- Practice attempt progress and incremental XP
-- Staged migration: apply only after reviewing the matching frontend release.

alter table public.practice_attempts
  add column if not exists progress jsonb not null default '{}'::jsonb,
  add column if not exists credited_xp integer not null default 0;

create or replace function public.start_practice_attempt(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_total integer;
  v_attempt_number integer;
  v_attempt_id uuid;
  v_progress jsonb;
begin
  if v_user_id is null then
    raise exception 'Anda harus login.';
  end if;

  select count(*)::integer
  into v_total
  from public.questions
  where exam_id = p_exam_id;

  if v_total < 1 then
    raise exception 'Modul belum memiliki soal atau misi.';
  end if;

  -- Serialize attempts for this user/module before checking for an unfinished one.
  perform pg_advisory_xact_lock(
    hashtext(v_user_id::text),
    hashtext(p_exam_id::text)
  );

  -- Resume the latest unfinished attempt instead of creating duplicates.
  select id, coalesce(progress, '{}'::jsonb)
  into v_attempt_id, v_progress
  from public.practice_attempts
  where user_id = v_user_id
    and exam_id = p_exam_id
    and status = 'in_progress'
  order by started_at desc
  limit 1
  for update;

  if found then
    return jsonb_build_object(
      'attempt_id', v_attempt_id,
      'resumed', true,
      'progress', v_progress
    );
  end if;

  select coalesce(max(attempt_number), 0) + 1
  into v_attempt_number
  from public.practice_attempts
  where user_id = v_user_id
    and exam_id = p_exam_id;

  insert into public.practice_attempts (
    user_id, exam_id, attempt_number, status, total_questions,
    answered_count, correct_count, wrong_count, score,
    answer_xp, streak_xp, improvement_xp, total_xp, started_at,
    progress, credited_xp
  )
  values (
    v_user_id, p_exam_id, v_attempt_number, 'in_progress', v_total,
    0, 0, 0, 0, 0, 0, 0, 0, now(),
    '{}'::jsonb, 0
  )
  returning id into v_attempt_id;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'attempt_number', v_attempt_number,
    'total_questions', v_total,
    'resumed', false,
    'progress', '{}'::jsonb
  );
end;
$function$;

create or replace function public.save_practice_attempt_progress(
  p_attempt_id uuid,
  p_progress jsonb,
  p_answered_count integer,
  p_correct_count integer,
  p_answer_xp integer,
  p_streak_xp integer
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_attempt public.practice_attempts%rowtype;
  v_target_credit integer;
  v_delta integer;
  v_new_xp integer;
  v_new_level integer;
begin
  if v_user_id is null then
    raise exception 'Anda harus login.';
  end if;

  if p_progress is null or jsonb_typeof(p_progress) <> 'object' then
    raise exception 'Data progres tidak valid.';
  end if;

  if p_answered_count < 0 or p_correct_count < 0
     or p_correct_count > p_answered_count
     or p_answer_xp < 0 or p_streak_xp < 0 then
    raise exception 'Data hasil latihan tidak valid.';
  end if;

  select *
  into v_attempt
  from public.practice_attempts
  where id = p_attempt_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Attempt tidak ditemukan.';
  end if;

  if v_attempt.status <> 'in_progress' then
    raise exception 'Sesi ini tidak sedang berlangsung.';
  end if;

  if p_answered_count > v_attempt.total_questions then
    raise exception 'Jumlah soal dijawab melebihi jumlah soal.';
  end if;

  v_target_credit := p_answer_xp + p_streak_xp;
  v_delta := v_target_credit - coalesce(v_attempt.credited_xp, 0);

  if v_delta < 0 then
    raise exception 'XP tersimpan tidak boleh berkurang.';
  end if;

  update public.practice_attempts
  set progress = p_progress,
      answered_count = p_answered_count,
      correct_count = p_correct_count,
      wrong_count = p_answered_count - p_correct_count,
      answer_xp = p_answer_xp,
      streak_xp = p_streak_xp,
      credited_xp = v_target_credit
  where id = p_attempt_id;

  if v_delta > 0 then
    update public.profiles
    set xp = coalesce(xp, 0) + v_delta,
        level = greatest(
          1,
          floor((coalesce(xp, 0) + v_delta) / 100)::integer + 1
        )
    where id = v_user_id
    returning xp, level into v_new_xp, v_new_level;
  else
    select xp, level into v_new_xp, v_new_level
    from public.profiles where id = v_user_id;
  end if;

  return jsonb_build_object(
    'saved', true,
    'credited_xp', v_target_credit,
    'xp_delta', v_delta,
    'xp', v_new_xp,
    'level', v_new_level
  );
end;
$function$;

revoke all on function public.save_practice_attempt_progress(uuid, jsonb, integer, integer, integer, integer) from public;
grant execute on function public.save_practice_attempt_progress(uuid, jsonb, integer, integer, integer, integer) to authenticated;

create or replace function public.finish_practice_attempt(
  p_attempt_id uuid,
  p_answered_count integer,
  p_correct_count integer,
  p_streak_xp integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_attempt public.practice_attempts%rowtype;
  v_score numeric;
  v_best_score numeric;
  v_answer_xp integer;
  v_streak integer;
  v_improvement integer;
  v_total_xp integer;
  v_delta_xp integer;
  v_new_xp integer;
  v_new_level integer;
begin
  if v_user_id is null then
    raise exception 'Anda harus login.';
  end if;

  select *
  into v_attempt
  from public.practice_attempts
  where id = p_attempt_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Attempt tidak ditemukan.';
  end if;

  if v_attempt.status = 'completed' then
    return jsonb_build_object(
      'already_completed', true,
      'score', v_attempt.score,
      'total_xp', v_attempt.total_xp
    );
  end if;

  if v_attempt.status <> 'in_progress' then
    raise exception 'Attempt ini tidak sedang berlangsung.';
  end if;

  if p_answered_count < 0 or p_correct_count < 0
     or p_correct_count > p_answered_count
     or p_answered_count > v_attempt.total_questions
     or p_streak_xp < 0 then
    raise exception 'Data hasil latihan tidak valid.';
  end if;

  v_score := case
    when v_attempt.total_questions > 0
    then round(100.0 * p_correct_count / v_attempt.total_questions, 2)
    else 0
  end;

  select max(score)
  into v_best_score
  from public.practice_attempts
  where user_id = v_user_id
    and exam_id = v_attempt.exam_id
    and status = 'completed';

  v_answer_xp := p_correct_count * 10;
  v_streak := p_streak_xp;

  v_improvement := case
    when v_best_score is not null and v_score > v_best_score
    then floor((v_score - v_best_score) / 10)::integer * 5
    else 0
  end;

  v_total_xp := v_answer_xp + v_streak + v_improvement;
  v_delta_xp := v_total_xp - coalesce(v_attempt.credited_xp, 0);

  if v_delta_xp < 0 then
    raise exception 'XP final lebih kecil daripada XP yang sudah diberikan.';
  end if;

  update public.practice_attempts
  set status = 'completed',
      answered_count = p_answered_count,
      correct_count = p_correct_count,
      wrong_count = p_answered_count - p_correct_count,
      score = v_score,
      answer_xp = v_answer_xp,
      streak_xp = v_streak,
      improvement_xp = v_improvement,
      total_xp = v_total_xp,
      credited_xp = v_total_xp,
      completed_at = now()
  where id = p_attempt_id;

  if v_delta_xp > 0 then
    update public.profiles
    set xp = coalesce(xp, 0) + v_delta_xp,
        level = greatest(
          1,
          floor((coalesce(xp, 0) + v_delta_xp) / 100)::integer + 1
        )
    where id = v_user_id
    returning xp, level into v_new_xp, v_new_level;
  else
    select xp, level into v_new_xp, v_new_level
    from public.profiles where id = v_user_id;
  end if;

  return jsonb_build_object(
    'already_completed', false,
    'score', v_score,
    'answer_xp', v_answer_xp,
    'streak_xp', v_streak,
    'improvement_xp', v_improvement,
    'total_xp', v_total_xp,
    'xp_delta', v_delta_xp,
    'xp', v_new_xp,
    'level', v_new_level
  );
end;
$function$;
