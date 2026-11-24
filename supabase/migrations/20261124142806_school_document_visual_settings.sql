create table if not exists public.school_document_visual_settings (
  id text primary key default 'primary' check (id = 'primary'),
  settings jsonb not null default '{
    "defaults": {
      "leftLogo": "/logo-sd-getasan.png",
      "rightLogo": "none",
      "theme": "candy",
      "pattern": "cartoon3d-dot",
      "watermark": { "enabled": true, "opacity": 0.20, "size": 60 }
    },
    "documents": {
      "report": { "useGlobal": true },
      "certificate": { "useGlobal": true },
      "award": { "useGlobal": true }
    }
  }'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.school_document_visual_settings enable row level security;
revoke all on public.school_document_visual_settings from anon, authenticated;

insert into public.school_document_visual_settings (id)
values ('primary')
on conflict (id) do nothing;

create or replace function public.get_school_document_visual_settings()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_settings public.school_document_visual_settings%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text = 'admin'
  ) then
    raise exception 'Hanya admin yang dapat membaca pengaturan tampilan dokumen.';
  end if;

  select * into v_settings
  from public.school_document_visual_settings
  where id = 'primary';

  return coalesce(to_jsonb(v_settings), '{}'::jsonb);
end;
$function$;

create or replace function public.save_school_document_visual_settings(p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_settings public.school_document_visual_settings%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role::text = 'admin'
  ) then
    raise exception 'Hanya admin yang dapat mengubah pengaturan tampilan dokumen.';
  end if;

  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    raise exception 'Format pengaturan tampilan dokumen tidak valid.';
  end if;

  if not (p_settings ? 'defaults') or jsonb_typeof(p_settings->'defaults') <> 'object'
     or not (p_settings ? 'documents') or jsonb_typeof(p_settings->'documents') <> 'object' then
    raise exception 'Pengaturan logo, tema, motif, atau dokumen tidak lengkap.';
  end if;

  insert into public.school_document_visual_settings (id, settings, updated_at, updated_by)
  values ('primary', p_settings, now(), auth.uid())
  on conflict (id) do update set
    settings = excluded.settings,
    updated_at = now(),
    updated_by = auth.uid()
  returning * into v_settings;

  return to_jsonb(v_settings);
end;
$function$;

revoke all on function public.get_school_document_visual_settings() from public, anon;
revoke all on function public.save_school_document_visual_settings(jsonb) from public, anon;
grant execute on function public.get_school_document_visual_settings() to authenticated;
grant execute on function public.save_school_document_visual_settings(jsonb) to authenticated;
