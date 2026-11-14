create index if not exists flashcard_sessions_exam_id_idx
  on public.flashcard_sessions(exam_id);

create index if not exists flashcard_session_cards_question_id_idx
  on public.flashcard_session_cards(question_id);

create index if not exists flashcard_card_mastery_question_id_idx
  on public.flashcard_card_mastery(question_id);

create or replace function public.finish_flashcard_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_session public.flashcard_sessions%rowtype;
  v_total integer;
  v_mastered integer;
  v_review integer;
  v_xp integer;
begin
  if v_user_id is null then
    raise exception 'Anda harus login.';
  end if;

  select * into v_session
  from public.flashcard_sessions s
  where s.id = p_session_id and s.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Sesi Flashcard tidak ditemukan.';
  end if;

  select count(*)::integer,
         count(*) filter (where c.status = 'mastered')::integer,
         coalesce(sum(c.review_count),0)::integer,
         coalesce(sum(case when c.xp_awarded then 10 else 0 end),0)::integer
    into v_total, v_mastered, v_review, v_xp
  from public.flashcard_session_cards c
  where c.session_id = p_session_id;

  if v_mastered <> v_total then
    raise exception 'Masih ada kartu yang perlu dipelajari.';
  end if;

  update public.flashcard_sessions
  set status = 'completed',
      total_cards = v_total,
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
  where id = p_session_id;

  return jsonb_build_object(
    'status','completed',
    'total_cards',v_total,
    'mastered_cards',v_mastered,
    'reviewed_again',v_review,
    'xp_earned',v_xp
  );
end;
$function$;

revoke all on function public.finish_flashcard_session(uuid) from public, anon;
grant execute on function public.finish_flashcard_session(uuid) to authenticated;
