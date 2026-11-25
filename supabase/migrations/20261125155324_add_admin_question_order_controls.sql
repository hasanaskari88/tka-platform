CREATE OR REPLACE FUNCTION public.move_question_order(
  p_exam_id uuid,
  p_question_id uuid,
  p_direction text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ids uuid[];
  v_position integer;
  v_target integer;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mengatur urutan soal.';
  END IF;

  IF p_direction NOT IN ('up', 'down') THEN
    RAISE EXCEPTION 'Arah perpindahan tidak valid.';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_exam_id::text));

  SELECT pg_catalog.array_agg(q.id ORDER BY q.sort_order, q.created_at, q.id)
  INTO v_ids
  FROM public.questions AS q
  WHERE q.exam_id = p_exam_id;

  IF v_ids IS NULL OR pg_catalog.array_length(v_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Bank soal tidak ditemukan.';
  END IF;

  v_position := pg_catalog.array_position(v_ids, p_question_id);
  IF v_position IS NULL THEN
    RAISE EXCEPTION 'Soal tidak ditemukan pada paket ini.';
  END IF;

  v_target := CASE WHEN p_direction = 'up' THEN v_position - 1 ELSE v_position + 1 END;

  IF v_target < 1 OR v_target > pg_catalog.array_length(v_ids, 1) THEN
    RETURN;
  END IF;

  v_ids[v_position] := v_ids[v_target];
  v_ids[v_target] := p_question_id;

  UPDATE public.questions
  SET sort_order = -sort_order - 1
  WHERE exam_id = p_exam_id;

  UPDATE public.questions AS q
  SET sort_order = ordered.position::integer
  FROM pg_catalog.unnest(v_ids) WITH ORDINALITY AS ordered(id, position)
  WHERE q.id = ordered.id
    AND q.exam_id = p_exam_id;
END;
$$;

REVOKE ALL ON FUNCTION public.move_question_order(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.move_question_order(uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.move_question_order(uuid, uuid, text) TO authenticated;
