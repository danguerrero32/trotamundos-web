// Genera los datos de muestra con los que Claude Design dibuja el panel, que son también
// el contrato de la API: uploads/panel-demo.json y uploads/importacion-demo.json.
// La carta y las actividades son las reales (de index.html); las consultas, inventadas;
// la importación sale del export real de LastApp del 23/10/2026 cruzado con la carta.
//
// Dos métodos, y de ahí sale quién manda en el precio:
//   - Plato con `lastapp` → lo trae LastApp y el precio es el de LastApp. El panel no lo edita.
//   - Plato con `lastapp: null` → lo subió Daniel a mano y el precio es suyo. Ninguna importación lo toca.
//
// Uso: node tools/genera-demo.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { extraerCarta } from './extrae-carta.mjs';

const raiz = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', raiz), 'utf8');
const filas = JSON.parse(await readFile(new URL('tests/fixtures/lastapp-productos-2026-10-23.json', raiz), 'utf8'));
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

// Productos de LastApp del export real, sin la cabecera. Un nombre puede estar repetido
// con precios distintos ("pulpo a la gallega" a 20 y a 30 €), así que la llave es el Id.
const productos = filas.slice(1).filter((f) => f[0] && f[1]).map((f) => ({ id: f[0], nombre: f[1], precio: precio(f[2]) }));
const porNombre = new Map();
for (const p of productos) if (!porNombre.has(norm(p.nombre))) porNombre.set(norm(p.nombre), p);

// ---------- Platos: los reales de la web ----------
// Estos van a mano: el precio de la web es el suyo y no sale de LastApp (las empanadas se
// venden por unidad y el Entrecote va sin precio). No se vinculan a ningún producto.
const A_MANO = ['Empanada argentina', 'Empanada fugazzeta', 'Entrecote', 'Pan Bao — Pulled pork', 'Pan Bao — Kebab'];
// Vínculos que el nombre exacto no encuentra y que la vinculación inicial hará a mano.
const VINCULO_MANUAL = {
  'Jamón Gran Reserva': 'Jamón alpujarreño gran reserva',
  'Surtido queso alpujarreño': 'Queso alpujarreño',
  'Choto': 'Choto en salsa de almendras',
  'Chuletas Segureñas': 'Chuletas de cordero segureñas',
  'Enchiladas': 'Enchiladas de pollo picantes',
  'Cous-cous': 'Cuscús vegetal',
  'Carpaccio de wagyu': 'carpaccio wagyu',
  'Wok de pollo': 'wok pollo',
  'Codillo con chucrut': 'Codillo de cerdo',
  'Parrillada': 'Parrillada para compartir',
  'Osobuco': 'Osobuco de ternera',
  'Gyozas de langostinos': 'Gyozas de pato o langostino',
  'Margarita': 'Pizza Margarita',
  '4 Quesos': 'Pizza 4 quesos',
  'Carbonara': 'Pizza Carbonara',
  'Fugazzeta': 'Pizza Fugazzeta',
  'De la Sierra': 'Pizza De la sierra',
  'Macarrones a la Boloñesa': 'Tallarines boloñesa',
  'Pasta con salsa de queso': 'Tallarines 4 quesos',
  'Pasta al Pesto': 'Tallarines al pesto',
};
const platos = carta.platos.map((p, i) => {
  const aMano = A_MANO.includes(p.nombre.es);
  const prod = aMano ? null : porNombre.get(norm(VINCULO_MANUAL[p.nombre.es] || p.nombre.es));
  return {
    id: `pl-${i + 1}`, categoria: p.categoria, orden: p.orden,
    nombre: p.nombre, descripcion: p.descripcion, nota_precio: p.nota_precio,
    // El precio de un plato vinculado es el de LastApp; el de un plato a mano, el de la web.
    precio: prod ? prod.precio : p.precio, emoji: p.emoji,
    visible: p.nombre.es !== 'Zaalouk', archivado: p.nombre.es === 'Codillo con chucrut',
    lastapp: prod ? { id: prod.id, nombre: prod.nombre, precio: prod.precio } : null,
  };
});
// Cinco vinculados que en LastApp han subido o bajado desde la última importación: son
// el grupo "Cambian de precio" de la vista previa, que es lo normal en una importación.
const CAMBIAN = { 'Chorizo alpujarreño': '11.00', 'Migas Alpujarreñas': '15.50', 'Pulpo a la gallega': '18.00', 'Margarita': '11.00', 'Hamburguesa de cabra': '15.00' };
for (const p of platos) if (CAMBIAN[p.nombre.es] && p.lastapp) p.precio = CAMBIAN[p.nombre.es];
// Uno vinculado cuyo nombre ha cambiado en LastApp desde la última importación.
const renombrado = platos.find((p) => p.lastapp && p.nombre.es === 'Morcilla alpujarreña') || platos.find((p) => p.lastapp);
renombrado.lastapp = { ...renombrado.lastapp, nombre: 'Morcilla' };
// Uno vinculado a un producto que ya no viene en el export.
const pollo = platos.find((p) => p.nombre.es === 'Pollo mozárabe');
if (pollo) pollo.lastapp = { id: 'demo-ya-no-esta', nombre: 'Pollo mozárabe', precio: '17.00' };
// Tres que entraron en una importación: vienen de LastApp, así que solo tienen el español.
const NUEVOS_IMPORTADOS = [['Pizza Pepperoni', 'pizzapasta', '🍕'], ['Shakshuka', 'vegetarianos', '🍳'], ['torrija', 'deaqui', '🍞']];
for (const [nombre, categoria, emoji] of NUEVOS_IMPORTADOS) {
  const prod = porNombre.get(norm(nombre));
  if (!prod) continue;
  platos.push({
    id: `pl-${platos.length + 1}`, categoria, orden: platos.filter((p) => p.categoria === categoria).length + 1,
    nombre: { ...vacio(), es: prod.nombre }, descripcion: vacio(), nota_precio: vacio(),
    precio: prod.precio, emoji, visible: true, archivado: false,
    lastapp: { id: prod.id, nombre: prod.nombre, precio: prod.precio },
  });
}

