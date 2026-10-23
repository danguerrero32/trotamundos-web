# PRD: Panel de Los Trotamundos

> Encargo para Claude Design con la plantilla de la skill `web-design-claude`, igual que el panel de Ascua de Oro.
>
> **Antes de lanzar el prompt (Dan):**
> 1. En `claude.ai/design`, **New Prototype → High-Fidelity**. Nombre del proyecto: **Trotamundos panel**.
> 2. Design system: pegar `https://trotamundos-brandbook.vercel.app/` y `https://www.lostrotamundosalpujarra.com/` para que saque la marca de ahí.
> 3. Subir estos archivos del repo: `uploads/panel-demo.json`, `uploads/importacion-demo.json` e `img/logo-los-trotamundos-restaurante-bubion.jpg`.
> 4. Pegar este PRD entero y, después, el **prompt autónomo** del final.
> 5. Revisar en el móvil con el **prompt de repaso** y pulsar **Hand off to Claude Code**. Pegarme el texto que sale.

---

## Descripción del Proyecto

Panel privado de Daniel, de Los Trotamundos (bar restaurante en Bubión, La Alpujarra). Con él mantiene al día la carta de la web, sube el Excel que exporta su TPV (LastApp) para actualizar precios y platos de golpe, crea y retira actividades (senderismo, rutas a caballo, 4x4, visitas) y atiende las consultas que llegan desde la web. Lo usa **desde el móvil**, en la barra o en la terraza, entre mesa y mesa.

**Tipo de proyecto:** aplicación privada de una sola página con siete vistas, servida en `/panel` dentro de la web
**Cliente / Marca:** Los Trotamundos (la marca de la web y del brandbook)
**Quién lo usa:** Daniel, y Dan para el mantenimiento. Daniel conoce su carta y su TPV; no hay que explicarle qué es un plato o un precio.
**Idioma:** solo español. El panel no enseña campos ni botones de otros idiomas.

---

## Objetivos

- Que al abrir el panel se vea en dos segundos lo que pide atención: consultas nuevas, platos ocultos y cuándo fue la última importación.
- Que cambiar un precio, ocultar un plato que hoy no hay o dar de alta uno nuevo se haga en menos de un minuto con el pulgar.
- Que subir el Excel de LastApp enseñe una vista previa clara de lo que va a cambiar y que Daniel solo tenga que decidir lo nuevo.
- Que cada consulta de actividad se conteste con un toque por WhatsApp, con el mensaje ya escrito.
- Que nunca se pierda nada: lo que se escribe se guarda solo y la sesión no caduca mientras se use.

## No-Objetivos

- Que funcione de verdad: lo conecta después Claude Code a la base de datos. En Design todo sale de `panel-demo.json` e `importacion-demo.json`.
- Traducciones: el panel trabaja solo en español. En los datos, los textos vienen como objeto (`nombre: {es, en, fr, ca}`) porque la web pública está en cuatro idiomas, pero **el panel solo lee y escribe `es`**. No se dibuja ni un campo, ni una pestaña, ni un selector de idioma.
- Hospedajes, reservas de mesa, estadísticas y gráficos.
- Editar la portada, los horarios o la sección "Por encargo" de la web.
- Una versión de escritorio elaborada: el escritorio es el móvil ensanchado, con la lista a la izquierda y la ficha a la derecha.

---

## Pantallas

Construir en este orden:

| # | Vista | Para qué | Datos |
|---|---|---|---|
| 0 | Entrada | Escribir el correo y recibir un enlace. Sin contraseña | `gestor` |
| 1 | Inicio | Lo que pide atención hoy y atajos grandes | `resumen`, `ultima_importacion`, `historial` |
| 2 | Carta | Categorías y platos; ficha editable; editar categorías; archivados | `categorias`, `platos` |
| 3 | Importar | Subir el Excel de LastApp, vista previa por grupos, aplicar | `importacion-demo.json` |
| 4 | Actividades | Tarjetas con foto; ficha editable | `actividades` |
| 5 | Consultas | Lista y ficha con WhatsApp, llamar y estado | `consultas`, `estados_consulta`, `etiquetas_consulta` |
| 6 | Ajustes | WhatsApp, avisos por correo y quién entra al panel | `ajustes` |

