// Entrada al panel sin contraseña: enlace al correo de un solo uso y sesión de 90 días que se renueva con el uso.
// Mismo diseño que el panel de Ascua de Oro. Solo se guarda el hash de cada token.
import { createHash, randomBytes } from 'node:crypto';
import { rest } from './supa.js';
import { enviarCorreo, plantilla, boton, esc } from './correo.js';

export const COOKIE = 'trotamundos_panel';
export const DIAS_SESION = 90;
export const MINUTOS_ENLACE = 30;

export const hashToken = (t) => createHash('sha256').update(String(t)).digest('hex');
export const tokenNuevo = () => randomBytes(32).toString('base64url');

export function leerCookie(header, nombre = COOKIE) {
  for (const parte of String(header || '').split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nombre) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function cookieSesion(token, { borrar = false } = {}) {
  const maxAge = borrar ? 0 : DIAS_SESION * 86400;
  return `${COOKIE}=${borrar ? '' : encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export async function esAdministrador(s, fetch, email) {
  const rows = await rest(s, fetch, `administradores?select=email,nombre&activo=eq.true&email=eq.${encodeURIComponent(email)}`);
  return rows && rows[0] ? rows[0] : null;
}

/** Crea un enlace de entrada y lo manda por correo. Responde igual esté o no autorizado el correo. */
export async function pedirEnlace({ s, fetch, env, email, origen, ahora = Date.now(), log = () => {} }) {
  const correo = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return { ok: false, error: 'Correo no válido' };
  const admin = await esAdministrador(s, fetch, correo);
  if (!admin) { log('entrada: correo no autorizado', correo); return { ok: true }; }
  const token = tokenNuevo();
  await rest(s, fetch, 'sesiones_panel', { method: 'POST', prefer: 'return=minimal', body: {
    token_hash: hashToken(token), email: correo, tipo: 'enlace', caduca_en: new Date(ahora + MINUTOS_ENLACE * 60000).toISOString(),
  } });
  const enlace = `${origen}/api/panel/sesion?t=${token}`;
  const nombre = admin.nombre ? esc(admin.nombre.split(' ')[0]) : '';
  const html = plantilla(`<h2 style="font-weight:normal;margin:0 0 8px">Tu enlace para entrar al panel</h2>
<p style="margin:0 0 18px">Hola, ${nombre}. Pulsa el botón desde el móvil o el ordenador en el que vayas a usar el panel. Vale durante ${MINUTOS_ENLACE} minutos y una sola vez.</p>
${boton(enlace, 'Entrar al panel')}
<p style="margin-top:18px;color:#8A7A62;font-size:13px">Si no has pedido este enlace, no hace falta que hagas nada.</p>`);
  await enviarCorreo(fetch, env, { para: [correo], asunto: 'Tu enlace para entrar al panel · Los Trotamundos', html });
  return { ok: true };
}

/** Canjea un enlace por una sesión. Devuelve el token de sesión o null. */
export async function canjearEnlace({ s, fetch, token, agente, ahora = Date.now() }) {
  if (!token) return null;
  const rows = await rest(s, fetch, `sesiones_panel?select=id,email,caduca_en,usado_en&tipo=eq.enlace&token_hash=eq.${hashToken(token)}`);
  const e = rows && rows[0];
  if (!e || e.usado_en || new Date(e.caduca_en).getTime() < ahora) return null;
  await rest(s, fetch, `sesiones_panel?id=eq.${e.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { usado_en: new Date(ahora).toISOString() } });
  const sesion = tokenNuevo();
  await rest(s, fetch, 'sesiones_panel', { method: 'POST', prefer: 'return=minimal', body: {
    token_hash: hashToken(sesion), email: e.email, tipo: 'sesion', caduca_en: new Date(ahora + DIAS_SESION * 86400000).toISOString(),
    ultimo_uso: new Date(ahora).toISOString(), agente: String(agente || '').slice(0, 200),
  } });
  return sesion;
}

/** {email, nombre} si la cookie corresponde a una sesión viva de alguien con acceso; renueva la caducidad con el uso. */
export async function sesionActual({ s, fetch, cookieHeader, ahora = Date.now() }) {
  const token = leerCookie(cookieHeader);
  if (!token) return null;
  const rows = await rest(s, fetch, `sesiones_panel?select=id,email,caduca_en,ultimo_uso&tipo=eq.sesion&token_hash=eq.${hashToken(token)}`);
  const se = rows && rows[0];
  if (!se || new Date(se.caduca_en).getTime() < ahora) return null;
  const admin = await esAdministrador(s, fetch, se.email);
  if (!admin) return null;
  if (!se.ultimo_uso || ahora - new Date(se.ultimo_uso).getTime() > 3600000) {
    await rest(s, fetch, `sesiones_panel?id=eq.${se.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { ultimo_uso: new Date(ahora).toISOString(), caduca_en: new Date(ahora + DIAS_SESION * 86400000).toISOString() } }).catch(() => {});
  }
  return { email: se.email, nombre: admin.nombre || se.email };
}

export async function cerrarSesion({ s, fetch, cookieHeader }) {
  const token = leerCookie(cookieHeader);
  if (!token) return;
  await rest(s, fetch, `sesiones_panel?tipo=eq.sesion&token_hash=eq.${hashToken(token)}`, { method: 'DELETE', prefer: 'return=minimal' }).catch(() => {});
}
