import { test } from 'node:test';
import assert from 'node:assert/strict';
import { precioWeb, platoAWeb, componerCarta, cartaPublica } from '../lib/carta.js';
import { limpiarTexto } from '../lib/idiomas.js';
import { S, fakeFetch } from './_ayuda.js';

test('precioWeb', () => {
  assert.equal(precioWeb(15), '15.00');
  assert.equal(precioWeb(16.5), '16.50');
  assert.equal(precioWeb('21'), '21.00');
  assert.equal(precioWeb(null), '');
});

test('platoAWeb omite idiomas vacíos', () => {
  const w = platoAWeb({ nombre: { es: 'Choto', en: '' }, descripcion: { es: 'Guiso' }, nota_precio: {}, precio: 21, emoji: '🐐' });
  assert.deepEqual(w, { es: 'Choto', desc_es: 'Guiso', p: '21.00', ico: '🐐' });
});

test('platoAWeb lleva todos los idiomas que tiene', () => {
  const w = platoAWeb({ nombre: { es: 'Zaalouk', en: 'Zaalouk', fr: 'Zaalouk', ca: 'Zaalouk' }, descripcion: {}, nota_precio: { es: '(confirmar)', en: '(to confirm)' }, precio: null, emoji: '🍆' });
  assert.deepEqual(w, { es: 'Zaalouk', en: 'Zaalouk', fr: 'Zaalouk', ca: 'Zaalouk', pnote_es: '(confirmar)', pnote_en: '(to confirm)', p: '', ico: '🍆' });
});

test('platoAWeb de un plato importado: solo español, y la web cae al español', () => {
  const w = platoAWeb({ nombre: { es: 'Pizza Pepperoni' }, descripcion: {}, nota_precio: {}, precio: 13.5, emoji: '🍕' });
  assert.deepEqual(w, { es: 'Pizza Pepperoni', p: '13.50', ico: '🍕' });
});

test('platoAWeb publica las cuatro versiones que la web ya tiene escritas', () => {
  const w = platoAWeb({ nombre: { es: 'Choto', en: 'Kid Goat', fr: 'Chevreau', ca: 'Cabrit' }, descripcion: {}, nota_precio: {}, precio: 21, emoji: '🐐' });
  assert.deepEqual(w, { es: 'Choto', en: 'Kid Goat', fr: 'Chevreau', ca: 'Cabrit', p: '21.00', ico: '🐐' });
});

test('componerCarta quita ocultos, archivados y categorías vacías, y ordena', () => {
  const categorias = [
    { id: 'carnes', nombre: { es: 'Carnes', en: 'Meat' }, orden: 2, visible: true },
    { id: 'deaqui', nombre: { es: 'De Aquí', en: 'From Here' }, orden: 1, visible: true },
    { id: 'oculta', nombre: { es: 'Oculta' }, orden: 3, visible: false },
    { id: 'vacia', nombre: { es: 'Vacía' }, orden: 4, visible: true },
  ];
  const plato = (categoria_id, es, orden, extra = {}) => ({ categoria_id, nombre: { es }, descripcion: {}, nota_precio: {}, precio: 10, emoji: '', orden, visible: true, archivado: false, ...extra });
  const platos = [
    plato('deaqui', 'Migas', 2), plato('deaqui', 'Jamón', 1), plato('deaqui', 'Oculto', 3, { visible: false }),
    plato('carnes', 'Choto', 1), plato('oculta', 'Nada', 1), plato('vacia', 'Archivado', 1, { archivado: true }),
  ];
  const c = componerCarta({ categorias, platos });
  assert.equal(c.origen, 'bd');
  assert.deepEqual(c.categorias.map((x) => x.slug), ['deaqui', 'carnes']);
  assert.deepEqual(c.categorias[0].platos.map((p) => p.es), ['Jamón', 'Migas']);
  assert.equal(c.categorias[0].es, 'De Aquí');
  assert.equal(c.categorias[0].en, 'From Here');
});

test('limpiarTexto', () => {
  assert.equal(limpiarTexto('  Pulpo\u0007 ', 200), 'Pulpo');
  assert.equal(limpiarTexto('x'.repeat(300), 200).length, 200);
  assert.equal(limpiarTexto(null, 10), '');
});

test('cartaPublica pide solo lo visible y no archivado', async () => {
  const f = fakeFetch([
    [/^categorias/, { json: [{ id: 'deaqui', nombre: { es: 'De Aquí' }, orden: 1, visible: true }] }],
    [/^platos/, { json: [{ categoria_id: 'deaqui', nombre: { es: 'Jamón' }, descripcion: {}, nota_precio: {}, precio: 15, emoji: '🍖', orden: 1, visible: true, archivado: false }] }],
  ]);
  const c = await cartaPublica({ s: S, fetch: f });
  assert.equal(c.categorias[0].platos[0].p, '15.00');
  const pPlatos = f.llamadas.find((l) => l.path.startsWith('platos')).path;
  assert.match(pPlatos, /visible=eq\.true/);
  assert.match(pPlatos, /archivado=eq\.false/);
});
