# Backend y panel de Los Trotamundos — estado del proyecto

Última actualización: 24 de octubre de 2026, de madrugada (tras la sesión de la noche). **Este archivo es el punto de entrada.** Si abres una conversación nueva sobre este proyecto, lee esto primero y después `docs/diseno-funcional.md`. Lo que diga este archivo manda sobre lo que digan los demás, porque es lo único que se mantiene al día.

---

## 1. Qué es

Dan Guerrero (Keen Impact) le ha vendido a Daniel, dueño del bar restaurante **Los Trotamundos** (Bubión, La Alpujarra, Granada), el backend de su web `lostrotamundosalpujarra.com`.

La web es hoy un solo `index.html` estático, en cuatro idiomas, con la carta escrita a mano dentro del código: 48 platos en 8 pestañas. Cada cambio de precio obliga a tocar el código. El encargo consiste en que Daniel mantenga él mismo:

1. **La carta**, plato a plato desde el móvil o subiendo el Excel que exporta LastApp, su TPV.
2. **Las actividades** (senderismo, rutas a caballo, 4x4), con las consultas de clientes guardadas en un panel.

Lo lleva Dan con Claude: **Claude Design hace el diseño del panel; Claude Code monta la base de datos, las funciones y la conexión.** Claude Code no maqueta.

## 2. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Código y documentos | https://github.com/danguerrero32/trotamundos-web — **hoy es público** (ver §7) |
| Copia local | `~/Downloads/trotamundos-web`, rama `backend-panel` |
| Web publicada | Vercel, proyecto `trotamundos-web`, rama `main` → `www.lostrotamundosalpujarra.com`. El dominio sin www redirige con un 308 |
| DNS | IONOS |
| Diseño del panel | Proyecto de Claude Design: https://claude.ai/design/p/1cf29510-df55-4d57-b442-423552560dc7 (archivo `Trotamundos Panel.dc.html`) |
| Manual de marca | https://trotamundos-brandbook.vercel.app/ y `~/Downloads/brandbook - guía de uso de marca web lostrotamundos.pdf` |
| Historial del cliente | `~/Library/Mobile Documents/com~apple~CloudDocs/Documents/Alpujarra leads/trotamundos/` — ahí viven el prompt maestro de Daniel, las fichas de su segundo cerebro, la guía de la web y el guion de la carta nueva |
| Método de referencia | `~/Downloads/Blasen Marujeña/ascuadeoro-web/` — el backend de Ascua de Oro, de donde sale el patrón. Donde una decisión diga "como en Ascua", está ahí |

## 3. Documentos de esta carpeta

| Archivo | Qué contiene |
|---|---|
| `ESTADO.md` | Este. Punto de entrada y estado real |
| `diseno-funcional.md` | El documento de diseño: decisiones, arquitectura, carta, importación, actividades, consultas, panel, datos, seguridad, alcance |
| `planes/2026-10-23-backend-panel.md` | El plan de implementación, tarea a tarea, con el estado de cada una marcado |
| `prd-panel-claude-design.md` | El encargo que se pegó en Claude Design, y al final el texto que se le dio para que construyera el panel |
| `kit-arranque-dan.md` | Lo que tiene que hacer Dan: cuentas, claves y datos |
| `carta-2026-10.md` | La carta impresa de octubre de 2026 transcrita, comparada plato a plato con la web, y las preguntas que quedan |

## 4. Cómo se trabaja aquí

Estas reglas las ha puesto Dan y no se negocian:

- **El control lo lleva Dan.** Nada con efectos —escribir código, hacer push, crear cuentas o recursos, tocar configuración— sin su OK a ese paso concreto. Proponer, sí; ejecutar, no.
- **Informar en pocas líneas:** qué se va a hacer, dónde, y qué se necesita de él.
- **No hacer trabajo que no ha pedido.** Si pide leer y opinar, se lee y se opina; no se corrige nada.
- **Claude Code no diseña.** El panel es lo que entregue Claude Design. La web pública no se rediseña.
- **A la web no se le quita nada.** Solo se añade.
- **Con Daniel, cero tecnicismos**, ni en inglés. Los textos del panel y su guía van en lenguaje de barra.
- **Las claves no se pegan en el chat** ni las escribe Claude en ningún formulario. Van de la mano de Dan a Vercel.
- Los métodos internos de Keen Impact no se mencionan nunca en nada que vea el cliente.

