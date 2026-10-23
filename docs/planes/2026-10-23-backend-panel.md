# Backend y panel de Los Trotamundos — Plan de implementación

> **Para agentes:** SUB-SKILL OBLIGATORIA: usar superpowers:subagent-driven-development (recomendada) o superpowers:executing-plans para ejecutar este plan tarea a tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que Daniel mantenga la carta (a mano o importando el Excel de LastApp) y las actividades de `lostrotamundosalpujarra.com` desde un panel diseñado en Claude Design, con las consultas de actividades guardadas en el panel y enviadas por WhatsApp a la vez.

**Arquitectura:** la web sigue siendo HTML estático en Vercel. Funciones de Vercel en `api/` hablan con Supabase (por PostgREST, con `fetch`) y con Resend (correo). La traducción con Claude queda en el código, apagada y sin clave: en este plan no se llama nunca. El panel es la exportación de Claude Design servida en `/panel`; un puente (`tools/panel-conexion.js`, inyectado por `tools/ajustes.py`) cambia sus datos de muestra por la API. Es el método del repositorio `danguerrero32/ascuadeoro-web`.

**Tecnología:** Node 24 (módulos ES), funciones de Vercel en `cdg1`, Supabase (Postgres, PostgREST, Storage), Resend, `@anthropic-ai/sdk` + `zod` (Claude Haiku 5.5, preparado y sin llamarse), SheetJS en el navegador, `node:test`, exportaciones `.dc.html` de Claude Design.

**Spec:** `docs/diseno-funcional.md`. Leerlo entero antes de empezar; este plan argumenta desde él.

**Referencia de código:** `~/Downloads/Blasen Marujeña/ascuadeoro-web/` (en adelante, **Ascua**). Donde una tarea dice "como en Ascua", copiar el patrón de ese archivo y adaptar nombres.

## Restricciones globales

- Node `24.x`, `"type": "module"`. Dependencias de ejecución: solo `@anthropic-ai/sdk` y `zod`. Supabase y Resend, con `fetch`.
- Librerías del navegador desde CDN con versión fija: SheetJS `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js`.
- Región de funciones `cdg1`. Supabase en West EU (París).
- Secretos solo en variables de Vercel o en secretos de GitHub. Nunca en el código, en el chat ni en commits. Nombres: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (la clave secreta del proyecto), `RESEND_API_KEY`, `RESEND_FROM`, `CRON_SECRET`; en GitHub, `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`. **No se crea `ANTHROPIC_API_KEY`.**
- Si las claves del proyecto de Supabase son del formato nuevo (`sb_secret_…`, `sb_publishable_…`), se mandan solo en la cabecera `apikey`, sin `Authorization: Bearer`. Si son JWT antiguos, las dos cabeceras, como en Ascua. `lib/supa.js` decide por el prefijo.
- Todas las tablas con RLS activado y **sin políticas**.
- Ningún dato personal en el repositorio: ni correos de administradores ni de aviso. Se dan de alta con SQL local no versionado (`supabase/local-*.sql`, en `.gitignore`) o desde Ajustes.
- **Cero llamadas a la API de Claude en todo el plan, publicación incluida.** No se traduce nada y no se gasta API: se trabaja solo en español. El ajuste `traduccion_automatica` es `false` y se queda así. El código de traducción se prueba solo con respuestas simuladas; nadie lo prueba "de verdad". Encenderlo es una decisión futura de Dan, fuera de este plan.
- El panel trabaja solo en español: las fichas editan el texto en español y no enseñan campos de otros idiomas ni botones de traducir.
- `main` no se toca salvo en la Tarea 3 (cimientos y latido, sin cambios visibles) y en la Tarea 15 (publicación con el OK de Dan). Todo lo demás va en la rama `backend-panel`, que Vercel despliega como vista previa.
- Claude Code no diseña. La web pública no se rediseña: lo nuevo reutiliza sus clases CSS. El panel es lo que entregue Claude Design.
- Nada se borra: ocultar (`visible`) y archivar (`archivado`/`archivada`). La única excepción es anonimizar una consulta.
- Precio en la web con el mismo formato de hoy: cadena con dos decimales y punto (`'15.00'`) o vacía.
- Textos del panel en español, en segunda persona hacia Daniel, sencillos. Nada de copy con aire de IA: ni frases cortas en paralelo tipo eslogan, ni construcciones "no X: Y", ni tríadas de relleno.
- Commits en español, en presente y descriptivos, como en Ascua, con la línea `Co-Authored-By` que indique la sesión.
- Acciones en cuentas de Dan (SQL en el editor de Supabase vía Claude in Chrome, cambios en Vercel o GitHub): están autorizadas por la aprobación de este plan **solo las que el plan nombra**, y se avisan en una línea antes de hacerlas.

## Foco de revisión

Lo que el spec implica, ninguna prueba unitaria cubre del todo y más probablemente le pasará a una persona usando esto:

1. **Excels con forma rara**: CSV con `;` (Excel en español), precios como número de celda y no como texto, cabecera que no está en la primera fila, Ids repetidos o filas vacías al final. Se espera que se lea bien o se rechace con un mensaje claro. Prueba en la Tarea 10.
2. **Nombres con HTML, comillas o emojis** (vienen de LastApp o de Daniel) pintados con `innerHTML`. Se espera texto literal y ningún script. Prueba en la Tarea 5.
3. **Doble pulsación de "Aplicar"**, o aplicar una vista previa después de que otra importación se haya aplicado. Se espera que no se aplique dos veces y un mensaje que pida volver a subir el archivo. Prueba en la Tarea 10.
4. **Teléfonos internacionales** (`+44 7700 900123`, `0049…`, con paréntesis o guiones). Se espera un enlace `wa.me` correcto o ningún enlace, nunca uno roto. Prueba en la Tarea 6.
5. **La primera categoría oculta o vaciada**, o el idioma cambiado tras cargar la carta. Se espera que la pestaña activa sea la primera visible y que todo cambie de idioma. Prueba en la Tarea 5.

---

## Cómo ejecutar este plan

- **Orden**: 1 → 2 → 3 → 4 → … → 15. La Tarea 2 va pronto a propósito: es el encargo de Claude Design y es el camino crítico, porque depende de Dan.
- **Esperas**: algunas tareas tienen un **requisito de Dan** (columna "Espera" abajo). Si no está, se salta a la siguiente tarea independiente y se vuelve cuando llegue. Nunca se inventa un dato ni una clave.
- **Mensajes a Dan**: uno solo por tanda, con la lista de lo que falta. Al terminar la Tarea 2 se le manda el **kit de arranque** (sección final) y el PRD.
- **Acceso a la base de datos**: Claude Code no tiene las claves de Supabase (están solo en Vercel). Para aplicar SQL o comprobar datos usa el editor SQL del proyecto en el Chrome de Dan, con Claude in Chrome. Para probar el panel en la vista previa, usa también ese Chrome: si no hay sesión, Dan pide el enlace con su correo y lo abre allí una vez, y la sesión dura 90 días.

| Tarea | Espera |
|---|---|
| 3 (aplicar SQL, pasar cimientos a `main`) | D1 Supabase + variables |
| 4, verificación real del correo | D2 Resend (sin dominio verificado, el enlace solo llega al correo de la cuenta de Resend) |
| 11 | D5 exports nuevos de LastApp, y después la confirmación de Dan |
| 12 | D7 *Hand off* de Claude Design |
| 15 | OK de Dan para publicar, D4 correo de Daniel, D6 OK para el repo privado |

---

### Tarea 1: Cimientos del repositorio y entorno local

**Archivos:**
- Modificar: `package.json`, `vercel.json`, `.gitignore`, `api/_lastapp.js`, `api/availability.js`, `api/availability-day.js`, `api/reservations.js`
- Crear: `.vercelignore`, `tools/servidor-local.mjs`, `.claude/launch.json`, `tests/cimientos.test.js`

**Interfaces:**
- Produce: `tools/servidor-local.mjs` en el puerto `4324`. Sin `SUPABASE_URL`, va en **modo demo**: `/api/panel/datos` → `uploads/panel-demo.json`; `/api/panel/importar` con `paso: 'vista_previa'` → `uploads/importacion-demo.json`; el resto de `/api/panel/*` responde `{ok:true}` (y `{ok:true, id:'demo-…'}` si el cuerpo trae `id` que empieza por `nuevo-` o `null`) y registra el cuerpo en consola; `/panel` → `Trotamundos Panel.dc.html`; `/privacidad` → `privacidad.html`. Igual que el de Ascua.

