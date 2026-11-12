-- Hubungkan akun guru/admin dengan penugasan wali kelas.
-- Baris lama dipasangkan hanya jika nama cocok tepat dan hanya ada satu akun admin yang cocok.

alter table public.teacher_signatories
  add column if not exists user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_signatories_user_id_fkey'
      and conrelid = 'public.teacher_signatories'::regclass
  ) then
    alter table public.teacher_signatories
      add constraint teacher_signatories_user_id_fkey
      foreign key (user_id)
      references public.profiles(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_teacher_signatories_user_id
  on public.teacher_signatories(user_id);

with exact_matches as (
  select
    ts.id as signatory_id,
    (array_agg(p.id))[1] as profile_id
  from public.teacher_signatories ts
  join public.profiles p
    on lower(trim(p.full_name)) = lower(trim(ts.full_name))
   and p.role = 'admin'
  where ts.position = 'class_teacher'
    and ts.is_active = true
    and ts.user_id is null
  group by ts.id
  having count(p.id) = 1
)
update public.teacher_signatories ts
set user_id = exact_matches.profile_id,
    updated_at = now()
from exact_matches
where ts.id = exact_matches.signatory_id;
