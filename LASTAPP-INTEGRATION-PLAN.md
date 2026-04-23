# Plan de integración Last.app — Producto web para restaurantes

> Documento generado el 23 de abril de 2026.
> Contexto: Dan Guerrero es developer y distribuidor oficial de Last.app. Este documento define la arquitectura y el plan de desarrollo de un producto replicable que permite a cualquier restaurante cliente añadir carta dinámica, reservas online y pedidos para llevar en su web, conectados en tiempo real con Last.app.
> La web demo de referencia es **Los Trotamundos** (`lostrotamundosalpujarra.com`), alojada en Vercel, repo: `danguerrero32/trotamundos-web`.

---

## 1. Contexto y objetivo

### Qué se quiere construir

Un **producto SaaS replicable** que cualquier restaurante cliente de Last.app pueda activar para tener en su web:

1. **Carta / catálogo dinámico** — sincronizado automáticamente con Last.app. Si el restaurante cambia un precio, descripción o foto en el TPV, la web lo refleja sin intervención.
2. **Widget de reservas** — el cliente final reserva desde la web del restaurante y la reserva aparece directamente en el TPV de Last.app, igual que si viniera de TheFork.
3. **Pedidos para llevar (takeaway)** — el cliente final selecciona productos desde la web y hace un pedido que aparece en el POS de Last.app como un pedido online, diferenciado de las comandas de mesa, gestionable desde el TPV exactamente igual que los pedidos de Glovo o UberEats.

### Por qué es viable

La API REST de Last.app v2 (`https://api.last.app/v2`) expone todos los endpoints necesarios para los tres flujos, incluyendo:
- Lectura completa del catálogo con categorías, productos, imágenes, alérgenos y especificaciones
- Consulta de disponibilidad de reservas por mes y por día (segmentada por zona)
- Creación de reservas con todos los campos relevantes
- Creación de tabs con `pickupType: "takeAway"` o `"ownDelivery"` que el TPV reconoce como pedidos online
- Adición de productos a un tab abierto

### Modelo de negocio / distribución

Dan tiene token de integrador que, en Last.app API v2, cubre **todas las organizations/locations** bajo ese integrador. Esto encaja perfectamente con el modelo SaaS: un único backend controlado por Dan sirve a múltiples restaurantes clientes, cada uno identificado por su `locationId` y `catalogId`.

---

## 2. Arquitectura técnica

### Principio fundamental: el token nunca va al frontend

El token de integrador de Last.app **no puede estar en el HTML ni en JavaScript del navegador** — cualquier visitante podría verlo e impersonar al integrador. La arquitectura correcta es:

```
Navegador del visitante (HTML/JS)
        ↓ llama a
Tu backend proxy (guarda el token de Last.app)
        ↓ llama a
API Last.app (api.last.app/v2)
        ↓ datos van al
TPV Last.app del restaurante
```

El frontend del restaurante solo conoce la URL de tu proxy, nunca las credenciales de Last.app.

### Estructura del proxy por cliente

Cada restaurante cliente tiene su propia instancia de configuración con:
- `LASTAPP_TOKEN` — el token de integrador (el mismo para todos si Dan es el integrador)
- `LASTAPP_LOCATION_ID` — el UUID de la location del restaurante en Last.app
- `LASTAPP_CATALOG_ID` — el UUID del catálogo que se quiere mostrar en la web

### Opción A: Vercel Serverless Functions (para Los Trotamundos demo)

La web ya está en Vercel con un `vercel.json` y estructura de fichero único (`index.html`). Vercel despliega automáticamente cualquier fichero dentro de `/api` como una serverless function. No hace falta migrar ni cambiar el stack.

Estructura resultante:
```
trotamundos-web/
├── index.html
├── vercel.json
├── img/
└── api/
    ├── catalog.js          ← GET /api/catalog
    ├── availability.js     ← GET /api/availability?date=YYYY-MM&diners=N
    ├── availability-day.js ← GET /api/availability-day?date=YYYY-MM-DD&diners=N
    ├── reservations.js     ← POST /api/reservations
    ├── orders.js           ← POST /api/orders (takeaway)
    └── _lastapp.js         ← helper compartido con fetch + auth headers
```

Las variables de entorno se configuran en el panel de Vercel (Settings > Environment Variables), nunca en el código.

### Opción B: Servidor Node.js en VPS con Easypanel (para escalar el producto)

