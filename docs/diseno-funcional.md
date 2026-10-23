# Backend de Los Trotamundos — Documento de diseño

23 de octubre de 2026 · Borrador para que Dan lo apruebe.
Replica el método del backend de Ascua de Oro (repositorio `danguerrero32/ascuadeoro-web`: `docs/ESTADO.md`, `docs/diseno-funcional.md`, `lib/panel.js`, `tools/panel-conexion.js`). Donde este documento no diga otra cosa, se hace como allí.

---

## 1. Qué construimos y para qué

Los Trotamundos es el bar restaurante de Daniel en Bubión (La Alpujarra). Su web, `lostrotamundosalpujarra.com`, es hoy un único `index.html` en cuatro idiomas (español, inglés, francés y catalán) que Vercel publica desde GitHub. No tiene base de datos: la carta está escrita a mano dentro del código, en un objeto de JavaScript con 48 platos repartidos en 8 pestañas. Cada cambio de precio o de plato exige tocar el código.

Dan le ha vendido a Daniel el backend. Tiene que conseguir estas cosas, por este orden:

1. **Que la carta de la web nunca vaya por detrás de la del restaurante.** Un cambio hecho en el panel se ve en la web en menos de un minuto. Lo nuevo sale en español en los cuatro idiomas mientras la traducción siga apagada (§6).
2. **Que mantenerla le cueste poco a Daniel.** Puede dar de alta un plato a mano desde el móvil en un minuto, o subir el Excel que exporta LastApp, su TPV, y decidir solo lo que es nuevo.
3. **Actividades editables**, en segundo plano: rutas, visitas y excursiones que él crea y retira, con consultas de clientes que no se pierden.
4. **Ningún hosting que mantener y coste cero.** En este encargo no se llama a ninguna API de pago.

El panel lo diseña Claude Design con la marca de Trotamundos. Claude Code monta la base de datos y las funciones, y después conecta la maqueta de Design a los datos sin reescribirla, igual que se hizo con el panel de Ascua.

**Punto de partida, comprobado el 23 de octubre de 2026.** El proyecto de Vercel es `trotamundos-web`, en el equipo de Dan. Sirve `www.lostrotamundosalpujarra.com`; el dominio sin www redirige ahí con un 308. El DNS está en IONOS. El proyecto no tiene ninguna variable de entorno, así que las funciones de reservas con LastApp (`api/reservations.js` y compañía, usadas por `reservar.html`) no están activas y la página de reservas va en modo demo. Esas funciones están escritas en CommonJS y el paquete no declara módulos ES.

## 2. Decisiones cerradas

| Tema | Decisión | Quién |
|---|---|---|
| Método | El de Ascua: web estática en GitHub, Vercel la publica, funciones en `api/` y Supabase detrás. Panel de Claude Design conectado por un puente sin tocar su código | Dan |
| Alojamiento | Vercel, que ya sirve la web. Ningún servidor propio | Dan |
| Base de datos | Supabase en la nube, plan gratuito, región UE (París) | Dan |
| Que Supabase no se duerma | Latido diario desde Vercel y otro cada dos días desde GitHub Actions como respaldo. En Ascua solo llegó a montarse el de Vercel | Dan |
| Idiomas | **Solo español en esta fase.** No se traduce nada ni se llama a la API de Claude: cero gasto. El código de la traducción automática (Claude Haiku) queda preparado y probado con respuestas simuladas, apagado y sin clave. Encenderlo es una decisión futura de Dan, fuera de este encargo (§6) | Dan |
| Entrada al panel | Sin contraseña: enlace al correo enviado con Resend desde el dominio, verificado con registros en el DNS de IONOS | Dan |
| Consultas de actividades | Se guardan en el panel y, en el mismo toque, se abre WhatsApp con el mensaje ya escrito para Daniel | Dan |
| Diseño del panel | Claude Design, con la marca de la web. Claude Code no maqueta | Dan |
| Campos del plato | Los mismos que ya tiene la web (§4) | Dan |
| Hospedajes | Fuera. No está vendido | Dan |
| Web pública | No se rediseña. Solo cambia de dónde lee la carta y las actividades, y el formulario de actividades pasa a enviar de verdad | Mía |
| Categorías | Daniel puede crearlas, renombrarlas, ordenarlas y ocultarlas (la carta nueva ya trae "Postres", que la web no tiene) | Mía |
| Nada se borra | Un plato o una actividad se oculta o se archiva, y se puede recuperar. La única excepción es "Borrar los datos de esta persona" en una consulta | Mía, como en Ascua |
| Quién manda en cada dato | LastApp manda en el precio de los platos vinculados, salvo los que tienen el precio fijado en la web. La web manda en el nombre, la descripción, el emoji y las traducciones | Mía |
| Vínculo con LastApp | Un plato de la web, como mucho un producto de LastApp. Cada plato tiene un interruptor "Precio fijo en la web" para los casos en que el precio de la web es otro a propósito (§5) | Mía |
| Sugerencias en la importación | Sin IA, para no gastar API: solo "Es el mismo que…" cuando el nombre coincide exacto, y lo marcado como "No va en la web" se recuerda. La primera vinculación la prepara Claude Code (§5), así que Daniel no se enfrenta a 175 filas | Mía, corregida por Dan |
| Producción | La web en vivo no se toca hasta el OK de Dan: todo se prueba en una rama con las vistas previas de Vercel | Mía |
| Repositorio | Pasa a privado (§12). Necesita el OK explícito de Dan | Mía, vetable |

