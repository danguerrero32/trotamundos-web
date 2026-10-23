import { test } from 'node:test';
import assert from 'node:assert/strict';
import { telefonoWa } from '../lib/telefono.js';
import { actividadAWeb, actividadesPublicas } from '../lib/actividades.js';
import { S, fakeFetch } from './_ayuda.js';

test('telefonoWa', () => {
  assert.equal(telefonoWa('+34 858 893 777'), '34858893777');
  assert.equal(telefonoWa('611 22 33 44'), '34611223344');
  assert.equal(telefonoWa('0044 7700 900123'), '447700900123');
  assert.equal(telefonoWa('+44 (7700) 900-123'), '447700900123');
  assert.equal(telefonoWa('12345'), null);
  assert.equal(telefonoWa(''), null);
});

test('actividadAWeb traduce el encuadre y escribe los textos con la forma de la web', () => {
  const w = actividadAWeb({ id: 'senderismo', emoji: '🥾', foto: 'img/s.png', encuadre: 'arriba', nombre: { es: 'Senderismo', en: 'Hiking' }, descripcion: { es: 'Rutas', en: '' } });
  assert.deepEqual(w, { id: 'senderismo', ico: '🥾', foto: 'img/s.png', posicion: 'top center', es: 'Senderismo', en: 'Hiking', desc_es: 'Rutas' });
});

test('actividadAWeb de una actividad nueva: solo español', () => {
  const w = actividadAWeb({ id: 'visita', emoji: '🏛️', foto: null, encuadre: 'centro', nombre: { es: 'Visita al pueblo' }, descripcion: {} });
  assert.deepEqual(w, { id: 'visita', ico: '🏛️', foto: '', posicion: 'center', es: 'Visita al pueblo' });
});

test('actividadesPublicas: visibles y no archivadas, y el WhatsApp del ajuste normalizado', async () => {
  const f = fakeFetch([
    [/^actividades/, { json: [{ id: 'caballo', emoji: '🐴', foto: 'img/c.jpg', encuadre: 'centro', nombre: { es: 'A caballo' }, descripcion: {}, visible: true, archivada: false, orden: 1 }] }],
    [/^ajustes/, { json: [{ valor: '+34 858 893 777' }] }],
  ]);
  const r = await actividadesPublicas({ s: S, fetch: f });
  assert.equal(r.origen, 'bd');
  assert.equal(r.whatsapp, '34858893777');
  assert.deepEqual(r.actividades.map((a) => a.id), ['caballo']);
  const p = f.llamadas.find((l) => l.path.startsWith('actividades')).path;
  assert.match(p, /visible=eq\.true/);
  assert.match(p, /archivada=eq\.false/);
});
