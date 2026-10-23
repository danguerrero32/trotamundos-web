# Kit de arranque — backend de Los Trotamundos

Lo que tienes que hacer tú para que yo pueda seguir. Puedes hacerlo mientras construyo; cuando termines cada punto, dímelo en el chat.

Unos 30 minutos. Las claves no se pegan en el chat.

- **D1. Supabase.** Crear el proyecto `trotamundos` en West EU (París). Si no deja por el límite de dos gratuitos, crear una organización nueva o usar una cuenta del restaurante. En Vercel → `trotamundos-web` → Settings → Environment Variables (Production y Preview): `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (la clave secreta). En GitHub → `trotamundos-web` → Settings → Secrets → Actions: `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` (la clave pública). Avisar cuando esté.
- **D2. Resend.** En tu cuenta actual, Domains → Add `lostrotamundosalpujarra.com` y copiar sus registros DNS en IONOS. Crear una API key y ponerla en Vercel como `RESEND_API_KEY`. Hasta que el dominio esté verificado, los enlaces del panel solo llegan a tu correo.
- **Anthropic:** nada. En este encargo no se llama a Claude.
- **`CRON_SECRET`** en Vercel: cualquier cadena larga.
- **D4.** El correo de Daniel para el panel.
- **D5.** Un export nuevo de LastApp en los dos formatos (productos y catálogo de sala) en `~/Downloads`, y una captura de dónde se saca cada uno. Si sabes si Daniel tiene precios distintos por catálogo, dímelo.
- **D6.** OK para pasar el repositorio a privado al publicar.
- **D7. Claude Design.** Seguir las instrucciones del principio de `docs/prd-panel-claude-design.md` y, al acabar, pulsar *Hand off to Claude Code* y pegarme el texto.
