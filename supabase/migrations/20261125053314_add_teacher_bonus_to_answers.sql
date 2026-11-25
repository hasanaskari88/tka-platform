-- Store per-answer essay bonus independently from the session-wide bonus.
alter table public.answers
  add column if not exists teacher_bonus numeric not null default 0
  check (teacher_bonus >= 0);