- [ ] **Paso 1:** crear la rama `backend-panel` desde `main` en `~/Downloads/trotamundos-web`.
- [ ] **Paso 2: prueba que falla.** En `tests/cimientos.test.js`: `test('las funciones de reservas cargan como módulos ES')` hace `await import('../api/reservations.js')` y comprueba `typeof mod.default === 'function'`; lo mismo con `availability.js` y `availability-day.js`.
- [ ] **Paso 3:** `node --test tests/` → FALLA (hoy son CommonJS).
- [ ] **Paso 4:** `package.json`: `"type": "module"`, `"engines": {"node": "24.x"}`, `"scripts": {"test": "node --test tests/"}`, `dependencies` `@anthropic-ai/sdk` y `zod` (últimas versiones compatibles según el README del SDK), y `npm install`. Pasar los cuatro archivos de `api/` a `import`/`export default` sin cambiar su lógica.
- [ ] **Paso 5:** `vercel.json`. Conservar todos los `redirects` actuales y añadir `"regions": ["cdg1"]` y una cabecera `X-Robots-Tag: noindex, nofollow` para `/api/(.*)`. Las reescrituras de `/panel` y `/privacidad` llegan en sus tareas.
- [ ] **Paso 6:** `.vercelignore` con `docs`, `tests`, `tools`, `supabase`, `README.md` y `.claude`, para que no se publiquen como estáticos. `.gitignore`: añadir `node_modules`, `.vercel`, `.env*` y `supabase/local-*.sql`.
- [ ] **Paso 7:** `tools/servidor-local.mjs`, adaptado del de Ascua con la interfaz de arriba. `.claude/launch.json` con `{"name":"trotamundos-web","runtimeExecutable":"node","runtimeArgs":["tools/servidor-local.mjs"],"port":4324}`.
- [ ] **Paso 8:** `npm test` → PASA. Arrancar el servidor y comprobar que `/`, `/reservar.html` y `/api/availability` cargan; la última responde un error controlado porque no hay token de LastApp.
- [ ] **Paso 9:** commit `Cimientos: módulos ES, Node 24, servidor local y pruebas`.

### Tarea 2: Contrato de datos y encargo para Claude Design

**Archivos:**
- Crear: `tools/extrae-carta.mjs`, `tests/fixtures/lastapp-productos-2026-07-24.json`, `tools/genera-demo.mjs`, `uploads/panel-demo.json`, `uploads/importacion-demo.json`, `docs/prd-panel-claude-design.md`, `tests/extrae-carta.test.js`

**Interfaces:**
- Produce: `extraerCarta(html: string) → { categorias: [{id, nombre:{es,en,fr,ca}, orden}], platos: [{categoria, orden, nombre:{…}, descripcion:{…}, nota_precio:{…}, precio:'15.00'|'', emoji}], actividades: [{id, emoji, nombre:{…}, descripcion:{…}, foto, encuadre, orden}] }`. Lee el objeto `MD`, las pestañas `.mtab` (sus `data-es/en/fr/ca`, decodificando entidades como `&#39;` y `&amp;`) y las tarjetas `.act-card` (id del `openModal('…')`, imagen y `background-position`: `top center` → `'arriba'`, `center` → `'centro'`, `bottom…` → `'abajo'`). Los textos multilingües de las actividades salen de los atributos `data-*`, no del texto visible.
- Produce: **el contrato** `uploads/panel-demo.json` y `uploads/importacion-demo.json`, con la forma exacta de abajo. La API de las tareas 9 y 10 devuelve exactamente esta forma.

`uploads/panel-demo.json`:

```json
{
  "_aviso": "DATOS DE MUESTRA para diseñar el panel. La carta y las actividades son las reales; las consultas, inventadas.",
  "gestor": { "nombre": "Daniel", "email": "daniel@example.com" },
  "resumen": { "consultas_nuevas": 2, "platos_ocultos": 1, "ultima_importacion": "2026-10-20T11:05:00+02:00" },
  "idiomas": ["es", "en", "fr", "ca"],
  "categorias": [{ "id": "deaqui", "nombre": { "es": "De Aquí", "en": "From Here", "fr": "D'Ici", "ca": "D'Aquí" }, "visible": true, "orden": 1, "traduccion": { "pendiente": false, "manual": [] } }],
  "platos": [{
    "id": "pl-1", "categoria": "deaqui", "orden": 1,
    "nombre": { "es": "Jamón Gran Reserva", "en": "Reserve Ham", "fr": "…", "ca": "…" },
    "descripcion": { "es": "…", "en": "…", "fr": "…", "ca": "…" },
    "nota_precio": { "es": "", "en": "", "fr": "", "ca": "" },
    "precio": "15.00", "precio_fijo": false, "emoji": "🍖",
    "visible": true, "archivado": false,
    "lastapp": { "id": "…", "nombre": "Jamón alpujarreño gran reserva", "precio": "15.00" },
    "traduccion": { "pendiente": false, "manual": ["nombre.en"] }
  }],
  "actividades": [{ "id": "senderismo", "emoji": "🥾", "nombre": {}, "descripcion": {}, "foto": "img/senderismo-sierra-nevada-rutas-alpujarra.png", "encuadre": "arriba", "visible": true, "archivada": false, "orden": 1, "traduccion": { "pendiente": false, "manual": [] } }],
  "consultas": [{ "id": "con-1", "recibida_en": "2026-10-22T18:40:00+02:00", "actividad_id": "caballo", "actividad": "Rutas a caballo", "nombre": "Ana Martín", "telefono": "+34 611 222 333", "fecha": "2026-11-14", "personas": "2", "idioma": "es", "estado": "nueva", "notas": "", "aviso_enviado": true, "whatsapp_url": "https://wa.me/34611222333?text=…", "llamar_url": "tel:+34611222333" }],
  "estados_consulta": ["nueva", "contestada", "confirmada", "descartada"],
  "etiquetas_consulta": { "nueva": "Nueva", "contestada": "Contestada", "confirmada": "Confirmada", "descartada": "Descartada" },
  "ajustes": { "whatsapp": "+34 858 893 777", "correos_aviso": ["daniel@example.com"], "aviso_consultas_correo": true, "nombre_gestor": "Daniel", "traduccion_automatica": false, "administradores": [{ "email": "daniel@example.com", "nombre": "Daniel", "soy_yo": true }] },
  "ultima_importacion": { "en": "2026-10-20T11:05:00+02:00", "archivo": "Products-20-10-2026.xls", "resumen": { "nuevos": 3, "precios": 5, "ocultados": 2 } },
  "historial": [{ "en": "2026-10-22T12:01:00+02:00", "quien": "Daniel", "accion": "Cambió el precio de Choto a 21 €" }]
}
```

Los platos archivados van en la misma lista, con `archivado: true`. La muestra trae los 48 platos reales, las 3 actividades reales, 6 consultas (en los cuatro idiomas y en todos los estados, una con teléfono británico), un plato oculto, uno archivado, las empanadas y el Entrecote con `precio_fijo: true`, y 3 platos con `traduccion.pendiente: true` y solo el español relleno.

`uploads/importacion-demo.json`:

```json
{
  "id": "imp-demo", "archivo": "Products-24-07-2026.xls", "formato": "productos", "catalogo": null,
  "aviso_fuente": null, "aviso_incompleto": false, "ocultar_desaparecidos_por_defecto": true,
  "totales": { "filas": 175, "nuevos": 0, "precio": 0, "precio_fijo": 0, "nombre": 0, "desaparecidos": 0, "sin_cambios": 0, "no_web": 0 },
  "grupos": {
    "nuevos": [{ "lastapp_id": "…", "nombre": "Pizza Pepperoni", "precio": "13.50", "categoria_lastapp": null,
                 "sugerencia": null,
                 "parecidos": [{ "plato_id": "pl-40", "nombre": "Margarita" }] }],
    "precio": [{ "plato_id": "pl-8", "nombre": "Choto", "antes": "21.00", "despues": "18.90" }],
    "precio_fijo": [{ "plato_id": "pl-12", "nombre": "Empanada argentina", "web": "3.50", "lastapp": "12.50" }],
    "nombre": [{ "plato_id": "pl-20", "nombre_web": "Wok de pollo", "antes": "Wok de pollo", "despues": "Wok de pollo y verduras" }],
    "desaparecidos": [{ "plato_id": "pl-33", "nombre": "Zaalouk", "lastapp_nombre": "Zaalouk" }],
    "sin_cambios": [{ "plato_id": "pl-1", "nombre": "Jamón Gran Reserva" }],
    "no_web": [{ "lastapp_id": "…", "nombre": "Coca Cola" }]
  }
}
```

`sugerencia` es `{destino:'mismo', plato_id}` (solo con nombre normalizado idéntico) o `null`. No hay sugerencias con IA. Las decisiones que manda el panel al aplicar:

```json
{ "id": "<uuid de la importación>",
  "nuevos": { "<lastapp_id>": { "destino": "plato", "categoria": "pizzapasta", "emoji": "🍕" } },
  "renombrar": ["<plato_id>"], "ocultar_desaparecidos": true, "recuperar_no_web": ["<lastapp_id>"] }
```

`destino` vale `plato`, `no_web`, `mismo` (con `plato_id`) o `pendiente` (no decidir ahora).