## 3. Cómo está montado

```
 Visitante ──► lostrotamundosalpujarra.com (Vercel, index.html estático)
                 │  lee la carta y las actividades
                 ▼
               /api/carta · /api/actividades · /api/consulta      ◄── funciones de Vercel
                 │                                                     (solo se ejecutan cuando
                 ▼                                                      alguien las llama)
               Supabase (base de datos + almacén de fotos)
                 ▲
                 │  /api/panel/* (con sesión)
 Daniel ──────► /panel  (maqueta de Claude Design + puente de conexión)
                         ├─ Resend: enlace de entrada y aviso de consultas
                         └─ Claude (Haiku): traducción preparada y apagada; no se llama

 Latidos: Vercel (cada día) y GitHub Actions (cada 2 días) ──► Supabase
```

Cada pieza tiene un solo trabajo:

- **La web pública** sigue siendo HTML estático. Al cargar pide la carta a `/api/carta` y las actividades a `/api/actividades`. Si la API no responde en unos segundos, pinta la carta y las actividades de hoy, que se quedan dentro del `index.html` como respaldo. Nunca se queda vacía.
- **Las funciones** (`api/`) son lo único que habla con Supabase, con la llave de servicio guardada en las variables de Vercel. Desde el navegador la base de datos está cerrada: todas las tablas llevan RLS activado y ninguna política, igual que en Ascua.
- **El panel** es la maqueta de Claude Design servida en `/panel`. Un puente (`tools/panel-conexion.js`, que un script añade tras cada exportación) cambia sus lecturas de datos de muestra por la API y manda cada cambio a `/api/panel/accion`.
- **Casi sin dependencias en el servidor**: Supabase y Resend se llaman por HTTP con `fetch`, como en Ascua. Para Claude se usa su SDK oficial (`@anthropic-ai/sdk`, con `zod` para que la respuesta llegue en un JSON validado), porque es la vía que Anthropic recomienda; son las dos únicas dependencias. El Excel se lee en el navegador de Daniel (§5), así que las funciones no cargan librerías de hojas de cálculo.
- **Caché**: las respuestas públicas se guardan 60 segundos en el borde de Vercel. Un cambio en el panel tarda como mucho un minuto en verse.

## 4. La carta

### Campos de un plato (los de la web de hoy)

| Campo | En la web hoy | Notas |
|---|---|---|
| Categoría | pestaña (`deaqui`, `carnes`…) | Las 8 actuales, editables |
| Nombre | `es`, `en`, `fr`, `ca` | Daniel escribe solo el español (§6) |
| Descripción | `desc_es` … `desc_ca` | Opcional |
| Precio | `p` (`'15.00'`; vacío en Entrecote) | Puede quedar vacío. Se muestra como hoy |
| Nota de precio | `pnote_es` … `pnote_ca` (`'(confirmar)'`) | Opcional, traducida |
| Emoji | `ico` | Uno |