Para servir múltiples restaurantes desde una sola infraestructura controlada por Dan, un servicio Node.js (Express o Hono) en su VPS gestionado con Easypanel es la opción más robusta y económica. Cada restaurante se configura como un "tenant" con su propio subdominio o path, y el panel de Easypanel facilita la gestión de contenedores Docker sin necesidad de DevOps avanzado.

Estructura sugerida para el producto multi-tenant:
```
lastapp-web-proxy/
├── src/
│   ├── index.ts               ← servidor principal (Hono o Express)
│   ├── routes/
│   │   ├── catalog.ts
│   │   ├── reservations.ts
│   │   └── orders.ts
│   ├── lib/
│   │   └── lastapp-client.ts  ← cliente HTTP centralizado
│   └── config/
│       └── tenants.ts         ← mapa locationId / catalogId por cliente
├── Dockerfile
└── docker-compose.yml
```

---

## 3. Endpoints de Last.app relevantes

Base URL: `https://api.last.app/v2`

Autenticación: header `Authorization: Bearer ${token}` en todas las llamadas. Además, en la mayoría de endpoints se requiere el header `LocationId` con el UUID de la location.

### 3.1 Catálogo

#### `GET /catalogs`
Lista los catálogos disponibles para una location.

Query params:
- `locationId` (required, UUID)
- `name` (optional, string)

Respuesta (array de):
```json
{
  "id": "93724e32-195d-49cd-9b0e-96e3dc0945b5",
  "name": "My Catalog",
  "organizationId": "19264e32-195d-49cd-9b0e-96e3dc0945b5",
  "deleted": false
}
```

#### `GET /catalogs/{catalogId}`
Devuelve el catálogo completo con todas las categorías, productos, combos y grupos de modificadores. **Este es el endpoint principal para renderizar la carta.**

Estructura de respuesta:
```json
{
  "id": "string",
  "name": "string",
  "organizationId": "string",
  "deleted": false,
  "modifierGroups": [
    {
      "id": "string",
      "name": "string",
      "min": 1,
      "max": 1,
      "allowRepeat": false,
      "modifiers": [
        {
          "id": "string",
          "name": "string",
          "priceImpact": 0,
          "externalId": "string | null",
          "organizationModifierId": "string"
        }
      ]
    }
  ],
  "categories": [
    {
      "id": "string",
      "name": "string",
      "enabled": true,
      "description": "string",
      "products": [
        {
          "id": "string",
          "name": "string",
          "type": "PRODUCT",
          "description": "string | null",
          "imageUrl": "string",
          "price": 750,
          "vatPercentage": 10,
          "modifierGroups": ["string (IDs)"],
          "allergens": ["EGG", "GLUTEN"],
          "specifications": ["vegetarian", "vegan", "glutenfree", "mild", "medium", "hot"],
          "organizationProductId": "string",
          "externalId": "string | null"
        }
      ]
    }
  ]
}
```

Notas importantes:
- `price` viene en **céntimos** (750 = 7,50 €). Hay que dividir entre 100 para mostrarlo.
- `allergens` es un array de strings con códigos de alérgenos (EGG, GLUTEN, etc.)
- `specifications` tiene valores predefinidos: `vegetarian`, `vegan`, `glutenfree`, `mild`, `medium`, `hot`
- `enabled: false` en una categoría significa que no debe mostrarse en la web
- Los productos también pueden ser de tipo `COMBO` (schema `catalogCombo`)

#### `PUT /catalogs/{catalogId}/products/{productId}`
Permite habilitar/deshabilitar un producto del catálogo (el único campo modificable vía API según la documentación actual). Útil si se quiere gestionar disponibilidad de platos desde la web de administración.

### 3.2 Reservas

#### `GET /reservations/availability/month`
Devuelve los días del mes que tienen disponibilidad para un número de comensales dado. Útil para pintar el calendario con días disponibles/no disponibles.

Query params:
- `locationId` (required, UUID)
- `diners` (required, number)
- `date` (required, formato `YYYY-MM`)

Respuesta: array de fechas ISO con disponibilidad:
```json
[
  "2025-04-23T00:00:00.000+02:00",
  "2025-04-24T00:00:00.000+02:00"
]
```

#### `GET /reservations/availability/day`
Devuelve las franjas horarias disponibles para un día concreto, **segmentadas por zona** (Sala, Terraza, etc.).

Query params:
- `locationId` (required, UUID)
- `diners` (required, number)
- `date` (required, formato `YYYY-MM-DD`)