- [ ] **Paso 1: prueba que falla.** En `tests/extrae-carta.test.js`, `test('extrae la carta real de index.html')`: 8 categorías con ids `['deaqui','detodaspartes','ensaladas','vegetarianos','carnes','delamar','hamburguesas','pizzapasta']`; 48 platos; el primero `{nombre.es:'Jamón Gran Reserva', precio:'15.00', emoji:'🍖'}`; el Entrecote con `precio: ''`; Zaalouk con `nota_precio.es: '(confirmar)'`; `categorias[0].nombre.fr === "D'Ici"`; 3 actividades con ids `['senderismo','caballo','4x4']`; senderismo con `encuadre: 'arriba'`; caballo con `descripcion.es` igual al `data-es` de su tarjeta.
- [ ] **Paso 2:** `npm test` → FALLA.
- [ ] **Paso 3:** implementar `extraerCarta(html)` en `tools/extrae-carta.mjs` (exportada; leer `MD` con `new Function('return ' + literal)()` sobre el literal del objeto) y que, ejecutado como script, imprima el JSON.
- [ ] **Paso 4:** `npm test` → PASA.
- [ ] **Paso 5:** `tests/fixtures/lastapp-productos-2026-07-24.json`: las 176 filas (cabecera incluida) de `~/Downloads/Products-24-07-2026.xls` como lista de listas de cadenas, tal cual. Se saca una vez con Python y `xlrd` en un entorno virtual del scratchpad, con `python -I`. Son nombres y precios del restaurante, sin datos personales.
- [ ] **Paso 6:** `tools/genera-demo.mjs`: escribe los dos JSON de arriba a partir de `extraerCarta` y del fixture. Los platos cuyo nombre normalizado coincide exacto con un producto se dan por vinculados; el resto de filas se reparte entre `nuevos` (unas 15) y `no_web` (bebidas y extras). Debe salir al menos una entrada en cada grupo. Ejecutarlo y comprobar a ojo los dos archivos.
- [ ] **Paso 7: PRD.** Antes de escribirlo, abrir enteros: `https://trotamundos-brandbook.vercel.app/`, `~/Downloads/brandbook - guía de uso de marca web lostrotamundos.pdf`, el logo (`~/Library/Mobile Documents/com~apple~CloudDocs/Documents/Alpujarra leads/trotamundos/logo trotamundos.jpeg`) y la web en vivo. Leer la plantilla de la skill de Dan (`~/Library/Mobile Documents/com~apple~CloudDocs/Documents/Claude/Projects/e1v/prd-template-demo-design.md` y `workflow-design.md`) y el PRD del panel de Ascua (`docs/prd-panel-claude-design.md`). Escribir `docs/prd-panel-claude-design.md` con la misma estructura que el de Ascua y estas piezas obligatorias:
  - Las siete vistas del §9 del spec, con su copy en la voz de Daniel, los estados vacíos y la vista Importar con sus grupos (§5), incluido un botón para marcar varios nuevos de golpe como "No va en la web".
  - En la ficha de un plato vinculado (`lastapp` no nulo) sin precio fijo, al cambiar el precio, la misma pantalla pregunta si fijarlo en la web. Si se contesta que sí, `accion('plato.guardar', {id, precio_fijo: true})`.
  - El panel es solo en español: las fichas de plato, categoría y actividad editan únicamente `.es`, sin campos de otros idiomas ni nada de traducción.
  - Identidad: la de la web (`--dark #0B0907`, `--card #1C1510`, `--gold #EDAF8C`, `--gold-l #F5CFA8`, `--accent #68B4C8`, `--cream #F0E6D2`, `--muted #8A7A62`, `--border #2E2418`, `--red #7A1A1A`; Berkshire Swash en titulares, Merriweather en el resto), con densidad de herramienta y legibilidad al sol en una terraza.
  - **Peticiones técnicas**, en una sección propia y con estas palabras:
    1. "Cada cambio que hace Daniel pasa por un único método del componente, `accion(tipo, datos)`, que en la maqueta solo actualiza el estado." Los `tipo` válidos son los de la Tarea 9.
    2. "Los elementos que se crean en la maqueta llevan un id que empieza por `nuevo-`."
    3. "El selector de archivo de Importar es un `<input type="file" accept=".xls,.xlsx,.csv" data-trota-importar>`. Al elegir un archivo, la maqueta hace `fetch('uploads/importacion-demo.json')` y pinta esa vista previa. Aplicar llama a `accion('importacion.aplicar', {id, decisiones})` con la forma de decisiones del contrato."
    4. "El botón de foto de una actividad es un `<label aria-label="Cambiar foto">`."
    5. "Todo lo que se ve sale de `panel-demo.json` e `importacion-demo.json`; nada escrito a mano en los componentes."
  - Un **prompt autónomo único**, que construya todo con el PRD y los dos JSON subidos, y un segundo prompt de repaso a 390 px.
  - Instrucciones para Dan: crear el proyecto "Trotamundos panel", sacar el sistema de diseño del brandbook y de la web, subir los dos JSON y el logo, pegar el PRD y el prompt, revisar en el móvil y pulsar *Hand off to Claude Code*.
- [ ] **Paso 8:** commit `Contrato de datos del panel y encargo para Claude Design`. Hacer push de la rama. Mandar a Dan el PRD (con SendUserFile, mostrándolo) y el kit de arranque del final de este plan.

### Tarea 3: Base de datos, latido y cimientos en `main`

**Espera:** D1, solo en los pasos 8 y 9. Los pasos 1 a 7 se hacen sin esperar.

**Archivos:**
- Crear: `supabase/001_esquema.sql`, `supabase/002_datos_iniciales.sql` (generado), `tools/genera-sql-inicial.mjs`, `api/latido.js`, `.github/workflows/latido.yml`, `lib/supa.js`, `tests/supa.test.js`

**Interfaces:**
- Produce `lib/supa.js`: `supa(env) → {base, headers} | null` (cabeceras según el tipo de clave, ver Restricciones); `rest(s, fetch, ruta, {method, body, prefer}) → json|null`, que lanza `Error('supabase <método> <ruta> <status> <texto>')` como en Ascua; `rpc(s, fetch, nombre, args) → json`, que hace POST a `/rest/v1/rpc/<nombre>`.
- Produce el esquema (tipos de texto con `check` en vez de enums; `creado_en`/`actualizado_en` `timestamptz` y el disparador `marca_actualizado()` como en Ascua):

| Tabla | Columnas |
|---|---|
| `categorias` | `id text pk` (el identificador de la pestaña), `nombre jsonb not null`, `orden smallint`, `visible bool default true`, `traduccion jsonb default '{"pendiente":false,"manual":[]}'` |
| `platos` | `id uuid pk`, `categoria_id text fk categorias`, `nombre jsonb not null`, `descripcion jsonb default '{}'`, `nota_precio jsonb default '{}'`, `precio numeric(8,2) null`, `precio_fijo bool default false`, `emoji text default ''`, `visible bool default true`, `archivado bool default false`, `orden smallint default 0`, `lastapp_id text unique null`, `lastapp_nombre text`, `traduccion jsonb default '{"pendiente":false,"manual":[]}'` |
| `productos_lastapp` | `id text pk` (Id de organización), `nombre`, `precio numeric(8,2)`, `categoria text`, `descripcion text`, `no_web bool default false`, `primera_vez timestamptz`, `ultima_vez timestamptz` |
| `importaciones` | `id uuid pk`, `en timestamptz`, `quien text`, `archivo text`, `formato text check in ('productos','catalogo')`, `catalogo text`, `filas jsonb`, `vista jsonb`, `decisiones jsonb`, `resumen jsonb`, `estado text check in ('vista_previa','aplicada','descartada') default 'vista_previa'`, `aplicada_en timestamptz` |
| `actividades` | `id text pk`, `emoji text`, `nombre jsonb`, `descripcion jsonb`, `foto text`, `encuadre text check in ('arriba','centro','abajo') default 'centro'`, `visible`, `archivada bool default false`, `orden`, `traduccion jsonb` |
| `consultas` | `id uuid pk`, `recibida_en`, `actividad_id text fk actividades on delete set null`, `actividad_nombre text`, `nombre text`, `telefono text`, `fecha date null`, `personas text`, `idioma text check in ('es','en','fr','ca')`, `acepta_privacidad_en timestamptz not null`, `estado text check in ('nueva','contestada','confirmada','descartada') default 'nueva'`, `notas text`, `aviso_enviado bool default false`, `anonimizada_en timestamptz` |
| `ajustes` | como en Ascua. Semillas: `whatsapp "+34858893777"`, `correos_aviso []`, `aviso_consultas_correo true`, `nombre_gestor "Daniel"`, `traduccion_automatica false` |
| `administradores`, `sesiones_panel`, `historial`, `latidos` | como `administradoras`, `sesiones_panel`, `historial` y `latidos` de Ascua |

Además: índice `consultas(estado, recibida_en desc)`, índice `consultas(telefono, recibida_en)`, la función `latir(p_origen text) returns void` (`security definer`, `set search_path = public`, inserta en `latidos`, con `grant execute ... to anon`), RLS en todas las tablas y el bucket público `fotos`.