Campos del panel que no se ven en la web: visible (sí o no: "hoy no hay"), archivado ("quitar de la carta", recuperable), orden dentro de su categoría, vínculo con LastApp (Id y nombre del producto allí), precio fijo en la web (sí o no) y, por cada traducción, si es automática o escrita a mano.

### Categorías

Cada una tiene un identificador fijo (el que usa la pestaña), su nombre en los cuatro idiomas, su orden y si se ve. Una categoría sin platos visibles no sale en la web. La base de datos arranca con las 8 de hoy y sus nombres.

### Cómo la lee la web

`GET /api/carta` devuelve las categorías visibles, en orden, y dentro de cada una sus platos visibles con la **misma forma** que el objeto `MD` actual (`es`, `en`, `desc_es`, `p`, `pnote_es`, `ico`…). Así, el código que dibuja la carta casi no cambia: las pestañas pasan a generarse desde los datos en vez de estar escritas en el HTML, y el selector de idioma las sigue traduciendo con los mismos atributos `data-es`/`data-en`. Cuando a un plato le falta una traducción, la web ya muestra el español en su lugar.

## 5. Importación desde LastApp

### Lo que trae el Excel de verdad

El export que hay en `~/Downloads/Products-24-07-2026.xls` (24 de julio) tiene 175 filas y cinco columnas: `Id`, `Name`, `Price` (`"19,00 €"`, con espacio duro), `Description` (vacía salvo en una fila) e `Image URL`. **No trae categoría y mezcla los platos con bebidas, licores, cafés y extras** ("Absolut", "Coca Cola", "Ingrediente extra (pizza)", "extra020"). Los nombres tampoco coinciden con los de la web: en LastApp es "Pizza Margarita" y en la web "Margarita", dentro de la pestaña Pizza y Pasta.

Hay otro formato de exportación de LastApp, el del catálogo, con las columnas `ID del producto en el catálogo`, `ID del producto en la organización`, `Categoría`, `Nombre`, `Precio` y `Descripción` (hay un ejemplo vacío en `~/Downloads/catalog.new-catalog-21-04-2026.csv`). El importador acepta los dos formatos (`.xls`, `.xlsx` y `.csv`) y reconoce las columnas por su nombre. Si viene la categoría de LastApp, la enseña junto a cada producto nuevo para ayudar a decidir.

### Qué export manda y cuál es la llave

El export de productos da un precio base por producto. El de catálogo da el precio de ese catálogo, y en LastApp puede haber varios: sala, para llevar, delivery. Si Daniel tiene precios distintos por catálogo, el export de productos iría siempre por detrás de lo que se cobra en la mesa. En el de julio, una decena de platos están por debajo de la carta impresa de septiembre (Choto 18,90 € frente a 21 €, Chuletas 19,50 € frente a 25 €), y con un solo export no se puede saber si es por la fecha o por el catálogo. Por eso:

- **La llave es el Id del producto en la organización.** Es el mismo producto en cualquier catálogo, y se comprueba con los exports nuevos que coincide con la columna `Id` del export de productos.
- **El formato que manda se decide con datos** en la construcción. Con un export reciente de cada formato, se compara con la carta impresa (`~/Downloads/Carta Trotamundos Alpujarra.pdf`) y gana el que cuadra con lo que se cobra en sala. El texto de ayuda del panel le dice a Daniel exactamente qué export sacar.
- **El importador recuerda de dónde vino la última importación aplicada** (formato y, en el de catálogo, el nombre que lleva el archivo). Si se sube otro distinto, la vista previa avisa antes de que los precios cambien de un lado a otro.

### Cómo funciona

