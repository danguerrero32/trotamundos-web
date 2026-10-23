// Número para los enlaces wa.me: solo dígitos, con el prefijo de país. Módulo puro: lo carga también el navegador.
export function telefonoWa(tel) {
  let t = String(tel || '').trim().replace(/[^\d+]/g, '');
  if (t.startsWith('00')) t = t.slice(2);
  const conMas = t.startsWith('+');
  const d = t.replace(/\D/g, '');
  if (!conMas && d.length === 9 && /^[6-9]/.test(d)) return '34' + d;
  if (d.length >= 10 && d.length <= 15) return d;
  return null;
}