- [ ] **Paso 1: prueba que falla.** `tests/supa.test.js`: `supa({SUPABASE_URL:'https://x.supabase.co/', SUPABASE_SERVICE_ROLE_KEY:'sb_secret_abc'}).headers` tiene `apikey: 'sb_secret_abc'` y no tiene `Authorization`; con `'eyJhbGciOi…'` tiene las dos; `supa({})` es `null`; `rpc` llama a `https://x.supabase.co/rest/v1/rpc/latir` con método POST y cuerpo `{"p_origen":"vercel"}`.
- [ ] **Paso 2:** `npm test` → FALLA. **Paso 3:** implementar `lib/supa.js`. **Paso 4:** `npm test` → PASA.
- [ ] **Paso 5:** escribir `supabase/001_esquema.sql`, idempotente como el de Ascua. `tools/genera-sql-inicial.mjs` escribe `002_datos_iniciales.sql` desde `extraerCarta()`: `insert … on conflict do nothing` de las 8 categorías, los 48 platos y las 3 actividades, con sus traducciones actuales y `traduccion.pendiente = false`.
- [ ] **Paso 6:** `api/latido.js`: comprueba `CRON_SECRET` como en Ascua y llama a `rpc(s, fetch, 'latir', {p_origen:'vercel'})`. `vercel.json`: `"crons": [{"path": "/api/latido", "schedule": "0 6 * * *"}]` y `"functions": {"api/latido.js": {"maxDuration": 60}}` (solo `maxDuration`; un bloque `functions` con `runtime` ya rompió un despliegue de este repo).
- [ ] **Paso 7:** `.github/workflows/latido.yml`: `on: schedule: - cron: '17 7 */2 * *'` y `workflow_dispatch`. Un paso `curl -fsS -X POST "$SUPABASE_URL/rest/v1/rpc/latir" -H "apikey: $SUPABASE_PUBLISHABLE_KEY" -H "Content-Type: application/json" -d '{"p_origen":"github"}'` con los dos secretos del repositorio.
- [ ] **Paso 8 (D1):** avisar a Dan en una línea y pegar `001` y `002` en el editor SQL del proyecto de Supabase con Claude in Chrome. Comprobar con consultas en el mismo editor: 8 categorías, 48 platos, 3 actividades y `ajustes.traduccion_automatica = false`. Dar de alta a Dan como administrador con `supabase/local-administradores.sql` (no versionado), pegado igual.
- [ ] **Paso 9:** commit `Base de datos, latido diario y latido de respaldo en GitHub`. Llevar la rama a `main` tal como está (tareas 1 a 3: nada de eso cambia la web, y `docs/` no se publica) y hacer push. Comprobar en Vercel que producción despliega bien, que la portada se ve igual y que `/reservar.html` carga. Lanzar el workflow a mano con `gh workflow run latido.yml` y ver en el editor SQL una fila `github` en `latidos`.

### Tarea 4: Servidor común y entrada al panel

**Archivos:**
- Crear: `lib/http.js`, `lib/correo.js`, `lib/sesiones.js`, `api/panel/entrar.js`, `api/panel/sesion.js`, `api/panel/salir.js`, `tests/sesiones.test.js`

**Interfaces:**
- Consume: `supa`, `rest` (Tarea 3).
- Produce `lib/correo.js`: `enviarCorreo(fetch, env, {para:string[], asunto, html}) → Promise<void>` (lanza un error sin `RESEND_API_KEY`; remitente `env.RESEND_FROM || 'Los Trotamundos <onboarding@resend.dev>'`) y `esc(s)`.
- Produce `lib/sesiones.js`: `COOKIE = 'trotamundos_panel'`, `DIAS_SESION = 90`, `MINUTOS_ENLACE = 30`, `hashToken`, `tokenNuevo`, `leerCookie`, `cookieSesion`, `esAdministrador`, `pedirEnlace`, `canjearEnlace`, `sesionActual → {email, nombre}|null` y `cerrarSesion`, con las firmas de Ascua (`lib/panel.js`) y la tabla `administradores`. El correo del enlace lleva el asunto `Tu enlace para entrar al panel · Los Trotamundos` y los colores de la marca.
- Produce `lib/http.js`: `cuerpoDe(req)`, `origenDe(req)`, `conSesion(req, res) → {s, quien}|null`, como en Ascua.

- [ ] **Paso 1:** pasar las pruebas de sesión de `tests/panel.test.js` de Ascua (tokens y cookies, enlace a un correo no autorizado, enlace a un administrador, canje vivo, usado y caducado, y la renovación de `sesionActual`) a `tests/sesiones.test.js`, con `trotamundos_panel` y `administradores`.
- [ ] **Paso 2:** `npm test` → FALLA. **Paso 3:** implementar. **Paso 4:** `npm test` → PASA.
- [ ] **Paso 5:** los tres manejadores de `api/panel/`, como en Ascua. `sesion.js` redirige a `/panel#inicio` o, si el enlace no vale, a `/panel#enlace-caducado`.
- [ ] **Paso 6:** commit `Entrada al panel con enlace al correo`.

### Tarea 5: Carta pública desde la base de datos

**Archivos:**
- Crear: `lib/idiomas.js`, `lib/carta.js`, `api/carta.js`, `tests/carta.test.js`
- Modificar: `index.html` (sección `#menu` y su `<script>`)

**Interfaces:**
- Produce `lib/idiomas.js`: `IDIOMAS = ['es','en','fr','ca']`, `OTROS = ['en','fr','ca']`, `limpiarTexto(s, max) → string` (quita caracteres de control, recorta espacios y corta a `max`).
- Produce `lib/carta.js`: `precioWeb(n: number|null) → '15.00'|''`; `platoAWeb(row) → {es,en,fr,ca,desc_es,…,desc_ca,p,pnote_es,…,pnote_ca,ico}` (la forma del `MD` de hoy; las claves de idiomas vacíos se omiten para que la web caiga al español, y **si `traduccion.pendiente` es verdadero se omiten todas las de en, fr y ca**, para que un plato cambiado no enseñe una traducción vieja; lo mismo hace `actividadAWeb` en la Tarea 6); `componerCarta({categorias, platos}) → {origen:'bd', categorias:[{slug, es, en, fr, ca, platos:[…]}]}` (solo categorías visibles con algún plato visible y no archivado, en orden de `orden`, y los platos también por `orden`); `cartaPublica({s, fetch})`.
- `GET /api/carta` → 200 con `componerCarta(...)` y `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`; si falla Supabase, 502 `{ok:false}`.

- [ ] **Paso 1: prueba que falla.** `tests/carta.test.js`:
  ```js
  test('precioWeb', () => { assert.equal(precioWeb(15), '15.00'); assert.equal(precioWeb(16.5), '16.50'); assert.equal(precioWeb(null), ''); });
  test('platoAWeb omite idiomas vacíos', () => {
    const w = platoAWeb({ nombre:{es:'Choto',en:''}, descripcion:{es:'Guiso'}, nota_precio:{}, precio:21, emoji:'🐐' });
    assert.deepEqual(w, { es:'Choto', desc_es:'Guiso', p:'21.00', ico:'🐐' });
  });
  test('platoAWeb pendiente de traducir: solo español', () => {
    const w = platoAWeb({ nombre:{es:'Choto al ajillo',en:'Kid Goat Stew'}, descripcion:{}, nota_precio:{}, precio:21, emoji:'🐐', traduccion:{pendiente:true, manual:[]} });
    assert.deepEqual(w, { es:'Choto al ajillo', p:'21.00', ico:'🐐' });
  });
  test('componerCarta quita ocultos, archivados y categorías vacías, y ordena', () => { /* 3 categorías: una oculta, una con solo un plato archivado; comprobar que queda una sola y sus platos en orden */ });
  test('limpiarTexto', () => { assert.equal(limpiarTexto('  Pulpo\u0007 ', 200), 'Pulpo'); assert.equal(limpiarTexto('x'.repeat(300), 200).length, 200); });
  ```
- [ ] **Paso 2:** `npm test` → FALLA. **Paso 3:** implementar `lib/idiomas.js`, `lib/carta.js` y `api/carta.js`. **Paso 4:** `npm test` → PASA.
- [ ] **Paso 5: `index.html`.** Renombrar `MD` a `CARTA_RESPALDO` y añadir las etiquetas de las 8 pestañas como datos. Escribir `pintarCarta(categorias)`, que genera las pestañas `.mtab` (con sus `data-es/en/fr/ca` y el texto del idioma activo) y los `.mpanel`. Mantiene activa la pestaña elegida si sigue existiendo y, si no, la primera. Al cargar se pinta el respaldo, como hoy. Después, `fetch('/api/carta')` con un límite de 4 s (`AbortController`): si responde con `origen: 'bd'`, se vuelve a pintar con esos datos; si falla, se queda el respaldo. `renderGrid` pasa todos los textos por `esc()` antes de meterlos en `innerHTML`. `setLang` sigue funcionando.
- [ ] **Paso 6: verificación en el navegador** (servidor local con un `DEMO_CARTA` de prueba, o la vista previa con datos de prueba): la carta sale en los 4 idiomas; un plato llamado `<img src=x onerror=alert(1)>` se ve como texto y no ejecuta nada; si la primera categoría se oculta, la pestaña activa es la siguiente; con la API caída sale el respaldo.
- [ ] **Paso 7:** commit `La carta de la web se lee de la base de datos, con la de hoy de respaldo`.

