// Recepción de las consultas de actividades que llegan desde la web.
// El manejador de Vercel (api/consulta.js) solo llama a procesarConsulta().
import { supa, rest } from './supa.js';
import { telefonoWa } from './telefono.js';
import { IDIOMAS, limpiarTexto } from './idiomas.js';
import { respuestaConsulta } from './mensajes.js';
import { enviarCorreo, plantilla, boton, esc } from './correo.js';

export const TIEMPO_MINIMO_MS = 3000;       // menos de 3 s rellenando: bot
export const MAX_POR_TELEFONO_24H = 3;
export const PERSONAS = ['1', '2', '3', '4', '5+'];

const DEMASIADAS = {
  es: 'Ya tenemos tus consultas de hoy. Te contestamos por WhatsApp en cuanto podamos.',
  en: "We already have your enquiries from today. We'll reply on WhatsApp as soon as we can.",
  fr: 'Nous avons déjà vos demandes du jour. Nous vous répondons sur WhatsApp dès que possible.',
  ca: 'Ja tenim les teves consultes d’avui. Et responem per WhatsApp tan aviat com puguem.',
};

/** Hoy en Madrid, como 'YYYY-MM-DD'. */
export const hoyMadrid = (ahora = Date.now()) => new Date(ahora).toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });

export function validarConsulta(body, hoyISO) {
  const b = body && typeof body === 'object' ? body : {};
  const errores = [];
  const nombre = limpiarTexto(b.nombre, 80);
  if (!nombre) errores.push('Falta el nombre.');
  const wa = telefonoWa(b.telefono);
  if (!wa) errores.push('El teléfono no parece válido.');
  const personas = String(b.personas || '');
  if (!PERSONAS.includes(personas)) errores.push('El número de personas no es válido.');
  if (b.privacidad !== true) errores.push('Hay que aceptar la política de privacidad.');
  const fecha = String(b.fecha || '').trim();
  if (fecha && (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < hoyISO)) errores.push('La fecha no es válida.');
  const idioma = IDIOMAS.includes(b.idioma) ? b.idioma : 'es';
  return { errores, datos: { actividad_id: String(b.actividad_id || ''), nombre, telefono: wa ? '+' + wa : '', fecha: fecha || null, personas, idioma } };
}

export function esSpam(body, ahora = Date.now()) {
  if (body && body.hp) return 'trampa';
  const t0 = Number(body && body.t_inicio);
  if (t0 && ahora - t0 < TIEMPO_MINIMO_MS) return 'demasiado rápido';
  return null;
}

const ajustesAObjeto = (rows) => Object.fromEntries((rows || []).map((r) => [r.clave, r.valor]));

export async function procesarConsulta({ body, env, fetch, ahora = Date.now(), log = () => {} }) {
  const s = supa(env);
  if (!s) return { status: 502, body: { ok: false, error: 'Sin base de datos.' } };
  const spam = esSpam(body, ahora);
  if (spam) { log('consulta descartada:', spam); return { status: 200, body: { ok: true } }; }
  const { errores, datos } = validarConsulta(body, hoyMadrid(ahora));
  if (errores.length) return { status: 400, body: { ok: false, error: errores[0] } };
  try {
    const [act] = await rest(s, fetch, `actividades?select=id,nombre&id=eq.${encodeURIComponent(datos.actividad_id)}&visible=eq.true&archivada=eq.false`) || [];
    if (!act) return { status: 400, body: { ok: false, error: 'Esa actividad ya no está disponible.' } };
    const desde = new Date(ahora - 86400000).toISOString();
    const previas = await rest(s, fetch, `consultas?select=id&telefono=eq.${encodeURIComponent(datos.telefono)}&recibida_en=gte.${encodeURIComponent(desde)}`);
    if ((previas || []).length >= MAX_POR_TELEFONO_24H) return { status: 429, body: { ok: false, error: DEMASIADAS[datos.idioma] } };
    const [fila] = await rest(s, fetch, 'consultas?select=id', { method: 'POST', prefer: 'return=representation', body: {
      actividad_id: act.id, actividad_nombre: act.nombre.es, nombre: datos.nombre, telefono: datos.telefono, fecha: datos.fecha,
      personas: datos.personas, idioma: datos.idioma, acepta_privacidad_en: new Date(ahora).toISOString(), estado: 'nueva',
    } });
    await rest(s, fetch, 'historial', { method: 'POST', prefer: 'return=minimal', body: { quien: 'web', accion: `Nueva consulta de ${datos.nombre}: ${act.nombre.es}`, tabla: 'consultas', registro_id: fila && fila.id } }).catch(() => {});
    const aj = ajustesAObjeto(await rest(s, fetch, 'ajustes?select=clave,valor&clave=in.(aviso_consultas_correo,correos_aviso,nombre_gestor)'));
    const para = Array.isArray(aj.correos_aviso) ? aj.correos_aviso : [];
    if (aj.aviso_consultas_correo !== false && para.length && fila) {
      try {
        const actividad = act.nombre[datos.idioma] || act.nombre.es;
        const respuesta = respuestaConsulta({ nombre: datos.nombre, actividad, fecha: datos.fecha, gestor: aj.nombre_gestor || 'Daniel' }, datos.idioma);
        const wa = `https://wa.me/${datos.telefono.slice(1)}?text=${encodeURIComponent(respuesta)}`;
        await enviarCorreo(fetch, env, { para, asunto: `Nueva consulta: ${act.nombre.es} · ${datos.nombre}`, html: plantilla(`<h2 style="font-weight:normal;margin:0 0 8px">Nueva consulta de ${esc(datos.nombre)}</h2>
<p style="margin:0 0 6px"><strong>${esc(act.nombre.es)}</strong>${datos.fecha ? ` · ${esc(datos.fecha)}` : ''} · ${esc(datos.personas)} ${datos.personas === '1' ? 'persona' : 'personas'} · idioma: ${esc(datos.idioma)}</p>
<p style="margin:0 0 18px">Teléfono: ${esc(datos.telefono)}</p>
${boton(wa, 'Contestar por WhatsApp')}`) });
        await rest(s, fetch, `consultas?id=eq.${fila.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { aviso_enviado: true } });
      } catch (e) { log('aviso de consulta no enviado:', e.message); }
    }
    return { status: 200, body: { ok: true } };
  } catch (e) {
    log('consulta: fallo de base de datos', e.message);
    return { status: 502, body: { ok: false, error: 'No hemos podido guardar la consulta.' } };
  }
}
