create schema if not exists costa_private;

create table if not exists costa_private.shared_plan (
  id boolean primary key default true check (id),
  plan jsonb not null
);

alter table costa_private.shared_plan enable row level security;
revoke all on schema costa_private from public, anon, authenticated;
revoke all on table costa_private.shared_plan from public, anon, authenticated;

insert into costa_private.shared_plan (id, plan)
values (
  true,
  '{
    "menu": [],
    "cars": [
      {"id": "car-1", "driver": "", "passengers": []},
      {"id": "car-2", "driver": "", "passengers": []}
    ],
    "items": [
      {"id": "chair", "item": "Sillas plegables", "category": "Playa", "owner": "Edu", "done": false},
      {"id": "cooler", "item": "Heladera portátil", "category": "Cocina", "owner": "Sin definir", "done": false},
      {"id": "picnic-table", "item": "Mesa de picnic", "category": "Playa", "owner": "Sin definir", "done": false},
      {"id": "food-basket", "item": "Canasta de comida", "category": "Comida", "owner": "Todos", "done": false},
      {"id": "towels", "item": "Toallas y reposeras", "category": "Playa", "owner": "Sin definir", "done": false},
      {"id": "drinks", "item": "Gaseosa / agua", "category": "Comida", "owner": "Sin definir", "done": false}
    ]
  }'::jsonb
)
on conflict (id) do nothing;

drop function if exists public.get_costa_plan(text);
drop function if exists public.save_costa_plan(text, jsonb);

create or replace function public.get_costa_plan()
returns jsonb
language sql
security definer
set search_path = pg_catalog, costa_private
as $$
  select plan
  from costa_private.shared_plan
  where id = true;
$$;

create or replace function public.save_costa_plan(p_plan jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, costa_private
as $$
begin
  if p_plan is null
    or pg_catalog.jsonb_typeof(p_plan) <> 'object'
    or pg_catalog.jsonb_typeof(p_plan->'menu') <> 'array'
    or pg_catalog.jsonb_typeof(p_plan->'items') <> 'array'
    or pg_catalog.jsonb_typeof(p_plan->'cars') <> 'array'
    or pg_catalog.pg_column_size(p_plan) > 200000 then
    raise exception 'Formato o tamaño del plan inválido.' using errcode = '22023';
  end if;

  insert into costa_private.shared_plan (id, plan)
  values (true, p_plan)
  on conflict (id) do update set plan = excluded.plan;
end;
$$;

revoke all on function public.get_costa_plan() from public;
revoke all on function public.save_costa_plan(jsonb) from public;
grant execute on function public.get_costa_plan() to anon, authenticated;
grant execute on function public.save_costa_plan(jsonb) to anon, authenticated;
