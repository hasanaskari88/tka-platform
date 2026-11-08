-- Central school document settings for admin report and certificate printing.
-- Staged only: apply to a development database and verify before Production.

create table if not exists public.school_document_settings (
  id text primary key default 'primary' check (id = 'primary'),
  school_name text not null default 'SD NEGERI GETASAN',
  school_address text not null default '',
  teacher_name text not null default '',
  teacher_nip text not null default '',
  principal_name text not null default '',
  principal_nip text not null default '',
  issue_place text not null default 'Getasan',
  kkm integer not null default 70 check (kkm between 0 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.school_document_settings enable row level security;

revoke all on table public.school_document_settings from anon, public;
grant select, insert, update on table public.school_document_settings to authenticated;

drop policy if exists "Admins manage school document settings" on public.school_document_settings;
create policy "Admins manage school document settings"
on public.school_document_settings
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role::text = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role::text = 'admin'
  )
);

insert into public.school_document_settings (id)
values ('primary')
on conflict (id) do nothing;

create or replace function public.get_school_document_settings()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_settings public.school_document_settings%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text = 'admin'
  ) then
    raise exception 'Hanya admin yang dapat membaca pengaturan dokumen.';
  end if;

  select * into v_settings
  from public.school_document_settings
  where id = 'primary';

  return to_jsonb(v_settings);
end;
$function$;

create or replace function public.save_school_document_settings(p_settings jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_settings public.school_document_settings%rowtype;
  v_kkm integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text = 'admin'
  ) then
    raise exception 'Hanya admin yang dapat mengubah pengaturan dokumen.';
  end if;

  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    raise exception 'Format pengaturan dokumen tidak valid.';
  end if;

  v_kkm := coalesce(nullif(p_settings->>'kkm', '')::integer, 70);
  if v_kkm < 0 or v_kkm > 100 then
    raise exception 'KKM harus berada pada rentang 0 sampai 100.';
  end if;

  insert into public.school_document_settings (
    id, school_name, school_address, teacher_name, teacher_nip,
    principal_name, principal_nip, issue_place, kkm, updated_at, updated_by
  )
  values (
    'primary',
    coalesce(nullif(p_settings->>'school_name', ''), 'SD NEGERI GETASAN'),
    coalesce(p_settings->>'school_address', ''),
    coalesce(p_settings->>'teacher_name', ''),
    coalesce(p_settings->>'teacher_nip', ''),
    coalesce(p_settings->>'principal_name', ''),
    coalesce(p_settings->>'principal_nip', ''),
    coalesce(nullif(p_settings->>'issue_place', ''), 'Getasan'),
    v_kkm,
    now(),
    auth.uid()
  )
  on conflict (id) do update set
    school_name = excluded.school_name,
    school_address = excluded.school_address,
    teacher_name = excluded.teacher_name,
    teacher_nip = excluded.teacher_nip,
    principal_name = excluded.principal_name,
    principal_nip = excluded.principal_nip,
    issue_place = excluded.issue_place,
    kkm = excluded.kkm,
    updated_at = now(),
    updated_by = auth.uid()
  returning * into v_settings;

  return to_jsonb(v_settings);
end;
$function$;

revoke all on function public.get_school_document_settings() from public, anon;
revoke all on function public.save_school_document_settings(jsonb) from public, anon;
grant execute on function public.get_school_document_settings() to authenticated;
grant execute on function public.save_school_document_settings(jsonb) to authenticated;
