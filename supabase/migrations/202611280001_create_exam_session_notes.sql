create table if not exists public.exam_session_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.exam_sessions(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_session_notes_session_user_key unique (session_id, user_id),
  constraint exam_session_notes_content_length check (char_length(content) <= 10000)
);
create index if not exists exam_session_notes_exam_updated_idx
  on public.exam_session_notes (exam_id, updated_at desc);
alter table public.exam_session_notes enable row level security;