Respuesta (objeto con zonas como keys):
```json
{
  "terraza": [
    { "start": "15:00", "end": "15:15" },
    { "start": "15:15", "end": "15:30" }
  ],
  "sala": [
    { "start": "12:00", "end": "12:45" }
  ]
}
```

#### `GET /reservations/schedules`
Devuelve los horarios de apertura configurados en Last.app para la location. Útil para mostrar horarios en la web o para validar en el frontend antes de dejar seleccionar fecha.

Query params:
- `locationId` (required, UUID)

Respuesta (objeto con días de la semana como keys):
```json
{
  "thursday": [{ "id": "string", "locationId": "string", "day": "thursday", "start": "08:00", "end": "00:00" }],
  "monday": [...],
  "wednesday": [...],
  "tuesday": [...],
  "friday": [...]
}
```

#### `POST /reservations`
Crea una reserva. Aparece en el TPV de Last.app exactamente igual que una reserva de TheFork u otro canal.

Request body:
```json
{
  "name": "string",
  "surname": "string",
  "locationId": "UUID",
  "externalId": null,
  "phoneNumber": "+34666111444",
  "diners": 2,
  "customerComments": "string | null",
  "source": "Web",
  "email": "string",
  "dateTime": "2024-02-05T14:00:00.000Z",
  "zone": "Sala"
}
```

Notas:
- `source` es el origen que aparece en el TPV. Usar algo identificable como `"Web"` o el nombre del restaurante.
- `zone` debe coincidir con una zona real configurada en Last.app (case insensitive según el ejemplo de la API).
- `externalId` puede usarse para guardar el ID interno de tu sistema si tuvieras uno.

Respuesta (201):
```json
{
  "name": "string",
  "surname": "string",
  "locationId": "UUID",
  "externalId": null,
  "tabId": "UUID",
  "phoneNumber": "+34666111444",
  "diners": 2,
  "customerComments": null,
  "source": "Web",
  "dateTime": "2024-02-05T14:00:00.000Z",
  "cancelled": false,
  "tables": ["UUID"],
  "zone": "sala"
}
```

#### `GET /reservations`
Lista reservas de una location en un rango de fechas. Útil si se quisiera construir un panel de gestión.

#### `PUT /reservations/{reservationId}`
Actualiza una reserva existente.

#### `DELETE /reservations/{reservationId}`
Cancela/elimina una reserva.

### 3.3 Pedidos para llevar (Tabs con pickupType)

En Last.app, la diferencia entre una comanda de mesa y un pedido online es el `pickupType`. Un tab con `pickupType: "takeAway"` o `"ownDelivery"` es lo que el TPV muestra como **orden** (pedido online), diferenciado visualmente de las mesas.

#### `POST /tabs`
Crea un tab (equivalente a abrir un pedido).

Request body relevante para takeaway:
```json
{
  "brandId": "UUID",
  "pickupType": "takeAway",
  "source": "Web",
  "customerName": "string",
  "phoneNumber": "+34666111444",
  "scheduledTime": "2024-02-05T14:00:00.000Z"
}
```

- `brandId` es el ID de la marca dentro de la location (no el locationId). Se obtiene desde `GET /locations/{locationId}`.
- `pickupType` puede ser: `"takeAway"`, `"ownDelivery"`, `"delivery"`. Para click & collect usar `"takeAway"`.
- `source` identifica el origen en el TPV. Usar `"Web"`.

#### `POST /tabs/{tabId}/products`
Añade productos al tab abierto.

Request body:
```json
{
  "products": [
    {
      "productId": "UUID del catalogProduct",
      "quantity": 2,
      "modifiers": ["UUID del modifier (opcional)"],
      "comment": "Sin cebolla"
    }
  ]
}
```

#### `GET /tabs/{tabId}`
Obtiene el estado actual del tab. Útil para confirmar que el pedido se registró correctamente.

#### `DELETE /tabs/{tabId}`
Cancela el tab (pedido cancelado).

---

## 4. Flujo completo de cada funcionalidad

### Flujo A: Mostrar carta

```
1. Frontend carga → llama a GET /api/catalog (tu proxy)
2. Proxy llama a GET /catalogs/{catalogId} en Last.app
3. Proxy devuelve el JSON al frontend (opcionalmente cacheado 5-10 min)
4. Frontend renderiza: itera categorías (solo enabled:true) → productos
5. Para cada producto: muestra nombre, descripción, precio (÷100), imagen, alérgenos, specs
```

