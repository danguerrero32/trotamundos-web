import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mensajeConsulta, respuestaConsulta, fechaLarga } from '../lib/mensajes.js';
import { validarConsulta, esSpam, procesarConsulta } from '../lib/consulta.js';
import { AHORA, fakeFetch } from './_ayuda.js';

const ENV = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_k', RESEND_API_KEY: 'r' };
const HOY = '2026-10-23';

test('mensajeConsulta es/en', () => {
  assert.equal(mensajeConsulta({ nombre: 'Ana', actividad: 'Rutas a caballo', fecha: '2026-11-14', personas: '2' }, 'es'),
    'Hola, soy Ana. Me interesa «Rutas a caballo» el 14 de noviembre para 2 personas.');
  assert.equal(mensajeConsulta({ nombre: 'Ana', actividad: 'Rutas a caballo', fecha: '', personas: '1' }, 'es'),
    'Hola, soy Ana. Me interesa «Rutas a caballo» para 1 persona.');
  assert.equal(mensajeConsulta({ nombre: 'Ana', actividad: 'Horse riding routes', fecha: '2026-11-14', personas: '2' }, 'en'),
    'Hi, I\'m Ana. I\'m interested in "Horse riding routes" on 14 November for 2 people.');
  assert.match(mensajeConsulta({ nombre: 'Ana', actividad: 'X', fecha: '2026-11-14', personas: '5+' }, 'en'), /for 5 or more people\.$/);
  assert.match(mensajeConsulta({ nombre: 'Ana', actividad: 'X', fecha: '', personas: '5+' }, 'es'), /para 5 o más personas\.$/);
});

