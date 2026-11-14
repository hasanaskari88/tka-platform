create or replace function public.start_flashcard_session(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_activity_type text;
  v_is_published boolean;
  v_total integer;
  v_session_id uuid;
begin
  if v_user_id is null then
    raise exception 'Anda harus login.';
  end if;

  select p.role::text into v_role
  from public.profiles p where p.id = v_user_id;

  if v_role is distinct from 'student' and v_role is distinct from 'admin' then
    raise exception 'Akun ini tidak diizinkan mengikuti Flashcard.';
  end if;

  select e.activity_type, e.is_published
    into v_activity_type, v_is_published
  from public.exams e where e.id = p_exam_id;

  if not found or v_activity_type is distinct from 'FLASHCARD' then
    raise exception 'Modul Flashcard tidak ditemukan.';
  end if;

  if v_role = 'student' and not coalesce(v_is_published, false) then
    raise exception 'Modul Flashcard belum dipublikasikan.';
  end if;

  select count(*)::integer into v_total
  from public.questions q
  where q.exam_id = p_exam_id and q.question_type = 'flashcard';

  if v_total < 1 then
    raise exception 'Modul ini belum memiliki kartu Flashcard.';
  end if;

  select s.id into v_session_id
  from public.flashcard_sessions s
  where s.user_id = v_user_id
    and s.exam_id = p_exam_id
    and s.status = 'in_progress'
  order by s.created_at desc
  limit 1
  for update;

  if v_session_id is null then
    insert into public.flashcard_sessions(user_id, exam_id, total_cards)
    values (v_user_id, p_exam_id, v_total)
    returning id into v_session_id;
  else
    update public.flashcard_sessions
    set total_cards = v_total, updated_at = now()
    where id = v_session_id;
  end if;

  -- Setiap sesi baru tetap memuat semua kartu agar siswa dapat mengulang.
  -- Tabel mastery terpisah mencegah XP diberikan dua kali untuk kartu yang sama.
  insert into public.flashcard_session_cards(session_id, question_id, position, status)
  select v_session_id, q.id,
         row_number() over (order by q.created_at, q.id)::integer,
         'new'
  from public.questions q
  where q.exam_id = p_exam_id and q.question_type = 'flashcard'
  on conflict (session_id, question_id) do nothing;

  return jsonb_build_object(
    'session_id', v_session_id,
    'total_cards', v_total,
    'status', 'in_progress'
  );
end;
$function$;

revoke all on function public.start_flashcard_session(uuid) from public, anon;
grant execute on function public.start_flashcard_session(uuid) to authenticated;
