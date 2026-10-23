import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extraerCarta } from '../tools/extrae-carta.mjs';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const c = extraerCarta(html);

test('extrae las 8 categorías con sus nombres en los cuatro idiomas', () => {
  assert.deepEqual(c.categorias.map((x) => x.id), ['deaqui', 'detodaspartes', 'ensaladas', 'vegetarianos', 'carnes', 'delamar', 'hamburguesas', 'pizzapasta']);
  assert.equal(c.categorias[0].nombre.fr, "D'Ici");
  assert.equal(c.categorias[6].nombre.en, 'Burgers & Bao');
  assert.deepEqual(c.categorias.map((x) => x.orden), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('extrae los 48 platos con sus campos', () => {
  assert.equal(c.platos.length, 48);
  const [jamon] = c.platos;
  assert.equal(jamon.nombre.es, 'Jamón Gran Reserva');
  assert.equal(jamon.precio, '15.00');
  assert.equal(jamon.emoji, '🍖');
  assert.equal(jamon.categoria, 'deaqui');
  assert.equal(jamon.orden, 1);
  assert.equal(c.platos.find((p) => p.nombre.es === 'Entrecote').precio, '');
  assert.equal(c.platos.find((p) => p.nombre.es === 'Zaalouk').nota_precio.es, '(confirmar)');
  assert.equal(c.platos.find((p) => p.nombre.es === 'Choto').nombre.en, 'Kid Goat Stew');
});

test('extrae las 3 actividades con su foto, encuadre y textos de los data-*', () => {
  assert.deepEqual(c.actividades.map((a) => a.id), ['senderismo', 'caballo', '4x4']);
  const [senderismo, caballo] = c.actividades;
  assert.equal(senderismo.encuadre, 'arriba');
  assert.equal(caballo.encuadre, 'centro');
  assert.equal(senderismo.foto, 'img/senderismo-sierra-nevada-rutas-alpujarra.png');
  assert.equal(senderismo.emoji, '🥾');
  assert.equal(caballo.descripcion.es, 'Los caminos históricos de La Alpujarra a lomos de caballo. Para principiantes y para quien ya monta.');
  assert.equal(caballo.nombre.ca, 'Rutes a cavall');
});
