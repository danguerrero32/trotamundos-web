// --- Conexión del panel con el servidor. Lo añade tools/ajustes.py al final del script de "Trotamundos Panel.dc.html". ---
// La maqueta de Claude Design no se toca: todo cambio que hace Daniel pasa por su método accion(tipo, datos), que aquí
// se envuelve para mandarlo también a /api/panel/accion. Los datos salen de /api/panel/datos en vez del JSON de muestra,
// el Excel de LastApp se lee en el navegador y se manda a /api/panel/importar, y las fotos suben directas al almacén.
(() => {
  const P = Component.prototype, API = '/api/panel';
  const ESPERA_MS = 900;
  const SHEETJS = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  const esNuevo = (id) => typeof id === 'string' && /^nuevo-/.test(id);
  // Avisos sin ventanas emergentes: una franja arriba, con los colores del panel, que se quita sola o al tocarla.
  const avisar = (t) => {
    try {
      let el = document.getElementById('trota-aviso');
      if (!el) {
        el = document.createElement('div'); el.id = 'trota-aviso';
        el.style.cssText = 'position:fixed;top:12px;left:12px;right:12px;z-index:9999;padding:14px 16px;background:#231A12;color:#F0E6D2;border:1px solid #C88860;border-radius:10px;font:15px/1.4 Merriweather,Georgia,serif;box-shadow:0 8px 24px rgba(0,0,0,.5);cursor:pointer;';
        el.onclick = () => el.remove();
        document.body.appendChild(el);
      }
      el.textContent = t;
      clearTimeout(el._t); el._t = setTimeout(() => el.remove(), 8000);
    } catch (e) { console.warn('[panel]', t); }
  };

  const post = (ruta, cuerpo) => fetch(API + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(cuerpo || {}) })
    .then((r) => r.json().catch(() => ({})).then((j) => ({ ok: r.ok && j.ok !== false, status: r.status, j })), () => ({ ok: false, status: 0, j: {} }));

  // Las lecturas de la maqueta (fetch de los JSON de muestra) se redirigen a la API. Se instala una sola vez y para siempre,
  // porque la vista previa de importación también se pide con fetch desde elegirArchivo().
  const fetchOriginal = window.fetch;
  let vistaPendiente = null; // promesa de la vista previa real del archivo que se acaba de elegir
  window.fetch = function (u, ...a) {
    const url = typeof u === 'string' ? u : (u && u.url) || '';
    if (/uploads\/panel-demo\.json$/.test(url)) {
      return fetchOriginal(API + '/datos', { credentials: 'same-origin' }).then((r) => {
        const comp = window.__trotaPanel;
        if (r.status === 401) {
          if (comp) comp.setState({ vista: 'entrada', d: null });
          try { if (location.hash && location.hash !== '#enlace-caducado') history.replaceState(null, '', location.pathname); } catch (e) {}
          return new Promise(() => {}); // sin sesión: la maqueta se queda en Entrada y no espera datos
        }
        if (!r.ok) { avisar('No se han podido cargar los datos del panel. Recarga la página en un momento.'); return new Promise(() => {}); }
        return r;
      });
    }
    if (/uploads\/importacion-demo\.json$/.test(url)) {
      const p = vistaPendiente || Promise.reject(new Error('sin archivo'));
      vistaPendiente = null;
      return p.then((vista) => ({ ok: true, status: 200, json: () => Promise.resolve(vista) }));
    }
    return fetchOriginal.call(this, u, ...a);
  };

  const mount = P.componentDidMount;
  P.componentDidMount = function () {
    window.__trotaPanel = this;
    this._sync = { reales: {}, pendientes: {}, creando: {}, cola: {}, timers: {} };
    mount.call(this);
    if (location.hash === '#enlace-caducado') {
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
      setTimeout(() => avisar('Ese enlace ya no vale: ha caducado o ya se usó. Pide otro con tu correo.'), 300);
    }
  };

  P._idReal = function (id) { return (this._sync.reales && this._sync.reales[id]) || id; };

  P._recargar = function () {
    return fetchOriginal(API + '/datos', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && d.categorias) this.setState({ d }); }).catch(() => {});
  };

  // Manda una acción ya traducida (ids reales, forma de la API). Un 401 significa que la sesión se ha ido.
  P._mandar = function (tipo, datos) {
    return post('/accion', { tipo, datos }).then((x) => {
      if (x.status === 401) { avisar('Tu sesión ha caducado. Vuelve a pedir el enlace con tu correo.'); location.reload(); return x; }
      if (!x.ok) { console.warn('[panel] no guardado', tipo, x.j); avisar((x.j && x.j.error) || 'No se ha podido guardar ese cambio. Inténtalo de nuevo.'); }
      return x;
    });
  };

  // Lo que la maqueta llama "orden" (lista de ids) la API lo llama "ids"; la foto de muestra (blob:) no se manda.
  function traducir(tipo, datos, idReal) {
    const d = { ...datos };
    if (d.id !== undefined) d.id = idReal(d.id);
    if (/\.ordenar$/.test(tipo)) { const ids = (d.orden || d.ids || []).map(idReal).filter((x) => !esNuevo(x)); delete d.orden; d.ids = ids; }
    if (tipo === 'actividad.archivar' && d.archivada === undefined) d.archivada = true;
    if (tipo === 'acceso.anadir') delete d.id;
    if (tipo === 'plato.guardar') { delete d.lastapp; delete d.archivado; delete d.orden; }
    if (tipo === 'actividad.guardar') { delete d.archivada; delete d.orden; if (typeof d.foto === 'string' && /^blob:/.test(d.foto)) delete d.foto; }
    if (tipo === 'categoria.guardar') delete d.orden;
    return d;
  }
  const fusionar = (base, extra) => {
    const r = { ...base };
    for (const k of Object.keys(extra)) {
      const v = extra[k];
      r[k] = v && typeof v === 'object' && !Array.isArray(v) && r[k] && typeof r[k] === 'object' ? { ...r[k], ...v } : v;
    }
    return r;
  };
  const DEBOUNCE = /^(plato|categoria|actividad)\.guardar$|^consulta\.notas$/;
  const CREA = { 'plato.guardar': true, 'categoria.guardar': true, 'actividad.guardar': true };
  const soloId = (d) => Object.keys(d).every((k) => k === 'id');

  // Un elemento nuevo en la maqueta (id "nuevo-…") se da de alta en el servidor cuando ya tiene nombre; hasta entonces se
  // acumula lo que Daniel va escribiendo. Las acciones que lleguen mientras tanto (ocultar, ordenar…) esperan en cola.
  P._crear = function (tipo, idLocal) {
    const S = this._sync, datos = S.pendientes[idLocal];
    if (!datos || S.creando[idLocal] || S.reales[idLocal]) return;
    if (!datos.nombre || !String(datos.nombre.es || '').trim()) return; // aún sin nombre: no hay nada que crear
    S.creando[idLocal] = true;
    const cuerpo = { ...traducir(tipo, datos, (x) => x), id: null };
    this._mandar(tipo, cuerpo).then((x) => {
      S.creando[idLocal] = false;
      if (!x.ok || !x.j.id) return;
      S.reales[idLocal] = x.j.id;
      S.pendientes[idLocal] = null;
      // La maqueta sigue usando el id local; en los datos reales el servidor ya tiene el id definitivo.
      const cola = S.cola[idLocal] || []; S.cola[idLocal] = [];
      for (const [t, d] of cola) this._enviar(t, d);
      // Si Daniel siguió escribiendo mientras se creaba, lo que cambió después se manda ahora.
      if (S.pendientes[idLocal]) { const resto = S.pendientes[idLocal]; S.pendientes[idLocal] = null; this._enviar(tipo, { ...resto, id: idLocal }); }
    });
  };

  P._enviar = function (tipo, datos) {
    const S = this._sync, id = datos && datos.id;
    if (esNuevo(id) && !S.reales[id]) {
      if (CREA[tipo]) {
        S.pendientes[id] = fusionar(S.pendientes[id] || {}, datos);
        if (S.creando[id]) return; // se mandará al terminar la creación
        clearTimeout(S.timers['crear:' + id]);
        S.timers['crear:' + id] = setTimeout(() => this._crear(tipo, id), ESPERA_MS);
        return;
      }
      (S.cola[id] = S.cola[id] || []).push([tipo, datos]);
      return;
    }
    const cuerpo = traducir(tipo, datos, (x) => this._idReal(x));
    if (CREA[tipo] && soloId(cuerpo)) return;
    if (DEBOUNCE.test(tipo)) {
      const k = tipo + ':' + id;
      S.pendientes[k] = fusionar(S.pendientes[k] || {}, cuerpo);
      clearTimeout(S.timers[k]);
      S.timers[k] = setTimeout(() => { const d = S.pendientes[k]; S.pendientes[k] = null; if (d) this._mandar(tipo, d); }, ESPERA_MS);
      return;
    }
    this._mandar(tipo, cuerpo);
  };

  const accionOriginal = P.accion;
  P.accion = function (tipo, datos) {
    if (tipo === 'importacion.aplicar') return this._aplicarImportacion(datos);
    accionOriginal.call(this, tipo, datos);
    try { this._enviar(tipo, datos || {}); } catch (e) { console.error('[panel]', e); }
  };

  // Aplicar una importación: lo hace la base de datos de una vez. Después se vuelven a leer los datos reales.
  P._aplicarImportacion = function (datos) {
    if (this._aplicando) return;
    this._aplicando = true;
    this.setState({ cargandoImp: true });
    post('/importar', { paso: 'aplicar', id: datos.id, decisiones: datos.decisiones }).then((x) => {
      this._aplicando = false;
      if (x.status === 401) { avisar('Tu sesión ha caducado. Vuelve a pedir el enlace con tu correo.'); location.reload(); return; }
      if (!x.ok) {
        avisar((x.j && x.j.error) || 'No se ha podido aplicar la importación. Vuelve a subir el archivo.');
        this.setState({ cargandoImp: false, impFase: 'subir', imp: null, dec: null });
        return this._recargar();
      }
      const r = x.j.resumen || {};
      const n = (v, s, p) => v + ' ' + (v === 1 ? s : p);
      const texto = [n(r.nuevos || 0, 'plato nuevo', 'platos nuevos'), n(r.precios || 0, 'precio', 'precios'), n(r.ocultados || 0, 'ocultado', 'ocultados')].join(', ');
      this.setState({ cargandoImp: false, impFase: 'hecho', impResultado: texto, imp: null, dec: null });
      return this._recargar();
    });
  };

  // Entrada y salida: la maqueta solo cambia su estado; aquí se avisa al servidor.
  const update = P.componentDidUpdate;
  P.componentDidUpdate = function (pp) {
    if (update) update.call(this, pp);
    const S = this.state, ps = this._prevState || S;
    this._prevState = S;
    if (ps === S) return;
    if (S.enviado && !ps.enviado && S.email) {
      post('/entrar', { email: S.email.trim() }).then((x) => {
        if (!x.ok) { avisar((x.j && x.j.error) || 'No se ha podido enviar el enlace. Revisa el correo e inténtalo otra vez.'); this.setState({ enviado: false }); }
      });
    }
    // Con sesión y sin una vista en la dirección, se entra a Inicio (la maqueta arranca siempre en Entrada).
    if (S.d && !ps.d && S.vista === 'entrada' && !/^#(inicio|carta|importar|actividades|consultas|ajustes)/.test(location.hash)) this.ir('inicio');
    if (S.vista === 'entrada' && ps.vista !== 'entrada' && ps.d) { post('/salir'); this.setState({ d: null, enviado: false }); }
  };

  // Importar: el archivo se lee en el navegador con SheetJS y la vista previa la calcula el servidor.
  let sheetjs = null;
  const cargarSheetJS = () => sheetjs || (sheetjs = new Promise((ok, mal) => {
    if (window.XLSX) return ok(window.XLSX);
    const s = document.createElement('script'); s.src = SHEETJS; s.onload = () => ok(window.XLSX); s.onerror = () => { sheetjs = null; mal(new Error('No se ha podido cargar el lector de Excel.')); };
    document.head.appendChild(s);
  }));
  async function leerFilas(file) {
    const XLSX = await cargarSheetJS();
    // Un CSV se lee como texto (UTF-8) para que no se estropeen las tildes ni el símbolo del euro; un .xls/.xlsx, en binario.
    const wb = /\.csv$/i.test(file.name)
      ? XLSX.read(await file.text(), { type: 'string', raw: false })
      : XLSX.read(await file.arrayBuffer(), { type: 'array', raw: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }).map((f) => f.map((c) => String(c ?? '')));
  }
  document.addEventListener('change', (e) => {
    const inp = e.target; if (!inp || !inp.matches || !inp.matches('input[data-trota-importar]')) return;
    const file = inp.files && inp.files[0]; if (!file) return;
    const comp = window.__trotaPanel;
    vistaPendiente = (async () => {
      const filas = await leerFilas(file);
      const { normalizarExport } = await import('/lib/lastapp.js');
      const n = normalizarExport(filas, file.name);
      if (!n.ok) throw new Error(n.error);
      const x = await post('/importar', { paso: 'vista_previa', archivo: file.name, filas });
      if (x.status === 401) { avisar('Tu sesión ha caducado. Vuelve a pedir el enlace con tu correo.'); location.reload(); throw new Error('401'); }
      if (!x.ok) throw new Error((x.j && x.j.error) || 'No se ha podido leer el archivo.');
      return x.j;
    })().catch((err) => {
      avisar(err && err.message ? err.message : 'No se ha podido leer el archivo.');
      if (comp) comp.setState({ cargandoImp: false, impFase: 'subir', imp: null, dec: null });
      return new Promise(() => {}); // la maqueta se queda esperando una vista previa que ya no llega
    });
  }, true);

  // Foto de una actividad: se reduce en el navegador y se sube directa al almacén con una URL firmada.
  async function reducir(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = url; });
      const max = 1600, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
    } finally { URL.revokeObjectURL(url); }
  }
  document.addEventListener('change', async (e) => {
    const inp = e.target; if (!inp || !inp.matches || !inp.matches('label[aria-label="Cambiar foto"] input[type="file"]')) return;
    const file = inp.files && inp.files[0]; if (!file) return;
    const comp = window.__trotaPanel, id = comp && comp.state.abierto; if (!id) return;
    if (esNuevo(id) && !comp._sync.reales[id]) { avisar('Escribe primero el nombre de la actividad y espera un segundo; luego pon la foto.'); return; }
    const blob = await reducir(file).catch(() => null);
    if (!blob) { avisar('No se ha podido leer esa foto. Prueba con otra.'); return; }
    const x = await post('/foto', { id: comp._idReal(id), nombre: file.name, tipo: 'image/jpeg' });
    if (!x.ok) { avisar('No se ha podido preparar la subida de la foto.'); return; }
    const up = await fetchOriginal(x.j.subir, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: blob }).catch(() => null);
    if (!up || !up.ok) { avisar('No se ha podido subir la foto. Prueba con otra o más tarde.'); return; }
    comp.accion('actividad.guardar', { id, foto: x.j.publica });
  }, true);
})();