### Tarea 6: Actividades públicas desde la base de datos

**Archivos:**
- Crear: `lib/telefono.js`, `lib/actividades.js`, `api/actividades.js`, `tests/actividades.test.js`
- Modificar: `index.html` (sección `#actividades`, `mTitles`, `openModal`)

**Interfaces:**
- Produce `lib/telefono.js`, un módulo puro que también carga el navegador desde `/lib/telefono.js`: `telefonoWa(tel: string) → string|null`. Quita todo lo que no sea dígito; un `00` inicial se quita; con `+`, los dígitos tal cual; 9 dígitos que empiezan por 6, 7, 8 o 9 → `'34' + dígitos`; 10 a 15 dígitos → tal cual; si no, `null`.
- Produce `lib/actividades.js`: `ENCUADRE = {arriba:'top center', centro:'center', abajo:'bottom center'}`; `actividadAWeb(row) → {id, ico, foto, posicion, es,en,fr,ca, desc_es,…}`; `actividadesPublicas({s, fetch}) → {origen:'bd', whatsapp:'34858893777', actividades:[…]}` (visibles y no archivadas, por `orden`; `whatsapp` es el ajuste pasado por `telefonoWa`).
- `GET /api/actividades`: mismas cabeceras de caché que la carta.

- [ ] **Paso 1: pruebas que fallan.** `actividadAWeb` traduce `encuadre:'arriba'` a `posicion:'top center'`; las archivadas no salen; con el ajuste `"+34 858 893 777"`, `whatsapp === '34858893777'`; y:
  ```js
  test('telefonoWa', () => {
    assert.equal(telefonoWa('+34 858 893 777'), '34858893777');
    assert.equal(telefonoWa('611 22 33 44'), '34611223344');
    assert.equal(telefonoWa('0044 7700 900123'), '447700900123');
    assert.equal(telefonoWa('+44 (7700) 900-123'), '447700900123');
    assert.equal(telefonoWa('12345'), null);
  });
  ```
- [ ] **Paso 2:** FALLA. **Paso 3:** implementar. **Paso 4:** PASA.
- [ ] **Paso 5: `index.html`.** Las tres tarjetas actuales pasan a ser `ACTIVIDADES_RESPALDO`. `pintarActividades(lista)` genera las `.act-card` con las mismas clases y `mTitles` desde los datos. Primero se pinta el respaldo y después lo de `/api/actividades`, como la carta. Los textos van escapados.
- [ ] **Paso 6:** verificación en el navegador: tarjetas iguales a las de hoy, en los 4 idiomas, y la ventana de consulta con el título de cada una.
- [ ] **Paso 7:** commit `Las actividades de la web se leen de la base de datos`.

### Tarea 7: Consultas de actividades (panel y WhatsApp a la vez)

**Archivos:**
- Crear: `lib/mensajes.js`, `lib/consulta.js`, `api/consulta.js`, `privacidad.html`, `tests/consulta.test.js`
- Modificar: `index.html` (ventana `#modal` y un `<script type="module">`), `vercel.json`

**Interfaces:**
- Consume: `telefonoWa` (Tarea 6), `esc` y `enviarCorreo` (Tarea 4), `IDIOMAS` (Tarea 5).
- Produce `lib/mensajes.js`, un módulo puro que también carga el navegador desde `/lib/mensajes.js`:
  - `fechaLarga(iso, idioma) → '14 de noviembre'` (y su equivalente en cada idioma; sin año).
  - `mensajeConsulta({nombre, actividad, fecha, personas}, idioma) → string`, el mensaje del cliente a Daniel.
  - `respuestaConsulta({nombre, actividad, fecha, gestor}, idioma) → string`, el de Daniel al cliente.
- Copy fijo (es y en; fr y ca, traducciones equivalentes con la misma estructura):
  - es: `Hola, soy Ana. Me interesa «Rutas a caballo» el 14 de noviembre para 2 personas.` Sin fecha, se quita ` el …`. Con `1`, `1 persona`; con `5+`, `5 o más personas`.
  - en: `Hi, I'm Ana. I'm interested in "Rutas a caballo" on 14 November for 2 people.` (`1 person`, `5 or more people`).
  - Respuesta es: `Hola, Ana. Soy Daniel, de Los Trotamundos. Hemos recibido tu consulta sobre «Rutas a caballo» para el 14 de noviembre.` Respuesta en: `Hi Ana, this is Daniel from Los Trotamundos. We've received your enquiry about "Horse riding routes" for 14 November.` La actividad va en el idioma del cliente.
- Produce `lib/consulta.js`:
  - `TIEMPO_MINIMO_MS = 3000`, `MAX_POR_TELEFONO_24H = 3`, `PERSONAS = ['1','2','3','4','5+']`.
  - `validarConsulta(body, hoyISO) → {errores:string[], datos}`. Pide `nombre` (1–80 caracteres), `telefono` con `telefonoWa` no nulo, `personas` dentro de `PERSONAS`, `privacidad === true`, `fecha` vacía o `YYYY-MM-DD` no anterior a `hoyISO` (hoy en Europe/Madrid) e `idioma` en `IDIOMAS` (si no, `'es'`).
  - `esSpam(body, ahora) → 'trampa'|'demasiado rápido'|null`.
  - `procesarConsulta({body, env, fetch, ahora}) → {status, body}`. Con spam, responde 200 `{ok:true}` sin guardar. Con 3 consultas del mismo teléfono en 24 h, 429 con un mensaje amable en el idioma del cliente. Si la actividad no existe o no está visible, 400. Guarda la consulta con `actividad_nombre` en español. Si `aviso_consultas_correo` y hay `correos_aviso`, manda el correo con el botón de WhatsApp al cliente y pone `aviso_enviado`. Si falla Supabase, 502.

- [ ] **Paso 1: pruebas que fallan** (`tests/consulta.test.js`, con el `fakeFetch` de Ascua):
  ```js
  test('mensajeConsulta es/en', () => {
    assert.equal(mensajeConsulta({ nombre:'Ana', actividad:'Rutas a caballo', fecha:'2026-11-14', personas:'2' }, 'es'),
      'Hola, soy Ana. Me interesa «Rutas a caballo» el 14 de noviembre para 2 personas.');
    assert.equal(mensajeConsulta({ nombre:'Ana', actividad:'Rutas a caballo', fecha:'', personas:'1' }, 'es'),
      'Hola, soy Ana. Me interesa «Rutas a caballo» para 1 persona.');
    assert.match(mensajeConsulta({ nombre:'Ana', actividad:'X', fecha:'2026-11-14', personas:'5+' }, 'en'), /for 5 or more people\.$/);
  });
  test('validarConsulta rechaza fecha pasada, sin privacidad o teléfono roto', () => { /* tres casos, un error cada uno */ });
  test('procesarConsulta: trampa → 200 sin guardar; 4.ª del mismo teléfono en 24 h → 429; normal → guarda y avisa', async () => { /* comprobar POST a consultas y llamada a Resend */ });
  ```
- [ ] **Paso 2:** FALLA. **Paso 3:** implementar. **Paso 4:** PASA.
- [ ] **Paso 5: `index.html`.** En la ventana `#modal`, ids para los campos (`m-nombre`, `m-tel`, `d3` ya existe, `m-personas`), un campo trampa `m-hp` oculto, la casilla `m-priv` con su texto y enlace a `/privacidad` y la primera capa informativa en los 4 idiomas (`data-es/en/fr/ca`). Se guarda `t_inicio` al abrir la ventana. Un `<script type="module">` importa `mensajeConsulta` de `/lib/mensajes.js` y `telefonoWa` de `/lib/telefono.js` y los deja en `window.TrotaMensajes`. Al pulsar "Enviar consulta", si los campos son válidos y **en el mismo manejador del clic**: `fetch('/api/consulta', {method:'POST', keepalive:true, …})` sin esperar y `window.open('https://wa.me/' + numero + '?text=' + encodeURIComponent(msg), '_blank')`, con `numero` sacado de `/api/actividades` o `'34858893777'` por defecto. Después, la ventana enseña la confirmación con un enlace que repite el WhatsApp: es `Recibida. Si WhatsApp no se ha abierto, pulsa aquí.`, más en, fr y ca. Si faltan campos, se marcan con los estilos de la web, sin `alert`.
- [ ] **Paso 6:** `privacidad.html` con el estilo de la web (cabecera y pie mínimos con sus clases). Lleva los huecos `[RAZÓN SOCIAL]`, `[NIF]`, `[DIRECCIÓN]` y `[CORREO DE CONTACTO]` y dice: responsable, finalidad (contestar la consulta), base (consentimiento), conservación (12 meses desde que se cierra), derechos y reclamación ante la AEPD. `vercel.json`: reescritura `/privacidad` → `/privacidad.html`, y los dos redirects de `/politica-de-privacidad` pasan a `https://www.lostrotamundosalpujarra.com/privacidad`.
- [ ] **Paso 7:** verificación en el navegador (servidor local): el clic abre `wa.me` con el texto correcto en los 4 idiomas, la petición a `/api/consulta` sale con el cuerpo correcto y sin privacidad no se envía.
- [ ] **Paso 8:** commit `Consultas de actividades: se guardan en el panel y se abren en WhatsApp`.

