# Costa Atlántica · 20–23 de noviembre de 2026

Plan compartido para organizar las comidas que vamos a cocinar y las cosas
que hay que llevar, además de repartir el grupo en los dos autos.

## Uso

- En **Comidas para cocinar**, agregá el plato, el día, el momento y quién cocina.
- En **Lista del súper**, anotá los productos y marcá lo que ya compraron.
- En **Cosas para llevar**, asigná categoría y responsable; marcá cada cosa cuando
  esté lista.
- En **Reparto en los dos autos**, elegí conductor y acompañantes. Cada persona
  puede quedar asignada a un solo auto.
- **Enviar por WhatsApp** prepara un resumen de autos, menú y checklist.
- **Imprimir / guardar PDF** abre el diálogo de impresión del navegador.

## Configurar la base compartida sin clave

La página se publica en
https://francosimonelli.github.io/costa_atlantica_27/ mediante GitHub Pages.
La URL del proyecto Supabase y su publishable key ya están configuradas en
`app.js`. La publishable key es pública; no uses la `service_role` ni otra
clave secreta en el sitio.

Para habilitar el guardado compartido:

1. En el proyecto Supabase configurado en `app.js`, ejecutá
   `supabase/schema.sql` en **SQL Editor**.
2. Esperá unos segundos y recargá la página pública. El sitio se conecta
   automáticamente, sin pedir clave; compartí la URL de GitHub Pages con el
   grupo.
3. Si no conecta, confirmá que las funciones `get_costa_plan()` y
   `save_costa_plan(jsonb)` aparezcan en Supabase **Database → Functions**.

Los cambios que ya estaban en este navegador se guardan localmente. Al conectar,
si difieren del plan compartido, se ofrece combinarlos sin borrar la copia
local.

El plan compartido se guarda en una fila privada de Postgres. El navegador solo
puede leerlo o editarlo mediante funciones públicas; no tiene acceso directo a
la tabla privada. **No hay autenticación:** cualquiera que conozca la dirección
del sitio o las credenciales públicas de Supabase puede leer, modificar o borrar
el plan compartido. No guardes información sensible. Para mantener los datos,
la interfaz no ofrece un botón para resetear todo; cada cambio se conserva en
el navegador y se sincroniza automáticamente después de conectar.

Los cambios de otros participantes se consultan periódicamente. Si hay una
copia local diferente al conectar, se conserva en ese navegador y aparece
**Combinar copia de este navegador**. La combinación agrega elementos locales
que no están en la copia compartida, conserva la versión compartida en caso de
IDs duplicados y mantiene la copia local en el navegador.

Hasta completar estos pasos, los cambios se guardan solo en el almacenamiento
local de ese navegador y no se comparten.