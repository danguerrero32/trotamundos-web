// Escribe supabase/002_datos_iniciales.sql con la carta impresa de octubre de 2026 (tools/carta-2026-10.json),
// más las tres actividades, que siguen saliendo de index.html.
// De index.html se heredan también, plato a plato, las traducciones (en, fr, ca) y el emoji de los platos que ya
// existían en la web, localizados por el campo "antes" del JSON (su nombre español de hoy en la web).
// Idempotente: los platos llevan un id fijo (md5 de categoría y orden) y todo va con "on conflict do nothing".
// Uso: node tools/genera-sql-inicial.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extraerCarta } from './extrae-carta.mjs';

const IDIOMAS = ['es', 'en', 'fr', 'ca'];
const CAMPOS = ['nombre', 'descripcion', 'nota_precio'];

// Un campo multiidioma del plato de la carta, completado con lo que la web ya tenía escrito.
// Regla: si el español no ha cambiado respecto a la web, se heredan en/fr/ca de la web (salvo que el JSON ya
// traiga algo en ese idioma). Si el español cambia, se queda lo que diga el JSON: su inglés, y fr/ca vacíos.
// Un idioma con valor null en el JSON se deja vacío siempre (sirve para no heredar un inglés copiado por error).
function completarCampo(delJson = {}, delWeb) {
  const out = {};
  const mismoEspanol = delWeb && (delJson.es || '') === (delWeb.es || '');
  for (const l of IDIOMAS) {
    if (delJson[l] === null) { out[l] = ''; continue; }
    out[l] = delJson[l] || (mismoEspanol && l !== 'es' ? delWeb[l] || '' : '');
  }
  return out;
}

export function cartaInicial({ carta, web }) {
  const webPorId = Object.fromEntries(web.categorias.map((c) => [c.id, c]));
  const categorias = carta.categorias.map((c) => ({
    id: c.id,
    nombre: completarCampo(c.nombre, webPorId[c.id]?.nombre),
    orden: c.orden,
  }));

  const webPorNombre = Object.fromEntries(web.platos.map((p) => [p.nombre.es, p]));
  const platos = carta.platos.map((p) => {
    const anterior = p.antes ? webPorNombre[p.antes] : undefined;
    if (p.antes && !anterior) throw new Error(`"${p.nombre.es}": no encuentro en index.html el plato "${p.antes}"`);
    const plato = { categoria: p.categoria, orden: p.orden };
    for (const campo of CAMPOS) plato[campo] = completarCampo(p[campo], anterior?.[campo]);
    plato.precio = p.precio || '';
    plato.emoji = p.emoji || anterior?.emoji || '';
    return plato;
  });

  return { categorias, platos, actividades: web.actividades };
}

export function generarSql({ categorias, platos, actividades }) {
  const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
  const json = (o) => `${lit(JSON.stringify(o))}::jsonb`;

  const filasCategorias = categorias.map((c) => `  (${lit(c.id)}, ${json(c.nombre)}, ${c.orden})`);
  const filasPlatos = platos.map((p) => `  (md5(${lit(`plato:${p.categoria}:${p.orden}`)})::uuid, ${lit(p.categoria)}, ${json(p.nombre)}, ${json(p.descripcion)}, ${json(p.nota_precio)}, ${p.precio === '' ? 'null' : p.precio}, ${lit(p.emoji)}, ${p.orden})`);
  const filasActividades = actividades.map((a) => `  (${lit(a.id)}, ${lit(a.emoji)}, ${json(a.nombre)}, ${json(a.descripcion)}, ${lit(a.foto)}, ${lit(a.encuadre)}, ${a.orden})`);

  return `-- Los Trotamundos · 002 · datos iniciales: la carta impresa de octubre de 2026 y las actividades de la web.
-- Generado por tools/genera-sql-inicial.mjs a partir de tools/carta-2026-10.json (la carta, transcrita en
-- docs/carta-2026-10.md) e index.html (las actividades, y las traducciones y emojis de los platos que ya estaban
-- en la web). No editar a mano. Idempotente.
-- Los platos que ya tenía la web conservan sus textos en inglés, francés y catalán; los nuevos y los que cambian
-- llevan español e inglés cuando la carta lo trae. Un idioma vacío hace que la web enseñe el español.
-- El panel solo edita el español; las otras no se tocan ni se borran.

insert into categorias (id, nombre, orden) values
${filasCategorias.join(',\n')}
on conflict (id) do nothing;

insert into platos (id, categoria_id, nombre, descripcion, nota_precio, precio, emoji, orden) values
${filasPlatos.join(',\n')}
on conflict (id) do nothing;

insert into actividades (id, emoji, nombre, descripcion, foto, encuadre, orden) values
${filasActividades.join(',\n')}
on conflict (id) do nothing;
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raiz = new URL('../', import.meta.url);
  const carta = JSON.parse(await readFile(new URL('tools/carta-2026-10.json', raiz), 'utf8'));
  const web = extraerCarta(await readFile(new URL('index.html', raiz), 'utf8'));
  const datos = cartaInicial({ carta, web });
  await writeFile(new URL('supabase/002_datos_iniciales.sql', raiz), generarSql(datos));
  console.log(`002_datos_iniciales.sql: ${datos.categorias.length} categorías, ${datos.platos.length} platos, ${datos.actividades.length} actividades`);
}