### Tarea 8: Traducción automática, construida y apagada

**Archivos:**
- Crear: `lib/claude.js`, `lib/traducir.js`, `tests/traducir.test.js`

Antes de escribir `lib/claude.js`, invocar la skill `claude-api` y seguir su sección de salida estructurada para TypeScript/JavaScript (`client.messages.parse` con `output_config.format` y `zodOutputFormat`).

**Interfaces:**
- Produce `lib/claude.js`: `MODELO = 'claude-haiku-5-5'` (lo eligió Dan); `clienteClaude(env) → Anthropic|null` (`null` sin `ANTHROPIC_API_KEY`).
- Produce `lib/traducir.js`:
  - `CAMPOS = ['nombre','descripcion','nota_precio']` para platos y `['nombre','descripcion']` para actividades y categorías.
  - `traducirLote({client, elementos:[{clave, textos:{campo: textoEs}}]}) → {clave: {campo: {en,fr,ca}}}`. Una sola llamada para todo el lote, `output_config.effort: 'low'` y `max_tokens: 8000`. Las instrucciones de sistema llevan el estilo de la casa y 12 ejemplos sacados de la carta actual (Choto, Migas Alpujarreñas, Costilla en orza, Plato Alpujarreño, Chuletas Segureñas, Pan Bao…): conservar nombres propios y locales y no traducir marcas. Lanza un error si `stop_reason` es `refusal` o `max_tokens`, o si `parsed_output` es nulo. Los textos vacíos no se mandan.
  - `marcarManual(fila, cambios) → string[]`: devuelve la lista `traduccion.manual` actualizada con cada `campo.idioma` distinto del español que venga en `cambios`.
  - `fusionar(fila, traducciones) → {nombre, descripcion, nota_precio}`: escribe solo los `campo.idioma` que no están en `manual`.
  - `traducirSiToca({s, fetch, client, ajustes, tabla, filas}) → {traducidas:number, pendientes:number}`. Con `ajustes.traduccion_automatica` apagado, solo pone `traduccion.pendiente = true` y no llama a `client`. Encendido, traduce, fusiona, guarda y pone `pendiente = false`; si algo falla, deja `pendiente = true`.

- [ ] **Paso 1: pruebas que fallan** (con un `client` simulado `{messages:{parse: async (req) => …}}` que guarda las peticiones):
  ```js
  test('apagada: no llama a Claude y deja pendiente', async () => { /* ajustes.traduccion_automatica=false → parse no llamado; PATCH con traduccion.pendiente=true */ });
  test('encendida: una llamada por lote, respeta lo manual', async () => { /* manual:['nombre.en'] → nombre.en se conserva; nombre.fr y nombre.ca cambian; pendiente=false */ });
  test('fallo de Claude: queda pendiente', async () => { /* parse lanza → pendiente=true, sin excepción hacia fuera */ });
  test('marcarManual', () => { assert.deepEqual(marcarManual({ traduccion:{ manual:[] } }, { nombre:{ es:'A', en:'B' } }), ['nombre.en']); });
  test('traducirLote no manda textos vacíos y usa claude-haiku-5-5', async () => { /* comprobar req.model y el contenido */ });
  ```
- [ ] **Paso 2:** FALLA. **Paso 3:** implementar. **Paso 4:** PASA.
- [ ] **Paso 5:** commit `Traducción automática con Claude, lista y apagada hasta la publicación`.

### Tarea 9: Datos y acciones del panel

**Archivos:**
- Crear: `lib/panel.js`, `api/panel/datos.js`, `api/panel/accion.js`, `api/panel/foto.js`, `tests/panel.test.js`

**Interfaces:**
- Consume: `rest`, `conSesion`, `traducirSiToca`, `marcarManual`, `limpiarTexto`, `respuestaConsulta`, `telefonoWa`, `precioWeb`.
- Produce `datosPanel({s, fetch, quien}) → objeto con la forma exacta de uploads/panel-demo.json`. Los ids de platos y consultas son los uuid reales y los de categorías y actividades, su `id` de texto. `whatsapp_url` y `llamar_url` se calculan en el servidor. `soy_yo` marca al administrador de la sesión. Las consultas anonimizadas no salen.
- Produce `accion({s, fetch, client, quien, cuerpo:{tipo, datos}}) → {ok:true, id?}`. Cada acción queda en `historial` con una frase en español ("Cambió el precio de Choto a 21 €"). Los `tipo`:

| tipo | datos | efecto |
|---|---|---|
| `plato.guardar` | `{id\|null, categoria?, nombre?, descripcion?, nota_precio?, precio?, emoji?, visible?, precio_fijo?}` (parcial) | Crea o actualiza. Si cambia un texto en español, llama a `traducirSiToca`; si cambia un texto en otro idioma, lo marca manual. `precio` admite coma o punto (`'21,50'`), y `''` → `null` |
| `plato.visible` | `{id, visible}` | |
| `plato.archivar` | `{id, archivado}` | |
| `plato.ordenar` | `{categoria, ids}` | Reescribe `orden` 1..n |
| `categoria.guardar` | `{id\|null, nombre?, visible?}` | Una nueva toma `id = slugify(nombre.es)` y nunca cambia |
| `categoria.ordenar` | `{ids}` | |
| `actividad.guardar` | `{id\|null, emoji?, nombre?, descripcion?, foto?, encuadre?, visible?}` | Como `plato.guardar` |
| `actividad.archivar` | `{id, archivada}` | |
| `actividad.ordenar` | `{ids}` | |
| `consulta.estado` | `{id, estado}` | |
| `consulta.notas` | `{id, notas}` | Sin historial, como en Ascua |
| `consulta.borrar` | `{id}` | Anonimiza (nombre `Datos borrados`, teléfono vacío, notas nulas, `anonimizada_en`) |
| `ajustes.guardar` | `{whatsapp?, correos_aviso?, aviso_consultas_correo?, nombre_gestor?}` | `traduccion_automatica` **no** se puede cambiar desde aquí |
| `acceso.anadir` | `{email, nombre}` | |
| `acceso.quitar` | `{email}` | Si es el de la sesión, `{ok:false, error:'No puedes quitarte a ti mismo.'}` |

- `api/panel/foto.js`: como el de Ascua, con la ruta `actividades/<id>/<marca de tiempo>-<nombre>.<ext>`.

- [ ] **Paso 1: pruebas que fallan** (`fakeFetch`): `datosPanel` devuelve exactamente las claves de primer nivel de `uploads/panel-demo.json` (comparar `Object.keys`); `plato.guardar` con `nombre.es` cambiado y la traducción apagada hace PATCH con `traduccion.pendiente: true` y no llama a `client`; con `nombre.en` cambiado, añade `'nombre.en'` a `manual`; `precio: ''` guarda `null`; `plato.guardar` sin `id` hace POST y devuelve `id`; `acceso.quitar` del propio correo falla; `consulta.borrar` anonimiza; `ajustes.guardar` ignora `traduccion_automatica`; un `tipo` desconocido lanza `acción desconocida`.
- [ ] **Paso 2:** FALLA. **Paso 3:** implementar `lib/panel.js` y los tres manejadores (como en Ascua, con `conSesion`). **Paso 4:** PASA.
- [ ] **Paso 5:** commit `Panel: datos y acciones contra la base de datos`.

### Tarea 10: Importación desde LastApp

**Archivos:**
- Crear: `lib/lastapp.js`, `lib/importacion.js`, `supabase/003_aplicar_importacion.sql`, `api/panel/importar.js`, `tests/lastapp.test.js`, `tests/importacion.test.js`
- Modificar: `vercel.json` (`"api/panel/importar.js": {"maxDuration": 60}`)

**Interfaces:**
- Produce `lib/lastapp.js`, un módulo puro que también carga el navegador:
  - `normalizarTexto(s) → string`: minúsculas, sin acentos, sin signos, espacios simples.
  - `parsePrecio(v) → number|null`. `'19,00 €'` → 19; `'1.234,50 €'` → 1234.5; `'€19.00'` → 19; `'19.00'` → 19; `19` (número) → 19; `''` o basura → `null`.
  - `normalizarExport(filas: string[][], archivo: string) → {ok:true, formato, catalogo, filas:[{id, nombre, precio, descripcion, categoria, imagen}], avisos:string[]} | {ok:false, error}`. Busca la cabecera en las 10 primeras filas, sin distinguir mayúsculas ni acentos. **Productos**: `Id`, `Name`, `Price`, `Description`, `Image URL`. **Catálogo**: `ID del producto en la organización` (la llave), `Categoría`, `Nombre`, `Precio`, `Descripción`. Si la cabecera es una sola celda con `;`, divide todas las filas por `;`. Salta filas sin Id o sin nombre. Con un Id repetido, se queda la primera fila y añade un aviso. `catalogo` sale del nombre del archivo `catalog.<nombre>-dd-mm-aaaa.(csv|xls|xlsx)`. Sin columnas reconocibles: `{ok:false, error:'No reconozco este archivo. Esperaba las columnas Id, Name y Price (export de productos) o ID del producto en la organización, Nombre y Precio (export de catálogo).'}`.
