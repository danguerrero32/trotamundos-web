import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { datosPanel, accion, slugify, aPrecio } from '../lib/panel.js';
import { S, AHORA, fakeFetch } from './_ayuda.js';

const demo = JSON.parse(await readFile(new URL('../uploads/panel-demo.json', import.meta.url), 'utf8'));
const QUIEN = { email: 'daniel@example.com', nombre: 'Daniel' };
const sinCliente = { messages: { parse: async () => { throw new Error('no debería llamarse'); } } };

const FILA_PLATO = { id: 'u1', categoria_id: 'carnes', nombre: { es: 'Choto', en: 'Kid Goat Stew', fr: 'Chevreau', ca: 'Cabrit' }, descripcion: { es: 'Guiso' }, nota_precio: {}, precio: 21, precio_fijo: false, emoji: '🐐', visible: true, archivado: false, orden: 8, lastapp_id: 'la-1', lastapp_nombre: 'Choto', traduccion: { pendiente: false, manual: [] } };

function rutasBase(extra = []) {
  return [
    ...extra,
    [/^platos\?select=\*&id=eq\./, { json: [FILA_PLATO] }],
    [/^ajustes/, { json: [{ clave: 'traduccion_automatica', valor: false }, { clave: 'nombre_gestor', valor: 'Daniel' }, { clave: 'whatsapp', valor: '+34858893777' }, { clave: 'correos_aviso', valor: [] }, { clave: 'aviso_consultas_correo', valor: true }] }],
  ];
}

test('aPrecio y slugify', () => {
  assert.equal(aPrecio('21,50'), 21.5);
  assert.equal(aPrecio('21.50 €'), 21.5);
  assert.equal(aPrecio(''), null);
  assert.throws(() => aPrecio('barato'), /precio/);
  assert.equal(slugify('Ruta de las Cañadas'), 'ruta-de-las-canadas');
});

