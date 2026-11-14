create or replace function public.start_practice_attempt(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_activity_type text;
  v_total integer;
  v_attempt_number integer;
  v_attempt_id uuid;
begin
  if v_user_id is null then
    raise exception 'Anda harus login.';
  end if;

  select role::text
  into v_role
  from public.profiles
  where id = v_user_id;

  if v_role is distinct from 'student'
     and v_role is distinct from 'admin' then
    raise exception 'Hanya siswa dan admin yang dapat memulai latihan.';
  end if;

  select activity_type::text
  into v_activity_type
  from public.exams
  where id = p_exam_id;

  if not found then
    raise exception 'Modul latihan tidak ditemukan.';
  end if;

  if v_activity_type = 'MAZE_GAME_V2' then
    select count(*)::integer
    into v_total
    from public.questions
    where exam_id = p_exam_id
      and question_type = 'maze_game_v2';
  elsif v_activity_type = 'MAZE_GAME' then
    select count(*)::integer
    into v_total
    from public.questions
    where exam_id = p_exam_id
      and question_type = 'maze_game';
  elsif v_activity_type = 'FLASHCARD' then
    select count(*)::integer
    into v_total
    from public.questions
    where exam_id = p_exam_id
      and question_type = 'flashcard';
  else
    select count(*)::integer
    into v_total
    from public.questions
    where exam_id = p_exam_id
      and coalesce(question_type, 'multiple_choice') in (
        'multiple_choice',
        'complex_multiple_choice',
        'true_false_matrix'
      );
  end if;

  if v_total < 1 then
    raise exception 'Modul belum memiliki misi atau soal yang didukung untuk jenis kegiatan ini.';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(v_user_id::text),
    hashtext(p_exam_id::text)
  );

  select coalesce(max(attempt_number), 0) + 1
  into v_attempt_number
  from public.practice_attempts
  where user_id = v_user_id
    and exam_id = p_exam_id;

  insert into public.practice_attempts (
    user_id, exam_id, attempt_number, status, total_questions,
    answered_count, correct_count, wrong_count, score,
    answer_xp, streak_xp, improvement_xp, total_xp, started_at
  )
  values (
    v_user_id, p_exam_id, v_attempt_number, 'in_progress', v_total,
    0, 0, 0, 0, 0, 0, 0, 0, now()
  )
  returning id into v_attempt_id;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'attempt_number', v_attempt_number,
    'total_questions', v_total
  );
end;
$function$;
