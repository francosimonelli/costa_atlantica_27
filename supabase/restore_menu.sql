update costa_private.shared_plan current_plan
set plan = pg_catalog.jsonb_set(
  current_plan.plan,
  '{menu}',
  coalesce(current_plan.plan->'menu', '[]'::jsonb) || coalesce((
    select pg_catalog.jsonb_agg(restored.meal)
    from pg_catalog.jsonb_array_elements(
      '[
        {"id":"restored-meal-2026-11-20-lunch","item":"Empanadas compradas o comer afuera (no cocinamos al llegar)","day":"2026-11-20","meal":"Almuerzo","owner":["Sin definir"]},
        {"id":"restored-meal-2026-11-20-dinner","item":"Pastas con salsa de tomate, queso rallado y ensalada","day":"2026-11-20","meal":"Cena","owner":["Sin definir"]},
        {"id":"restored-meal-2026-11-21-breakfast","item":"Tostadas, fruta, café y mate","day":"2026-11-21","meal":"Desayuno","owner":["Sin definir"]},
        {"id":"restored-meal-2026-11-21-lunch","item":"Hamburguesas (también opción vegetariana) con ensalada","day":"2026-11-21","meal":"Almuerzo","owner":["Sin definir"]},
        {"id":"restored-meal-2026-11-21-snack","item":"Mate, fruta y algo dulce","day":"2026-11-21","meal":"Merienda","owner":["Sin definir"]},
        {"id":"restored-meal-2026-11-21-dinner","item":"Pizza casera; alternativa: pedir o salir a comer","day":"2026-11-21","meal":"Cena","owner":["Sin definir"]},
        {"id":"restored-meal-2026-11-22-breakfast","item":"Tostadas, fruta, café y mate","day":"2026-11-22","meal":"Desayuno","owner":["Sin definir"]},
        {"id":"restored-meal-2026-11-22-lunch","item":"Sobras o sándwiches; alternativa: comer afuera","day":"2026-11-22","meal":"Almuerzo","owner":["Sin definir"]},
        {"id":"restored-meal-2026-11-22-snack","item":"Mate, fruta y bizcochitos","day":"2026-11-22","meal":"Merienda","owner":["Sin definir"]},
        {"id":"restored-meal-2026-11-22-dinner","item":"Asado o verduras a la parrilla con ensaladas","day":"2026-11-22","meal":"Cena","owner":["Sin definir"]},
        {"id":"restored-meal-2026-11-23-breakfast","item":"Desayuno simple con lo que quede","day":"2026-11-23","meal":"Desayuno","owner":["Sin definir"]},
        {"id":"restored-meal-2026-11-23-lunch","item":"Sándwiches para el viaje o comer afuera, según el horario","day":"2026-11-23","meal":"Almuerzo","owner":["Sin definir"]}
      ]'::jsonb
    ) as restored(meal)
    where not exists (
      select 1
      from pg_catalog.jsonb_array_elements(
        coalesce(current_plan.plan->'menu', '[]'::jsonb)
      ) as existing(meal)
      where existing.meal->>'day' = restored.meal->>'day'
        and existing.meal->>'meal' = restored.meal->>'meal'
    )
  ), '[]'::jsonb),
  true
)
where current_plan.id = true;

select jsonb_array_length(plan->'menu') as meal_count
from costa_private.shared_plan
where id = true;