1. **Subir.** Daniel pulsa "Subir Excel de LastApp" y elige el archivo en el móvil o el ordenador. El navegador lo lee con SheetJS, la librería estándar de hojas de cálculo, cargada solo en ese momento. Manda las filas ya limpias a `/api/panel/importar`, y el servidor las vuelve a validar con el mismo código.
2. **Vista previa.** El servidor compara cada fila con lo que ya conoce, usando el Id de LastApp como llave, y la clasifica en grupos:
   - **Nuevos en LastApp**: Daniel elige para cada uno una categoría de la web (y emoji), "No va en la web" (bebidas, extras) o "Es el mismo que…" un plato todavía sin vincular. Si el nombre coincide exacto con uno de esos platos, viene preseleccionado; si solo se parece, se le enseña como posible, sin marcar. Hay un botón para marcar varios de golpe como "No va en la web".
   - **Cambian de precio**: precio de antes y precio nuevo. Se aplican.
   - **Cambian de nombre en LastApp**: se informa y, con una casilla desmarcada por defecto, se puede cambiar también el nombre en la web (queda pendiente de traducir, §6).
   - **Ya no están en LastApp**: casilla "Ocultarlos de la web", marcada por defecto. Si falta más de la mitad de lo vinculado, la casilla viene desmarcada y un aviso pregunta si el archivo es el export completo.
   - **Sin cambios** y **No van en la web** (lo que se marcó otras veces), plegados. Lo segundo se puede deshacer.
3. **Aplicar.** Un botón aplica todo junto. Una función de la base de datos escribe todos los cambios en una sola operación: si algo falla, no se aplica nada a medias. Los platos nuevos entran en español. El panel enseña el resumen ("3 platos nuevos, 5 precios actualizados, 2 ocultados") y queda apuntado en el historial.

### Reglas

- La decisión "No va en la web" se recuerda por Id: en las importaciones siguientes esa fila ya no pregunta.
- Los platos creados a mano y sin vincular nunca se ocultan ni se tocan por una importación.
- Un plato se vincula como mucho a un producto de LastApp. "Es el mismo que…" solo ofrece platos todavía sin vincular.
- **Precio fijo en la web.** Hay platos cuyo precio en la web es otro a propósito. Las empanadas van a 3,50 € por unidad en la web y en la carta impresa, pero en LastApp están a 12,50 € y 10,00 €. El Entrecote va sin precio, y LastApp le pone 23 €. Con el interruptor encendido, la importación no toca ese precio y la vista previa solo informa ("en LastApp ha pasado a 13 €; en la web sigue en 3,50 €").
- **Un plato que en LastApp son varios productos** (el Surtido de croquetas frente a "Croquetas de cocido" y "Croquetas del mar") se vincula a uno con el precio fijo, o se deja sin vincular con su precio a mano, y los demás productos se marcan "No va en la web".
- Un plato vinculado y sin precio fijo al que Daniel le cambia el precio a mano volverá al precio de LastApp en la siguiente importación, y la vista previa lo enseña como cambio. Al cambiar un precio a mano en un plato vinculado, el panel pregunta en la misma pantalla si quiere fijarlo.
- Si un plato nuevo trae descripción en LastApp, esa es su descripción inicial en español.
- Un archivo sin las columnas reconocibles se rechaza con un mensaje que dice qué columnas esperaba. No se aplica nada.

### La primera vinculación

Los 48 platos de la web de hoy no tienen Id de LastApp. Cruzándolos con el export de julio salen 12 coincidencias exactas y 20 parecidas, muchas falsas ("Choto" se parece a "Cortado"; "Carpaccio de wagyu", a "Carajillo de Bailey"). Otros 16 ni aparecen, porque la carta es de septiembre y el export es de julio. Así que:

- Hace falta **un export nuevo** de LastApp antes de vincular.
- Claude Code prepara la vinculación inicial con ese export: propone qué producto es cada plato, cuáles llevan el precio fijo y qué filas son bebidas o extras, y marca cada precio que no cuadre con la carta impresa. Se la pasa a Dan en una lista para que la confirme. Con eso, la primera importación real de Daniel solo le enseña cambios de verdad, no 175 filas.
- Ninguna vinculación por parecido se aplica sin confirmación, ni en la primera importación ni en las siguientes.

