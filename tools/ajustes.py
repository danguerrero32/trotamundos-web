#!/usr/bin/env python3
"""Ajustes que se reaplican tras cada exportación del panel desde Claude Design.
Uso: python3 tools/ajustes.py   (desde la raíz del repositorio)
Cada ajuste es idempotente: si ya está aplicado, no hace nada."""
import os, re

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(RAIZ)
PANEL = 'Trotamundos Panel.dc.html'
MARCA = '// --- Conexión del panel con el servidor.'

def leer(p): return open(p, encoding='utf-8').read()
def escribir(p, s): open(p, 'w', encoding='utf-8').write(s)

if not os.path.exists(PANEL):
    raise SystemExit(f'No encuentro {PANEL}')
if os.path.exists('.thumbnail'):
    os.remove('.thumbnail'); print('quitado .thumbnail')

panel = leer(PANEL)

# 1. El botón "Entrar (demo)" de la maqueta no tiene sentido con sesión de verdad.
n = len(panel)
panel = re.sub(r'\s*<button onClick="\{\{ entrarDemo \}\}"[^>]*>Entrar \(demo\)</button>', '', panel)
if len(panel) != n: print('panel: botón de demo quitado')

# 2. Comprobación de los puntos de anclaje que usa el puente (tools/panel-conexion.js).
for ancla, nombre in [('accion(tipo, datos)', 'método accion'), ('data-trota-importar', 'selector de archivo de Importar'),
                      ('aria-label="Cambiar foto"', 'botón de foto'), ("fetch('uploads/panel-demo.json')", 'lectura de los datos de muestra'),
                      ("fetch('uploads/importacion-demo.json')", 'lectura de la vista previa de muestra'), ("'nuevo-'", 'ids de elementos nuevos')]:
    if ancla not in panel: print(f'AVISO: no encuentro "{nombre}" en la maqueta; revisar tools/panel-conexion.js')

# 3. La conexión con el servidor va al final del script del componente (sustituyéndola si ya estaba).
conexion = leer('tools/panel-conexion.js')
m = re.search(r'(<script type="text/x-dc" data-dc-script[^>]*>)(.*?)(</script>)', panel, re.S)
if not m:
    print('AVISO: no encuentro el script del panel')
else:
    js = m.group(2)
    if MARCA in js: js = js[:js.index(MARCA)]
    js = js.rstrip() + '\n\n' + conexion
    panel = panel[:m.start(2)] + js + panel[m.end(2):]
    print('panel: conexión con el servidor añadida')

escribir(PANEL, panel)
print('ajustes aplicados')
