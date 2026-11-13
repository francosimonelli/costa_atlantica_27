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

update costa_private.shared_plan as current_plan
set plan = pg_catalog.jsonb_set(
  current_plan.plan,
  '{shopping}',
  coalesce(current_plan.plan->'shopping', '[]'::jsonb) || coalesce((
    select pg_catalog.jsonb_agg(restored.product)
    from pg_catalog.jsonb_array_elements(
      '[
        {"id":"restored-shopping-empanadas","item":"Empanadas para el almuerzo del viernes","owner":"Sin definir","done":false},
        {"id":"restored-shopping-pasta","item":"Pasta seca","owner":"Sin definir","done":false},
        {"id":"restored-shopping-tomato-sauce","item":"Salsa de tomate","owner":"Sin definir","done":false},
        {"id":"restored-shopping-grated-cheese","item":"Queso rallado","owner":"Sin definir","done":false},
        {"id":"restored-shopping-salad-vegetables","item":"Lechuga, tomate y cebolla para ensaladas","owner":"Sin definir","done":false},
        {"id":"restored-shopping-burgers","item":"Hamburguesas y opción vegetariana","owner":"Sin definir","done":false},
        {"id":"restored-shopping-burger-buns","item":"Pan de hamburguesas","owner":"Sin definir","done":false},
        {"id":"restored-shopping-condiments","item":"Queso y condimentos","owner":"Sin definir","done":false},
        {"id":"restored-shopping-pizza-dough","item":"Discos o masa para pizza","owner":"Sin definir","done":false},
        {"id":"restored-shopping-mozzarella","item":"Muzzarella","owner":"Sin definir","done":false},
        {"id":"restored-shopping-pizza-sauce","item":"Salsa para pizza y toppings","owner":"Sin definir","done":false},
        {"id":"restored-shopping-asado-meat","item":"Carne para asado","owner":"Sin definir","done":false},
        {"id":"restored-shopping-grill-vegetables","item":"Verduras para la parrilla","owner":"Sin definir","done":false},
        {"id":"restored-shopping-bread","item":"Pan","owner":"Sin definir","done":false},
        {"id":"restored-shopping-yerba","item":"Yerba","owner":"Sin definir","done":false},
        {"id":"restored-shopping-coffee-tea-sugar","item":"Café, té y azúcar","owner":"Sin definir","done":false},
        {"id":"restored-shopping-milk","item":"Leche","owner":"Sin definir","done":false},
        {"id":"restored-shopping-breakfast-sandwich-bread","item":"Pan para desayunos y sándwiches","owner":"Sin definir","done":false},
        {"id":"restored-shopping-jam-butter","item":"Dulce y manteca","owner":"Sin definir","done":false},
        {"id":"restored-shopping-fruit","item":"Fruta","owner":"Sin definir","done":false},
        {"id":"restored-shopping-cookies","item":"Galletitas o bizcochitos","owner":"Sin definir","done":false},
        {"id":"restored-shopping-water-drinks","item":"Agua y bebidas","owner":"Sin definir","done":false}
      ]'::jsonb
    ) as restored(product)
    where not exists (
      select 1
      from pg_catalog.jsonb_array_elements(
        coalesce(current_plan.plan->'shopping', '[]'::jsonb)
      ) as existing(product)
      where existing.product->>'item' = restored.product->>'item'
    )
  ), '[]'::jsonb),
  true
)
where current_plan.id = true;

select jsonb_array_length(plan->'shopping') as shopping_product_count
from costa_private.shared_plan
where id = true;
