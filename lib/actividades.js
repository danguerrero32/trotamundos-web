// Actividades públicas que lee la web, con la forma que pintan sus tarjetas.
import { rest } from './supa.js';
import { idiomasPublicables } from './idiomas.js';
import { telefonoWa } from './telefono.js';

export const ENCUADRE = { arriba: 'top center', centro: 'center', abajo: 'bottom center' };
const WHATSAPP_POR_DEFECTO = '34858893777';

export function actividadAWeb(row) {
  const w = { id: row.id, ico: row.emoji || '', foto: row.foto || '', posicion: ENCUADRE[row.encuadre] || 'center' };
  const idiomas = idiomasPublicables(row);
  for (const l of idiomas) if (row.nombre && row.nombre[l]) w[l] = row.nombre[l];
  for (const l of idiomas) if (row.descripcion && row.descripcion[l]) w['desc_' + l] = row.descripcion[l];
  return w;
}

export async function actividadesPublicas({ s, fetch }) {
  const [filas, aj] = await Promise.all([
    rest(s, fetch, 'actividades?select=id,emoji,foto,encuadre,nombre,descripcion,orden,traduccion&visible=eq.true&archivada=eq.false&order=orden.asc'),
    rest(s, fetch, 'ajustes?select=valor&clave=eq.whatsapp'),
  ]);
  const whatsapp = telefonoWa(aj && aj[0] && aj[0].valor) || WHATSAPP_POR_DEFECTO;
  return { origen: 'bd', whatsapp, actividades: (filas || []).map(actividadAWeb) };
}