- Produce `lib/importacion.js`:
  - `UMBRAL_INCOMPLETO = 0.5`.
  - `vistaPrevia({filas, formato, catalogo, platos, productos, ultima}) → objeto con la forma de uploads/importacion-demo.json` (sin `id`). Reglas del §5 del spec:
    - Una fila es **nueva** si su Id no está en `productos`. Si está con `no_web`, va a `no_web`. Si está y algún plato la tiene vinculada, se compara con ese plato: precio distinto y sin precio fijo → `precio`; con precio fijo y distinto → `precio_fijo`; `lastapp_nombre` distinto → `nombre`; nada → `sin_cambios`. Si está pero sin plato y sin `no_web`, cuenta como `nuevos`.
    - **Desaparecidos**: platos con `lastapp_id`, no archivados, cuyo Id no viene en el archivo. Si superan `UMBRAL_INCOMPLETO` de los vinculados, `aviso_incompleto: true` y `ocultar_desaparecidos_por_defecto: false`.
    - `aviso_fuente`: si `ultima` (la última importación aplicada) tiene otro `formato` u otro `catalogo`, un texto como `La última importación fue del export de productos; este es del catálogo «sala». Los precios pueden cambiar de uno a otro.`
    - `parecidos`: hasta 3 platos sin vincular con nombre normalizado parecido (Dice de bigramas ≥ 0,5). Nunca se preseleccionan.
    - `sugerencia: {destino:'mismo', plato_id}` solo si el nombre normalizado es idéntico al de un plato sin vincular.
  - `resumenAplicado(vista, decisiones) → {nuevos, precios, ocultados, no_web, vinculados}`.
- Produce el RPC `aplicar_importacion(p_id uuid, p_decisiones jsonb, p_quien text) returns jsonb`, en `plpgsql` y en una sola transacción:
  - Bloquea la fila de la importación (`for update`). Si no está en `vista_previa`, `raise exception 'ya_aplicada'`. Si hay otra importación aplicada después de su `en`, `raise exception 'vista_caducada'`.
  - Hace upsert en `productos_lastapp` de todas las filas (`ultima_vez = now()`).
  - Para cada `nuevos[id]`: con `plato`, inserta el plato (`nombre {es}`, `descripcion {es}` si hay, `precio`, `emoji`, `categoria_id`, `lastapp_id`, `lastapp_nombre`, `orden` al final de su categoría y `traduccion {"pendiente":true,"manual":[]}`); con `no_web`, marca el producto; con `mismo`, vincula el plato y pone el precio salvo que tenga precio fijo; con `pendiente`, nada.
  - Actualiza el precio de los vinculados sin precio fijo. `renombrar` cambia `nombre.es` y marca la traducción pendiente. Con `ocultar_desaparecidos`, pone `visible = false` a los desaparecidos. `recuperar_no_web` quita la marca.
  - Marca la importación como aplicada, guarda las decisiones y el resumen, apunta en `historial` y devuelve `{resumen, platos_tocados: uuid[]}`.
- Produce `POST /api/panel/importar` (con sesión):
  - `{paso:'vista_previa', archivo, filas}`: `normalizarExport`, carga platos, productos y la última aplicada, `vistaPrevia`, guarda en `importaciones` y devuelve la vista con `id`. Sin IA.
  - `{paso:'aplicar', id, decisiones}`: RPC (que ya deja los platos nuevos y renombrados como pendientes de traducir). Los errores `ya_aplicada` y `vista_caducada` se traducen a `Esta importación ya se aplicó.` y `Desde que subiste este archivo se ha aplicado otra importación. Vuelve a subirlo.`
  - `{paso:'descartar', id}`.

- [ ] **Paso 1: pruebas que fallan, `tests/lastapp.test.js`:** `parsePrecio` con los seis casos de arriba; `normalizarExport` sobre el fixture real (`formato:'productos'`, 175 filas, la de `Bacalao a la Vizcaína` con `precio: 19`); la misma fila como CSV con `;`; una cabecera en la tercera fila con dos filas de título encima; un Id duplicado (una sola fila y un aviso); un archivo con otras columnas (`ok:false`, con el mensaje de arriba); `catalogo` sacado de `catalog.sala-21-10-2026.csv` es `'sala'`.
- [ ] **Paso 2: pruebas que fallan, `tests/importacion.test.js`** (con platos y productos construidos a mano): una fila nueva va a `nuevos`; una vinculada con otro precio va a `precio`; con precio fijo, a `precio_fijo` y no a `precio`; una `no_web` va a `no_web`; un vinculado ausente va a `desaparecidos`; con 3 de 4 ausentes, `aviso_incompleto: true` y `ocultar_desaparecidos_por_defecto: false`; `Margarita` frente a `Pizza Margarita` sale en `parecidos` pero `sugerencia` es `null`; `Croquetas de cocido` frente a un plato sin vincular llamado igual da `sugerencia.destino === 'mismo'`; con `ultima` de otro formato, `aviso_fuente` no es nulo; y en el manejador, un RPC que responde `ya_aplicada` da 409 con `Esta importación ya se aplicó.`.
- [ ] **Paso 3:** `npm test` → FALLA. **Paso 4:** implementar. **Paso 5:** `npm test` → PASA.
- [ ] **Paso 6 (D1):** avisar y pegar `003` en el editor SQL de Supabase. Probarlo allí mismo con una importación de prueba de 3 filas inventadas (Ids `prueba-1…3`), insertada a mano en `importaciones`: aplicar dos veces (la segunda da `ya_aplicada`) y después archivar los platos de prueba y borrar sus filas de `productos_lastapp` e `importaciones`, que son datos de prueba verificados.
- [ ] **Paso 7:** commit `Importación del Excel de LastApp con vista previa`.

### Tarea 11: Vinculación inicial con LastApp

**Espera:** D5 (exports nuevos en `~/Downloads`).

**Archivos:**
- Crear: `tools/vinculacion-inicial.mjs`, `docs/vinculacion-inicial.md`, `supabase/004_vinculacion_inicial.sql` (generado)

- [ ] **Paso 1:** convertir los exports a filas (como el fixture) y pasarlos por `normalizarExport`. Comprobar que el `Id` del export de productos coincide con `ID del producto en la organización` del de catálogo en los productos comunes, y anotar el resultado.
- [ ] **Paso 2:** decidir qué export manda: comparar los precios de los dos con la carta impresa (`~/Downloads/Carta Trotamundos Alpujarra.pdf`) y gana el que cuadre con lo que se cobra en sala. Anotar el porqué.
- [ ] **Paso 3:** `tools/vinculacion-inicial.mjs` propone, para cada uno de los 48 platos, su producto de LastApp (o ninguno), si lleva precio fijo (empanadas, Entrecote, Surtido de croquetas, Surtido de queso…) y la lista de filas `no_web` (bebidas, licores, cafés, extras), y marca cada precio que no cuadre con la carta impresa. Usa `normalizarTexto` y `parecidos`, más criterio humano: **se revisa fila a fila**, sin vincular nada por parecido sin pensarlo.
- [ ] **Paso 4:** escribir `docs/vinculacion-inicial.md` con tres tablas en lenguaje llano: plato → producto, precio fijo y no van en la web. Mandárselo a Dan y **esperar su confirmación**.
- [ ] **Paso 5:** con el OK, generar `004` (actualiza `lastapp_id`, `lastapp_nombre` y `precio_fijo`, y hace upsert de `productos_lastapp` con `no_web`), avisar y aplicarlo. Comprobar que una vista previa del mismo export ya no trae `nuevos` y que sus `precio` coinciden con los que Dan dio por buenos.
- [ ] **Paso 6:** actualizar en el PRD y en la guía de Daniel cómo se saca el export que manda. Commit `Vinculación inicial de la carta con LastApp`.

### Tarea 12: Conexión de la maqueta de Claude Design

**Espera:** D7 (*Hand off* de Dan).

**Archivos:**
- Crear: `Trotamundos Panel.dc.html` (y lo que traiga la exportación: `support.js`, imágenes), `tools/ajustes.py`, `tools/panel-conexion.js`
- Modificar: `vercel.json` (reescritura `/panel` → `/Trotamundos Panel.dc.html` y `noindex` para las dos rutas)

