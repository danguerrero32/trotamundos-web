import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import handler from '../api/panel/[ruta].js';

function respuesta() {
  const r = { statusCode: 200, cuerpo: null, cabeceras: {} };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (o) => { r.cuerpo = o; return r; };
  r.setHeader = (k, v) => { r.cabeceras[k] = v; };
  r.end = () => r;
  return r;
}

test('una ruta desconocida del panel da 404', async () => {
  const res = respuesta();
  await handler({ query: { ruta: 'borrar-todo' }, url: '/api/panel/borrar-todo', headers: {}, method: 'POST' }, res);
  assert.equal(res.statusCode, 404);
  const res2 = respuesta();
  await handler({ query: { ruta: 'constructor' }, url: '/api/panel/constructor', headers: {}, method: 'POST' }, res2);
  assert.equal(res2.statusCode, 404);
});

test('sin el parámetro de la ruta, la saca de la dirección (servidor local)', async () => {
  const res = respuesta();
  await handler({ query: {}, url: '/api/panel/entrar', headers: {}, method: 'GET' }, res);
  assert.equal(res.statusCode, 405); // llegó a "entrar", que solo acepta POST
});

test('el despliegue cabe en el plan gratuito de Vercel: como mucho 12 funciones', async () => {
  const funciones = [];
  async function recorrer(dir) {
    for (const e of await readdir(new URL(dir, import.meta.url), { withFileTypes: true })) {
      if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
      if (e.isDirectory()) await recorrer(`${dir}${e.name}/`);
      else if (/\.(m?js|ts)$/.test(e.name)) funciones.push(`${dir}${e.name}`);
    }
  }
  await recorrer('../api/');
  assert.ok(funciones.length <= 12, `hay ${funciones.length} funciones: ${funciones.join(', ')}`);
});
