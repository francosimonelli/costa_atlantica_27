# Costa Atlántica · 20–23 de viembre de 2026

Plan compartido para organizar las comidas que vamos a cocinar y las cosas
que hay que llevar, además de repartir el grupo en los dos autos.

## Uso

- En **Comidas para cocinar**, agregá o editá el plato, el día, el momento y una
  o varias personas responsables: marcá todos los nombres que participen. “Todos”
  y “Sin definir” son opciones excluyentes.
- En **Lista del súper**, agregá o editá productos y marcá lo que ya compraron.
- En **Cosas para llevar**, asigná o editá categoría y responsable; marcá cada cosa cuando
  esté lista.
- En **Medicamentos y botiquín**, anotá elementos de primeros auxilios y medicación
  personal sin detallar información médica.
- En **Reparto en los dos autos**, elegí conductor y acompañantes. Cada persona
  puede quedar asignada a un solo auto.
- En las tablas, usá **Editar**, **Guardar** o **Cancelar**. Los cambios se guardan
  localmente y se sincronizan con el plan compartido.
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
2. Ejecutá también `supabase/audit_menu_deletions.sql` para registrar las
   comidas quitadas del menú junto con la fecha y la IP que Supabase exponga
   en los encabezados de la solicitud. La IP puede no estar disponible en
   todos los casos, ser compartida o estar enmascarada; no identifica
   necesariamente a una persona.
3. Esperá unos segundos y recargá la página pública. El sitio se conecta
   automáticamente, sin pedir clave; compartí la URL de GitHub Pages con el
   grupo.
4. Si no conecta, confirmá que las funciones `get_costa_plan()` y
   `save_costa_plan(jsonb)` aparezcan en Supabase **Database → Functions**.

Los cambios que ya estaban en este navegador se guardan localmente. Al conectar,
los elementos locales que no estén en el plan compartido se incorporan
automáticamente; si un elemento tiene el mismo ID en ambas copias, prevalece la
versión compartida.

El plan compartido se guarda en una fila privada de Postgres. El navegador solo
puede leerlo o editarlo mediante funciones públicas; no tiene acceso directo a
la tabla privada. **No hay autenticación:** cualquiera que conozca la dirección
del sitio o las credenciales públicas de Supabase puede leer, modificar o borrar
el plan compartido. No guardes información sensible. Para mantener los datos,
la interfaz no ofrece un botón para resetear todo; cada cambio se conserva en
el navegador y se sincroniza automáticamente después de conectar.

Los cambios de otros participantes se consultan periódicamente.

Hasta completar estos pasos, los cambios se guardan solo en el almacenamiento
local de ese navegador y no se comparten.

### Registrar y revisar borrados del menú

La interfaz informa a los participantes que los borrados de comidas se registran
con fecha e IP. La tabla privada `costa_private.menu_deletion_audit` no es
accesible desde la página pública; para revisarla, usá **SQL Editor** con una
cuenta administradora:

```sql
select created_at, client_ip, removed_menu
from costa_private.menu_deletion_audit
order by created_at desc;
```

El registro empieza cuando se ejecuta `supabase/audit_menu_deletions.sql`; no
puede reconstruir las IP de borrados anteriores. Para volver a cargar el menú
que ya estaba guardado, ejecutá `supabase/restore_menu.sql`. El script agrega
las comidas históricas solo en horarios que todavía no tienen una comida, para
preservar cambios nuevos hechos por el grupo.