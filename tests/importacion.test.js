import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vistaPrevia, resumenAplicado, procesarImportacion } from '../lib/importacion.js';
import { S, fakeFetch } from './_ayuda.js';

const plato = (id, es, extra = {}) => ({ id, categoria_id: 'carnes', nombre: { es }, precio: 10, precio_fijo: false, lastapp_id: null, lastapp_nombre: null, archivado: false, ...extra });
const fila = (id, nombre, precio) => ({ id, nombre, precio, descripcion: '', categoria: null, imagen: '' });
const base = { formato: 'productos', catalogo: null, ultima: null };

test('vistaPrevia: nuevo, precio, precio fijo, no_web y sin cambios', () => {
  const platos = [
    plato('p1', 'Choto', { lastapp_id: 'a', lastapp_nombre: 'Choto', precio: 21 }),
    plato('p2', 'Empanada argentina', { lastapp_id: 'b', lastapp_nombre: 'Empanada de ternera', precio: 3.5, precio_fijo: true }),
    plato('p3', 'Migas', { lastapp_id: 'c', lastapp_nombre: 'Migas', precio: 16.5 }),
  ];
  const productos = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'z', no_web: true }];
  const filas = [fila('a', 'Choto', 18.9), fila('b', 'Empanada de ternera', 12.5), fila('c', 'Migas', 16.5), fila('z', 'Coca Cola', 2.5), fila('n', 'Pizza Pepperoni', 13.5)];
  const v = vistaPrevia({ ...base, filas, platos, productos });
  assert.deepEqual(v.grupos.precio, [{ plato_id: 'p1', nombre: 'Choto', antes: '21.00', despues: '18.90' }]);
  assert.deepEqual(v.grupos.precio_fijo, [{ plato_id: 'p2', nombre: 'Empanada argentina', web: '3.50', lastapp: '12.50' }]);
  assert.deepEqual(v.grupos.sin_cambios, [{ plato_id: 'p3', nombre: 'Migas' }]);
  assert.deepEqual(v.grupos.no_web, [{ lastapp_id: 'z', nombre: 'Coca Cola' }]);
  assert.equal(v.grupos.nuevos[0].lastapp_id, 'n');
  assert.equal(v.grupos.nuevos[0].precio, '13.50');
  assert.equal(v.totales.filas, 5);
  assert.equal(v.totales.nuevos, 1);
});

test('vistaPrevia: nombre cambiado en LastApp y desaparecidos', () => {
  const platos = [plato('p1', 'Morcilla alpujarreña', { lastapp_id: 'a', lastapp_nombre: 'Morcilla', precio: 11 }), plato('p2', 'Pollo mozárabe', { lastapp_id: 'b', lastapp_nombre: 'Pollo mozárabe' })];
  const v = vistaPrevia({ ...base, filas: [fila('a', 'Morcilla alpujarreña', 11)], platos, productos: [{ id: 'a' }, { id: 'b' }] });
  assert.deepEqual(v.grupos.nombre, [{ plato_id: 'p1', nombre_web: 'Morcilla alpujarreña', antes: 'Morcilla', despues: 'Morcilla alpujarreña' }]);
  assert.deepEqual(v.grupos.desaparecidos, [{ plato_id: 'p2', nombre: 'Pollo mozárabe', lastapp_nombre: 'Pollo mozárabe' }]);
  assert.equal(v.aviso_incompleto, false);
  assert.equal(v.ocultar_desaparecidos_por_defecto, true);
});

test('vistaPrevia: si falta más de la mitad de lo vinculado, avisa y no oculta por defecto', () => {
  const platos = ['a', 'b', 'c', 'd'].map((x, i) => plato(`p${i}`, `Plato ${x}`, { lastapp_id: x, lastapp_nombre: `Plato ${x}` }));
  const v = vistaPrevia({ ...base, filas: [fila('a', 'Plato a', 10)], platos, productos: platos.map((p) => ({ id: p.lastapp_id })) });
  assert.equal(v.grupos.desaparecidos.length, 3);
  assert.equal(v.aviso_incompleto, true);
  assert.equal(v.ocultar_desaparecidos_por_defecto, false);
});

