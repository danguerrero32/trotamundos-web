// Genera los datos de muestra con los que Claude Design dibuja el panel, que son también
// el contrato de la API: uploads/panel-demo.json y uploads/importacion-demo.json.
// La carta y las actividades son las reales (de index.html); las consultas, inventadas;
// la importación sale del export real de LastApp del 24/07/2026 cruzado con la carta.
// Uso: node tools/genera-demo.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { extraerCarta } from './extrae-carta.mjs';

const raiz = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', raiz), 'utf8');
const filas = JSON.parse(await readFile(new URL('tests/fixtures/lastapp-productos-2026-07-24.json', raiz), 'utf8'));
const carta = extraerCarta(html);

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const precio = (s) => { const n = parseFloat(String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')); return isNaN(n) ? '' : n.toFixed(2); };
const bigramas = (s) => { const t = norm(s).replace(/ /g, ''); const b = []; for (let i = 0; i < t.length - 1; i++) b.push(t.slice(i, i + 2)); return b; };
function dice(a, b) {
  const x = bigramas(a), y = bigramas(b); if (!x.length || !y.length) return 0;
  const resto = [...y]; let comunes = 0;
  for (const g of x) { const i = resto.indexOf(g); if (i >= 0) { comunes++; resto.splice(i, 1); } }
  return (2 * comunes) / (x.length + y.length);
}
const vacio = () => ({ es: '', en: '', fr: '', ca: '' });

// Productos de LastApp del export real, sin la cabecera.
const productos = filas.slice(1).filter((f) => f[0] && f[1]).map((f) => ({ id: f[0], nombre: f[1], precio: precio(f[2]) }));
const porNombre = new Map(productos.map((p) => [norm(p.nombre), p]));

// ---------- Platos: los 48 reales, con los casos que el panel tiene que saber pintar ----------
const FIJOS = ['Empanada argentina', 'Empanada fugazzeta', 'Entrecote'];
// Vínculos que no salen por nombre exacto y que la vinculación inicial hará a mano (con precio fijo).
const A_MANO = { 'Empanada argentina': 'Empanada de ternera', 'Empanada fugazzeta': 'Empanada de fugazzeta', 'Entrecote': 'Entrecot de ternera con guarnición' };
const platos = carta.platos.map((p, i) => {
  const enLastApp = porNombre.get(norm(A_MANO[p.nombre.es] || p.nombre.es));
  return {
    id: `pl-${i + 1}`, categoria: p.categoria, orden: p.orden,
    nombre: p.nombre, descripcion: p.descripcion, nota_precio: p.nota_precio,
    precio: p.precio, precio_fijo: FIJOS.includes(p.nombre.es), emoji: p.emoji,
    visible: p.nombre.es !== 'Zaalouk', archivado: p.nombre.es === 'Codillo con chucrut',
    lastapp: enLastApp ? { id: enLastApp.id, nombre: enLastApp.nombre, precio: enLastApp.precio } : null,
    traduccion: { pendiente: false, manual: [] },
  };
});
// Uno vinculado cuyo nombre ha cambiado en LastApp desde la última importación.
const renombrado = platos.find((p) => p.lastapp && p.nombre.es === 'Morcilla alpujarreña') || platos.find((p) => p.lastapp);
renombrado.lastapp = { ...renombrado.lastapp, nombre: 'Morcilla' };
// Uno vinculado a un producto que ya no viene en el export.
const pollo = platos.find((p) => p.nombre.es === 'Pollo mozárabe');
pollo.lastapp = { id: 'demo-ya-no-esta', nombre: 'Pollo mozárabe', precio: '17.00' };
// Tres que entraron en una importación: solo en español, pendientes de traducir.
const NUEVOS_IMPORTADOS = [['Pizza Pepperoni', 'pizzapasta', '🍕'], ['Shakshuka', 'vegetarianos', '🍳'], ['Sopa de verduras', 'vegetarianos', '🥣']];
for (const [nombre, categoria, emoji] of NUEVOS_IMPORTADOS) {
  const prod = porNombre.get(norm(nombre));
  if (!prod) continue;
  platos.push({
    id: `pl-${platos.length + 1}`, categoria, orden: platos.filter((p) => p.categoria === categoria).length + 1,
    nombre: { ...vacio(), es: prod.nombre }, descripcion: vacio(), nota_precio: vacio(),
    precio: prod.precio, precio_fijo: false, emoji, visible: true, archivado: false,
    lastapp: { id: prod.id, nombre: prod.nombre, precio: prod.precio },
    traduccion: { pendiente: true, manual: [] },
  });
}

const categorias = carta.categorias.map((c) => ({ id: c.id, nombre: c.nombre, visible: true, orden: c.orden, traduccion: { pendiente: false, manual: [] } }));
const actividades = carta.actividades.map((a) => ({ ...a, visible: true, archivada: false, traduccion: { pendiente: false, manual: [] } }));

// ---------- Consultas inventadas: cuatro idiomas, todos los estados, un teléfono británico ----------
const ACT = Object.fromEntries(actividades.map((a) => [a.id, a]));
const telWa = (t) => { let d = String(t).replace(/[^\d+]/g, ''); if (d.startsWith('00')) d = d.slice(2); d = d.replace(/\D/g, ''); return d.length === 9 && /^[6-9]/.test(d) ? '34' + d : d; };
const SALUDO = {
  es: (n, a) => `Hola, ${n}. Soy Daniel, de Los Trotamundos. Hemos recibido tu consulta sobre «${a}».`,
  en: (n, a) => `Hi ${n}, this is Daniel from Los Trotamundos. We've received your enquiry about "${a}".`,
  fr: (n, a) => `Bonjour ${n}, c'est Daniel, de Los Trotamundos. Nous avons bien reçu votre demande concernant « ${a} ».`,
  ca: (n, a) => `Hola, ${n}. Sóc en Daniel, de Los Trotamundos. Hem rebut la teva consulta sobre «${a}».`,
};
const consulta = (n, actividad, nombre, telefono, fecha, personas, idioma, estado, recibida, notas = '') => ({
  id: `con-${n}`, recibida_en: recibida, actividad_id: actividad, actividad: ACT[actividad].nombre.es,
  nombre, telefono, fecha, personas, idioma, estado, notas, aviso_enviado: true,
  whatsapp_url: `https://wa.me/${telWa(telefono)}?text=${encodeURIComponent(SALUDO[idioma](nombre.split(' ')[0], ACT[actividad].nombre[idioma]))}`,
  llamar_url: `tel:+${telWa(telefono)}`,
});
const consultas = [
  consulta(1, 'caballo', 'Ana Martín', '+34 611 222 333', '2026-11-14', '2', 'es', 'nueva', '2026-10-22T18:40:00+02:00'),
  consulta(2, 'senderismo', 'Oliver Bennett', '+44 7700 900123', '2026-11-02', '4', 'en', 'nueva', '2026-10-23T09:15:00+02:00'),
  consulta(3, '4x4', 'Camille Laurent', '+33 6 12 34 56 78', '2026-10-30', '2', 'fr', 'contestada', '2026-10-20T12:05:00+02:00', 'Le he pasado precio. Espera respuesta.'),
  consulta(4, 'caballo', 'Jordi Puig', '622 456 789', '2026-10-26', '3', 'ca', 'confirmada', '2026-10-18T20:31:00+02:00', 'Confirmado con Paco, salida a las 10.'),
  consulta(5, 'senderismo', 'Lucía Romero', '655 987 321', '', '5+', 'es', 'descartada', '2026-10-12T11:47:00+02:00', 'Buscaba algo en enero, ya no hay salidas.'),
  consulta(6, '4x4', 'Marta Gil', '699 111 222', '2026-12-06', '1', 'es', 'contestada', '2026-10-21T16:20:00+02:00'),
];

const panel = {
  _aviso: 'DATOS DE MUESTRA para diseñar el panel. La carta y las actividades son las reales; las consultas, inventadas.',
  gestor: { nombre: 'Daniel', email: 'daniel@example.com' },
  resumen: {
    consultas_nuevas: consultas.filter((c) => c.estado === 'nueva').length,
    platos_ocultos: platos.filter((p) => !p.visible && !p.archivado).length,
    ultima_importacion: '2026-10-20T11:05:00+02:00',
  },
  idiomas: ['es', 'en', 'fr', 'ca'],
  categorias, platos, actividades, consultas,
  estados_consulta: ['nueva', 'contestada', 'confirmada', 'descartada'],
  etiquetas_consulta: { nueva: 'Nueva', contestada: 'Contestada', confirmada: 'Confirmada', descartada: 'Descartada' },
  ajustes: {
    whatsapp: '+34 858 893 777', correos_aviso: ['daniel@example.com'], aviso_consultas_correo: true, nombre_gestor: 'Daniel', traduccion_automatica: false,
    administradores: [{ email: 'daniel@example.com', nombre: 'Daniel', soy_yo: true }, { email: 'dan@example.com', nombre: 'Dan', soy_yo: false }],
  },
  ultima_importacion: { en: '2026-10-20T11:05:00+02:00', archivo: 'Products-20-10-2026.xls', resumen: { nuevos: 3, precios: 5, ocultados: 2 } },
  historial: [
    { en: '2026-10-23T09:16:00+02:00', quien: 'web', accion: 'Nueva consulta de Oliver Bennett: Senderismo en Sierra Nevada' },
    { en: '2026-10-22T12:01:00+02:00', quien: 'Daniel', accion: 'Cambió el precio de Choto a 21 €' },
    { en: '2026-10-21T10:30:00+02:00', quien: 'Daniel', accion: 'Ocultó Zaalouk' },
    { en: '2026-10-20T11:05:00+02:00', quien: 'Daniel', accion: 'Importó la carta de LastApp: 3 platos nuevos, 5 precios' },
    { en: '2026-10-19T19:12:00+02:00', quien: 'Daniel', accion: 'Quitó de la carta Codillo con chucrut' },
  ],
};

// ---------- Vista previa de importación: el export real contra la carta de arriba ----------
const BEBIDAS_Y_EXTRAS = /(brandy|coñac|agua|coca|fanta|aquarius|nestea|zumo|cerveza|alhambra|pinta|ca[nñ]a|vino|copa|tinto|rioja|ribera|crianza|verdejo|rueda|albari|cava|caf[eé]|cortado|americano|carajillo|infusi|\bt[eé]\b|t[oó]nica|absolut|ballantine|barcel[oó]|brugal|bailey|dyc|seagram|puerto de indias|\bron\b|ginebra|gin|whisk|vodka|chupito|licor|hielo|kalimotxo|sprite|schweppes|red ?bull|lata|extra|ingrediente|panera|milka|oreo|chco|creppe|vermut|refresco|bitter|batido|leche|colacao|cola cao|mosto|sidra|jagger|j[aä]ger|hierbas|pacharan|orujo|tequila|martini|smirnoff|beefeater|tanqueray|bombay|larios|cutty|jb\b|johnnie|chivas|jack|havana|cacique|negrita|malibu|passport|grant|botella|vaso|jarra|tercio|botell)/i;
const vinculados = new Map(platos.filter((p) => p.lastapp && !p.archivado).map((p) => [p.lastapp.id, p]));
const sinVincular = platos.filter((p) => !p.lastapp && !p.archivado);
const grupos = { nuevos: [], precio: [], precio_fijo: [], nombre: [], desaparecidos: [], sin_cambios: [], no_web: [] };
for (const prod of productos) {
  const p = vinculados.get(prod.id);
  if (p) {
    if (prod.precio !== p.precio && p.precio_fijo) grupos.precio_fijo.push({ plato_id: p.id, nombre: p.nombre.es, web: p.precio, lastapp: prod.precio });
    else if (prod.precio !== p.precio) grupos.precio.push({ plato_id: p.id, nombre: p.nombre.es, antes: p.precio, despues: prod.precio });
    if (p.lastapp.nombre !== prod.nombre) grupos.nombre.push({ plato_id: p.id, nombre_web: p.nombre.es, antes: p.lastapp.nombre, despues: prod.nombre });
    if (prod.precio === p.precio && p.lastapp.nombre === prod.nombre) grupos.sin_cambios.push({ plato_id: p.id, nombre: p.nombre.es });
  } else if (BEBIDAS_Y_EXTRAS.test(prod.nombre)) {
    grupos.no_web.push({ lastapp_id: prod.id, nombre: prod.nombre });
  } else {
    const parecidos = sinVincular.map((s) => ({ plato_id: s.id, nombre: s.nombre.es, d: dice(s.nombre.es, prod.nombre) }))
      .filter((x) => x.d >= 0.5).sort((a, b) => b.d - a.d).slice(0, 3).map(({ plato_id, nombre }) => ({ plato_id, nombre }));
    const igual = sinVincular.find((s) => norm(s.nombre.es) === norm(prod.nombre));
    grupos.nuevos.push({ lastapp_id: prod.id, nombre: prod.nombre, precio: prod.precio, categoria_lastapp: null, sugerencia: igual ? { destino: 'mismo', plato_id: igual.id } : null, parecidos });
  }
}
// Tras la vinculación inicial, una importación normal trae pocos nuevos: se dejan 12 (primero los que
// tienen parecidos) y el resto cuenta como ya marcado "No va en la web".
grupos.nuevos.sort((a, b) => b.parecidos.length - a.parecidos.length);
for (const n of grupos.nuevos.splice(12)) grupos.no_web.push({ lastapp_id: n.lastapp_id, nombre: n.nombre });
const enArchivo = new Set(productos.map((p) => p.id));
for (const p of vinculados.values()) if (!enArchivo.has(p.lastapp.id)) grupos.desaparecidos.push({ plato_id: p.id, nombre: p.nombre.es, lastapp_nombre: p.lastapp.nombre });

const importacion = {
  id: 'imp-demo', archivo: 'Products-24-07-2026.xls', formato: 'productos', catalogo: null,
  aviso_fuente: null, aviso_incompleto: false, ocultar_desaparecidos_por_defecto: true,
  totales: { filas: productos.length, ...Object.fromEntries(Object.entries(grupos).map(([k, v]) => [k, v.length])) },
  grupos,
};

await writeFile(new URL('uploads/panel-demo.json', raiz), JSON.stringify(panel, null, 2) + '\n');
await writeFile(new URL('uploads/importacion-demo.json', raiz), JSON.stringify(importacion, null, 2) + '\n');
console.log('panel-demo.json:', platos.length, 'platos,', consultas.length, 'consultas');
console.log('importacion-demo.json:', JSON.stringify(importacion.totales));
