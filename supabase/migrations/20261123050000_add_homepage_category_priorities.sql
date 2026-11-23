ALTER TABLE public.homepage_content_pins ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'item', ADD COLUMN IF NOT EXISTS category_key text NULL;
ALTER TABLE public.homepage_content_pins DROP CONSTRAINT IF EXISTS homepage_content_pins_target_matches_surface;
ALTER TABLE public.homepage_content_pins ADD CONSTRAINT homepage_content_pins_scope_valid CHECK (scope IN ('item','category'));
ALTER TABLE public.homepage_content_pins ADD CONSTRAINT homepage_content_pins_target_matches_surface CHECK (
(scope='item' AND category_key IS NULL AND ((surface IN ('cbt','practice') AND exam_id IS NOT NULL AND material_id IS NULL AND announcement_id IS NULL) OR (surface='material' AND exam_id IS NULL AND material_id IS NOT NULL AND announcement_id IS NULL) OR (surface='announcement' AND exam_id IS NULL AND material_id IS NULL AND announcement_id IS NOT NULL)))
OR (scope='category' AND surface IN ('cbt','practice') AND category_key IS NOT NULL AND length(btrim(category_key))>0 AND exam_id IS NULL AND material_id IS NULL AND announcement_id IS NULL));
CREATE UNIQUE INDEX IF NOT EXISTS homepage_content_pins_category_unique ON public.homepage_content_pins(surface,category_key) WHERE scope='category';
CREATE OR REPLACE FUNCTION public.replace_homepage_content_priorities(p_surface text,p_item_ids uuid[],p_category_keys text[],p_updated_by uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $function$
DECLARE v_item_count integer:=COALESCE(cardinality(p_item_ids),0); v_category_count integer:=COALESCE(cardinality(p_category_keys),0); v_unique_count bigint:=0; v_key_count bigint:=0; v_item_id uuid; v_category_key text; v_sort_order integer:=0;
BEGIN
IF p_surface IS NULL OR p_surface NOT IN ('cbt','practice','material','announcement') THEN RAISE EXCEPTION 'Invalid homepage pin surface'; END IF;
IF v_item_count>500 OR v_category_count>200 THEN RAISE EXCEPTION 'Too many homepage priorities'; END IF;
IF v_category_count>0 AND p_surface NOT IN ('cbt','practice') THEN RAISE EXCEPTION 'Category priorities are only supported for CBT and Practice'; END IF;
SELECT count(DISTINCT item_id) INTO v_unique_count FROM unnest(COALESCE(p_item_ids,ARRAY[]::uuid[])) AS input(item_id);
IF v_unique_count<>v_item_count THEN RAISE EXCEPTION 'Duplicate homepage priority item'; END IF;
SELECT count(DISTINCT lower(btrim(category_key))) INTO v_key_count FROM unnest(COALESCE(p_category_keys,ARRAY[]::text[])) AS input(category_key);
IF v_key_count<>v_category_count THEN RAISE EXCEPTION 'Duplicate homepage priority category'; END IF;
PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('homepage_content_pins:'||p_surface,0));
DELETE FROM public.homepage_content_pins WHERE surface=p_surface;
FOR v_item_id IN SELECT item_id FROM unnest(COALESCE(p_item_ids,ARRAY[]::uuid[])) WITH ORDINALITY AS input(item_id,ordinal) ORDER BY ordinal LOOP
v_sort_order:=v_sort_order+1;
IF p_surface IN ('cbt','practice') THEN
IF NOT EXISTS(SELECT 1 FROM public.exams WHERE id=v_item_id) THEN RAISE EXCEPTION 'Exam priority target does not exist'; END IF;
INSERT INTO public.homepage_content_pins(surface,scope,exam_id,sort_order,updated_at,updated_by) VALUES(p_surface,'item',v_item_id,v_sort_order,now(),p_updated_by);
ELSIF p_surface='material' THEN
IF NOT EXISTS(SELECT 1 FROM public.study_materials WHERE id=v_item_id) THEN RAISE EXCEPTION 'Material priority target does not exist'; END IF;
INSERT INTO public.homepage_content_pins(surface,scope,material_id,sort_order,updated_at,updated_by) VALUES(p_surface,'item',v_item_id,v_sort_order,now(),p_updated_by);
ELSE
IF NOT EXISTS(SELECT 1 FROM public.announcements WHERE id=v_item_id) THEN RAISE EXCEPTION 'Announcement priority target does not exist'; END IF;
INSERT INTO public.homepage_content_pins(surface,scope,announcement_id,sort_order,updated_at,updated_by) VALUES(p_surface,'item',v_item_id,v_sort_order,now(),p_updated_by);
END IF; END LOOP;
FOR v_category_key IN SELECT lower(btrim(category_key)) FROM unnest(COALESCE(p_category_keys,ARRAY[]::text[])) WITH ORDINALITY AS input(category_key,ordinal) ORDER BY ordinal LOOP
v_sort_order:=v_sort_order+1;
INSERT INTO public.homepage_content_pins(surface,scope,category_key,sort_order,updated_at,updated_by) VALUES(p_surface,'category',v_category_key,v_sort_order,now(),p_updated_by);
END LOOP;
END; $function$;
REVOKE ALL ON FUNCTION public.replace_homepage_content_priorities(text,uuid[],text[],uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.replace_homepage_content_priorities(text,uuid[],text[],uuid) TO service_role;