Navegación: en móvil, barra inferior fija con cinco iconos y texto (**Inicio · Carta · Actividades · Consultas · Ajustes**). En escritorio, barra lateral estrecha con los mismos cinco. Importar no está en la barra: se llega desde Inicio y desde Carta con un botón grande.

---

## Arquitectura de Componentes

- **Entrada**: pantalla centrada sobre el fondo noche con el logo circular, el campo "Tu correo" y el botón "Mándame el enlace". Al pulsarlo, el mismo bloque cambia a la confirmación. Sin registro y sin "he olvidado la contraseña", porque no hay contraseña.
- **Cabecera**: fina. Logo pequeño, nombre de la vista en Berkshire Swash y, a la derecha, "Daniel" con el botón "Salir".
- **Inicio**: "Hola, Daniel" y debajo tarjetas grandes, una por cosa pendiente, con una cifra enorme y una frase: consultas nuevas, platos ocultos y la última importación ("Última carta subida: hace 3 días"). Pulsar una tarjeta lleva a la lista ya filtrada. Debajo, tres atajos grandes: **Subir Excel de LastApp**, **Añadir plato** y **Añadir actividad**. Al final, "Últimos movimientos" con las líneas de `historial`. Si no hay nada pendiente, una sola tarjeta: "Todo al día."
- **Carta**:
  - Arriba, las categorías como pestañas deslizables, como en la web (De Aquí, De Todas Partes…), y el botón "Subir Excel de LastApp".
  - Dentro de cada categoría, los platos en filas compactas: emoji, nombre, precio a la derecha y un interruptor de "En la carta" (visible u oculto). Un plato oculto se ve atenuado. Los platos se ordenan arrastrando.
  - Si un plato está vinculado a LastApp (`lastapp` no nulo), lleva una marca discreta "LastApp": su precio lo manda el TPV. Un plato sin vínculo no lleva marca: el precio lo pone Daniel.
  - Botón "Añadir plato" al final de cada categoría.
  - Al pie, "Editar categorías" (renombrar, ordenar, ocultar, crear) y "Archivados" (los `archivado: true`, con "Volver a la carta").
- **Ficha de plato**: formulario en una columna con categoría (selector), emoji (un toque abre una rejilla de emojis de comida), nombre, descripción, precio y nota de precio ("por unidad", "según peso"…). Interruptor "En la carta". Al final, en gris, "Quitar de la carta", que lo archiva sin borrarlo. Cada cambio se guarda solo, con un "Guardado" pequeño.
  - **El precio tiene dos caras, y es la decisión de diseño más importante de esta vista.**
    - **Plato de LastApp** (`lastapp` no nulo): el precio **no es un campo**. Se enseña grande, como un dato, con la etiqueta "Lo trae LastApp" y debajo, pequeño, "En LastApp: Croquetas de cocido · 14,00 €". Al lado, el enlace "Lo quiero poner yo" → `accion('plato.desvincular', {id})`, que pide confirmación en la misma pantalla: "Si lo pones tú, este plato deja de seguir a LastApp y se queda en 14,00 € hasta que tú lo cambies." Al aceptar, el plato pasa a ser de los otros y el precio se convierte en campo.
    - **Plato a mano** (`lastapp: null`): el precio es un campo normal, editable, sin ninguna etiqueta.
    - No hay interruptores, ni "precio fijo", ni preguntas al teclear un precio. Un plato o sigue al TPV o lo lleva Daniel.
