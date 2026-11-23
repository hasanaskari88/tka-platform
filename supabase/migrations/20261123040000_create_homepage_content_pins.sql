-- Isolated metadata for homepage/practice content ordering.
-- Existing content, exam, attempt, answer and XP tables are not modified.

CREATE TABLE IF NOT EXISTS public.homepage_content_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surface text NOT NULL CHECK (surface IN ('cbt', 'practice', 'material', 'announcement')),
  exam_id uuid NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  material_id uuid NULL REFERENCES public.study_materials(id) ON DELETE CASCADE,
  announcement_id uuid NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  sort_order integer NOT NULL CHECK (sort_order > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL,
  CONSTRAINT homepage_content_pins_target_matches_surface CHECK (
    (surface IN ('cbt', 'practice') AND exam_id IS NOT NULL AND material_id IS NULL AND announcement_id IS NULL)
    OR (surface = 'material' AND exam_id IS NULL AND material_id IS NOT NULL AND announcement_id IS NULL)
    OR (surface = 'announcement' AND exam_id IS NULL AND material_id IS NULL AND announcement_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS homepage_content_pins_exam_unique
  ON public.homepage_content_pins (surface, exam_id)
  WHERE exam_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS homepage_content_pins_material_unique
  ON public.homepage_content_pins (surface, material_id)
  WHERE material_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS homepage_content_pins_announcement_unique
  ON public.homepage_content_pins (surface, announcement_id)
  WHERE announcement_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS homepage_content_pins_order_unique
  ON public.homepage_content_pins (surface, sort_order);

ALTER TABLE public.homepage_content_pins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.homepage_content_pins FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.homepage_content_pins TO service_role;

CREATE OR REPLACE FUNCTION public.replace_homepage_content_pins(
  p_surface text,
  p_item_ids uuid[],
  p_updated_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_item_count integer := COALESCE(cardinality(p_item_ids), 0);
  v_unique_count bigint := 0;
  v_item_id uuid;
  v_sort_order integer := 0;
BEGIN
  IF p_surface IS NULL OR p_surface NOT IN ('cbt', 'practice', 'material', 'announcement') THEN
    RAISE EXCEPTION 'Invalid homepage pin surface';
  END IF;

  IF v_item_count > 500 THEN
    RAISE EXCEPTION 'Too many homepage pins';
  END IF;

  SELECT count(DISTINCT item_id)
    INTO v_unique_count
    FROM unnest(COALESCE(p_item_ids, ARRAY[]::uuid[])) AS input(item_id);

  IF v_unique_count <> v_item_count THEN
    RAISE EXCEPTION 'Duplicate homepage pin item';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('homepage_content_pins:' || p_surface, 0)
  );

  DELETE FROM public.homepage_content_pins WHERE surface = p_surface;

  FOR v_item_id IN
    SELECT item_id
    FROM unnest(COALESCE(p_item_ids, ARRAY[]::uuid[]))
      WITH ORDINALITY AS input(item_id, ordinal)
    ORDER BY ordinal
  LOOP
    v_sort_order := v_sort_order + 1;

    IF p_surface IN ('cbt', 'practice') THEN
      IF NOT EXISTS (SELECT 1 FROM public.exams WHERE id = v_item_id) THEN
        RAISE EXCEPTION 'Exam pin target does not exist';
      END IF;
      INSERT INTO public.homepage_content_pins (surface, exam_id, sort_order, updated_at, updated_by)
      VALUES (p_surface, v_item_id, v_sort_order, now(), p_updated_by);
    ELSIF p_surface = 'material' THEN
      IF NOT EXISTS (SELECT 1 FROM public.study_materials WHERE id = v_item_id) THEN
        RAISE EXCEPTION 'Material pin target does not exist';
      END IF;
      INSERT INTO public.homepage_content_pins (surface, material_id, sort_order, updated_at, updated_by)
      VALUES (p_surface, v_item_id, v_sort_order, now(), p_updated_by);
    ELSE
      IF NOT EXISTS (SELECT 1 FROM public.announcements WHERE id = v_item_id) THEN
        RAISE EXCEPTION 'Announcement pin target does not exist';
      END IF;
      INSERT INTO public.homepage_content_pins (surface, announcement_id, sort_order, updated_at, updated_by)
      VALUES (p_surface, v_item_id, v_sort_order, now(), p_updated_by);
    END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.replace_homepage_content_pins(text, uuid[], uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_homepage_content_pins(text, uuid[], uuid)
  TO service_role;
