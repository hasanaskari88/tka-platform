create table if not exists public.flashcard_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  total_cards integer not null default 0 check (total_cards >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists flashcard_sessions_user_exam_status_idx
  on public.flashcard_sessions(user_id, exam_id, status, created_at desc);

create table if not exists public.flashcard_session_cards (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.flashcard_sessions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  position integer not null default 0,
  status text not null default 'new' check (status in ('new','needs_review','mastered')),
  review_count integer not null default 0 check (review_count >= 0),
  xp_awarded boolean not null default false,
  mastered_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(session_id, question_id)
);

create index if not exists flashcard_session_cards_session_status_idx
  on public.flashcard_session_cards(session_id, status, position);

create table if not exists public.flashcard_card_mastery (
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  first_mastered_at timestamptz not null default now(),
  xp_awarded integer not null default 10 check (xp_awarded >= 0),
  primary key(user_id, question_id)
);

alter table public.flashcard_sessions enable row level security;
alter table public.flashcard_session_cards enable row level security;
alter table public.flashcard_card_mastery enable row level security;

drop policy if exists "Students read own flashcard sessions" on public.flashcard_sessions;
create policy "Students read own flashcard sessions"
  on public.flashcard_sessions for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Students read own flashcard session cards" on public.flashcard_session_cards;
create policy "Students read own flashcard session cards"
  on public.flashcard_session_cards for select to authenticated
  using (
    exists (
      select 1 from public.flashcard_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "Students read own flashcard mastery" on public.flashcard_card_mastery;
create policy "Students read own flashcard mastery"
  on public.flashcard_card_mastery for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.flashcard_sessions to authenticated;
grant select on public.flashcard_session_cards to authenticated;
grant select on public.flashcard_card_mastery to authenticated;

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

  insert into public.flashcard_session_cards(session_id, question_id, position, status)
  select v_session_id, q.id,
         row_number() over (order by q.created_at, q.id)::integer,
         case when exists (
           select 1 from public.flashcard_card_mastery m
           where m.user_id = v_user_id and m.question_id = q.id
         ) then 'mastered' else 'new' end
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

create or replace function public.record_flashcard_response(
  p_session_id uuid,
  p_question_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_session public.flashcard_sessions%rowtype;
  v_card public.flashcard_session_cards%rowtype;
  v_awarded_question uuid;
  v_new_xp integer;
  v_xp_earned integer := 0;
begin
  if v_user_id is null then
    raise exception 'Anda harus login.';
  end if;

  if p_status not in ('needs_review','mastered') then
    raise exception 'Status kartu tidak valid.';
  end if;

  select * into v_session
  from public.flashcard_sessions s
  where s.id = p_session_id and s.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Sesi Flashcard tidak ditemukan.';
  end if;

  if v_session.status <> 'in_progress' then
    raise exception 'Sesi Flashcard sudah selesai.';
  end if;

  select * into v_card
  from public.flashcard_session_cards c
  where c.session_id = p_session_id and c.question_id = p_question_id
  for update;

  if not found then
    raise exception 'Kartu tidak termasuk dalam sesi ini.';
  end if;

  if v_card.status = 'mastered' then
    return jsonb_build_object('status','mastered','xp_earned',0,'already_mastered',true);
  end if;

  if p_status = 'needs_review' then
    update public.flashcard_session_cards
    set status = 'needs_review',
        review_count = review_count + 1,
        updated_at = now()
    where id = v_card.id;
  else
    insert into public.flashcard_card_mastery(user_id, question_id, xp_awarded)
    values (v_user_id, p_question_id, 10)
    on conflict (user_id, question_id) do nothing
    returning question_id into v_awarded_question;

    if v_awarded_question is not null then
      update public.profiles
      set xp = coalesce(xp,0) + 10
      where id = v_user_id
      returning xp into v_new_xp;

      update public.profiles
      set level = greatest(1, floor(coalesce(v_new_xp,0) / 100.0)::integer + 1)
      where id = v_user_id;

      v_xp_earned := 10;
    end if;

    update public.flashcard_session_cards
    set status = 'mastered',
        mastered_at = now(),
        xp_awarded = (v_xp_earned > 0),
        updated_at = now()
    where id = v_card.id;
  end if;

  update public.flashcard_sessions
  set updated_at = now()
  where id = p_session_id;

  return jsonb_build_object(
    'status', p_status,
    'xp_earned', v_xp_earned,
    'already_mastered', (p_status = 'mastered' and v_xp_earned = 0)
  );
end;
$function$;

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
         count(*) filter (where c.status = 'needs_review')::integer,
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

revoke all on function public.start_flashcard_session(uuid) from public, anon;
revoke all on function public.record_flashcard_response(uuid, uuid, text) from public, anon;
revoke all on function public.finish_flashcard_session(uuid) from public, anon;
grant execute on function public.start_flashcard_session(uuid) to authenticated;
grant execute on function public.record_flashcard_response(uuid, uuid, text) to authenticated;
grant execute on function public.finish_flashcard_session(uuid) to authenticated;