- **Importar**: tres momentos en la misma vista.
  1. *Subir*: un bloque grande con "Elige el Excel que exporta LastApp" y una explicación de una línea. Al elegir el archivo, la vista pasa a la vista previa.
  2. *Vista previa*: arriba, el archivo y los totales. Si `aviso_incompleto` o `aviso_fuente` vienen con texto, un aviso destacado en oro con ese texto. Debajo, los grupos como acordeones, los que piden decisión abiertos y los demás plegados:
     - **Nuevos en LastApp**: cada uno con su nombre, su precio y un selector con tres caminos: una categoría de la web (con emoji), "No va en la web" o "Es el mismo que…" (lista de platos sin vincular). Si trae `sugerencia` con destino `mismo`, viene preseleccionado. Si trae `parecidos`, se enseñan como "¿Es alguno de estos?" sin marcar. Arriba del grupo, un botón para marcar varios de golpe como "No va en la web".
     - **Cambian de precio**: antes y después ("21,00 € → 18,90 €"). Se aplican todos: el precio lo manda LastApp. Si son muchos, el grupo viene abierto, porque es lo que Daniel tiene que ver antes de aplicar.
     - **Cambian de nombre en LastApp**: con una casilla desmarcada "Cambiar también el nombre en la web".
     - **Ya no están en LastApp**: con la casilla "Ocultarlos de la web", marcada según `ocultar_desaparecidos_por_defecto`.
     - **Sin cambios** y **No van en la web**: plegados. En el segundo, cada fila tiene "Recuperar".
     - Al pie, fijo en móvil, el botón "Aplicar cambios" y, al lado, "Descartar".
  3. *Hecho*: el resumen ("Carta actualizada: 3 platos nuevos, 5 precios, 2 ocultados") y el botón "Ver la carta".
- **Actividades**: tarjetas grandes con la foto de fondo, el emoji, el nombre y la descripción, igual que en la web. Interruptor "En la web". Se ordenan arrastrando. Botón "Añadir actividad".
- **Ficha de actividad**: foto con el botón "Cambiar foto", y debajo tres botones pequeños de encuadre (Arriba · Centro · Abajo) que mueven la foto en una vista previa de la tarjeta. Después, emoji, nombre y descripción. Interruptor "En la web" y, al final en gris, "Archivar".
- **Consultas**: lista con las nuevas primero. Cada tarjeta lleva el nombre, la actividad, la fecha que pide y las personas ("Ruta a caballo · 14 nov · 2 personas"), hace cuánto llegó y la etiqueta de estado. Un punto pequeño con la bandera o el código del idioma del cliente. Filtros en chips: Todas · Nuevas · Contestadas · Confirmadas · Descartadas.
- **Ficha de consulta**: cabecera con nombre, actividad, fecha, personas, idioma y teléfono. Dos botones grandes, fijos abajo en móvil: **WhatsApp** (abre `whatsapp_url`, con la respuesta ya escrita en el idioma del cliente) y **Llamar** (`llamar_url`). El estado como cuatro botones segmentados (Nueva · Contestada · Confirmada · Descartada). Después, "Tus notas", un área de texto que se guarda sola. Al pie, en gris, "Borrar los datos de esta persona", con confirmación en la misma pantalla.
- **Ajustes**: formulario en una columna con "WhatsApp del restaurante", "Correos que reciben el aviso de cada consulta" (lista editable), el interruptor "Avisarme por correo de cada consulta" y "Tu nombre en los mensajes". Debajo, el bloque "Quién entra al panel": la lista de `administradores` con "Quitar" (no aparece en el propio, `soy_yo: true`) y "Añadir persona" (nombre y correo).
- **Estados vacíos**: cada lista tiene su frase, con la voz de la casa y sin ilustraciones de plantilla.

---

## Identidad Visual

La misma que la web y el brandbook: noche serrana, oro del atardecer y azul del globo. Lo que cambia es la **densidad**: es una herramienta, así que hay menos aire y más información por pantalla. El texto tiene que leerse bien con el sol de la terraza: contraste alto (crema sobre noche) y botones grandes.