test('datosPanel devuelve las mismas claves de primer nivel que uploads/panel-demo.json', async () => {
  const f = fakeFetch([
    [/^categorias/, { json: [{ id: 'carnes', nombre: { es: 'Carnes' }, orden: 5, visible: true, traduccion: { pendiente: false, manual: [] } }] }],
    [/^platos/, { json: [FILA_PLATO, { ...FILA_PLATO, id: 'u2', visible: false, lastapp_id: null }] }],
    [/^productos_lastapp/, { json: [{ id: 'la-1', precio: 18.9 }] }],
    [/^actividades/, { json: [{ id: 'caballo', emoji: '🐴', nombre: { es: 'Rutas a caballo', en: 'Horse riding routes' }, descripcion: {}, foto: 'img/c.jpg', encuadre: 'centro', visible: true, archivada: false, orden: 2, traduccion: {} }] }],
    [/^consultas/, { json: [{ id: 'c1', recibida_en: '2026-10-22T18:40:00Z', actividad_id: 'caballo', actividad_nombre: 'Rutas a caballo', nombre: 'Oliver Bennett', telefono: '+447700900123', fecha: '2026-11-14', personas: '2', idioma: 'en', estado: 'nueva', notas: null, aviso_enviado: true }] }],
    [/^importaciones/, { json: [] }],
    [/^administradores/, { json: [{ email: 'daniel@example.com', nombre: 'Daniel' }, { email: 'dan@example.com', nombre: 'Dan' }] }],
    [/^historial/, { json: [] }],
    ...rutasBase(),
  ]);
  const d = await datosPanel({ s: S, fetch: f, quien: QUIEN, ahora: AHORA });
  const claves = Object.keys(demo).filter((k) => !k.startsWith('_'));
  assert.deepEqual(Object.keys(d), claves);
  assert.equal(d.resumen.consultas_nuevas, 1);
  assert.equal(d.resumen.platos_ocultos, 1);
  assert.deepEqual(d.platos[0].lastapp, { id: 'la-1', nombre: 'Choto', precio: '18.90' });
  assert.equal(d.platos[0].precio, '21.00');
  assert.equal(d.platos[0].categoria, 'carnes');
  assert.equal(d.consultas[0].actividad, 'Rutas a caballo');
  assert.match(decodeURIComponent(d.consultas[0].whatsapp_url), /^https:\/\/wa\.me\/447700900123\?text=Hi Oliver, this is Daniel from Los Trotamundos\. We've received your enquiry about "Horse riding routes"/);
  assert.equal(d.consultas[0].llamar_url, 'tel:+447700900123');
  assert.deepEqual(d.ajustes.administradores.map((a) => a.soy_yo), [true, false]);
  assert.equal(d.ajustes.traduccion_automatica, false);
});

test('plato.guardar con nombre.es cambiado y la traducción apagada: PATCH, pendiente y sin llamar a Claude', async () => {
  const f = fakeFetch(rutasBase());
  const r = await accion({ s: S, fetch: f, client: sinCliente, quien: QUIEN, cuerpo: { tipo: 'plato.guardar', datos: { id: 'u1', nombre: { es: 'Choto al ajillo' } } } });
  assert.deepEqual(r, { ok: true, id: 'u1' });
  const patches = f.llamadas.filter((l) => l.method === 'PATCH' && l.path.startsWith('platos'));
  assert.equal(patches[0].body.nombre.es, 'Choto al ajillo');
  assert.equal(patches[0].body.nombre.en, 'Kid Goat Stew');
  assert.ok(patches.some((p) => p.body.traduccion && p.body.traduccion.pendiente === true));
});

test('plato.guardar con nombre.en cambiado lo marca como manual', async () => {
  const f = fakeFetch(rutasBase());
  await accion({ s: S, fetch: f, client: null, quien: QUIEN, cuerpo: { tipo: 'plato.guardar', datos: { id: 'u1', nombre: { en: 'Goat Stew' } } } });
  const patch = f.llamadas.find((l) => l.method === 'PATCH' && l.path.startsWith('platos'));
  assert.deepEqual(patch.body.traduccion.manual, ['nombre.en']);
});

test('plato.guardar: precio vacío guarda null, con coma se entiende, y el cambio queda en el historial', async () => {
  const f = fakeFetch(rutasBase());
  await accion({ s: S, fetch: f, client: null, quien: QUIEN, cuerpo: { tipo: 'plato.guardar', datos: { id: 'u1', precio: '' } } });
  assert.equal(f.llamadas.find((l) => l.method === 'PATCH').body.precio, null);
  const f2 = fakeFetch(rutasBase());
  await accion({ s: S, fetch: f2, client: null, quien: QUIEN, cuerpo: { tipo: 'plato.guardar', datos: { id: 'u1', precio: '22,50' } } });
  assert.equal(f2.llamadas.find((l) => l.method === 'PATCH').body.precio, 22.5);
  assert.equal(f2.llamadas.find((l) => l.path.startsWith('historial')).body.accion, 'Cambió el precio de Choto a 22,50 €');
});

test('plato.guardar sin id crea el plato al final de su categoría y devuelve el id', async () => {
  const f = fakeFetch([
    [/^platos\?select=orden/, { json: [{ orden: 9 }] }],
    [/^platos/, { method: 'POST', json: [{ ...FILA_PLATO, id: 'nuevo-uuid', nombre: { es: 'Shakshuka' }, orden: 10 }] }],
    ...rutasBase(),
  ]);
  const r = await accion({ s: S, fetch: f, client: null, quien: QUIEN, cuerpo: { tipo: 'plato.guardar', datos: { id: null, categoria: 'vegetarianos', nombre: { es: 'Shakshuka' }, precio: '12' } } });
  assert.deepEqual(r, { ok: true, id: 'nuevo-uuid' });
  const post = f.llamadas.find((l) => l.method === 'POST' && l.path.startsWith('platos'));
  assert.equal(post.body.orden, 10);
  assert.equal(post.body.categoria_id, 'vegetarianos');
  assert.equal(post.body.precio, 12);
  assert.equal(post.body.traduccion.pendiente, true);
});

test('acceso.quitar del propio correo falla', async () => {
  const r = await accion({ s: S, fetch: fakeFetch(), client: null, quien: QUIEN, cuerpo: { tipo: 'acceso.quitar', datos: { email: 'Daniel@example.com' } } });
  assert.deepEqual(r, { ok: false, error: 'No puedes quitarte a ti mismo.' });
});

test('consulta.borrar anonimiza sin eliminar la fila', async () => {
  const f = fakeFetch([[/^consultas/, { method: 'PATCH', json: [{ nombre: 'Ana' }] }]]);
  await accion({ s: S, fetch: f, client: null, quien: QUIEN, cuerpo: { tipo: 'consulta.borrar', datos: { id: 'c1' } } });
  const patch = f.llamadas.find((l) => l.method === 'PATCH');
  assert.equal(patch.body.nombre, 'Datos borrados');
  assert.equal(patch.body.telefono, '');
  assert.ok(patch.body.anonimizada_en);
  assert.equal(f.llamadas.filter((l) => l.method === 'DELETE').length, 0);
});

test('ajustes.guardar ignora traduccion_automatica y normaliza los correos', async () => {
  const f = fakeFetch();
  await accion({ s: S, fetch: f, client: null, quien: QUIEN, cuerpo: { tipo: 'ajustes.guardar', datos: { traduccion_automatica: true, correos_aviso: ' Daniel@Example.com , ', nombre_gestor: 'Dani' } } });
  const post = f.llamadas.find((l) => l.path.startsWith('ajustes'));
  assert.deepEqual(post.body.map((x) => x.clave).sort(), ['correos_aviso', 'nombre_gestor']);
  assert.deepEqual(post.body.find((x) => x.clave === 'correos_aviso').valor, ['daniel@example.com']);
});

test('consulta.estado rechaza un estado desconocido', async () => {
  await assert.rejects(accion({ s: S, fetch: fakeFetch(), client: null, quien: QUIEN, cuerpo: { tipo: 'consulta.estado', datos: { id: 'c1', estado: 'perdida' } } }), /estado no válido/);
});

test('un tipo desconocido lanza acción desconocida', async () => {
  await assert.rejects(accion({ s: S, fetch: fakeFetch(), client: null, quien: QUIEN, cuerpo: { tipo: 'plato.volar', datos: {} } }), /acción desconocida/);
});
