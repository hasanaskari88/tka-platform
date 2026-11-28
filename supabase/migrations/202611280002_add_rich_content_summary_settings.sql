alter table public.announcements
  add column if not exists content_html text,
  add column if not exists summary_mode text not null default 'auto',
  add column if not exists summary_height_px integer not null default 280,
  add column if not exists summary_repeat boolean not null default true;

alter table public.study_materials
  add column if not exists summary_mode text not null default 'auto',
  add column if not exists summary_height_px integer not null default 280,
  add column if not exists summary_repeat boolean not null default true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'announcements_summary_mode_check') then
    alter table public.announcements add constraint announcements_summary_mode_check check (summary_mode in ('auto', 'manual'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'announcements_summary_height_check') then
    alter table public.announcements add constraint announcements_summary_height_check check (summary_height_px between 120 and 900);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'study_materials_summary_mode_check') then
    alter table public.study_materials add constraint study_materials_summary_mode_check check (summary_mode in ('auto', 'manual'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'study_materials_summary_height_check') then
    alter table public.study_materials add constraint study_materials_summary_height_check check (summary_height_px between 120 and 900);
  end if;
end $$;