## 6. Traducciones

**En este encargo, solo español y cero gasto de API.** No se traduce nada: ni durante la construcción ni al publicar. Lo que sí se hace es dejar el código preparado:

- Un interruptor en los ajustes (`traduccion_automatica`) que arranca y se queda apagado. No se pone ninguna clave de Anthropic.
- Con el interruptor apagado, guardar o importar no llama a Claude. Lo nuevo o cambiado queda en español y marcado como pendiente de traducir.
- **Un plato pendiente se ve en español en los cuatro idiomas.** Así, si Daniel cambia "Choto" por otro plato, la versión inglesa no sigue enseñando la traducción vieja.
- Los 48 platos y las 3 actividades de hoy conservan las traducciones que ya tienen en la web mientras no se cambien.
- El panel trabaja solo en español: no enseña campos de otros idiomas ni botones de traducir.
- Las pruebas automáticas cubren la traducción con respuestas simuladas, sin llamar a la API.

Cuando Dan decida encenderla, harán falta la clave, el interruptor y la parte del panel para revisar traducciones. Lo de abajo describe cómo funcionará entonces.

- Con el interruptor encendido, al guardar un plato, una categoría o una actividad con el texto en español cambiado, la función pide a Claude (Haiku) las versiones en inglés, francés y catalán. Las instrucciones incluyen ejemplos de la carta actual para que mantenga el estilo de la casa (cómo se traducen "Choto", "Migas" o "Costilla en orza") y los nombres propios.
- Cada traducción sabe si es automática o escrita a mano. Si Daniel corrige el inglés de un plato, esa traducción pasa a manual y ya no se rehace cuando cambia el español. El panel marca las automáticas para que se vean y tiene un botón "Volver a traducir".
- Si la traducción falla (sin conexión, sin saldo), el plato se guarda igual en español y queda marcado como pendiente. La tarea diaria reintenta las pendientes. Mientras tanto, la web enseña el español.
- La importación usa la misma llamada, por lotes: una sola petición para todos los platos nuevos.
- Coste: una traducción de un plato son unos cientos de tokens. Con el uso de un restaurante, céntimos al año. La clave (`ANTHROPIC_API_KEY`) va en Vercel, con un límite de gasto puesto en la cuenta de Anthropic.

## 7. Actividades

Hoy hay tres tarjetas escritas a mano: Senderismo, A caballo y 4x4. Cada actividad tiene los campos que ya pinta la web:

| Campo | Notas |
|---|---|
| Emoji | Como el 🥾 de hoy |
| Nombre y descripción | En español (§6) |
| Foto | Subida desde el móvil. El navegador la reduce a unos 1.600 px antes de subirla, porque el plan gratuito de Supabase no transforma imágenes y las fotos del móvil pesan varios megas |
| Encuadre | Arriba, centro o abajo (hoy la de senderismo va "arriba") |
| Visible, archivada, orden | Como los platos |

`GET /api/actividades` devuelve las visibles con lo que la web necesita para pintar la tarjeta y el título de la ventana de consulta. Si falla, quedan las tres de hoy como respaldo.

## 8. Consultas de actividades

### En la web

La ventana de consulta mantiene sus campos (nombre, teléfono o WhatsApp, fecha preferida y personas) y añade la casilla de privacidad. Al pulsar "Enviar consulta", en el mismo toque:

1. La consulta se manda a `/api/consulta` con un envío que sobrevive aunque la página cambie (`keepalive`).
2. Se abre WhatsApp, a `wa.me/` con el número del restaurante sacado de los ajustes, con el mensaje escrito en el idioma de la web: "Hola, soy Ana. Me interesa la ruta a caballo el 14 de noviembre para 2 personas."
3. La ventana muestra la confirmación: "Recibida. Si WhatsApp no se ha abierto, pulsa aquí." Reutiliza los estilos de la web y no se rediseña nada.

Si el cliente no llega a mandar el WhatsApp, la consulta está en el panel. Si falla el guardado, el WhatsApp llega igual.

