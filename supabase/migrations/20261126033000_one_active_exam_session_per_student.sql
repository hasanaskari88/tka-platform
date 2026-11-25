-- Only one live or paused attempt per student and exam; completed attempts remain historical.
create unique index if not exists exam_sessions_one_active_per_user_exam_idx
  on public.exam_sessions (exam_id, user_id)
  where user_id is not null and status in ('ongoing', 'paused');