| Rol | Nombre | Hex | Token |
|---|---|---|---|
| Fondo base | Noche | `#0B0907` | `--dark` |
| Fondo secundario | Carbón | `#13100A` | `--dark2` |
| Tarjetas | Cartón | `#1C1510` | `--card` |
| Tarjetas elevadas | Cacao | `#231A12` | `--card2` |
| Bordes | Borde | `#2E2418` | `--border` |
| Primario (acción) | Oro | `#EDAF8C` | `--gold` |
| Titulares | Oro claro | `#F5CFA8` | `--gold-l` |
| Hover y detalles | Terracota | `#C88860` | `--gold-d` |
| Texto | Crema | `#F0E6D2` | `--cream` |
| Texto secundario | Tierra apagada | `#8A7A62` | `--muted` |
| Acento (detalles, marca LastApp) | Azul globo | `#68B4C8` | `--accent` |
| Alertas y borrar | Brasa | `#7A1A1A` | `--red` |
| WhatsApp | Verde | `#25D366` | — |

Proporción de la marca: cerca de un 70 % de oscuros, un 16 % de tarjetas, un 9 % de oro y un 5 % de azul. El oro guía la acción y el azul se reserva para detalles.

### Tipografía

- **Berkshire Swash** (peso regular): nombres de vista, "Hola, Daniel", cifras grandes de Inicio y precios destacados. Nunca en bloques de texto.
- **Merriweather** 300 y 400: todo lo demás (formularios, listas, botones). Etiquetas en mayúsculas pequeñas, 12 px, con espaciado.

### Componentes

- Botón primario en oro con texto noche; secundario fantasma con borde crema; WhatsApp en verde. Radio de 8 px.
- Tarjetas con fondo `#1C1510`, borde `#2E2418` y radio de 8 a 12 px, sin sombras duras. Al pasar o tocar, borde en terracota.
- Interruptores y chips en oro cuando están activos.

### Voz

La del brandbook: de tú, cálida, honesta, viajera y sensorial. Con Daniel se habla como habla él con su gente, sin florituras y sin tecnicismos. Nada de frases de relleno ni de eslóganes.

### Lo que NO queremos

- Estética de dashboard de SaaS: gráficos, KPIs con flechitas, degradados, iconos de colores.
- Tablas densas con muchas columnas. Son tarjetas y filas pensadas para el pulgar.
- Ventanas emergentes para confirmar. Las confirmaciones se hacen en la misma pantalla.
- Inter, Roboto, sombras azuladas, bordes grises de Bootstrap o blancos fríos.
- Textos de relleno tipo "Lorem" o "Bienvenido a tu dashboard".
- Hex fuera de la tabla de arriba.

---

## Assets Necesarios

| Asset | Descripción | Estado |
|---|---|---|
| `uploads/panel-demo.json` | La carta real (51 platos en 8 categorías: 46 de LastApp y 5 a mano), las 3 actividades reales, 6 consultas inventadas en 4 idiomas, ajustes, historial | Listo |
| `uploads/importacion-demo.json` | Vista previa construida con el export real de LastApp del 23/10/2026 (197 productos) contra la carta: 12 nuevos, 4 cambios de precio, 1 renombrado, 1 desaparecido, 39 sin cambios y 141 que no van en la web | Listo |
| Logo | `img/logo-los-trotamundos-restaurante-bubion.jpg` (emblema circular) | Listo |
| Fotos de actividades | Las rutas de `foto` en `actividades` son las de la web (`img/…`) | En la web |

---

## Copy Principal