El filtro de basura es el de Ascua, adaptado a un formulario corto: un campo trampa invisible, un mínimo de 3 segundos rellenando y un máximo de 3 consultas por teléfono en 24 horas. Sin captcha.

### En el panel

Lista de consultas con las nuevas primero. Cada ficha enseña la actividad, la fecha, las personas, el idioma y hace cuánto llegó, y tiene estos botones:

- **WhatsApp**: abre la conversación con el cliente con una respuesta preparada en su idioma ("Hola, Ana. Soy Daniel, de Los Trotamundos. Hemos recibido tu consulta…").
- **Llamar**.
- **Estado**: nueva → contestada → confirmada, o descartada.
- **Notas internas**, que se guardan solas.
- **Borrar los datos de esta persona**: anonimiza la consulta, como en Ascua.

Aviso por correo de cada consulta nueva a los correos de los ajustes. Viene encendido y se puede apagar si a Daniel le basta con WhatsApp. Las consultas cerradas se anonimizan a los 12 meses, en la tarea diaria.

## 9. El panel

- **Dirección**: `/panel`, fuera de buscadores.
- **Quién entra**: los correos de la lista de acceso. Arranca con Dan (para pruebas) y Daniel. Desde Ajustes se añaden o quitan correos; nadie puede quitarse a sí mismo, para no quedarse fuera.
- **Entrada**: la de Ascua, tal cual. Se escribe el correo y llega un enlace que vale 30 minutos y una sola vez. Al pulsarlo se crea una sesión de 90 días (cookie `HttpOnly`) que se renueva sola con el uso. Si el correo no está autorizado, la respuesta es la misma y no se manda nada.
- **Nada se pierde**: lo que se escribe se guarda en el dispositivo mientras se teclea, y se manda al servidor con una pequeña espera, como en Ascua.
- **Pensado para el móvil** de Daniel, en la barra o en la terraza. El escritorio es el móvil ensanchado.

| Vista | Para qué |
|---|---|
| Entrada | Correo y enlace |
| Inicio | "Hola, Daniel": consultas nuevas, platos ocultos y la fecha de la última importación. Atajos grandes: Subir Excel de LastApp, Añadir plato, Añadir actividad. Últimos movimientos |
| Carta | Categorías como en la web; dentro, los platos con precio, emoji, el interruptor de visible y el orden. Ficha editable, en español. Editar categorías. Archivados |
| Importar | Subir el archivo, la vista previa por grupos (§5) y Aplicar |
| Actividades | Tarjetas con foto; ficha editable con cámara y encuadre |
| Consultas | Lista y ficha (§8) |
| Ajustes | WhatsApp del restaurante, correos de aviso, interruptor de aviso por correo, nombre de quien gestiona (para los mensajes) y lista de acceso al panel |

**Historial**: cada cambio queda apuntado con quién lo hizo y cuándo (tabla `historial`).

## 10. Los datos

Todo en Supabase, con RLS activado y sin políticas en todas las tablas.

| Tabla | Contiene |
|---|---|
| `categorias` | Identificador, nombre en 4 idiomas, orden, visible, qué traducciones son manuales |
| `platos` | Categoría, nombre, descripción y nota de precio en 4 idiomas, precio, precio fijo, emoji, visible, archivado, orden, Id y nombre en LastApp (Id único: un producto, un plato), traducciones manuales o pendientes |
| `productos_lastapp` | Lo último que se ha visto de cada producto de LastApp (por su Id de organización): nombre, precio, categoría allí, si "no va en la web", qué plato tiene vinculado, primera y última vez visto |
| `importaciones` | Cada importación: quién, cuándo, archivo, formato y catálogo de origen, filas limpias, vista previa, decisiones, resumen y estado (vista previa, aplicada o descartada) |
| `actividades` | Emoji, nombre y descripción en 4 idiomas, foto, encuadre, visible, archivada, orden |
| `consultas` | Actividad (y su nombre en ese momento), nombre, teléfono, fecha, personas, idioma, aceptación de privacidad con fecha, estado, notas, si salió el aviso, anonimizada |
| `ajustes` | Clave y valor: WhatsApp, correos de aviso, aviso por correo, nombre de quien gestiona |
| `administradores` | Correos con acceso al panel |
| `sesiones_panel` | Como en Ascua: solo el *hash* de cada token |
| `historial` | Quién hizo qué y cuándo |
| `latidos` | Cada latido, con su origen (Vercel o GitHub) |