**Aviso para quien retome esto:** una conversación anterior escribió el borrador de los documentos sin mirar el historial del proyecto y después escribió código sin permiso, que acabó subido a GitHub. De ahí viene la rama `backend-panel`. Ese código está ya corregido y probado, pero **sigue sin aprobar**: trátalo como borrador hasta que Dan lo dé por bueno.

## 5. Decisiones cerradas

| Tema | Decisión |
|---|---|
| Método | El de Ascua: web estática en GitHub, Vercel la publica, funciones en `api/`, Supabase detrás, panel de Claude Design conectado por un puente que no toca su código |
| Alojamiento | Vercel y Supabase gratuito. Ningún servidor propio. Latido diario para que Supabase no se duerma |
| Idiomas | **Solo español en esta fase.** No se traduce, no se llama a ninguna API y no se escribe código de traducción. Los textos que la web ya tiene en inglés, francés y catalán se cargan en la base de datos y **no se borran**. Si Daniel cambia el español de un campo, las otras versiones de ese campo se vacían y la web enseña el español ahí. Las otras versiones son una fase aparte |
| Precio | **Los precios finales son SIEMPRE los de la carta impresa** (Dan, 25 de octubre; sustituye a la decisión anterior de que mandara LastApp). Hoy ningún plato está vinculado a LastApp: todos van a mano y ninguna importación toca un precio. El código sigue teniendo los dos métodos (vinculado = precio de LastApp); mientras no se cambie, **no hay que aceptar "Es el mismo que…" al importar**, porque eso vincula y cambia el precio. Pendiente de decidir con Dan qué hace la importación a partir de ahora (ver Tarea 11) |
| Entrada al panel | Sin contraseña: enlace al correo con Resend, desde el dominio verificado en IONOS |
| Consultas de actividades | Se guardan en el panel y además abren WhatsApp con el mensaje escrito |
| Reservas de mesa | **Fuera.** Daniel ya las tiene en LastApp. Lo que hay en la web se queda como está, funcione o no |
| Hospedajes | **Fuera.** No está vendido. La sección de la web se queda como está |
| Sin APIs de pago | Ninguna, en ninguna fase de este encargo |
| Repositorio privado | Decidido, pendiente del OK expreso de Dan al publicar |
| Qué carta va en la web | **La carta impresa de octubre de 2026** (`~/Downloads/Carta Trotamundos Alpujarra.zip`, transcrita en `carta-2026-10.md`) manda sobre la web actual y sobre el Excel de LastApp para decidir categorías y platos. El Excel trae bebidas y cosas desactualizadas: solo sirve para precios de vinculados e importación. Decidido por Dan el 24 de octubre |

## 6. Estado por bloques

Las tareas son las del plan. Lo escrito está en la rama `backend-panel`, con **79 pruebas en verde** (`npm test`). El proyecto no instala ninguna dependencia de npm.

