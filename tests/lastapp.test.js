import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parsePrecio, normalizarTexto, normalizarExport } from '../lib/lastapp.js';

const fixture = JSON.parse(await readFile(new URL('./fixtures/lastapp-productos-2026-07-24.json', import.meta.url), 'utf8'));
const ERROR_COLUMNAS = 'No reconozco este archivo. Esperaba las columnas Id, Name y Price (export de productos) o ID del producto en la organización, Nombre y Precio (export de catálogo).';

test('parsePrecio entiende los precios como vienen', () => {
  assert.equal(parsePrecio('19,00 €'), 19);
  assert.equal(parsePrecio('1.234,50 €'), 1234.5);
  assert.equal(parsePrecio('€19.00'), 19);
  assert.equal(parsePrecio('19.00'), 19);
  assert.equal(parsePrecio(19), 19);
  assert.equal(parsePrecio('12,5'), 12.5);
  assert.equal(parsePrecio(''), null);
  assert.equal(parsePrecio('gratis'), null);
});

test('normalizarTexto', () => {
  assert.equal(normalizarTexto('  Jamón  Alpujarreño, Gran-Reserva '), 'jamon alpujarreno gran reserva');
});

test('normalizarExport lee el export real de productos', () => {
  const r = normalizarExport(fixture, 'Products-24-07-2026.xls');
  assert.equal(r.ok, true);
  assert.equal(r.formato, 'productos');
  assert.equal(r.catalogo, null);
  assert.equal(r.filas.length, 175);
  const bacalao = r.filas.find((f) => f.nombre === 'Bacalao a la Vizcaína');
  assert.equal(bacalao.precio, 19);
  assert.equal(bacalao.id, '36aaf2ad-76e1-4008-a1c8-37fc3c143dc1');
});

test('normalizarExport: CSV con punto y coma de Excel en español', () => {
  const filas = [['Id;Name;Price;Description;Image URL'], ['36aaf2ad;Bacalao a la Vizcaína;"19,00 €";;']];
  const r = normalizarExport(filas, 'products.csv');
  assert.equal(r.ok, true);
  assert.deepEqual(r.filas[0], { id: '36aaf2ad', nombre: 'Bacalao a la Vizcaína', precio: 19, descripcion: '', categoria: null, imagen: '' });
});

test('normalizarExport: cabecera en la tercera fila, precio como número de celda y filas vacías al final', () => {
  const filas = [['Carta de LastApp'], [''], ['Id', 'Name', 'Price'], ['a1', 'Choto', 21], ['', '', ''], ['', '']];
  const r = normalizarExport(filas, 'products.xlsx');
  assert.equal(r.ok, true);
  assert.deepEqual(r.filas.map((f) => [f.id, f.precio]), [['a1', 21]]);
});

test('normalizarExport: un Id repetido se queda una vez y avisa', () => {
  const filas = [['Id', 'Name', 'Price'], ['a1', 'Choto', '21,00 €'], ['a1', 'Choto bis', '22,00 €']];
  const r = normalizarExport(filas, 'products.xls');
  assert.equal(r.filas.length, 1);
  assert.equal(r.filas[0].nombre, 'Choto');
  assert.equal(r.avisos.length, 1);
});

test('normalizarExport: el export de catálogo usa el Id de organización y saca el catálogo del nombre del archivo', () => {
  const filas = [['ID del producto en el catálogo', 'ID del producto en la organización', 'Categoría', 'Nombre', 'Precio', 'Descripción'], ['cat-1', 'org-1', 'Carnes', 'Choto', '21,00 €', 'Guiso']];
  const r = normalizarExport(filas, 'catalog.sala-21-10-2026.csv');
  assert.equal(r.formato, 'catalogo');
  assert.equal(r.catalogo, 'sala');
  assert.deepEqual(r.filas[0], { id: 'org-1', nombre: 'Choto', precio: 21, descripcion: 'Guiso', categoria: 'Carnes', imagen: '' });
});

test('normalizarExport: un archivo con otras columnas se rechaza con un mensaje claro', () => {
  const r = normalizarExport([['Fecha', 'Mesa', 'Total'], ['2026-10-01', '4', '56,00']], 'cierre.xlsx');
  assert.deepEqual(r, { ok: false, error: ERROR_COLUMNAS });
});