const categorias = carta.categorias.map((c) => ({ id: c.id, nombre: c.nombre, visible: true, orden: c.orden }));
const actividades = carta.actividades.map((a) => ({ ...a, visible: true, archivada: false }));

// ---------- Consultas inventadas: cuatro idiomas, todos los estados, un teléfono británico ----------
// El idioma es el del visitante que escribió desde la web, que sigue en cuatro idiomas.
// No tiene nada que ver con la carta: el panel es solo en español.
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
  _aviso: 'DATOS DE MUESTRA para diseñar el panel. La carta y las actividades son las reales; las consultas, inventadas. El panel es solo en español: de los textos se edita la clave es y nada más.',
  gestor: { nombre: 'Daniel', email: 'daniel@example.com' },
  resumen: {
    consultas_nuevas: consultas.filter((c) => c.estado === 'nueva').length,
    platos_ocultos: platos.filter((p) => !p.visible && !p.archivado).length,
    ultima_importacion: '2026-10-20T11:05:00+02:00',
  },
  categorias, platos, actividades, consultas,
  estados_consulta: ['nueva', 'contestada', 'confirmada', 'descartada'],
  etiquetas_consulta: { nueva: 'Nueva', contestada: 'Contestada', confirmada: 'Confirmada', descartada: 'Descartada' },
  ajustes: {
    whatsapp: '+34 858 893 777', correos_aviso: ['daniel@example.com'], aviso_consultas_correo: true, nombre_gestor: 'Daniel',
    administradores: [{ email: 'daniel@example.com', nombre: 'Daniel', soy_yo: true }, { email: 'dan@example.com', nombre: 'Dan', soy_yo: false }],
  },
  ultima_importacion: { en: '2026-10-20T11:05:00+02:00', archivo: 'Products-20-10-2026.xls', resumen: { nuevos: 3, precios: 5, ocultados: 2 } },
  historial: [
    { en: '2026-10-23T09:16:00+02:00', quien: 'web', accion: 'Nueva consulta de Oliver Bennett: Senderismo en Sierra Nevada' },
    { en: '2026-10-22T12:01:00+02:00', quien: 'Daniel', accion: 'Cambió el precio de Empanada argentina a 3,50 €' },
    { en: '2026-10-21T10:30:00+02:00', quien: 'Daniel', accion: 'Ocultó Zaalouk' },
    { en: '2026-10-20T11:05:00+02:00', quien: 'Daniel', accion: 'Subió la carta de LastApp: 3 platos nuevos, 5 precios' },
    { en: '2026-10-19T19:12:00+02:00', quien: 'Daniel', accion: 'Quitó de la carta Codillo con chucrut' },
  ],
};