Almacén `fotos` (público) para las fotos de actividades, con subida directa desde el navegador mediante una URL firmada, como las de los cachorros.

La carta y las actividades de hoy se cargan en la base de datos al arrancar, sacadas del propio `index.html` con un script, para que el primer día la web enseñe exactamente lo mismo que ahora.

## 11. Del diseño al código

El mismo recorrido que el panel de Ascua, que Design produjo entero con un solo prompt:

1. **El contrato son los datos de muestra.** Claude Code prepara `uploads/panel-demo.json`, con la carta real, las actividades reales, consultas de muestra, ajustes e historial, y `uploads/importacion-demo.json`, una vista previa de importación construida con el Excel real de julio contra la carta real. Design dibuja leyendo esos archivos y la API devolverá exactamente esa forma.
2. **PRD para Claude Design** (`docs/prd-panel-claude-design.md`), con la plantilla de la skill `web-design-claude` de Dan: vistas, copy en la voz de Daniel, identidad visual de la web (fondo casi negro `#0B0907`, dorado `#EDAF8C`, azul `#68B4C8`, crema `#F0E6D2`, Berkshire Swash en titulares y Merriweather en el texto) y un **prompt autónomo único**, más uno de repaso a 390 px. Antes de escribirlo se abren enteros el brandbook (`trotamundos-brandbook.vercel.app` y el PDF de guía de uso) y el logo.
3. **Dos peticiones técnicas a Design**, que no tocan lo visual:
   - Cada cambio pasa por un único método `accion(tipo, datos)`, que en la maqueta solo actualiza el estado. Así el puente se engancha en un solo sitio en vez de vigilar todo el estado como en Ascua. Si Design no lo respeta, el puente vuelve a vigilar el estado, como allí.
   - Al elegir un archivo para importar, la maqueta hace `fetch('uploads/importacion-demo.json')` y pinta esa vista previa. El puente lee el archivo de verdad, lo manda a la API y devuelve la vista previa real en esa misma lectura.
4. **Dan** crea en Claude Design el proyecto "Trotamundos panel" con el sistema de diseño sacado del brandbook y de la web, sube los dos JSON y el logo, pega el PRD y el prompt, revisa y pulsa *Hand off to Claude Code*.
5. **Claude Code** lee el proyecto con DesignSync, lo guarda en el repo y ejecuta `tools/ajustes.py`. El script reaplica tras cada exportación lo que esta pisa: quita el botón de demo, pone el selector de archivo en la cámara y añade el puente al final del script. `/panel` apunta a la página del panel desde `vercel.json`.

La construcción no espera a Design: la base de datos, las funciones y la importación se hacen y se prueban contra el contrato mientras Dan trabaja en Design.

## 12. Seguridad y privacidad

- Las claves solo van en las variables de Vercel y en los secretos de GitHub. Nunca en el código ni en el chat.
- En el repositorio no va ningún dato personal: los correos del panel se dan de alta desde Ajustes o con SQL que no se sube.
- El repositorio hoy es **público**. Con un backend dentro conviene pasarlo a privado, por dos motivos: el código del panel y los documentos internos quedan a la vista, y en un repositorio público GitHub desactiva las tareas programadas tras 60 días sin cambios. Como la carta pasa a vivir en Supabase, puede haber meses sin cambios en el código. Vercel despliega igual repositorios privados en el plan gratuito.
- El latido de GitHub no usa la llave de servicio: llama a una función de la base de datos (`latir`) que solo inserta un latido, con la clave pública. Si alguien la viera, solo podría dar latidos.
- La consulta de actividades recoge datos personales: casilla de aceptación obligatoria, primera capa informativa en la propia ventana y página `/privacidad`. Hoy `/politica-de-privacidad` redirige a la portada, así que pasará a esa página. Los datos fiscales de Daniel están pendientes y la página lleva huecos marcados hasta tenerlos.
- `noindex` en `/panel` y en `/api/*`.