- **Entrada:** título "Tu panel" · campo "Tu correo" · botón "Mándame el enlace" · confirmación "Te hemos mandado un enlace a [correo]. Ábrelo desde este móvil y entras." · pie "Solo entran los correos autorizados."
- **Inicio:** "Hola, Daniel" · "[n] consultas nuevas" · "[n] platos ocultos" · "Última carta subida: [hace cuánto]" · atajos "Subir Excel de LastApp", "Añadir plato", "Añadir actividad" · "Últimos movimientos" · vacío: "Todo al día."
- **Carta:** "En la carta" · "Añadir plato" · "Editar categorías" · "Archivados" · "Volver a la carta" · marca "LastApp" · ficha: "Categoría", "Emoji", "Nombre", "Descripción", "Precio", "Nota de precio (por unidad, según peso…)", "Quitar de la carta", "Guardado" · precio de un plato del TPV: "Lo trae LastApp" · "En LastApp: [nombre] · [precio]" · "Lo quiero poner yo" · confirmación: "Si lo pones tú, este plato deja de seguir a LastApp y se queda en [precio] hasta que tú lo cambies." · "Sí, lo pongo yo" · "Déjalo como está" · vacío de una categoría: "Aquí todavía no hay platos."
- **Importar:** "Elige el Excel que exporta LastApp" · "Te enseñamos lo que va a cambiar antes de tocar nada." · grupos: "Nuevos en LastApp", "Cambian de precio", "Cambian de nombre en LastApp", "Ya no están en LastApp", "Sin cambios", "No van en la web" · opciones: "No va en la web", "Es el mismo que…", "¿Es alguno de estos?" · casillas: "Cambiar también el nombre en la web", "Ocultarlos de la web" · "Marcar como 'No va en la web'" · "Recuperar" · "Aplicar cambios" · "Descartar" · hecho: "Carta actualizada: [resumen]" · "Ver la carta"
- **Actividades:** "En la web" · "Añadir actividad" · "Cambiar foto" · "Encuadre: Arriba · Centro · Abajo" · "Archivar" · vacío: "No hay actividades en la web. Añade la primera."
- **Consultas:** chips "Todas · Nuevas · Contestadas · Confirmadas · Descartadas" · botones "WhatsApp" y "Llamar" · "Tus notas" (placeholder: "Lo que quieras recordar: hora de salida, quién la lleva…") · "Borrar los datos de esta persona" · confirmación: "¿Borramos los datos de [nombre]? La consulta queda, sin nombre ni teléfono." · "Sí, borrar" · vacío: "Ninguna consulta nueva. Buen rato para salir a la terraza."
- **Ajustes:** "WhatsApp del restaurante" · "Correos que reciben el aviso de cada consulta" · "Avisarme por correo de cada consulta" · "Tu nombre en los mensajes" · "Quién entra al panel" · "Añadir persona" · "Quitar" · "Guardar"

---

## Peticiones técnicas

No cambian nada visual y son imprescindibles para que Claude Code conecte la maqueta sin tocarla:

1. Cada cambio que hace Daniel pasa por un único método del componente, `accion(tipo, datos)`, que en la maqueta solo actualiza el estado. Los `tipo` son: `plato.guardar`, `plato.visible`, `plato.archivar`, `plato.ordenar`, `plato.desvincular`, `categoria.guardar`, `categoria.ordenar`, `actividad.guardar`, `actividad.archivar`, `actividad.ordenar`, `consulta.estado`, `consulta.notas`, `consulta.borrar`, `ajustes.guardar`, `acceso.anadir`, `acceso.quitar` e `importacion.aplicar`. Los datos de un `.guardar` llevan el `id` y solo los campos que cambian (por ejemplo, `{id: 'pl-8', precio: '21.00'}`), y los textos van como objeto con la clave `es` (`{nombre: {es: 'Choto'}}`).
2. Los elementos que se crean en la maqueta llevan un id que empieza por `nuevo-`.
3. El selector de archivo de Importar es un `<input type="file" accept=".xls,.xlsx,.csv" data-trota-importar>`. Al elegir un archivo, la maqueta hace `fetch('uploads/importacion-demo.json')` y pinta esa vista previa. "Aplicar cambios" llama a `accion('importacion.aplicar', {id, decisiones})` con esta forma de decisiones:
   `{ nuevos: { <lastapp_id>: {destino:'plato', categoria, emoji} | {destino:'no_web'} | {destino:'mismo', plato_id} | {destino:'pendiente'} }, renombrar: [<plato_id>], ocultar_desaparecidos: true|false, recuperar_no_web: [<lastapp_id>] }`
