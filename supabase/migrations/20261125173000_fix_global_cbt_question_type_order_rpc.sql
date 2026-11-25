-- Correct ambiguous output-column resolution in the global type-order RPC.
CREATE OR REPLACE FUNCTION public.get_cbt_question_type_order()
RETURNS TABLE(question_type text, sort_order integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Hanya admin yang dapat melihat pengaturan urutan jenis soal.';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('cbt_question_type_order'));
  INSERT INTO public.cbt_question_type_order AS target (question_type, sort_order)
  SELECT discovered.question_type,
         COALESCE((SELECT MAX(existing.sort_order) FROM public.cbt_question_type_order AS existing), 0)
           + discovered.position
  FROM (
    SELECT types.question_type,
           pg_catalog.row_number() OVER (ORDER BY types.question_type)::integer AS position
    FROM (
      SELECT DISTINCT COALESCE(q.question_type, 'multiple_choice') AS question_type
      FROM public.questions AS q
      JOIN public.exams AS e ON e.id = q.exam_id
      WHERE COALESCE(e.target_mode, 'BOTH') <> 'PRACTICE_ONLY'
        AND COALESCE(e.activity_type, 'QUIZ') = 'QUIZ'
    ) AS types
    LEFT JOIN public.cbt_question_type_order AS configured
      ON configured.question_type = types.question_type
    WHERE configured.question_type IS NULL
  ) AS discovered
  ON CONFLICT ON CONSTRAINT cbt_question_type_order_pkey DO NOTHING;
  RETURN QUERY
  SELECT setting.question_type, setting.sort_order
  FROM public.cbt_question_type_order AS setting
  ORDER BY setting.sort_order, setting.question_type;
END;
$function$;
