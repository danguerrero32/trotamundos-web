// Correo con Resend por HTTP. Mientras el dominio no esté verificado, el remitente es el de pruebas
// de Resend y solo llega al correo de la cuenta de Resend (el de Dan).
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function enviarCorreo(fetch, env, { para, asunto, html }) {
  if (!env.RESEND_API_KEY) throw new Error('sin RESEND_API_KEY');
  const from = env.RESEND_FROM || 'Los Trotamundos <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: para, subject: asunto, html }),
  });
  if (!res.ok) throw new Error(`resend ${res.status} ${await res.text()}`);
}

/** Envoltorio de los correos, con los colores de la marca. */
export const plantilla = (cuerpo) => `<div style="font:16px/1.55 Georgia,serif;color:#1C1510;max-width:560px">${cuerpo}</div>`;
export const boton = (href, texto) => `<p><a href="${esc(href)}" style="display:inline-block;padding:12px 20px;background:#EDAF8C;color:#0B0907;text-decoration:none;border-radius:8px">${esc(texto)}</a></p>`;
