// Escribe supabase/002_datos_iniciales.sql con la carta, las categorías y las actividades de hoy,
// sacadas de index.html, para que el primer día la web enseñe exactamente lo mismo que ahora.
// Idempotente: los platos llevan un id fijo (md5 de categoría y orden) y todo va con "on conflict do nothing".
// Uso: node tools/genera-sql-inicial.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { extraerCarta } from './extrae-carta.mjs';

const raiz = new URL('../', import.meta.url);
const { categorias, platos, actividades } = extraerCarta(await readFile(new URL('index.html', raiz), 'utf8'));

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const json = (o) => `${lit(JSON.stringify(o))}::jsonb`;
const TRADUCCION = json({ pendiente: false, manual: [] });

const filasCategorias = categorias.map((c) => `  (${lit(c.id)}, ${json(c.nombre)}, ${c.orden})`);
const filasPlatos = platos.map((p) => `  (md5(${lit(`plato:${p.categoria}:${p.orden}`)})::uuid, ${lit(p.categoria)}, ${json(p.nombre)}, ${json(p.descripcion)}, ${json(p.nota_precio)}, ${p.precio === '' ? 'null' : p.precio}, ${lit(p.emoji)}, ${p.orden}, ${TRADUCCION})`);
const filasActividades = actividades.map((a) => `  (${lit(a.id)}, ${lit(a.emoji)}, ${json(a.nombre)}, ${json(a.descripcion)}, ${lit(a.foto)}, ${lit(a.encuadre)}, ${a.orden}, ${TRADUCCION})`);

const sql = `-- Los Trotamundos · 002 · datos iniciales: la carta y las actividades que hoy tiene la web.
-- Generado por tools/genera-sql-inicial.mjs a partir de index.html. No editar a mano. Idempotente.

insert into categorias (id, nombre, orden) values
${filasCategorias.join(',\n')}
on conflict (id) do nothing;

insert into platos (id, categoria_id, nombre, descripcion, nota_precio, precio, emoji, orden, traduccion) values
${filasPlatos.join(',\n')}
on conflict (id) do nothing;

insert into actividades (id, emoji, nombre, descripcion, foto, encuadre, orden, traduccion) values
${filasActividades.join(',\n')}
on conflict (id) do nothing;
`;

await writeFile(new URL('supabase/002_datos_iniciales.sql', raiz), sql);
console.log(`002_datos_iniciales.sql: ${categorias.length} categorías, ${platos.length} platos, ${actividades.length} actividades`);