Consideraciones de caché: el catálogo no cambia frecuentemente. Cachear en el proxy durante 5-10 minutos reduce llamadas a la API y mejora rendimiento. Si el restaurante activa/desactiva un plato, el cambio es visible en máximo ese tiempo.

### Flujo B: Hacer una reserva

```
1. Usuario selecciona nº de comensales
2. Frontend llama a GET /api/availability?date=YYYY-MM&diners=N
3. Proxy llama a GET /reservations/availability/month → devuelve días disponibles
4. Frontend pinta calendario con días disponibles resaltados
5. Usuario selecciona un día → Frontend llama a GET /api/availability-day?date=YYYY-MM-DD&diners=N
6. Proxy llama a GET /reservations/availability/day → devuelve franjas por zona
7. Frontend muestra franjas horarias (opcionalmente con selector de zona)
8. Usuario rellena nombre, teléfono, email, comentarios y confirma
9. Frontend llama a POST /api/reservations con los datos
10. Proxy llama a POST /reservations en Last.app
11. Last.app crea la reserva → aparece en el TPV
12. Proxy devuelve confirmación al frontend
13. Frontend muestra pantalla de confirmación al usuario
```

### Flujo C: Pedido para llevar

```
1. Usuario navega la carta (mismo componente que Flujo A)
2. Añade productos al carrito (estado local en el frontend)
3. Usuario introduce nombre y teléfono, selecciona hora de recogida
4. Frontend llama a POST /api/orders con los datos del carrito
5. Proxy llama a POST /tabs con pickupType:"takeAway" → obtiene tabId
6. Proxy llama a POST /tabs/{tabId}/products con los productos del carrito
7. Proxy devuelve confirmación con número de pedido al frontend
8. Frontend muestra pantalla de confirmación
9. En el TPV del restaurante aparece el pedido en la sección de órdenes online
```

---

## 5. Plan de desarrollo por fases

### ⚠️ PASO 0 — Antes de escribir código: confirmar con Last.app

**Este es el paso más importante y el primero que hay que hacer.**

Escribir a `integrations@last.app` confirmando:

1. Que como distribuidor/reseller oficial se puede usar la API de integrador para construir un producto replicable para múltiples restaurantes clientes.
2. Que un único token de integrador puede operar sobre las locations de todos los restaurantes clientes (lo que indica la documentación de V2, pero conviene confirmar).
3. Si el proceso de aprobación para pasar a producción (`integrators@last.app`) aplica de alguna manera diferente al ser distribuidor.
4. Si existe alguna documentación adicional o canal de soporte prioritario para distribuidores.

Sin esta confirmación, no tiene sentido invertir tiempo en el desarrollo porque el modelo de uso podría requerir ajustes.

---

### Fase 1 — Proxy backend para Los Trotamundos (demo en Vercel)

**Objetivo:** tener el backend proxy funcionando para la demo, sin cambiar la infraestructura actual.

Tareas:
- Crear carpeta `/api` en el repo `trotamundos-web`
- Implementar `_lastapp.js` como helper con la función `callLastApp(path, options)` que añade los headers de autenticación
- Implementar `api/catalog.js` con caché simple en memoria (o usando la caché de Vercel Edge)
- Implementar `api/availability.js` y `api/availability-day.js`
- Implementar `api/reservations.js`
- Implementar `api/orders.js`
- Configurar variables de entorno en Vercel: `LASTAPP_TOKEN`, `LASTAPP_LOCATION_ID`, `LASTAPP_CATALOG_ID`
- Actualizar `vercel.json` si hace falta (actualmente solo tiene redirects, no debería interferir)

Nota sobre el `vercel.json` actual: tiene una regla que redirige `/reservar` a la home. Habrá que eliminar o modificar esa regla cuando se implemente el widget de reservas como ruta real.

### Fase 2 — Componentes frontend para Los Trotamundos

**Objetivo:** integrar los widgets en el `index.html` existente.

Tareas:
- Sección "Carta" — renderizado de categorías y productos desde la API
  - Filtro por especificaciones (vegano, sin gluten, etc.)
  - Iconos de alérgenos
  - Imágenes de productos si están disponibles en Last.app
- Widget de reservas — flujo completo (calendario → franja horaria → formulario → confirmación)
- Widget de takeaway — carta + carrito + formulario de recogida + confirmación

Decisión de stack: la web actual es HTML/CSS/JS vanilla. Se puede mantener así para no complicar el deploy, o migrar a un componente ligero (Alpine.js, Preact) si la complejidad de los widgets lo justifica.