test('mensajeConsulta fr/ca llevan nombre, actividad y fecha', () => {
  const fr = mensajeConsulta({ nombre: 'Camille', actividad: 'Randonnées à cheval', fecha: '2026-11-14', personas: '2' }, 'fr');
  assert.match(fr, /Camille/); assert.match(fr, /Randonnées à cheval/); assert.match(fr, /14 novembre/);
  const ca = mensajeConsulta({ nombre: 'Jordi', actividad: 'Rutes a cavall', fecha: '2026-10-26', personas: '3' }, 'ca');
  assert.match(ca, /Jordi/); assert.match(ca, /Rutes a cavall/); assert.match(ca, /26 d'octubre/);
});

test('respuestaConsulta es/en', () => {
  assert.equal(respuestaConsulta({ nombre: 'Ana Martín', actividad: 'Rutas a caballo', fecha: '2026-11-14', gestor: 'Daniel' }, 'es'),
    'Hola, Ana. Soy Daniel, de Los Trotamundos. Hemos recibido tu consulta sobre «Rutas a caballo» para el 14 de noviembre.');
  assert.equal(respuestaConsulta({ nombre: 'Ana', actividad: 'Horse riding routes', fecha: '2026-11-14', gestor: 'Daniel' }, 'en'),
    'Hi Ana, this is Daniel from Los Trotamundos. We\'ve received your enquiry about "Horse riding routes" for 14 November.');
  assert.equal(respuestaConsulta({ nombre: 'Ana', actividad: 'Rutas a caballo', fecha: '', gestor: 'Daniel' }, 'es'),
    'Hola, Ana. Soy Daniel, de Los Trotamundos. Hemos recibido tu consulta sobre «Rutas a caballo».');
});

test('fechaLarga', () => {
  assert.equal(fechaLarga('2026-11-14', 'es'), '14 de noviembre');
  assert.equal(fechaLarga('2026-08-03', 'ca'), "3 d'agost");
  assert.equal(fechaLarga('', 'es'), '');
});

const valida = { actividad_id: 'caballo', nombre: 'Ana', telefono: '611 222 333', fecha: '2026-11-14', personas: '2', idioma: 'es', privacidad: true };

test('validarConsulta acepta una consulta correcta y normaliza el teléfono', () => {
  const { errores, datos } = validarConsulta(valida, HOY);
  assert.deepEqual(errores, []);
  assert.equal(datos.telefono, '+34611222333');
  assert.equal(datos.fecha, '2026-11-14');
});

test('validarConsulta rechaza fecha pasada, sin privacidad o teléfono roto', () => {
  assert.equal(validarConsulta({ ...valida, fecha: '2026-10-01' }, HOY).errores.length, 1);
  assert.equal(validarConsulta({ ...valida, privacidad: false }, HOY).errores.length, 1);
  assert.equal(validarConsulta({ ...valida, telefono: '123' }, HOY).errores.length, 1);
  assert.equal(validarConsulta({ ...valida, personas: '9' }, HOY).errores.length, 1);
  assert.equal(validarConsulta({ ...valida, idioma: 'de' }, HOY).datos.idioma, 'es');
});

test('esSpam', () => {
  assert.equal(esSpam({ hp: 'x' }, AHORA), 'trampa');
  assert.equal(esSpam({ t_inicio: AHORA - 1000 }, AHORA), 'demasiado rápido');
  assert.equal(esSpam({ t_inicio: AHORA - 10000 }, AHORA), null);
});

const rutas = (previas = []) => [
  [/^actividades/, { json: [{ id: 'caballo', nombre: { es: 'Rutas a caballo', en: 'Horse riding routes' } }] }],
  [/^consultas\?select=id&telefono/, { method: 'GET', json: previas }],
  [/^consultas/, { method: 'POST', json: [{ id: 'c1' }] }],
  [/^ajustes/, { json: [{ clave: 'aviso_consultas_correo', valor: true }, { clave: 'correos_aviso', valor: ['dan@example.com'] }, { clave: 'nombre_gestor', valor: 'Daniel' }] }],
];

test('procesarConsulta: con el campo trampa responde ok sin guardar', async () => {
  const f = fakeFetch(rutas());
  const r = await procesarConsulta({ body: { ...valida, hp: 'bot' }, env: ENV, fetch: f, ahora: AHORA });
  assert.equal(r.status, 200);
  assert.equal(f.llamadas.filter((l) => l.method === 'POST').length, 0);
});

test('procesarConsulta: la cuarta del mismo teléfono en 24 h da 429 en su idioma', async () => {
  const f = fakeFetch(rutas([{ id: 1 }, { id: 2 }, { id: 3 }]));
  const r = await procesarConsulta({ body: { ...valida, idioma: 'en', t_inicio: AHORA - 10000 }, env: ENV, fetch: f, ahora: AHORA });
  assert.equal(r.status, 429);
  assert.match(r.body.error, /WhatsApp/);
  assert.equal(f.llamadas.filter((l) => l.method === 'POST' && l.path.startsWith('consultas')).length, 0);
});

test('procesarConsulta: guarda, apunta en el historial, avisa por correo y marca el aviso', async () => {
  const f = fakeFetch(rutas());
  const r = await procesarConsulta({ body: { ...valida, t_inicio: AHORA - 10000 }, env: ENV, fetch: f, ahora: AHORA });
  assert.deepEqual(r, { status: 200, body: { ok: true } });
  const ins = f.llamadas.find((l) => l.method === 'POST' && l.path.startsWith('consultas'));
  assert.equal(ins.body.actividad_nombre, 'Rutas a caballo');
  assert.equal(ins.body.telefono, '+34611222333');
  assert.equal(ins.body.acepta_privacidad_en, new Date(AHORA).toISOString());
  assert.ok(f.llamadas.some((l) => l.method === 'POST' && l.path.startsWith('historial')));
  const correo = f.llamadas.find((l) => l.url.startsWith('https://api.resend.com'));
  assert.deepEqual(correo.body.to, ['dan@example.com']);
  assert.match(correo.body.html, /wa\.me\/34611222333/);
  assert.ok(f.llamadas.some((l) => l.method === 'PATCH' && l.path.startsWith('consultas') && l.body.aviso_enviado === true));
});

test('procesarConsulta: actividad inexistente u oculta da 400', async () => {
  const f = fakeFetch([[/^actividades/, { json: [] }]]);
  const r = await procesarConsulta({ body: { ...valida, t_inicio: AHORA - 10000 }, env: ENV, fetch: f, ahora: AHORA });
  assert.equal(r.status, 400);
});
