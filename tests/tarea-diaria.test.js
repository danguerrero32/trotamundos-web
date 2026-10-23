import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tareaDiaria } from '../lib/tarea-diaria.js';
import { S, AHORA, fakeFetch } from './_ayuda.js';

const clienteProhibido = { messages: { parse: async () => { throw new Error('no debería llamarse'); } } };
const ajustesApagada = [/^ajustes/, { json: [{ clave: 'traduccion_automatica', valor: false }] }];

test('con la traducción apagada no llama a Claude ni busca pendientes', async () => {
  const f = fakeFetch([ajustesApagada]);
  const r = await tareaDiaria({ s: S, fetch: f, client: clienteProhibido, ahora: AHORA });
  assert.equal(r.latido, true);
  assert.equal(r.traducidas, 0);
  assert.equal(f.llamadas.filter((l) => l.path.includes('traduccion->>pendiente')).length, 0);
  assert.ok(f.llamadas.some((l) => l.path === 'rpc/latir' && l.body.p_origen === 'vercel'));
});

test('anonimiza solo las consultas cerradas de hace más de 12 meses', async () => {
  const f = fakeFetch([ajustesApagada, [/^consultas/, { method: 'PATCH', json: [{ id: 'c1' }, { id: 'c2' }] }]]);
  const r = await tareaDiaria({ s: S, fetch: f, client: null, ahora: AHORA });
  assert.equal(r.anonimizadas, 2);
  const patch = f.llamadas.find((l) => l.method === 'PATCH' && l.path.startsWith('consultas'));
  const limite = new Date(AHORA - 365 * 86400000).toISOString();
  assert.ok(patch.path.includes(`actualizado_en=lt.${encodeURIComponent(limite)}`));
  assert.ok(patch.path.includes('estado=in.(contestada,confirmada,descartada)'));
  assert.ok(patch.path.includes('anonimizada_en=is.null'));
  assert.equal(patch.body.nombre, 'Datos borrados');
});

test('si falla el anonimizado, el latido y la limpieza se hacen igual', async () => {
  const f = fakeFetch([ajustesApagada, [/^consultas/, { method: 'PATCH', status: 500, json: { message: 'caída' } }], [/^sesiones_panel/, { method: 'DELETE', json: [{ id: 's1' }] }]]);
  const r = await tareaDiaria({ s: S, fetch: f, client: null, ahora: AHORA });
  assert.equal(r.latido, true);
  assert.equal(r.anonimizadas, 0);
  assert.equal(r.sesiones_borradas, 1);
  const del = f.llamadas.find((l) => l.method === 'DELETE');
  assert.ok(del.path.includes(`caduca_en=lt.${encodeURIComponent(new Date(AHORA - 7 * 86400000).toISOString())}`));
});
