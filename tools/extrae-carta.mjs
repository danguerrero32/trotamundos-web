// Saca de index.html la carta (objeto MD), los nombres de las pestañas y las tarjetas de actividades.
// Lo usan los datos de muestra del panel (genera-demo.mjs) y el SQL inicial (genera-sql-inicial.mjs).
// Uso como script: node tools/extrae-carta.mjs   → imprime el JSON.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const IDIOMAS = ['es', 'en', 'fr', 'ca'];
const ENCUADRE = { top: 'arriba', center: 'centro', bottom: 'abajo' };

const decodificar = (s) => String(s ?? '')
  .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function atributosIdioma(etiqueta) {
  const out = {};
  for (const l of IDIOMAS) {
    const m = etiqueta.match(new RegExp(`data-${l}="([^"]*)"`));
    out[l] = m ? decodificar(m[1]) : '';
  }
  return out;
}

const porIdioma = (item, prefijo) => Object.fromEntries(IDIOMAS.map((l) => [l, item[prefijo + l] || '']));

export function extraerCarta(html) {
  const literal = html.match(/const MD = (\{[\s\S]*?\n\});/);
  if (!literal) throw new Error('No encuentro el objeto MD en index.html');
  const MD = new Function('return ' + literal[1])();

  const menu = html.slice(html.indexOf('<section id="menu">'), html.indexOf('</section>', html.indexOf('<section id="menu">')));
  const categorias = [...menu.matchAll(/<button class="mtab[^"]*"[^>]*>/g)].map((m, i) => ({
    id: m[0].match(/mTab\('([^']+)'/)[1],
    nombre: atributosIdioma(m[0]),
    orden: i + 1,
  }));

  const platos = [];
  for (const cat of categorias) {
    (MD[cat.id] || []).forEach((item, i) => platos.push({
      categoria: cat.id,
      orden: i + 1,
      nombre: Object.fromEntries(IDIOMAS.map((l) => [l, item[l] || ''])),
      descripcion: porIdioma(item, 'desc_'),
      nota_precio: porIdioma(item, 'pnote_'),
      precio: item.p || '',
      emoji: item.ico || '',
    }));
  }

  const seccionAct = html.slice(html.indexOf('<section id="actividades">'), html.indexOf('</section>', html.indexOf('<section id="actividades">')));
  const actividades = seccionAct.split('<div class="act-card"').slice(1).map((bloque, i) => {
    const fondo = bloque.match(/background-image:url\('([^']+)'\);background-position:([a-z]+)/);
    return {
      id: bloque.match(/openModal\('([^']+)'\)/)[1],
      emoji: (bloque.match(/<div class="act-ico">([^<]*)<\/div>/) || [, ''])[1].trim(),
      nombre: atributosIdioma(bloque.match(/<h3 class="act-name"[^>]*>/)[0]),
      descripcion: atributosIdioma(bloque.match(/<p class="act-desc"[^>]*>/)[0]),
      foto: fondo[1],
      encuadre: ENCUADRE[fondo[2]] || 'centro',
      orden: i + 1,
    };
  });

  return { categorias, platos, actividades };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  console.log(JSON.stringify(extraerCarta(html), null, 2));
}