4. El botón de foto de una actividad es un `<label aria-label="Cambiar foto">`.
5. Todo lo que se ve sale de `panel-demo.json` e `importacion-demo.json`, cargados con `fetch('uploads/panel-demo.json')` y `fetch('uploads/importacion-demo.json')`. Nada escrito a mano en los componentes.
6. En la pantalla de entrada, un botón discreto "Entrar (demo)" salta al inicio. Claude Code lo quita al conectar.

---

## Stack Técnico

```json
{
  "framework": "HTML + React (JSX) tal como exporta Claude Design: una sola página 'Trotamundos Panel' con vistas internas",
  "datos": "uploads/panel-demo.json e uploads/importacion-demo.json; nada escrito a mano",
  "estado": "vista activa, filtros y elemento abierto en el estado del componente; la dirección cambia (#carta/pl-8) para poder volver atrás",
  "cambios": "todos por accion(tipo, datos)",
  "despues": "Claude Code redirige las lecturas a /api/panel/* y engancha accion() sin tocar la maqueta"
}
```

---

## Exclusiones Explícitas

- Sin login real: la entrada es visual y "Entrar (demo)" salta al inicio.
- Sin subida real de fotos ni lectura real del Excel: el selector de archivo solo dispara la carga de `importacion-demo.json`.
- Sin campos ni botones de otros idiomas.
- Sin gráficos ni estadísticas.
- Sin textos nuevos fuera de este PRD.

---

## Criterios de Aceptación

- [ ] Las siete vistas existen y se navega con la barra inferior (móvil) o lateral (escritorio).
- [ ] Carta: pestañas de categorías, filas con emoji, nombre, precio e interruptor; ficha editable; editar categorías y archivados.
- [ ] El precio de un plato de LastApp se enseña pero no se edita, con "Lo trae LastApp" y "Lo quiero poner yo"; el de un plato a mano es un campo normal. La confirmación de desvincular sale en la misma pantalla.
- [ ] Importar: subir, vista previa con los seis grupos, selector de destino por cada nuevo, marcar varios como "No va en la web", casillas de renombrar y ocultar, avisos cuando vienen, aplicar y resumen.
- [ ] Actividades: tarjetas con foto y ficha con "Cambiar foto" y encuadre.
- [ ] Consultas: nuevas primero, filtros, ficha con WhatsApp y Llamar fijos abajo en móvil, estados y notas.
- [ ] Ajustes con la lista de acceso, sin "Quitar" en la propia persona.
- [ ] Cada lista tiene su estado vacío con la frase del PRD.
- [ ] Todos los cambios pasan por `accion(tipo, datos)`; los nuevos llevan id `nuevo-…`.
- [ ] Móvil primero: todo se usa con el pulgar, botones de al menos 44 px y sin scroll horizontal a 390 px.
- [ ] Ningún hex fuera de la tabla; Berkshire Swash y Merriweather.

---

## Notas y Restricciones

- La carta y las actividades de `panel-demo.json` son las reales; las consultas son inventadas.
- Casos que tienen que verse bien: Zaalouk (oculto), Codillo con chucrut (archivado), las dos empanadas, el Entrecote y los dos Pan Bao (a mano, `lastapp: null`; el Entrecote además sin precio), Pizza Pepperoni, Shakshuka y torrija (llegaron en una importación y solo tienen el español), la consulta de Oliver Bennett (teléfono británico, en inglés) y las cuatro consultas en idiomas distintos.
- En `importacion-demo.json` hay 141 filas en "No van en la web": el grupo tiene que plegarse bien y no estorbar.
- Precios: en la maqueta se pintan con coma y euro ("21,00 €"), aunque en los datos vengan como `"21.00"`.

---

# Prompts para Claude Design

## 1. Prompt autónomo

