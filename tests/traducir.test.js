// Ninguna prueba llama a la API de Claude: el cliente es siempre simulado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODELO, clienteClaude } from '../lib/claude.js';
import { traducirLote, marcarManual, fusionar, traducirSiToca } from '../lib/traducir.js';
import { S, fakeFetch } from './_ayuda.js';

function clienteSimulado(respuesta) {
  const peticiones = [];
  const client = { messages: { parse: async (req) => { peticiones.push(req); if (respuesta instanceof Error) throw respuesta; return typeof respuesta === 'function' ? respuesta(req) : respuesta; } } };
  return { client, peticiones };
}

const plato = (extra = {}) => ({ id: 'p1', nombre: { es: 'Choto al ajillo', en: 'Kid Goat (house)', fr: 'Vieux', ca: 'Vell' }, descripcion: { es: '' }, nota_precio: {}, traduccion: { pendiente: false, manual: ['nombre.en'] }, ...extra });
const respuestaChoto = { stop_reason: 'end_turn', parsed_output: { elementos: [{ clave: 'p1', campo: 'nombre', en: 'Garlic Kid Goat', fr: 'Chevreau à l’ail', ca: 'Cabrit a l’all' }] } };

test('sin clave no hay cliente de Claude', () => {
  assert.equal(clienteClaude({}), null);
  assert.equal(MODELO, 'claude-haiku-5-5');
});

test('apagada: no llama a Claude y deja pendiente', async () => {
  const { client, peticiones } = clienteSimulado(respuestaChoto);
  const f = fakeFetch();
  const r = await traducirSiToca({ s: S, fetch: f, client, ajustes: { traduccion_automatica: false }, tabla: 'platos', filas: [plato()] });
  assert.equal(peticiones.length, 0);
  assert.deepEqual(r, { traducidas: 0, pendientes: 1 });
  const patch = f.llamadas.find((l) => l.method === 'PATCH');
  assert.match(patch.path, /^platos\?id=eq\.p1/);
  assert.equal(patch.body.traduccion.pendiente, true);
});

test('encendida: una llamada por lote, respeta lo manual', async () => {
  const { client, peticiones } = clienteSimulado(respuestaChoto);
  const f = fakeFetch();
  const r = await traducirSiToca({ s: S, fetch: f, client, ajustes: { traduccion_automatica: true }, tabla: 'platos', filas: [plato()] });
  assert.equal(peticiones.length, 1);
  assert.deepEqual(r, { traducidas: 1, pendientes: 0 });
  const patch = f.llamadas.find((l) => l.method === 'PATCH');
  assert.equal(patch.body.nombre.en, 'Kid Goat (house)');  // manual: se conserva
  assert.equal(patch.body.nombre.fr, 'Chevreau à l’ail');
  assert.equal(patch.body.nombre.ca, 'Cabrit a l’all');
  assert.equal(patch.body.traduccion.pendiente, false);
});

test('fallo de Claude: queda pendiente, sin excepción hacia fuera', async () => {
  const { client } = clienteSimulado(new Error('sin saldo'));
  const f = fakeFetch();
  const r = await traducirSiToca({ s: S, fetch: f, client, ajustes: { traduccion_automatica: true }, tabla: 'platos', filas: [plato()] });
  assert.deepEqual(r, { traducidas: 0, pendientes: 1 });
  assert.equal(f.llamadas.find((l) => l.method === 'PATCH').body.traduccion.pendiente, true);
});

test('una negativa o una respuesta cortada cuentan como fallo', async () => {
  const { client } = clienteSimulado({ stop_reason: 'max_tokens', parsed_output: null });
  await assert.rejects(traducirLote({ client, elementos: [{ clave: 'p1', textos: { nombre: 'Choto' } }] }), /max_tokens/);
});

test('marcarManual', () => {
  assert.deepEqual(marcarManual({ traduccion: { manual: [] } }, { nombre: { es: 'A', en: 'B' } }), ['nombre.en']);
  assert.deepEqual(marcarManual({ traduccion: { manual: ['nombre.en'] } }, { descripcion: { fr: 'x' } }), ['nombre.en', 'descripcion.fr']);
  assert.deepEqual(marcarManual({ traduccion: { manual: [] } }, { nombre: { es: 'Solo español' } }), []);
});

test('fusionar escribe solo lo que no es manual', () => {
  const r = fusionar(plato(), { nombre: { en: 'X', fr: 'Y', ca: 'Z' } });
  assert.deepEqual(r.nombre, { es: 'Choto al ajillo', en: 'Kid Goat (house)', fr: 'Y', ca: 'Z' });
});

test('traducirLote no manda textos vacíos y usa claude-haiku-5-5', async () => {
  const { client, peticiones } = clienteSimulado(respuestaChoto);
  await traducirLote({ client, elementos: [{ clave: 'p1', textos: { nombre: 'Choto al ajillo', descripcion: '', nota_precio: '  ' } }] });
  const req = peticiones[0];
  assert.equal(req.model, 'claude-haiku-5-5');
  assert.equal(req.output_config.effort, 'low');
  const enviado = JSON.parse(req.messages[0].content);
  assert.deepEqual(enviado, [{ clave: 'p1', campo: 'nombre', es: 'Choto al ajillo' }]);
});

test('traducirLote sin nada que traducir no llama', async () => {
  const { client, peticiones } = clienteSimulado(respuestaChoto);
  assert.deepEqual(await traducirLote({ client, elementos: [{ clave: 'p1', textos: { nombre: '' } }] }), {});
  assert.equal(peticiones.length, 0);
});