### Fase 3 — Abstracción del producto (multi-tenant)

**Objetivo:** hacer que el mismo código sirva para cualquier restaurante cliente, no solo Los Trotamundos.

Tareas:
- Extraer el proxy a un repositorio independiente (`lastapp-web-proxy` o similar)
- Diseñar el sistema de configuración por tenant (por subdominio, por API key propia, o por header)
- Dockerizar el servicio
- Desplegar en VPS con Easypanel
- Documentar el proceso de onboarding de un nuevo restaurante cliente

### Fase 4 — Widgets embebibles (el producto final)

**Objetivo:** que un restaurante pueda añadir la carta o las reservas con una sola línea de HTML.

Tareas:
- Construir el bundle JavaScript de los widgets (`lastapp-widgets.js`)
- Diseñar el sistema de configuración por atributos `data-*` en el script tag
- CDN para servir el bundle (puede ser el mismo VPS o un servicio externo)
- Panel de administración simple para Dan: registrar restaurant, obtener snippet

Ejemplo de uso final para el cliente:
```html
<!-- Widget de reservas -->
<script src="https://widgets.tudominio.com/lastapp.js"
        data-client="trotamundos"
        data-widget="reservations"
        data-color="#your-brand-color">
</script>

<!-- Widget de carta -->
<script src="https://widgets.tudominio.com/lastapp.js"
        data-client="trotamundos"
        data-widget="catalog">
</script>
```

### Fase 5 — Panel de administración para Dan

**Objetivo:** poder dar de alta nuevos restaurantes sin tocar código.

Tareas:
- Formulario para registrar nuevo cliente: nombre, locationId, catalogId, color de marca, zonas activas
- Generador de snippet listo para copiar
- Vista de clientes activos
- Gestión de tokens por cliente si se decide modelo de API key propia por restaurante

---

## 6. Estado actual del repo `trotamundos-web`

- **Estructura:** un único `index.html` (70KB), carpeta `/img`, `vercel.json`, `README.md`, `llms.txt`
- **Deploy:** Vercel, conectado al repo de GitHub en rama `main`
- **Dominio:** `lostrotamundosalpujarra.com`
- **Stack actual:** HTML/CSS/JS vanilla, sin framework, sin bundler
- **Vercel.json:** solo redirects, sin rewrites ni configuración de functions. Compatible con añadir `/api` sin modificaciones.
- **Integración Last.app actual:** ninguna. `/reservar` redirige a la home como placeholder.

---

## 7. Consideraciones adicionales

### Rate limits de la API de Last.app

- 1500 requests cada 10 minutos por token/entity
- 15 requests por segundo por token/entity
- El endpoint `/organizations` tiene límite especial: 1 req/segundo

Para el uso previsto (carta cacheada, reservas bajo demanda), estos límites son muy holgados incluso con varios restaurantes activos.

### Actualización de precios/catálogo

Según la FAQ de Last.app: no es posible actualizar precios ni el catálogo completo vía API. El único campo modificable de un producto es su estado (habilitado/deshabilitado). Todo lo demás se gestiona desde el admin de Last.app y la web lo lee automáticamente al ser consultada.

### Webhooks

Last.app soporta webhooks que pueden ser útiles en fases avanzadas:
- `location:integrated` / `location:desintegrated` — cuando un restaurante activa/desactiva la integración
- Eventos de pedidos y pagos para sincronización en tiempo real

Los webhooks se configuran desde el Developer Portal de Last.app.

### Zonas de Los Trotamundos (referencia para las reservas)

Las zonas configuradas en el TPV de Los Trotamundos son:
- Sala Bar
- Comedor
- Barra
- Terraza
- De Pie Exterior

El campo `zone` en `POST /reservations` debe coincidir con el nombre de zona tal como está en Last.app.

---

## 8. Recursos y contactos

| Recurso | Valor |
|---|---|
| API base URL | `https://api.last.app/v2` |
| Documentación API | `https://developers.last.app/docs/index.html` |
| OpenAPI spec | `openapi-lastapp.json` (en este repo) |
| Soporte general | `support@last.app` |
| Soporte integraciones | `integrations@last.app` |
| Developer Portal | `https://developers.last.app` |
| Repo web demo | `https://github.com/danguerrero32/trotamundos-web` |
| Web demo | `https://lostrotamundosalpujarra.com` |
| Deploy actual | Vercel |
