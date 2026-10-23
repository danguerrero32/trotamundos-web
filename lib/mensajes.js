// Textos de WhatsApp de las consultas de actividades, en los cuatro idiomas de la web.
// Módulo puro: lo usa el servidor y lo carga también el navegador (/lib/mensajes.js).
const MESES = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  ca: ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'],
};

/** '2026-11-14' → '14 de noviembre' (es), '14 November' (en), '14 novembre' (fr), "14 de novembre" / "3 d'agost" (ca). */
export function fechaLarga(iso, idioma = 'es') {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const dia = Number(m[3]), mes = (MESES[idioma] || MESES.es)[Number(m[2]) - 1];
  if (idioma === 'en' || idioma === 'fr') return `${dia} ${mes}`;
  if (idioma === 'ca') return /^[aeiou]/i.test(mes) ? `${dia} d'${mes}` : `${dia} de ${mes}`;
  return `${dia} de ${mes}`;
}

const PERSONAS = {
  es: (p) => (p === '1' ? '1 persona' : p === '5+' ? '5 o más personas' : `${p} personas`),
  en: (p) => (p === '1' ? '1 person' : p === '5+' ? '5 or more people' : `${p} people`),
  fr: (p) => (p === '1' ? '1 personne' : p === '5+' ? '5 personnes ou plus' : `${p} personnes`),
  ca: (p) => (p === '1' ? '1 persona' : p === '5+' ? '5 persones o més' : `${p} persones`),
};

/** El mensaje que el cliente manda a Daniel por WhatsApp al pedir información de una actividad. */
export function mensajeConsulta({ nombre, actividad, fecha, personas }, idioma = 'es') {
  const l = PERSONAS[idioma] ? idioma : 'es';
  const f = fechaLarga(fecha, l);
  const gente = PERSONAS[l](String(personas || '2'));
  if (l === 'en') return `Hi, I'm ${nombre}. I'm interested in "${actividad}"${f ? ` on ${f}` : ''} for ${gente}.`;
  if (l === 'fr') return `Bonjour, je m'appelle ${nombre}. Je suis intéressé(e) par « ${actividad} »${f ? ` le ${f}` : ''} pour ${gente}.`;
  if (l === 'ca') return `Hola, em dic ${nombre}. M'interessa «${actividad}»${f ? ` el ${f}` : ''} per a ${gente}.`;
  return `Hola, soy ${nombre}. Me interesa «${actividad}»${f ? ` el ${f}` : ''} para ${gente}.`;
}

/** La respuesta preparada que Daniel manda al cliente desde el panel, en el idioma del cliente. */
export function respuestaConsulta({ nombre, actividad, fecha, gestor }, idioma = 'es') {
  const pila = String(nombre || '').trim().split(/\s+/)[0] || '';
  const f = fechaLarga(fecha, idioma);
  if (idioma === 'en') return `Hi ${pila}, this is ${gestor} from Los Trotamundos. We've received your enquiry about "${actividad}"${f ? ` for ${f}` : ''}.`;
  if (idioma === 'fr') return `Bonjour ${pila}, c'est ${gestor}, de Los Trotamundos. Nous avons bien reçu votre demande concernant « ${actividad} »${f ? ` pour le ${f}` : ''}.`;
  if (idioma === 'ca') return `Hola, ${pila}. T'escriu ${gestor}, de Los Trotamundos. Hem rebut la teva consulta sobre «${actividad}»${f ? ` per al ${f}` : ''}.`;
  return `Hola, ${pila}. Soy ${gestor}, de Los Trotamundos. Hemos recibido tu consulta sobre «${actividad}»${f ? ` para el ${f}` : ''}.`;
}
