# Kit de arranque — backend de Los Trotamundos

Lo que tienes que hacer tú para que yo pueda seguir. Puedes hacerlo mientras construyo; cuando termines cada punto, dímelo en el chat.

Unos 30 minutos. Las claves no se pegan en el chat.

- **D1. Supabase.** Crear el proyecto `trotamundos` en West EU (París). Si no deja por el límite de dos gratuitos, crear una organización nueva o usar una cuenta del restaurante. En Vercel → `trotamundos-web` → Settings → Environment Variables (Production y Preview): `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (la clave secreta). En GitHub → `trotamundos-web` → Settings → Secrets → Actions: `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` (la clave pública). Avisar cuando esté.
- **D2. Resend.** En tu cuenta actual, Domains → Add `lostrotamundosalpujarra.com` y copiar sus registros DNS en IONOS. Crear una API key y ponerla en Vercel como `RESEND_API_KEY`. Hasta que el dominio esté verificado, los enlaces del panel solo llegan a tu correo.
- **Anthropic:** nada. En este encargo no se llama a ninguna API de pago.
- **`CRON_SECRET`** en Vercel: cualquier cadena larga.
- **D4.** El correo de Daniel para el panel.
- **D5.** El export de productos ya lo tengo (`Products-23-10-2026.csv`, 197 productos). Falta el **export de catálogo**, el que trae la columna `Categoría`: el que hay en `~/Downloads` está vacío. Con él, los platos nuevos llegan ya con su categoría y se puede crear la pestaña de Postres, que la web no tiene y LastApp sí (torrija, coulant, tartas, tiramisú). Y una captura de dónde se saca, para el texto de ayuda del panel.
- **D6.** OK para pasar el repositorio a privado al publicar.
- **D7. Claude Design.** Seguir las instrucciones del principio de `docs/prd-panel-claude-design.md` y, al acabar, pulsar *Hand off to Claude Code* y pegarme el texto.