| Bloque | Estado |
|---|---|
| Documento de diseño, plan y PRD | Hechos y corregidos con las decisiones de Dan del 23 de octubre |
| Tarea 1 · Cimientos (módulos ES, Node 24, servidor local) | Escrita, sin aprobar |
| Tarea 2 · Contrato de datos (`uploads/panel-demo.json`, `uploads/importacion-demo.json`) y PRD | Escrita. Regenerada con el export real del 23 de octubre |
| Datos iniciales (`supabase/002`) | **Regenerados con la carta de octubre y cargados el 24 de octubre**: 9 categorías, 57 platos, 3 actividades. `tools/genera-sql-inicial.mjs` lee `tools/carta-2026-10.json` (la carta como datos) e `index.html` (actividades, y traducciones y emojis de los platos que ya estaban). Las respuestas de Dan están al final de `carta-2026-10.md` |
| Tarea 3 · Base de datos (`supabase/001`, `002`), latido de Vercel y de GitHub | `001` **ejecutado el 24 de octubre** en el proyecto `trotamundos` de Supabase (ref `tirnsyngbulmldodrrxb`, organización `trotamundos`, desde el Chrome de Dan): 11 tablas con RLS, `latir`, bucket `fotos`, ajustes sembrados. Dan dado de alta en `administradores` con `supabase/local-administradores.sql` (no versionado). `002` ejecutado (ver fila anterior). Latidos sin probar |
| Tarea 4 · Entrada al panel con enlace al correo | Escrita, sin probar de verdad (falta Resend) |
| Tarea 5 · Carta pública desde la base de datos | Escrita |
| Tarea 6 · Actividades públicas desde la base de datos | Escrita |
| Tarea 7 · Consultas: panel y WhatsApp a la vez, más `/privacidad` | Escrita |
| Tarea 8 · Traducción automática | **Retirada** por decisión de Dan |
| Tarea 9 · Datos y acciones del panel | Escrita |
| Tarea 10 · Importación del Excel de LastApp con vista previa | Escrita. `003` **ejecutado el 24 de octubre** (función `aplicar_importacion` creada). Sin probar con datos |
| Tarea 11 · Vinculación inicial con LastApp | **Cambia de sentido el 25 de octubre.** La importación de prueba vinculó 29 platos y cambió 8 precios; Dan zanjó que los precios son siempre los de la carta, así que se restauraron los 57 precios de la carta y se quitaron los 29 vínculos (SQL desde su Chrome; apuntado en `historial`). Los 197 productos siguen en `productos_lastapp` sin marcar. **Pendiente de Dan:** qué papel le queda a la importación. Propuesta: que sirva solo para avisar de platos nuevos en LastApp (y de los que desaparecen), sin tocar nunca un precio; un plato creado desde la importación nacería a mano con el precio de LastApp como punto de partida, editable. Eso exige cambiar `aplicar_importacion` y la vista previa, y retirar del panel la ficha de "Lo trae LastApp". Hasta entonces, no aceptar "Es el mismo que…" |
| Tarea 12 · Importar y conectar el panel de Claude Design | **Hecha el 24 de octubre.** `Trotamundos Panel.dc.html` y `support.js` traídos del proyecto de Design "Backend Trotamundos" (DesignSync llega a él por su id aunque `list_projects` no lo liste). `tools/panel-conexion.js` envuelve `accion()`, redirige las lecturas a `/api/panel/datos`, lee el Excel con SheetJS y sube las fotos; `tools/ajustes.py` lo inyecta y quita el botón de demo. **Comprobado en modo demo** con el servidor local a 390 px: alta de plato (espera al nombre, fusiona el precio, las acciones siguientes usan el id real), importación con el export real (vista previa y aplicar), salir y pedir enlace. **Comprobado también en la vista previa de Vercel con la base real** el 24 de octubre: `/api/carta` devuelve la carta de octubre con `origen: 'bd'`, la web de la vista previa pinta las 9 pestañas y los 57 platos, `/panel` carga la pantalla de entrada y guarda el enlace en `sesiones_panel`. **Recorrido real hecho el 25 de octubre** (Tarea 14, paso 2) en el Chrome de Dan con su sesión: plato de prueba creado, visto en `/api/carta`, ocultado y archivado; importación del export real (vista previa con 197 filas y aplicada); actividad de prueba con foto (reducida a 150 KB y subida al bucket `fotos`), vista en `/api/actividades` y archivada; consulta desde la web de la vista previa (WhatsApp con el texto correcto y guardada), vista en el panel con sus botones, pasada a contestada y anonimizada; `noindex` en `/panel` y `/api/*`; la web sigue entera (menú, actividades, reservas, alojamiento, encargos, galería, contacto, `reservar.html`). Lo creado para probar lleva `[prueba]` y está archivado |
| Tarea 13 · Tarea diaria (latido, anonimizado, limpieza) | Escrita |
| Tarea 14 · Verificación en la vista previa y guía para Daniel | Sin empezar |
| Tarea 15 · Publicación | Sin empezar |

El panel va todo en **una sola función de Vercel** (`api/panel/[ruta].js` + `lib/rutas-panel.js`), porque el plan gratuito admite doce funciones por despliegue y no caben de otra forma.

## 7. Lo que tiene que hacer Dan

Comprobado el 24 de octubre por la noche:

- [x] **Supabase.** Proyecto `trotamundos` creado. Esquema cargado.
- [x] **Vercel**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM` y `CRON_SECRET` en Production, Preview (marcado el 24 de octubre con el OK de Dan) y Development. La vista previa de la rama es `trotamundos-web-git-backend-panel-danguerrero32s-projects.vercel.app`, protegida con inicio de sesión de Vercel.
- [x] **Resend funciona** (25 de octubre, 0:10): clave nueva y remitente con formato `Nombre <correo>` en un dominio de Dan. El enlace de entrada llegó y Dan entró al panel de la vista previa.
- [ ] **GitHub** → Settings → Secrets → Actions: `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`. Es solo el latido de respaldo; no corre prisa.
- [ ] **OK para pasar el repositorio a privado** cuando se publique.
- [x] **Rama** `backend-panel` subida (OK de Dan del 24 de octubre).

## 8. Datos que faltan

- **El export de catálogo de LastApp**, el que trae la columna `Categoría`. El que hay en `~/Downloads` está vacío. Con él los platos nuevos llegan clasificados. (Postres: la carta de octubre no los trae, así que de momento no se crea la pestaña; ver `carta-2026-10.md`.)
- **El OK de Daniel a los precios.** Manda LastApp, y eso baja precios en la web en la primera importación. Medido con el export del 23 de octubre: las pizzas caen entre 1 y 2 € (Margarita 12,50 → 11,50; 4 Quesos 15,00 → 13,90; Carbonara 15,00 → 13,50; De la Sierra 17,00 → 15,00), y hay cuatro más sueltos (Chorizo 12 → 11, Surtido de croquetas 14 → 15, Gyozas de verdura 10 → 12, Pulpo a la gallega 22 → 20). La Tarea 11 le pasa la lista completa antes de aplicar nada.
- El correo de Daniel para darle acceso al panel.
- Los datos fiscales de Daniel para la página de privacidad, que hoy lleva huecos marcados.
- Confirmar que el WhatsApp del restaurante sigue siendo el +34 858 893 777.

## 8b. Cómo se ejecuta SQL en Supabase desde aquí

Claude Code no tiene las claves: el SQL se pega en el editor SQL del proyecto desde el Chrome de Dan (Claude in Chrome), copiándolo al portapapeles con `pbcopy`. **Siempre con `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pbcopy < archivo.sql`**: el 24 de octubre la primera carga entró con las tildes y los emojis rotos ("Jam√≥n") porque el terminal no tenía la codificación puesta, y hubo que borrar y recargar los datos. Comprobar después con una consulta que devuelva un nombre con tilde y un emoji.

## 9. Lo que hay que saber del Excel de LastApp

Medido contra el export real del 23 de octubre (`~/Downloads/Products-23-10-2026.csv`, 197 productos), que es el fixture de las pruebas:

- **Ninguno de los dos formatos de export trae los idiomas.** El de productos tiene `Id, Name, Price, Description, Image URL`; el de catálogo tiene `ID del producto en el catálogo, ID del producto en la organización, Categoría, Nombre, Precio, Descripción`. La carta traducida vive dentro de LastApp, no sale en el Excel. Cuando llegue la fase de idiomas habrá que sacarla de la API de LastApp —la web ya habla con `api.last.app/v2` en `api/_lastapp.js`— o de donde Dan decida.
- **Solo 23 de los 48 platos de la web coinciden por nombre exacto.** Los otros 25 hay que vincularlos a mano: en LastApp las pizzas van con prefijo ("Pizza Margarita" frente a "Margarita") y hay nombres que no se parecen en nada.
- **Hay nombres repetidos con precios distintos**: "pulpo a la gallega" está a 20 y a 30 €, "chupito" a 2 y a 1,50 €, "tinto de verano pinta" tres veces. **La llave es siempre el Id**, nunca el nombre.
- El Excel mezcla los platos con bebidas, licores, cafés y extras: de las 197 filas, unas 141 no van en la web.

## 10. Siguiente fase, ya decidida y sin diseñar

Dan lo decidió el 23 de octubre y está apuntado en el PRD, en el apartado "Pendiente de diseñar más adelante". No se diseña hasta que él lo diga:

- **El aviso del día en la web.** Un recuadro que Daniel escribe desde el panel y sale arriba en la web, como la franja de oferta de una tienda: que hoy cierra, que hay fiesta, que hay promoción. Con fechas opcionales y apagado automático.
- **El panel guardado en el móvil, con avisos al teléfono** cuando entra una consulta. En iPhone solo funciona si antes se guarda el panel en la pantalla de inicio y se da permiso; en Android, sin esa condición. No cuesta dinero.

## 11. Siguiente paso

1. Decisión de Dan sobre qué hace la importación de LastApp ahora que los precios son siempre los de la carta (Tarea 11), y el cambio de código que salga de ahí.
2. Vinculación inicial con LastApp y la lista de precios para que Dan la confirme (Tarea 11). `uploads/panel-demo.json` sigue con la carta vieja: es solo la muestra del diseño y no afecta a nada real; se regenera cuando toque.
3. Guía para Daniel (Tarea 14) y publicación con el OK de Dan (Tarea 15). **Ojo:** en cuanto `api/carta.js` llegue a `main`, la web pública pasa a enseñar la carta de la base de datos (la de octubre, ya cargada).