```
Esto es el panel privado de Daniel, dueño del bar restaurante Los Trotamundos, en Bubión (La Alpujarra, Granada). Lo usa desde el móvil, detrás de la barra o en la terraza, entre mesa y mesa. Con él mantiene la carta de su web, sube el Excel que exporta su TPV para actualizar precios de golpe, crea y retira actividades (senderismo, rutas a caballo, 4x4) y contesta por WhatsApp las consultas que llegan de la web.

Te pego el PRD completo: úsalo como briefing y respeta el copy tal cual, palabra por palabra. Hereda el design system de la web y del brandbook: fondo noche casi negro, oro del atardecer para la acción, azul globo solo en detalles pequeños, Berkshire Swash en titulares, cifras y precios y nunca en bloques de texto, Merriweather en todo lo demás. Cambia una cosa respecto a la web: aquí hay densidad de herramienta, menos aire y más información por pantalla, y contraste alto para que se lea con el sol de la terraza.

Todos los datos salen de panel-demo.json e importacion-demo.json, que he subido. No escribas datos a mano en los componentes.

Dos cosas que son el corazón de este panel y que no se te pueden escapar:

1. EL PRECIO TIENE DOS CARAS. Cada plato o sigue al TPV o lo lleva Daniel, y se ve de un vistazo cuál es cuál.
   - Si el plato tiene "lastapp" con datos, el precio NO es un campo: se enseña grande, como un dato, con la etiqueta "Lo trae LastApp", debajo en pequeño "En LastApp: [nombre allí] · [precio allí]", y al lado el enlace "Lo quiero poner yo".
   - Si "lastapp" es null, el precio es un campo normal y editable, sin etiqueta ninguna.
   - "Lo quiero poner yo" pide confirmación en la misma pantalla, nunca en una ventana emergente, y llama a accion('plato.desvincular', {id}).
   - No inventes interruptores, ni un "precio fijo", ni preguntas al teclear un precio. Solo esas dos caras.

2. TODO EN ESPAÑOL, SIEMPRE. En los datos los textos vienen como objeto con cuatro idiomas (nombre: {es, en, fr, ca}) porque la web pública está en cuatro idiomas, pero el panel lee y escribe SOLO la clave es. No dibujes ni un campo de otro idioma, ni pestañas de idioma, ni selectores, ni botones de traducir, ni banderas, en ninguna vista. La única excepción es un punto pequeño con el idioma del cliente en una consulta, porque eso dice en qué idioma hay que contestarle.

Construye el panel completo, vista por vista y en este orden: Entrada, estructura (cabecera y barra inferior), Inicio, Carta con la ficha de plato, Importar, Actividades con su ficha, Consultas con su ficha y Ajustes. Termina cada vista antes de pasar a la siguiente.

Cumple las peticiones técnicas del PRD al pie de la letra: todos los cambios pasan por un método accion(tipo, datos); los elementos nuevos llevan id "nuevo-…"; el selector de archivo de Importar es un input con data-trota-importar que, al elegir archivo, hace fetch de uploads/importacion-demo.json; y el botón de foto de una actividad es un label con aria-label="Cambiar foto".

Nada de ventanas emergentes: todas las confirmaciones, en la misma pantalla. Nada de estética de dashboard: ni gráficas, ni KPIs con flechitas, ni degradados. Son tarjetas y filas para el pulgar.
```

## 2. Repaso en móvil

```
Revisa todo el panel a 390 px de ancho. Botones de al menos 44 px, nada cortado, sin scroll horizontal, la barra inferior siempre visible, y en la ficha de consulta los botones WhatsApp y Llamar fijos abajo, igual que "Aplicar cambios" en Importar. Comprueba los estados vacíos de cada lista y que el grupo "No van en la web" (141 filas) se queda plegado sin estorbar. Repasa también que en la ficha de un plato de LastApp el precio se lee bien como dato (no parece un campo desactivado) y que "Lo quiero poner yo" se toca sin pelearse con el pulgar.
```
