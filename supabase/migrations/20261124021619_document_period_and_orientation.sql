alter table public.school_document_settings
  add column if not exists academic_year text not null default '2026/2027',
  add column if not exists learning_period text not null default 'Semester Ganjil',
  add column if not exists report_orientation text not null default 'portrait',
  add column if not exists certificate_orientation text not null default 'landscape';

alter table public.school_document_settings drop constraint if exists school_document_settings_learning_period_check;
alter table public.school_document_settings add constraint school_document_settings_learning_period_check
  check (learning_period in ('Semester Ganjil', 'Semester Genap', 'Akhir Jenjang SD'));

alter table public.school_document_settings drop constraint if exists school_document_settings_report_orientation_check;
alter table public.school_document_settings add constraint school_document_settings_report_orientation_check
  check (report_orientation in ('portrait', 'landscape'));

alter table public.school_document_settings drop constraint if exists school_document_settings_certificate_orientation_check;
alter table public.school_document_settings add constraint school_document_settings_certificate_orientation_check
  check (certificate_orientation in ('portrait', 'landscape'));

create or replace function public.save_school_document_settings(p_settings jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_settings public.school_document_settings%rowtype;
  v_kkm integer;
  v_academic_year text;
  v_learning_period text;
  v_report_orientation text;
  v_certificate_orientation text;
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
  v_academic_year := coalesce(nullif(btrim(p_settings->>'academic_year'), ''), '2026/2027');
  v_learning_period := coalesce(nullif(p_settings->>'learning_period', ''), 'Semester Ganjil');
  v_report_orientation := coalesce(nullif(p_settings->>'report_orientation', ''), 'portrait');
  v_certificate_orientation := coalesce(nullif(p_settings->>'certificate_orientation', ''), 'landscape');

  if v_kkm < 0 or v_kkm > 100 then raise exception 'KKM harus berada pada rentang 0 sampai 100.'; end if;
  if length(v_academic_year) > 20 then raise exception 'Tahun pelajaran terlalu panjang.'; end if;
  if v_learning_period not in ('Semester Ganjil', 'Semester Genap', 'Akhir Jenjang SD') then raise exception 'Periode pembelajaran tidak valid.'; end if;
  if v_report_orientation not in ('portrait', 'landscape') or v_certificate_orientation not in ('portrait', 'landscape') then raise exception 'Orientasi dokumen tidak valid.'; end if;

  insert into public.school_document_settings (
    id, school_name, school_address, teacher_name, teacher_nip,
    principal_name, principal_nip, issue_place, kkm,
    academic_year, learning_period, report_orientation, certificate_orientation,
    updated_at, updated_by
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
    v_kkm, v_academic_year, v_learning_period,
    v_report_orientation, v_certificate_orientation,
    now(), auth.uid()
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
    academic_year = excluded.academic_year,
    learning_period = excluded.learning_period,
    report_orientation = excluded.report_orientation,
    certificate_orientation = excluded.certificate_orientation,
    updated_at = now(),
    updated_by = auth.uid()
  returning * into v_settings;
  return to_jsonb(v_settings);
end;
$function$;

revoke all on function public.save_school_document_settings(jsonb) from public, anon;
grant execute on function public.save_school_document_settings(jsonb) to authenticated;

notify pgrst, 'reload schema';
