// Traducción automática de platos, categorías y actividades al inglés, francés y catalán.
// Queda preparada y APAGADA: con el ajuste traduccion_automatica en false (o sin clave) no se llama a Claude;
// lo nuevo o cambiado se marca como pendiente y la web lo enseña en español en los cuatro idiomas.
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { MODELO } from './claude.js';
import { rest } from './supa.js';
import { OTROS } from './idiomas.js';

export const CAMPOS = { platos: ['nombre', 'descripcion', 'nota_precio'], categorias: ['nombre'], actividades: ['nombre', 'descripcion'] };

// Ejemplos de la carta de hoy, para que la traducción mantenga el estilo de la casa.
const EJEMPLOS = [
  ['Choto', 'Kid Goat Stew', 'Chevreau', 'Cabrit'], ['Migas Alpujarreñas', 'Alpujarra Migas', 'Migas Alpujarreñas', 'Migues Alpujarrenyes'],
  ['Costilla en orza', 'Preserved Pork Ribs', 'Côtes de porc confites', 'Costella en orça'], ['Plato Alpujarreño', 'Alpujarra Plate', 'Assiette Alpujarreña', 'Plat Alpujarrenyo'],
  ['Chuletas Segureñas', 'Segureño Lamb Chops', "Côtelettes d'agneau Segureño", 'Costelles Segurenyes'], ['Pan Bao — Pulled pork', 'Bao Bun — Pulled Pork', 'Pain Bao — Pulled pork', 'Pa Bao — Pulled pork'],
  ['Jamón Gran Reserva', 'Reserve Ham', 'Jambon Gran Reserva', 'Pernil Gran Reserva'], ['Surtido de croquetas', 'Assorted Croquettes', 'Assortiment de croquettes', 'Assortiment de croquetes'],
  ['Ternera con ciruelas', 'Beef with Prunes', 'Bœuf aux pruneaux', 'Vedella amb prunes'], ['Bacalao Trotamundos', 'Trotamundos Cod', 'Morue Trotamundos', 'Bacallà Trotamundos'],
  ['Langostinos al pilpil', 'Sizzling Prawns', 'Crevettes au pil pil', 'Llagostins al pilpil'], ['Hamburguesa de cabra', 'Goat Cheese Burger', 'Burger au fromage de chèvre', 'Hamburguesa de cabra'],
];

const SISTEMA = `Traduces la carta y las actividades de Los Trotamundos, un bar restaurante de Bubión (La Alpujarra, Granada), del español al inglés, al francés y al catalán, para la web del restaurante.
Mantén el tono de la casa: cálido, sencillo y honesto, sin adornos. Respeta los nombres propios y de marca (Trotamundos, Diego Martín, Abuela ili, Bubión, Sierra Nevada, La Alpujarra) y las notas cortas como "por unidad" o "(confirmar)".
Ejemplos de cómo se traducen ya los platos (español | inglés | francés | catalán):
${EJEMPLOS.map((e) => e.join(' | ')).join('\n')}
Recibirás una lista JSON de piezas {clave, campo, es}. Devuelve una entrada por pieza con la misma clave y campo y su traducción en en, fr y ca.`;

const Respuesta = z.object({ elementos: z.array(z.object({ clave: z.string(), campo: z.string(), en: z.string(), fr: z.string(), ca: z.string() })) });

/** elementos: [{clave, textos: {campo: textoEnEspañol}}] → {clave: {campo: {en, fr, ca}}}. Una sola llamada por lote. */
export async function traducirLote({ client, elementos }) {
  const piezas = elementos.flatMap((e) => Object.entries(e.textos || {})
    .filter(([, t]) => String(t || '').trim())
    .map(([campo, es]) => ({ clave: e.clave, campo, es: String(es).trim() })));
  if (!piezas.length) return {};
  const res = await client.messages.parse({
    model: MODELO,
    max_tokens: 8000,
    output_config: { effort: 'low', format: zodOutputFormat(Respuesta) },
    system: SISTEMA,
    messages: [{ role: 'user', content: JSON.stringify(piezas) }],
  });
  if (res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens' || !res.parsed_output) throw new Error(`traducción no válida (${res.stop_reason})`);
  const out = {};
  for (const r of res.parsed_output.elementos) (out[r.clave] ||= {})[r.campo] = { en: r.en, fr: r.fr, ca: r.ca };
  return out;
}

/** Lista traduccion.manual actualizada con cada campo.idioma distinto del español que traen los cambios. */
export function marcarManual(fila, cambios) {
  const manual = [...((fila && fila.traduccion && fila.traduccion.manual) || [])];
  for (const [campo, valor] of Object.entries(cambios || {})) {
    if (!valor || typeof valor !== 'object') continue;
    for (const l of OTROS) if (l in valor && !manual.includes(`${campo}.${l}`)) manual.push(`${campo}.${l}`);
  }
  return manual;
}

/** Aplica las traducciones a los campos de la fila, sin pisar las que Daniel escribió a mano. */
export function fusionar(fila, traducciones) {
  const manual = (fila.traduccion && fila.traduccion.manual) || [];
  const out = {};
  for (const [campo, porIdioma] of Object.entries(traducciones || {})) {
    out[campo] = { ...(fila[campo] || {}) };
    for (const l of OTROS) if (!manual.includes(`${campo}.${l}`) && porIdioma[l]) out[campo][l] = porIdioma[l];
  }
  return out;
}

const marcarPendiente = (s, fetch, tabla, fila, pendiente) => rest(s, fetch, `${tabla}?id=eq.${encodeURIComponent(fila.id)}`, {
  method: 'PATCH', prefer: 'return=minimal', body: { traduccion: { ...(fila.traduccion || { manual: [] }), pendiente } },
});

/** Traduce las filas si la traducción está encendida y hay cliente; si no, las deja pendientes. Nunca lanza. */
export async function traducirSiToca({ s, fetch, client, ajustes, tabla, filas }) {
  const lista = filas || [];
  if (!lista.length) return { traducidas: 0, pendientes: 0 };
  const encendida = ajustes && ajustes.traduccion_automatica === true && client;
  if (encendida) {
    try {
      const campos = CAMPOS[tabla] || ['nombre'];
      const out = await traducirLote({ client, elementos: lista.map((f) => ({ clave: f.id, textos: Object.fromEntries(campos.map((c) => [c, (f[c] && f[c].es) || ''])) })) });
      for (const f of lista) {
        await rest(s, fetch, `${tabla}?id=eq.${encodeURIComponent(f.id)}`, { method: 'PATCH', prefer: 'return=minimal', body: {
          ...fusionar(f, out[f.id] || {}), traduccion: { ...(f.traduccion || { manual: [] }), pendiente: false },
        } });
      }
      return { traducidas: lista.length, pendientes: 0 };
    } catch (e) {
      console.warn('[traducir]', e.message);
    }
  }
  for (const f of lista) await marcarPendiente(s, fetch, tabla, f, true).catch(() => {});
  return { traducidas: 0, pendientes: lista.length };
}