## 13. Lo que tiene que hacer Dan

Todo lo demás lo hace Claude Code. Lo de Dan se agrupa en tres momentos:

**Arranque (unos 30 minutos, el primer día, en paralelo a la construcción)**

1. Supabase: crear el proyecto "trotamundos" en la región West EU (París). El plan gratuito admite dos proyectos activos y no está claro si el límite es por organización o por cuenta: si no deja, crear una organización nueva o usar una cuenta del restaurante. Copiar la URL del proyecto, la clave secreta y la clave pública a las variables de Vercel (Production y Preview), y la URL y la clave pública a los secretos del repositorio en GitHub.
2. Resend: en tu cuenta actual (el plan gratuito admite ya tres dominios), añadir `lostrotamundosalpujarra.com` y copiar sus registros al DNS de IONOS. Crear una clave de API para Vercel.
3. Darme el correo de Daniel para el panel.
4. Pedirle a Daniel un export nuevo de LastApp, o sacarlo tú si tienes acceso, y dejarlo en `~/Downloads`. Si se puede, los dos formatos (productos y catálogo).
5. OK para pasar el repositorio a privado.

No hace falta clave de Anthropic: en este encargo no se llama a Claude.

**Claude Design (una sesión)**: crear el proyecto, pegar el PRD y el prompt, revisar en el móvil y hacer *Hand off*.

**Revisiones**: confirmar la lista de la primera vinculación con LastApp; probar el panel en la vista previa de Vercel; dar el OK para publicar (pasar la rama a `main`).

## 14. Cómo se comprueba

- Pruebas automáticas (`node --test`): limpieza de filas del Excel en los dos formatos y con los precios tal como vienen (`"19,00 €"` con espacio duro), clasificación de la vista previa (nuevo, precio, nombre, desaparecido, ignorado, "es el mismo que"), aviso de export incompleto, reglas de traducción con respuestas simuladas (automática frente a manual, pendiente, y que con el interruptor apagado no se llama a Claude), conversión a la forma de la web, validación y filtro de la consulta, y sesiones (las de Ascua, adaptadas).
- Servidor local con modo demo, como en Ascua: sin claves sirve los JSON de muestra y registra las acciones sin guardarlas.
- Recorrido completo en el navegador, en la vista previa de Vercel con la base de datos real: entrar con el enlace; crear un plato y verlo en la web en menos de un minuto, en español en los cuatro idiomas; ocultarlo y archivarlo; importar el export real y aplicar; crear una actividad con foto desde el tamaño de móvil; mandar una consulta desde la web y verla en el panel, con el WhatsApp bien escrito y el correo recibido.
- Caso de fallo: con la API caída, la web enseña la carta y las actividades de respaldo.
- Que las reservas por LastApp (`reservar.html` y sus funciones) siguen funcionando igual tras los cambios del repositorio.
- Revisión a 390 px de ancho.

## 15. Fuera de este alcance

Hospedajes (no vendido). Fotos de los platos y alérgenos: la web no los tiene hoy y no se pidieron, aunque la tabla admitiría añadirlos más adelante. La sección "Por encargo" y el horario siguen fijos en el código. Sincronización directa con la API de LastApp, sin Excel: es posible porque la web ya usa esa API para las reservas, pero no se pidió. Rediseño de la web pública. Respuestas automáticas por WhatsApp (se usan enlaces que abren la conversación).

## 16. Pendientes de datos

- Correo de Daniel para el panel.
- Export reciente de LastApp en los dos formatos y cómo se saca exactamente cada uno desde LastApp (para el texto de ayuda del panel).
- Si Daniel tiene en LastApp precios distintos por catálogo (sala, para llevar, delivery). Si Dan lo sabe, ahorra una comprobación; si no, se deduce de los exports (§5).
- Datos fiscales de Daniel para la página de privacidad.
- Confirmar que el WhatsApp del restaurante sigue siendo el +34 858 893 777 que usa la web.
