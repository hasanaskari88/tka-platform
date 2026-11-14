revoke execute on function public.start_practice_attempt(uuid) from public, anon;
grant execute on function public.start_practice_attempt(uuid) to authenticated;
