# Backend y panel de Los Trotamundos — estado del proyecto

Última actualización: 24 de octubre de 2026, por la noche. **Este archivo es el punto de entrada.** Si abres una conversación nueva sobre este proyecto, lee esto primero y después `docs/diseno-funcional.md`. Lo que diga este archivo manda sobre lo que digan los demás, porque es lo único que se mantiene al día.

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
| Precio | **Dos métodos.** Plato vinculado a un producto de LastApp: el precio lo manda LastApp y el panel no lo edita. Plato subido a mano: el precio lo pone Daniel y ninguna importación lo toca. "Quitar el vínculo con LastApp" (`plato.desvincular`) pasa un plato del primero al segundo. No hay interruptor de "precio fijo" |
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
| Datos iniciales (`supabase/002`) | **Hay que regenerarlos con la carta de octubre**, no con la web. `tools/genera-sql-inicial.mjs` hoy lee `index.html`; tiene que pasar a leer la carta nueva y conservar los textos en los otros idiomas de los platos que ya existen. Espera las respuestas de `carta-2026-10.md` |
| Tarea 3 · Base de datos (`supabase/001`, `002`), latido de Vercel y de GitHub | `001` **ejecutado el 24 de octubre** en el proyecto `trotamundos` de Supabase (ref `tirnsyngbulmldodrrxb`, organización `trotamundos`, desde el Chrome de Dan): 11 tablas con RLS, `latir`, bucket `fotos`, ajustes sembrados. Dan dado de alta en `administradores` con `supabase/local-administradores.sql` (no versionado). `002` sin ejecutar (ver fila anterior). Latidos sin probar |
| Tarea 4 · Entrada al panel con enlace al correo | Escrita, sin probar de verdad (falta Resend) |
| Tarea 5 · Carta pública desde la base de datos | Escrita |
| Tarea 6 · Actividades públicas desde la base de datos | Escrita |
| Tarea 7 · Consultas: panel y WhatsApp a la vez, más `/privacidad` | Escrita |
| Tarea 8 · Traducción automática | **Retirada** por decisión de Dan |
| Tarea 9 · Datos y acciones del panel | Escrita |
| Tarea 10 · Importación del Excel de LastApp con vista previa | Escrita. `003` **ejecutado el 24 de octubre** (función `aplicar_importacion` creada). Sin probar con datos |
| Tarea 11 · Vinculación inicial con LastApp | **Sin empezar.** Espera el export de catálogo y, sobre todo, el OK de Dan a los precios que van a cambiar |
| Tarea 12 · Importar y conectar el panel de Claude Design | **Sin empezar.** El diseño ya está hecho; falta traerlo y conectarlo. Comprobado el 24 de octubre: la herramienta DesignSync solo lista proyectos de *sistema de diseño* (Nocturne, Classical, Organic, Design System), no el proyecto del panel. Hace falta que Dan haga *Hand off to Claude Code* o exporte el `.dc.html` y lo deje en `~/Downloads` (ahí solo está `Brandbook Los Trotamundos.dc.html`) |
| Tarea 13 · Tarea diaria (latido, anonimizado, limpieza) | Escrita |
| Tarea 14 · Verificación en la vista previa y guía para Daniel | Sin empezar |
| Tarea 15 · Publicación | Sin empezar |

El panel va todo en **una sola función de Vercel** (`api/panel/[ruta].js` + `lib/rutas-panel.js`), porque el plan gratuito admite doce funciones por despliegue y no caben de otra forma.

## 7. Lo que tiene que hacer Dan

Comprobado el 24 de octubre por la noche:

- [x] **Supabase.** Proyecto `trotamundos` creado. Esquema cargado.
- [x] **Vercel**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM` y `CRON_SECRET` están puestas… **pero solo en Production y Development, no en Preview.** Sin Preview, la vista previa de la rama `backend-panel` (`trotamundos-web-git-backend-panel-….vercel.app`, protegida con inicio de sesión de Vercel) no tiene base de datos y el panel no se puede probar ahí. Se arregla marcando también Preview en cada variable.
- [ ] **Resend.** La clave está en Vercel. Sin comprobar si el dominio `lostrotamundosalpujarra.com` está verificado: se verá al pedir el primer enlace de entrada. Ojo con IONOS: añade el dominio él solo, así que en el nombre del registro va solo la parte de delante (`resend._domainkey`, no el nombre entero).
- [ ] **GitHub** → Settings → Secrets → Actions: `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`. Es solo el latido de respaldo; no corre prisa.
- [ ] **Claude Design:** exportar el panel (*Hand off to Claude Code* o descarga del `.dc.html`) y dejarlo en `~/Downloads`. DesignSync no llega a ese proyecto (ver Tarea 12).
- [ ] **Responder las preguntas de `carta-2026-10.md`** (pestañas de "De todas partes", dos precios de hamburguesas, Shakshuka, Margaritas repetidas, postres).
- [ ] **OK para pasar el repositorio a privado** cuando se publique.
- [ ] **Subir la rama** `backend-panel`: hay commits en local sin subir.

## 8. Datos que faltan

- **El export de catálogo de LastApp**, el que trae la columna `Categoría`. El que hay en `~/Downloads` está vacío. Con él los platos nuevos llegan clasificados. (Postres: la carta de octubre no los trae, así que de momento no se crea la pestaña; ver `carta-2026-10.md`.)
- **El OK de Daniel a los precios.** Manda LastApp, y eso baja precios en la web en la primera importación. Medido con el export del 23 de octubre: las pizzas caen entre 1 y 2 € (Margarita 12,50 → 11,50; 4 Quesos 15,00 → 13,90; Carbonara 15,00 → 13,50; De la Sierra 17,00 → 15,00), y hay cuatro más sueltos (Chorizo 12 → 11, Surtido de croquetas 14 → 15, Gyozas de verdura 10 → 12, Pulpo a la gallega 22 → 20). La Tarea 11 le pasa la lista completa antes de aplicar nada.
- El correo de Daniel para darle acceso al panel.
- Los datos fiscales de Daniel para la página de privacidad, que hoy lleva huecos marcados.
- Confirmar que el WhatsApp del restaurante sigue siendo el +34 858 893 777.

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

Con las respuestas de Dan a `carta-2026-10.md`:

1. Rehacer `tools/genera-sql-inicial.mjs` para que lea la carta de octubre (con los textos en los otros idiomas que la web ya tiene para los platos que siguen), regenerar `002` y cargarlo en el editor SQL desde el Chrome de Dan. Comprobar categorías, platos y 3 actividades. Regenerar `uploads/panel-demo.json` con la carta nueva.
2. Marcar Preview en las variables de Vercel (lo hace Dan, o Claude con su OK) y comprobar `/api/carta` en la vista previa de la rama.
3. Llevar las tareas 1 a 3 a `main` (no cambian nada visible) y comprobar que producción sigue igual. **Ojo:** en cuanto `api/carta.js` llegue a `main` con la base de datos cargada, la web pública pasa a enseñar la carta de la base de datos. Por eso `002` tiene que estar cargado y revisado antes.
4. Importar el panel de Claude Design, escribir el puente y conectarlo (Tarea 12).
5. Vinculación inicial con LastApp y la lista de precios para que Dan la confirme (Tarea 11).
6. Recorrido completo en la vista previa de Vercel y guía para Daniel (Tarea 14). Publicar solo con el OK de Dan (Tarea 15).
