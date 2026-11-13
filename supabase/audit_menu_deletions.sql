create table if not exists costa_private.menu_deletion_audit (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  client_ip text,
  removed_menu jsonb not null
);

alter table costa_private.menu_deletion_audit enable row level security;
revoke all on table costa_private.menu_deletion_audit from public, anon, authenticated;

create or replace function public.save_costa_plan(p_plan jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, costa_private
as $$
declare
  previous_plan jsonb;
  removed_menu jsonb := '[]'::jsonb;
  request_headers jsonb;
  client_ip text;
begin
  if p_plan is null
    or pg_catalog.jsonb_typeof(p_plan) <> 'object'
    or pg_catalog.jsonb_typeof(p_plan->'menu') <> 'array'
    or pg_catalog.jsonb_typeof(p_plan->'items') <> 'array'
    or pg_catalog.jsonb_typeof(p_plan->'cars') <> 'array'
    or pg_catalog.pg_column_size(p_plan) > 200000 then
    raise exception 'Formato o tamaño del plan inválido.' using errcode = '22023';
  end if;

  select plan
  into previous_plan
  from costa_private.shared_plan
  where id = true
  for update;

  if found then
    select coalesce(pg_catalog.jsonb_agg(old_rows.old_meal), '[]'::jsonb)
    into removed_menu
    from pg_catalog.jsonb_array_elements(coalesce(previous_plan->'menu', '[]'::jsonb))
      as old_rows(old_meal)
    where not exists (
      select 1
      from pg_catalog.jsonb_array_elements(coalesce(p_plan->'menu', '[]'::jsonb))
        as new_rows(new_meal)
      where new_rows.new_meal->>'id' is not distinct from old_rows.old_meal->>'id'
    );

    if pg_catalog.jsonb_array_length(removed_menu) > 0 then
      request_headers := coalesce(
        nullif(pg_catalog.current_setting('request.headers', true), '')::jsonb,
        '{}'::jsonb
      );
      client_ip := coalesce(
        nullif(request_headers->>'cf-connecting-ip', ''),
        nullif(request_headers->>'x-real-ip', ''),
        nullif(request_headers->>'x-forwarded-for', '')
      );

      insert into costa_private.menu_deletion_audit (client_ip, removed_menu)
      values (client_ip, removed_menu);
    end if;

    update costa_private.shared_plan
    set plan = p_plan
    where id = true;
  else
    insert into costa_private.shared_plan (id, plan)
    values (true, p_plan);
  end if;
end;
$$;

revoke all on function public.save_costa_plan(jsonb) from public;
grant execute on function public.save_costa_plan(jsonb) to anon, authenticated;
