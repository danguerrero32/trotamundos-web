import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extraerCarta } from '../tools/extrae-carta.mjs';
import { cartaInicial, generarSql } from '../tools/genera-sql-inicial.mjs';

const carta = JSON.parse(await readFile(new URL('../tools/carta-2026-10.json', import.meta.url), 'utf8'));
const web = extraerCarta(await readFile(new URL('../index.html', import.meta.url), 'utf8'));
const datos = cartaInicial({ carta, web });
const plato = (es) => datos.platos.find((p) => p.nombre.es === es);

test('las 9 categorías de la carta de octubre, en su orden, con los nombres de la web donde ya existían', () => {
  assert.deepEqual(datos.categorias.map((c) => c.id), ['deaqui', 'carnes', 'sopas', 'ensaladas', 'vegetarianos', 'delamar', 'hamburguesas', 'pizzapasta', 'postres']);
  assert.deepEqual(datos.categorias.map((c) => c.orden), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(datos.categorias[0].nombre.fr, "D'Ici");
  assert.equal(datos.categorias[2].nombre.en, 'Soups');
  assert.equal(datos.categorias[8].nombre.ca, 'Postres');
  assert.ok(!datos.categorias.some((c) => c.id === 'detodaspartes'));
});

test('57 platos: 11+10+3+2+6+5+5+9+6, numerados desde 1 en cada categoría', () => {
  assert.equal(datos.platos.length, 57);
  const cuenta = {};
  for (const p of datos.platos) cuenta[p.categoria] = (cuenta[p.categoria] || 0) + 1;
  assert.deepEqual(cuenta, { deaqui: 11, carnes: 10, sopas: 3, ensaladas: 2, vegetarianos: 6, delamar: 5, hamburguesas: 5, pizzapasta: 9, postres: 6 });
  for (const c of datos.categorias) {
    assert.deepEqual(datos.platos.filter((p) => p.categoria === c.id).map((p) => p.orden), Array.from({ length: cuenta[c.id] }, (_, i) => i + 1));
  }
});

test('los platos que no cambian heredan sus traducciones y su emoji de la web', () => {
  const jamon = plato('Jamón Gran Reserva');
  assert.equal(jamon.nombre.en, 'Reserve Ham');
  assert.notEqual(jamon.nombre.ca, '');
  assert.equal(jamon.descripcion.fr, 'Jambons Diego Martín, coupés finement à la main');
  assert.equal(jamon.emoji, '🍖');
  assert.equal(jamon.precio, '15.00');
});

test('Pasta Carbonara hereda la descripción de Tallarines Carbonara pero no el nombre en otros idiomas', () => {
  const pasta = plato('Pasta Carbonara');
  assert.ok(pasta);
  assert.equal(pasta.categoria, 'pizzapasta');
  assert.equal(pasta.descripcion.en, 'Bacon, egg, parmesan');
  assert.equal(pasta.descripcion.ca, 'Amb bacó, ou i parmesà');
  assert.equal(pasta.nombre.fr, '');
  assert.equal(pasta.nombre.ca, '');
  assert.equal(pasta.emoji, '🥚');
  assert.equal(plato('Tallarines Carbonara'), undefined);
});

test('Entrecote: 30,00, descripción nueva solo en español y nombre heredado', () => {
  const e = plato('Entrecote');
  assert.equal(e.precio, '30.00');
  assert.equal(e.descripcion.es, 'Lomo alto de ternera, 500 g aprox., con guarnición');
  assert.equal(e.descripcion.en, '');
  assert.equal(e.descripcion.fr, '');
  assert.equal(e.nombre.fr, 'Entrecôte');
});

test('Osobuco conserva francés y catalán pero no el inglés copiado del codillo', () => {
  const o = plato('Osobuco');
  assert.equal(o.descripcion.en, '');
  assert.notEqual(o.descripcion.fr, '');
  assert.equal(o.nombre.ca, 'Ossobuco');
});

test('Shakshuka sustituye al Zaalouk, a 10,00 y sin nota de precio', () => {
  const s = plato('Shakshuka');
  assert.equal(s.categoria, 'vegetarianos');
  assert.equal(s.precio, '10.00');
  assert.equal(s.nota_precio.es, '');
  assert.equal(s.nombre.en, 'Shakshuka');
  assert.equal(s.descripcion.en, 'Roasted vegetable soup, moroccan style');
  assert.equal(s.emoji, '🍅');
  assert.equal(plato('Zaalouk'), undefined);
});

test('sale Ternera con ciruelas y solo hay una Margarita', () => {
  assert.equal(plato('Ternera con ciruelas'), undefined);
  assert.equal(datos.platos.filter((p) => p.nombre.es === 'Margarita').length, 1);
});

test('las sopas son nuevas, con el inglés que trae la carta', () => {
  assert.equal(plato('Sopa de picadillo').descripcion.en, 'Homemade broth with chicken, ham, egg, noodles and fried bread');
  assert.equal(plato('Sopa de marisco').nombre.en, 'Seafood soup');
  assert.equal(plato('Sopa de marisco').descripcion.es, '');
  assert.equal(plato('Sopa de marisco').precio, '12.00');
});

test('postres de LastApp, solo en español', () => {
  const t = plato('Torrija');
  assert.equal(t.categoria, 'postres');
  assert.equal(t.precio, '8.50');
  assert.equal(t.nombre.en, '');
  assert.equal(t.emoji, '🍞');
  assert.equal(plato('Fruta').precio, '2.50');
});

test('Enchiladas y Empanada argentina pasan a Carnes; hamburguesas a 16,00', () => {
  assert.equal(plato('Enchiladas').categoria, 'carnes');
  assert.equal(plato('Enchiladas').descripcion.en, 'Mexican recipe, spicy');
  assert.equal(plato('Empanada argentina').categoria, 'carnes');
  assert.equal(plato('Hamburguesa completa').precio, '16.00');
  assert.equal(plato('Hamburguesa de cabra').precio, '16.00');
});

test('las 3 actividades siguen saliendo de la web', () => {
  assert.deepEqual(datos.actividades.map((a) => a.id), ['senderismo', 'caballo', '4x4']);
});

test('un "antes" que no existe en la web es un error, no un plato sin traducciones', () => {
  const rota = { categorias: carta.categorias, platos: [{ ...carta.platos[0], antes: 'Plato inventado' }] };
  assert.throws(() => cartaInicial({ carta: rota, web }), /Plato inventado/);
});

test('el SQL es idempotente, con ids fijos y la cabecera de la carta de octubre', () => {
  const sql = generarSql(datos);
  assert.match(sql, /carta impresa de octubre de 2026/);
  assert.equal((sql.match(/on conflict \(id\) do nothing;/g) || []).length, 3);
  assert.match(sql, /md5\('plato:postres:6'\)::uuid, 'postres', '\{"es":"Torrija"/);
  assert.match(sql, /md5\('plato:carnes:3'\)::uuid, 'carnes', '\{"es":"Entrecote"[^\n]* 30\.00, '🥩', 3\)/);
  assert.ok(!sql.includes('detodaspartes'));
});
