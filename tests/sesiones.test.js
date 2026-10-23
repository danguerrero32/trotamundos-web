import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashToken, tokenNuevo, leerCookie, cookieSesion, pedirEnlace, canjearEnlace, sesionActual } from '../lib/sesiones.js';
import { S, AHORA, fakeFetch } from './_ayuda.js';

test('tokens y cookies', () => {
  const t = tokenNuevo(); assert.ok(t.length > 30); assert.equal(hashToken(t).length, 64); assert.notEqual(hashToken(t), hashToken(t + 'x'));
  assert.equal(leerCookie('a=1; trotamundos_panel=abc%3D; b=2'), 'abc=');
  assert.equal(leerCookie(''), null);
  assert.match(cookieSesion('tok'), /^trotamundos_panel=tok; Path=\/; Max-Age=7776000; HttpOnly; Secure; SameSite=Lax$/);
  assert.match(cookieSesion('', { borrar: true }), /Max-Age=0/);
});

test('pedirEnlace: a un correo no autorizado responde ok sin hacer nada', async () => {
  const f = fakeFetch([[/^administradores/, { json: [] }]]);
  const r = await pedirEnlace({ s: S, fetch: f, env: { RESEND_API_KEY: 'r' }, email: 'nadie@example.com', origen: 'https://trota.test', ahora: AHORA });
  assert.deepEqual(r, { ok: true });
  assert.equal(f.llamadas.filter((l) => l.method === 'POST').length, 0);
});

test('pedirEnlace: a un administrador le guarda el hash y le manda el enlace', async () => {
  const f = fakeFetch([[/^administradores/, { json: [{ email: 'dan@example.com', nombre: 'Dan' }] }]]);
  const r = await pedirEnlace({ s: S, fetch: f, env: { RESEND_API_KEY: 'r' }, email: 'Dan@Example.com', origen: 'https://trota.test', ahora: AHORA });
  assert.deepEqual(r, { ok: true });
  const ins = f.llamadas.find((l) => l.path.startsWith('sesiones_panel') && l.method === 'POST');
  assert.equal(ins.body.tipo, 'enlace'); assert.equal(ins.body.email, 'dan@example.com');
  assert.equal(ins.body.caduca_en, new Date(AHORA + 30 * 60000).toISOString());
  const correo = f.llamadas.find((l) => l.url.startsWith('https://api.resend.com'));
  assert.equal(correo.body.subject, 'Tu enlace para entrar al panel · Los Trotamundos');
  const enlace = correo.body.html.match(/href="([^"]+)"/)[1];
  assert.match(enlace, /^https:\/\/trota\.test\/api\/panel\/sesion\?t=/);
  assert.equal(hashToken(enlace.split('t=')[1]), ins.body.token_hash); // el correo lleva el token; la base de datos, su hash
});

test('canjearEnlace: un enlace vivo da sesión y queda usado; uno usado o caducado, no', async () => {
  const f = fakeFetch([[/^sesiones_panel\?select.*tipo=eq\.enlace/, { json: [{ id: 'e1', email: 'dan@example.com', caduca_en: new Date(AHORA + 60000).toISOString(), usado_en: null }] }]]);
  const ses = await canjearEnlace({ s: S, fetch: f, token: 'abc', agente: 'Safari', ahora: AHORA });
  assert.ok(ses && ses.length > 30);
  assert.ok(f.llamadas.some((l) => l.method === 'PATCH' && l.body.usado_en));
  const nueva = f.llamadas.find((l) => l.method === 'POST'); assert.equal(nueva.body.tipo, 'sesion'); assert.equal(nueva.body.token_hash, hashToken(ses));
  const f2 = fakeFetch([[/^sesiones_panel/, { json: [{ id: 'e1', email: 'x', caduca_en: new Date(AHORA - 1).toISOString(), usado_en: null }] }]]);
  assert.equal(await canjearEnlace({ s: S, fetch: f2, token: 'abc', ahora: AHORA }), null);
  const f3 = fakeFetch([[/^sesiones_panel/, { json: [{ id: 'e1', email: 'x', caduca_en: new Date(AHORA + 1e6).toISOString(), usado_en: '2026-10-07' }] }]]);
  assert.equal(await canjearEnlace({ s: S, fetch: f3, token: 'abc', ahora: AHORA }), null);
});

test('sesionActual: cookie válida devuelve al administrador y renueva la caducidad', async () => {
  const f = fakeFetch([
    [/^sesiones_panel/, { method: 'GET', json: [{ id: 's1', email: 'dan@example.com', caduca_en: new Date(AHORA + 1e8).toISOString(), ultimo_uso: new Date(AHORA - 2 * 3600000).toISOString() }] }],
    [/^administradores/, { json: [{ email: 'dan@example.com', nombre: 'Dan' }] }],
  ]);
  const q = await sesionActual({ s: S, fetch: f, cookieHeader: 'trotamundos_panel=tok', ahora: AHORA });
  assert.deepEqual(q, { email: 'dan@example.com', nombre: 'Dan' });
  const renov = f.llamadas.find((l) => l.method === 'PATCH');
  assert.equal(renov.body.caduca_en, new Date(AHORA + 90 * 86400000).toISOString());
});

test('sesionActual: sin cookie, caducada o de alguien que ya no tiene acceso, null', async () => {
  assert.equal(await sesionActual({ s: S, fetch: fakeFetch(), cookieHeader: '', ahora: AHORA }), null);
  const caducada = fakeFetch([[/^sesiones_panel/, { json: [{ id: 's1', email: 'dan@example.com', caduca_en: new Date(AHORA - 1).toISOString() }] }]]);
  assert.equal(await sesionActual({ s: S, fetch: caducada, cookieHeader: 'trotamundos_panel=tok', ahora: AHORA }), null);
  const sinAcceso = fakeFetch([[/^sesiones_panel/, { json: [{ id: 's1', email: 'dan@example.com', caduca_en: new Date(AHORA + 1e8).toISOString() }] }], [/^administradores/, { json: [] }]]);
  assert.equal(await sesionActual({ s: S, fetch: sinAcceso, cookieHeader: 'trotamundos_panel=tok', ahora: AHORA }), null);
});
