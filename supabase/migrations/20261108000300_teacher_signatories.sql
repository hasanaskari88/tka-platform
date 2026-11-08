-- Master list of school document signatories.
-- Apply only to an isolated development database after review; not Production.
create table if not exists public.teacher_signatories (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  position text not null check (position in ('class_teacher', 'principal')),
  class_code text,
  nip text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_signatories_class_position_check check (
    (position = 'class_teacher' and class_code is not null and length(trim(class_code)) > 0)
    or (position = 'principal' and class_code is null)
  )
);
create index if not exists teacher_signatories_class_active_idx
  on public.teacher_signatories (class_code, position) where is_active = true;
create index if not exists teacher_signatories_position_active_idx
  on public.teacher_signatories (position) where is_active = true;
alter table public.teacher_signatories enable row level security;
revoke all on table public.teacher_signatories from anon, public;
grant select, insert, update, delete on table public.teacher_signatories to authenticated;
drop policy if exists "Authenticated users read active signatories" on public.teacher_signatories;
create policy "Authenticated users read active signatories"
on public.teacher_signatories for select to authenticated
using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role::text = 'admin')
  or (
    is_active = true
    and (
      position = 'principal'
      or (
        position = 'class_teacher'
        and class_code = (select p.class_code from public.profiles p where p.id = (select auth.uid()))
      )
    )
  )
);
drop policy if exists "Admins manage signatories" on public.teacher_signatories;
create policy "Admins manage signatories"
on public.teacher_signatories for all to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role::text = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role::text = 'admin'));

-- Refresh PostgREST so newly created tables/functions are immediately visible to the Data API.
notify pgrst, 'reload schema';
