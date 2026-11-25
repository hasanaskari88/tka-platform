-- Global order for CBT question types and per-group manual question ordering.
CREATE TABLE IF NOT EXISTS public.cbt_question_type_order (
  question_type text PRIMARY KEY,
  sort_order integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cbt_question_type_order ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.cbt_question_type_order FROM PUBLIC, anon, authenticated;

INSERT INTO public.cbt_question_type_order (question_type, sort_order)
VALUES ('multiple_choice', 1), ('complex_multiple_choice', 2),
       ('true_false_matrix', 3), ('essay', 4)
ON CONFLICT (question_type) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_cbt_question_type_order()
RETURNS TABLE(question_type text, sort_order integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Hanya admin yang dapat melihat pengaturan urutan jenis soal.';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('cbt_question_type_order'));
  INSERT INTO public.cbt_question_type_order (question_type, sort_order)
  SELECT discovered.question_type,
         COALESCE((SELECT MAX(existing.sort_order) FROM public.cbt_question_type_order AS existing), 0)
           + discovered.position
  FROM (
    SELECT types.question_type,
           pg_catalog.row_number() OVER (ORDER BY types.question_type)::integer AS position
    FROM (
      SELECT DISTINCT COALESCE(q.question_type, 'multiple_choice') AS question_type
      FROM public.questions q
      JOIN public.exams e ON e.id = q.exam_id
      WHERE COALESCE(e.target_mode, 'BOTH') <> 'PRACTICE_ONLY'
        AND COALESCE(e.activity_type, 'QUIZ') = 'QUIZ'
    ) types
    LEFT JOIN public.cbt_question_type_order configured
      ON configured.question_type = types.question_type
    WHERE configured.question_type IS NULL
  ) discovered
  ON CONFLICT (question_type) DO NOTHING;
  RETURN QUERY
  SELECT setting.question_type, setting.sort_order
  FROM public.cbt_question_type_order setting
  ORDER BY setting.sort_order, setting.question_type;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_cbt_question_type_order(p_question_types text[])
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_total integer; v_distinct integer; v_known integer;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN RAISE EXCEPTION 'Hanya admin yang dapat mengubah urutan jenis soal.'; END IF;
  IF p_question_types IS NULL OR pg_catalog.array_length(p_question_types, 1) IS NULL THEN
    RAISE EXCEPTION 'Daftar urutan jenis soal tidak boleh kosong.';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('cbt_question_type_order'));
  SELECT pg_catalog.count(*), pg_catalog.count(DISTINCT item)
    INTO v_total, v_distinct
  FROM pg_catalog.unnest(p_question_types) AS item;
  SELECT pg_catalog.count(*) INTO v_known FROM public.cbt_question_type_order;
  IF v_total <> v_known OR v_distinct <> v_total OR EXISTS (
    SELECT 1 FROM pg_catalog.unnest(p_question_types) requested(item)
    LEFT JOIN public.cbt_question_type_order known ON known.question_type = requested.item
    WHERE known.question_type IS NULL
  ) THEN RAISE EXCEPTION 'Daftar jenis soal berubah. Muat ulang pengaturan lalu coba lagi.'; END IF;
  UPDATE public.cbt_question_type_order setting
  SET sort_order = ordered.position::integer, updated_at = pg_catalog.now()
  FROM pg_catalog.unnest(p_question_types) WITH ORDINALITY ordered(question_type, position)
  WHERE setting.question_type = ordered.question_type;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_cbt_question_type_order() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_cbt_question_type_order(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cbt_question_type_order() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_cbt_question_type_order(text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.move_question_order(p_exam_id uuid, p_question_id uuid, p_direction text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_ids uuid[]; v_position integer; v_target integer;
  v_question_type text; v_max_score numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN RAISE EXCEPTION 'Hanya admin yang dapat mengatur urutan soal.'; END IF;
  IF p_direction NOT IN ('up', 'down') THEN RAISE EXCEPTION 'Arah perpindahan tidak valid.'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_exam_id::text));
  SELECT COALESCE(q.question_type, 'multiple_choice'), q.max_score
    INTO v_question_type, v_max_score
  FROM public.questions q WHERE q.id = p_question_id AND q.exam_id = p_exam_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Soal tidak ditemukan pada paket ini.'; END IF;
  SELECT pg_catalog.array_agg(q.id ORDER BY q.sort_order, q.created_at, q.id)
    INTO v_ids
  FROM public.questions q
  WHERE q.exam_id = p_exam_id
    AND COALESCE(q.question_type, 'multiple_choice') = v_question_type
    AND q.max_score IS NOT DISTINCT FROM v_max_score;
  v_position := pg_catalog.array_position(v_ids, p_question_id);
  IF v_position IS NULL THEN RAISE EXCEPTION 'Soal tidak ditemukan pada kelompok jenis dan bobot yang sama.'; END IF;
  v_target := CASE WHEN p_direction = 'up' THEN v_position - 1 ELSE v_position + 1 END;
  IF v_target < 1 OR v_target > pg_catalog.array_length(v_ids, 1) THEN RETURN; END IF;
  v_ids[v_position] := v_ids[v_target]; v_ids[v_target] := p_question_id;
  UPDATE public.questions q
  SET sort_order = ordered.position::integer
  FROM pg_catalog.unnest(v_ids) WITH ORDINALITY ordered(id, position)
  WHERE q.id = ordered.id AND q.exam_id = p_exam_id
    AND COALESCE(q.question_type, 'multiple_choice') = v_question_type
    AND q.max_score IS NOT DISTINCT FROM v_max_score;
END;
$function$;

REVOKE ALL ON FUNCTION public.move_question_order(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_question_order(uuid, uuid, text) TO authenticated;