test('vistaPrevia: Margarita frente a Pizza Margarita es parecido, no sugerencia', () => {
  const v = vistaPrevia({ ...base, filas: [fila('m', 'Pizza Margarita', 11.5)], platos: [plato('p1', 'Margarita')], productos: [] });
  const n = v.grupos.nuevos[0];
  assert.deepEqual(n.parecidos, [{ plato_id: 'p1', nombre: 'Margarita' }]);
  assert.equal(n.sugerencia, null);
});

test('vistaPrevia: mismo nombre normalizado que un plato sin vincular sugiere "mismo"', () => {
  const v = vistaPrevia({ ...base, filas: [fila('k', 'Croquetas de cocido', 14)], platos: [plato('p9', 'Croquetas de Cocido')], productos: [] });
  assert.deepEqual(v.grupos.nuevos[0].sugerencia, { destino: 'mismo', plato_id: 'p9' });
});

test('vistaPrevia: avisa si la última importación vino de otro export', () => {
  const v = vistaPrevia({ filas: [], formato: 'catalogo', catalogo: 'sala', platos: [], productos: [], ultima: { formato: 'productos', catalogo: null } });
  assert.equal(v.aviso_fuente, 'La última importación fue del export de productos; este es del catálogo «sala». Los precios pueden cambiar de uno a otro.');
  assert.equal(vistaPrevia({ ...base, filas: [], platos: [], productos: [], ultima: { formato: 'productos', catalogo: null } }).aviso_fuente, null);
});

test('resumenAplicado', () => {
  const vista = { grupos: { precio: [{}, {}], desaparecidos: [{}, {}, {}] } };
  const r = resumenAplicado(vista, { nuevos: { a: { destino: 'plato' }, b: { destino: 'no_web' }, c: { destino: 'mismo' }, d: { destino: 'pendiente' } }, ocultar_desaparecidos: true });
  assert.deepEqual(r, { nuevos: 1, precios: 2, ocultados: 3, no_web: 1, vinculados: 1 });
});

const QUIEN = { email: 'daniel@example.com', nombre: 'Daniel' };

test('procesarImportacion: aplicar dos veces da 409 con un mensaje claro', async () => {
  const f = fakeFetch([
    [/^importaciones\?select/, { json: [{ id: 'i1', vista: { grupos: { precio: [], desaparecidos: [] } } }] }],
    [/^categorias/, { json: [{ id: 'carnes' }] }],
    [/^rpc\/aplicar_importacion/, { status: 400, json: { code: 'P0001', message: 'ya_aplicada' } }],
  ]);
  const r = await procesarImportacion({ s: S, fetch: f, quien: QUIEN, cuerpo: { paso: 'aplicar', id: 'i1', decisiones: { nuevos: {} } } });
  assert.deepEqual(r, { status: 409, body: { ok: false, error: 'Esta importación ya se aplicó.' } });
});

test('procesarImportacion: un archivo irreconocible da 400 y no guarda nada', async () => {
  const f = fakeFetch();
  const r = await procesarImportacion({ s: S, fetch: f, quien: QUIEN, cuerpo: { paso: 'vista_previa', archivo: 'x.xlsx', filas: [['Fecha', 'Total']] } });
  assert.equal(r.status, 400);
  assert.equal(f.llamadas.filter((l) => l.method === 'POST').length, 0);
});

test('procesarImportacion: un plato nuevo sin categoría válida se rechaza antes de tocar nada', async () => {
  const f = fakeFetch([
    [/^importaciones\?select/, { json: [{ id: 'i1', vista: { grupos: { precio: [], desaparecidos: [], nuevos: [{ lastapp_id: 'n', nombre: 'Pizza Pepperoni' }] } } }] }],
    [/^categorias/, { json: [{ id: 'carnes' }] }],
  ]);
  const r = await procesarImportacion({ s: S, fetch: f, quien: QUIEN, cuerpo: { paso: 'aplicar', id: 'i1', decisiones: { nuevos: { n: { destino: 'plato', categoria: 'postres' } } } } });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /Pizza Pepperoni/);
  assert.equal(f.llamadas.filter((l) => l.path.startsWith('rpc/')).length, 0);
});