// ---------- Vista previa de importación: el export real contra la carta de arriba ----------
const BEBIDAS_Y_EXTRAS = /(brandy|coñac|agua|coca|fanta|aquarius|nestea|zumo|cerveza|alhambra|pinta|ca[nñ]a|vino|copa|tinto|rioja|ribera|crianza|verdejo|rueda|albari|cava|protos|resalso|bergasa|palo cortado|caf[eé]|cortado|capuccino|espresso|americano|carajillo|infuci|infusi|\bt[eé]\b|t[oó]nica|chocolate|colacao|cola cao|absolut|ballantine|barcel[oó]|brugal|bailey|dyc|seagram|puerto de indias|\bron\b|ginebra|gin|whisk|vodka|chupito|licor|hielo|kalimotxo|sprite|schweppes|red ?bull|monster|monter|extreme|lata|extra|ingrediente|panera|milka|oreo|kitkat|toblerone|nuii|pirulo|maxi bon|chco|nata|fruta|yogurt|creppe|vermut|refresco|bitter|batido|leche|mosto|sidra|sol y sombra|hierbas|hiervas|pacharan|orujo|tequila|habana|larios|jameson|jack|dewars|jw |carlos tercero|beefeater|botella|vaso|jarra|tercio|men[uú]|sugerencia|tortilla|tostada|shandy|clara|mojito|pachar[aá]n|sangria|sangr[ií]a|guindalera)/i;
// Productos que no van en la web porque ese plato se lleva a mano (las empanadas van por unidad).
const NO_WEB_A_MANO = /(empanada de ternera|empanada de fugazzeta|empanada extra|entrecot de ternera|pan bao)/i;
const vinculados = new Map(platos.filter((p) => p.lastapp && !p.archivado).map((p) => [p.lastapp.id, p]));
const sinVincular = platos.filter((p) => !p.lastapp && !p.archivado);
const grupos = { nuevos: [], precio: [], nombre: [], desaparecidos: [], sin_cambios: [], no_web: [] };
for (const prod of productos) {
  const p = vinculados.get(prod.id);
  if (p) {
    if (prod.precio !== p.precio) grupos.precio.push({ plato_id: p.id, nombre: p.nombre.es, antes: p.precio, despues: prod.precio });
    if (p.lastapp.nombre !== prod.nombre) grupos.nombre.push({ plato_id: p.id, nombre_web: p.nombre.es, antes: p.lastapp.nombre, despues: prod.nombre });
    if (prod.precio === p.precio && p.lastapp.nombre === prod.nombre) grupos.sin_cambios.push({ plato_id: p.id, nombre: p.nombre.es });
  } else if (BEBIDAS_Y_EXTRAS.test(prod.nombre) || NO_WEB_A_MANO.test(prod.nombre)) {
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
  id: 'imp-demo', archivo: 'Products-23-10-2026.csv', formato: 'productos', catalogo: null,
  aviso_fuente: null, aviso_incompleto: false, ocultar_desaparecidos_por_defecto: true,
  totales: { filas: productos.length, ...Object.fromEntries(Object.entries(grupos).map(([k, v]) => [k, v.length])) },
  grupos,
};

await writeFile(new URL('uploads/panel-demo.json', raiz), JSON.stringify(panel, null, 2) + '\n');
await writeFile(new URL('uploads/importacion-demo.json', raiz), JSON.stringify(importacion, null, 2) + '\n');
console.log('panel-demo.json:', platos.length, 'platos,', platos.filter((p) => p.lastapp).length, 'de LastApp,', platos.filter((p) => !p.lastapp).length, 'a mano,', consultas.length, 'consultas');
console.log('importacion-demo.json:', JSON.stringify(importacion.totales));