**Interfaces:**
- Consume: los endpoints de las tareas 4, 9 y 10 y `lib/lastapp.js` en el navegador.
- `tools/panel-conexion.js` (patrón de Ascua, `tools/panel-conexion.js`):
  - Al montar el componente, redirige `fetch('uploads/panel-demo.json')` a `/api/panel/datos`. Un 401 lleva a la pantalla de entrada. Gestiona `#enlace-caducado`.
  - **Envuelve `accion(tipo, datos)`**: llama a la original (estado local) y manda el cambio a `/api/panel/accion`. Agrupa por `tipo` e `id` con 900 ms de espera, fusionando los datos parciales. Traduce los ids `nuevo-…` al id real tras la primera respuesta, y mientras tanto encola. `importacion.aplicar` va a `/api/panel/importar` con `paso:'aplicar'`. Si la API responde con error, se lo enseña a Daniel con el texto del servidor. Un 401 recarga (lo escrito sigue en el dispositivo).
  - **Si la maqueta no tiene `accion`**, cae al observador de estado de Ascua, que hay que mapear leyendo el código exportado.
  - **Importar**: escucha `change` en fase de captura sobre `input[data-trota-importar]`. Carga SheetJS (versión fija) la primera vez, lee la primera hoja con `sheet_to_json(ws, {header:1, raw:false, defval:''})`, `normalizarExport` en el navegador para avisar pronto, y POST con `paso:'vista_previa'`. Guarda la promesa, y la lectura de `uploads/importacion-demo.json` que hace la maqueta la recibe con esa respuesta. Si da error, lo enseña con el texto del servidor.
  - **Foto**: `change` en el `input[data-trota-foto]` que mete `ajustes.py`. Reduce la imagen con `canvas` a 1.600 px de lado mayor, en JPEG de calidad 0,82, pide la URL firmada a `/api/panel/foto`, sube con PUT y llama a `accion('actividad.guardar', {id, foto: publica})`.
  - Mientras se escribe, guarda en `localStorage` como en Ascua.
- `tools/ajustes.py`: idempotente, con avisos si no encuentra un punto de anclaje. Quita el botón de demo, mete `<input type="file" accept="image/*" data-trota-foto style="display:none">` dentro de `label[aria-label="Cambiar foto"]` y añade el puente al final del `<script type="text/x-dc" data-dc-script>`, sustituyéndolo si ya estaba.

- [ ] **Paso 1:** leer el proyecto de Design con DesignSync (`list_files` y `get_file` de cada `.dc.html`; si falla por autorización, pedir a Dan que ejecute `/design-login` en una terminal con `claude`, sin entrar por Chrome a su proyecto). Guardar los archivos en el repo.
- [ ] **Paso 2:** comprobar que la maqueta cumple las cinco peticiones técnicas del PRD. Si no cumple alguna, anotar cuál y adaptar el puente a lo que haya.
- [ ] **Paso 3:** escribir `tools/panel-conexion.js` y `tools/ajustes.py` y ejecutar `python3 tools/ajustes.py`.
- [ ] **Paso 4: verificación en modo demo** (servidor local, a 390 px): cada acción de la tabla de la Tarea 9 sale en la consola del servidor con su `tipo` y sus datos; un plato nuevo recibe su id y los cambios siguientes lo usan; subir el fixture real como `.xls` enseña la vista previa; la foto se reduce antes de subir.
- [ ] **Paso 5:** commit `Panel de Claude Design conectado a la API`. Push.

### Tarea 13: Tarea diaria completa

**Archivos:**
- Modificar: `api/latido.js`
- Crear: `lib/tarea-diaria.js`, `tests/tarea-diaria.test.js`

**Interfaces:**
- Produce `tareaDiaria({s, fetch, client, ahora}) → {latido:true, traducidas, anonimizadas, sesiones_borradas}`:
  - `latir('vercel')`.
  - Con `traduccion_automatica` encendida, `traducirSiToca` sobre como mucho 40 elementos pendientes (platos, categorías y actividades).
  - Anonimiza las consultas `contestada`, `confirmada` o `descartada` con `actualizado_en` de hace más de 12 meses.
  - Borra las filas de `sesiones_panel` caducadas hace más de 7 días.
  - Un fallo en una tarea no detiene las demás.

- [ ] **Paso 1: pruebas que fallan:** con la traducción apagada, no llama a `client`; la consulta de hace 13 meses se anonimiza y la de hace 11 no; si falla la anonimización, el latido se hace igual.
- [ ] **Paso 2:** FALLA. **Paso 3:** implementar y que `api/latido.js` llame a `tareaDiaria`. **Paso 4:** PASA.
- [ ] **Paso 5:** commit `Tarea diaria: latido, traducciones pendientes, anonimizado y limpieza`.

### Tarea 14: Verificación completa en la vista previa y documentación

**Archivos:**
- Crear: `docs/ESTADO.md`, `docs/GUIA-PANEL-DANIEL.md`
- Modificar: `README.md`, `llms.txt` (solo si algún precio de "Destacados" ha cambiado tras la vinculación)

- [ ] **Paso 1:** push de la rama y localizar la URL de la vista previa en Vercel.
- [ ] **Paso 2: recorrido completo en la vista previa con la base real**, en el Chrome de Dan con Claude in Chrome, a 390 px y en escritorio, sobre la URL de la rama (`…-git-backend-panel-….vercel.app`). Lo que se cree para probar lleva `[prueba]` en el nombre y se archiva al terminar.
  1. Entrar con el enlace del correo (si hace falta, Dan lo abre en ese Chrome).
  2. Crear un plato, verlo en la web de la vista previa en menos de un minuto (en español en los cuatro idiomas, porque la traducción está apagada), ocultarlo y archivarlo.
  3. Cambiar el precio de un plato vinculado y ver la pregunta de fijarlo.
  4. Crear una categoría y ver su pestaña.
  5. Importar el export que manda, aplicarlo y volver a pulsar Aplicar (debe salir el mensaje de ya aplicada).
  6. Crear una actividad con foto desde el móvil.
  7. Mandar una consulta desde la web: se abre WhatsApp con el texto correcto, la consulta sale en el panel con su botón de respuesta y llega el correo.
  8. Comprobar que con la API caída sale el respaldo, que `/reservar.html` sigue funcionando y que `/panel` y `/api/*` llevan `noindex`.
- [ ] **Paso 3:** `docs/ESTADO.md` con la estructura del de Ascua: qué es, dónde está cada cosa, cómo se trabaja, estado por bloques, tareas de Dan y datos que faltan. `docs/GUIA-PANEL-DANIEL.md`: una página para Daniel, en su voz, con entrar, cambiar un plato, subir el Excel (con los pasos exactos en LastApp), fijar un precio, actividades y consultas. Sin tecnicismos y sin mencionar herramientas internas de Keen Impact.
- [ ] **Paso 4:** commit `Verificación completa en la vista previa y documentación`. Mandar a Dan la URL de la vista previa, un resumen de lo comprobado y la guía, y pedirle el OK para publicar.

### Tarea 15: Publicación

**Espera:** OK de Dan para publicar, D4 y D6.

- [ ] **Paso 1:** dar de alta a Daniel en `administradores` y en `correos_aviso` (SQL local o desde Ajustes). Comprobar que el dominio está verificado en Resend y que `RESEND_FROM` es `Los Trotamundos <panel@lostrotamundosalpujarra.com>`.
- [ ] **Paso 2:** comprobar en el editor SQL que `traduccion_automatica` sigue en `false` y en Vercel que no existe `ANTHROPIC_API_KEY`. Se publica en español: no se traduce nada.
- [ ] **Paso 3:** fusionar `backend-panel` en `main` y hacer push. Comprobar en producción, en `www.lostrotamundosalpujarra.com`: la carta sale de la base de datos (`/api/carta` con `origen: 'bd'`), las actividades también, una consulta real de prueba de Dan llega por los dos lados, `/panel` funciona y el cron de Vercel sale en la configuración del proyecto.
- [ ] **Paso 4:** con el OK de D6, `gh repo edit danguerrero32/trotamundos-web --visibility private --accept-visibility-change-consequences` y comprobar que Vercel sigue desplegando y que el workflow de latido sigue activo.
- [ ] **Paso 5:** actualizar `docs/ESTADO.md` y mandar a Dan la guía de Daniel lista para reenviar. Commit `Publicación del backend y el panel`.

---

## Kit de arranque para Dan (se manda al terminar la Tarea 2)

Unos 30 minutos. Las claves no se pegan en el chat.

- **D1. Supabase.** Crear el proyecto `trotamundos` en West EU (París). Si no deja por el límite de dos gratuitos, crear una organización nueva o usar una cuenta del restaurante. En Vercel → `trotamundos-web` → Settings → Environment Variables (Production y Preview): `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (la clave secreta). En GitHub → `trotamundos-web` → Settings → Secrets → Actions: `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` (la clave pública). Avisar cuando esté.
- **D2. Resend.** En tu cuenta actual, Domains → Add `lostrotamundosalpujarra.com` y copiar sus registros DNS en IONOS. Crear una API key y ponerla en Vercel como `RESEND_API_KEY`. Hasta que el dominio esté verificado, los enlaces del panel solo llegan a tu correo.
- **Anthropic:** nada. En este encargo no se llama a Claude.
- **`CRON_SECRET`** en Vercel: cualquier cadena larga.
- **D4.** El correo de Daniel para el panel.
- **D5.** Un export nuevo de LastApp en los dos formatos (productos y catálogo de sala) en `~/Downloads`, y una captura de dónde se saca cada uno. Si sabes si Daniel tiene precios distintos por catálogo, dímelo.
- **D6.** OK para pasar el repositorio a privado al publicar.
- **D7. Claude Design.** Seguir las instrucciones del principio de `docs/prd-panel-claude-design.md` y, al acabar, pulsar *Hand off to Claude Code* y pegarme el texto.
