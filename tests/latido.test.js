import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/latido.js';

function respuesta() {
  const r = { statusCode: 200, cuerpo: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (o) => { r.cuerpo = o; return r; };
  r.end = () => r;
  return r;
}

function conEntorno(env, fn) {
  const antes = { ...process.env };
  Object.assign(process.env, env);
  return Promise.resolve(fn()).finally(() => {
    for (const k of Object.keys(env)) if (!(k in antes)) delete process.env[k]; else process.env[k] = antes[k];
  });
}

test('latido: sin el secreto del cron responde 401 y no llama a Supabase', async () => {
  const llamadas = [];
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url) => { llamadas.push(url); return { ok: true, status: 204, text: async () => '' }; };
  try {
    await conEntorno({ CRON_SECRET: 's3cr3t', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_k' }, async () => {
      const res = respuesta();
      await handler({ headers: { authorization: 'Bearer otro' } }, res);
      assert.equal(res.statusCode, 401);
    });
  } finally { globalThis.fetch = fetchOriginal; }
  assert.equal(llamadas.length, 0);
});

test('latido: con el secreto llama a latir con origen vercel', async () => {
  const llamadas = [];
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url, init) => { llamadas.push({ url, body: init.body }); return { ok: true, status: 204, text: async () => '' }; };
  try {
    await conEntorno({ CRON_SECRET: 's3cr3t', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_k' }, async () => {
      const res = respuesta();
      await handler({ headers: { authorization: 'Bearer s3cr3t' } }, res);
      assert.equal(res.statusCode, 200);
    });
  } finally { globalThis.fetch = fetchOriginal; }
  assert.equal(llamadas[0].url, 'https://x.supabase.co/rest/v1/rpc/latir');
  assert.equal(llamadas[0].body, '{"p_origen":"vercel"}');
});
