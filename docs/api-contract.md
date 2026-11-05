# Safety Desarrollo — contrato de la API

Fecha: 2026-10-29 · Fuente de verdad para backend (`backend/src/modules/safetyDev/`) y frontend (`apps/safety-desarrollo/`).
Spec: `docs/specs/2026-10-29-safety-desarrollo-design.md`. SQL: `backend/changes/db/2026-10-29_safety-desarrollo.sql`.
Lógica pura y validadores: `backend/src/modules/safetyDev/safetyDev.domain.js` (las rutas DEBEN usarla; no duplicar reglas).

## 0. Convenciones

- Base: `/api/safety-dev`. Todas las rutas con `authRequired` + `requireAppAccess(40)` (token del portal en `Authorization: Bearer …`).
  Sin token → 401 (middleware del portal); sin acceso a la app → 403 (middleware del portal).
- JSON en **camelCase**; BD en **snake_case**. La conversión fila → JSON se hace con `domain.toApi(entity, row)`; la entrada se valida con
  `domain.validateX(body, opts)` que devuelve `{ ok, errors, value }` con `value` en columnas de BD.
- Tipos en JSON: ids enteros; importes y decimales como **número** (no string); booleanos `true/false`; fechas `"YYYY-MM-DD"` o `null`;
  marcas de tiempo (`createdAt`, `updatedAt`, `hechoEn`) ISO 8601 (`"2026-10-29T10:00:00.000Z"`).
- Todas las entidades llevan `id`, `createdAt`, `updatedAt`.
- Los textos opcionales vacíos se devuelven como `""` (columnas NOT NULL) o `null` (columnas NULL); ver cada forma.
- Entrada parcial en `PUT`: solo se cambian los campos presentes en el cuerpo (`{ partial: true }`).
- SQL siempre parametrizado (`?`). Los filtros se validan contra los enums de `domain.ENUMS` antes de usarse.
- Toda escritura añade una entrada en `safety_dev_history` (ver §9) dentro de la misma petición.

### Errores

Siempre `{ "error": "<código>", "message": "<texto en español>" }` más campos opcionales:

| HTTP | `error` | Cuándo | Campos extra |
|---|---|---|---|
| 400 | `validation` | Cuerpo o filtro no válido | `fields: { campo: "mensaje" }` (claves camelCase de la entrada) |
| 400 | `comment_required` | `/advance` con entregables obligatorios pendientes y sin comentario | `fields: { comentario }`, `pendientes: n` |
| 403 | `forbidden` | El rol no permite la operación (o un responsable cambia campos bloqueados) | — |
| 404 | `not_found` | Proyecto, recurso anidado (o que no pertenece a ese proyecto), documento sin fichero | — |
| 409 | `conflict` | Nombre duplicado (`ER_DUP_ENTRY`), fabricante/familia en uso al borrar | `reason: "duplicate" \| "in_use"` |
| 413 | `file_too_large` | Fichero > 25 MB | — |
| 503 | `schema_missing` | Faltan tablas (`ER_NO_SUCH_TABLE`), como Innovation Tracker | sin `message` obligatorio |

Mensajes tipo: `"No tienes permiso para esta acción."`, `"Proyecto no encontrado."`, `"Ya existe un proyecto con ese nombre."`,
`"Revisa los campos marcados."` (para `validation`).

### Roles (spec §4.4)

`domain.resolveRole({ isAppAdmin, userId, project, people, actions })` → `admin | responsable | lector` (solo cuentan las
acciones abiertas: `pendiente`/`enviado`), y
`domain.canEdit(role, entidad)` con estas entidades:

| Entidad | admin | responsable | lector |
|---|---|---|---|
| `projectCreate`, `projectDelete`, `projectLocked` (camino, fase, designerId, sourcingId, homologationId), `phaseAdvance`, `caminoChange` | ✔ | — | — |
| `suppliers` (directorio), `people`, `families`, `familyFields`, `templates`, `seed` | ✔ | — | — |
| `project` (datos generales), `phases` (fechas), `products`, `deliverables`, `actions`, `projectSuppliers`, `quotes`, `budget`, `certifications`, `documents` | ✔ | ✔ (solo sus proyectos) | — |

Lectura (todos los GET, descarga de documentos y `/export`): cualquier usuario con acceso a la app.
`isAppAdmin` = `findAppAdminFlag(req.user.id, users.role_id, 40)` (patrón de `calculadoraPva.routes.js`).

---

## 1. Formas de las entidades (JSON)

```jsonc
// Family
{ "id": 1, "code": "borde", "nombre": "Protección de borde (TEPS/SPPB)", "anclaEspecialista": "#eps", "orden": 1, "activo": true,
  "createdAt": "…", "updatedAt": "…",
  "fields": [ FamilyField ] }            // solo en /bootstrap y GET /families

// FamilyField
{ "id": 10, "familyCode": "plataformas", "key": "ratio_carga_peso", "label": "Ratio carga/peso", "type": "number",   // number|text|bool|select
  "unit": "", "options": null /* o ["fija","retráctil"] */, "calculado": true, "orden": 5, "createdAt": "…", "updatedAt": "…" }

// Person
{ "id": 3, "nombre": "Javier Martín", "papel": "R&D Project Manager", "empresa": "Alsina HQ", "email": "", "portalUserId": null,
  "activo": true, "createdAt": "…", "updatedAt": "…" }

// Supplier (directorio)
{ "id": 7, "nombre": "Strumin", "pais": "Polonia", "region": "Europa", "tipo": "proveedor",   // competidor|proveedor|ambos|laboratorio
  "web": "https://…", "contacto": "Joanna Budzowska-Wójcik", "email": "", "telefono": "", "notas": null, "homologadoSistema": false,
  "createdAt": "…", "updatedAt": "…" }

// Template (plantilla de entregable)
{ "id": 1, "camino": "oem", "fase": "busqueda", "texto": "Lista de fabricantes candidatos", "obligatorio": true, "orden": 2,
  "createdAt": "…", "updatedAt": "…" }

// Project
{ "id": 12, "codigo": "I-114", "nombre": "PVA 2 «Pantalla de Vida Plus»", "familyCode": "pva",
  "camino": "propio",                       // propio|oem
  "faseActual": "aprovisionamiento",        // ver domain.PHASES_BY_CAMINO
  "estado": "activo",                       // activo|en_pausa|terminado|cancelado
  "prioridad": "alta",                      // alta|media|baja
  "gama": null,                             // premium|estandar|economica|null
  "modalidad": "venta_alquiler",            // venta|alquiler|venta_alquiler|null
  "centroDiseno": "Alsina HQ", "mercados": "España, Filipinas", "fechaObjetivo": "2027-01-15", "descripcion": "…" /* o null */,
  "designerId": 3, "sourcingId": null, "homologationId": 3, "sharepointUrl": "",
  "createdBy": 1, "createdAt": "…", "updatedAt": "…" }

// Product
{ "id": 4, "projectId": 12, "nombre": "Guía vertical 3 m", "componente": "guía", "codigoAlsina": null,
  "origen": "propio",                       // propio|oem|componente_comprado
  "specs": { "altura_m": 3, "clase_en13374": "A+B" },   // claves = FamilyField.key; libres permitidas; calculados recalculados
  "pesoKg": 12.5, "dimsTransporte": "3000×200×100", "udsPorCamion": null,
  "piezasTransporte": [ { "nombre": "Base", "pesoKg": 142.6, "dims": "4900×900×300" } ],
  "notas": null, "createdAt": "…", "updatedAt": "…" }

// Phase
{ "id": 30, "projectId": 12, "fase": "mvp", "orden": 3, "fechaObjetivo": "2026-12-01", "fechaInicio": "2026-08-01", "fechaFin": "2026-10-29",
  "estado": "hecha",                        // pendiente|en_curso|hecha|saltada
  "createdAt": "…", "updatedAt": "…" }

// Deliverable
{ "id": 55, "projectId": 12, "fase": "mvp", "texto": "Ensayo según norma", "obligatorio": true, "orden": 1,
  "hecho": true, "hechoPor": 1, "hechoEn": "2026-10-29T09:12:00.000Z", "createdAt": "…", "updatedAt": "…" }

// Approval (historial de cambios de fase)
{ "id": 2, "projectId": 12, "tipo": "avance",            // avance|retroceso|cambio_camino
  "deFase": "mvp", "aFase": "aprovisionamiento", "deCamino": null, "aCamino": null,
  "pendientes": 1, "aprobadoPor": 1, "aprobadoPorNombre": "Jesús Gómez", "comentario": "Falta manual, se acepta",
  "createdAt": "…", "updatedAt": "…" }
// aprobadoPorNombre = users.name (LEFT JOIN users) o null

// Action
{ "id": 80, "projectId": 12, "fase": null, "texto": "Pedir desglose de códigos y pesos", "ownerId": 5,
  "fechaLimite": "2026-11-15", "estado": "pendiente",   // pendiente|enviado|hecho|cancelado
  "origen": "MoM 27/10/2026", "createdBy": 1, "vencida": false, "createdAt": "…", "updatedAt": "…" }
// vencida = domain.isActionOverdue(action, hoy)

// ProjectSupplier (relación proyecto-fabricante)
{ "id": 6, "projectId": 12, "supplierId": 7, "productId": null,
  "rol": "candidato_oem",                   // candidato_oem|fabricante|proveedor_componente|laboratorio|referencia
  "estado": "oferta",                       // identificado|contactado|oferta|muestras|ensayos|homologado|pedido|aparcado|descartado
  "notas": null, "supplierNombre": "Strumin", "supplierPais": "Polonia",
  "quotes": [ Quote ],                      // orden: fecha DESC, id DESC
  "lastQuote": Quote | null,                // = quotes[0]
  "createdAt": "…", "updatedAt": "…" }

// Quote
{ "id": 9, "projectSupplierId": 6, "referencia": "0051006710", "fecha": "2026-07-20", "validez": "2026-12-30",
  "incoterm": "FCA", "plazoTexto": "2 meses", "moneda": "EUR", "importe": 49216, "notas": null,
  "createdAt": "…", "updatedAt": "…" }

// BudgetLine
{ "id": 20, "projectId": 12, "tipo": "compra_inicial",   // prototipaje|compra_inicial|ensayos|utillaje|otros
  "concepto": "32 × Modulo 18", "supplierId": 7, "unidades": 32, "precioUnitario": 1538, "porte": 3500, "moneda": "EUR",
  "previsto": 52716,                        // = unidades×precioUnitario+porte si hay ambos (lo fija el servidor), si no manual
  "real": null,                             // columna BD importe_real
  "estado": "previsto",                     // previsto|comprometido|pagado
  "createdAt": "…", "updatedAt": "…" }

// Certification
{ "id": 3, "projectId": 12, "productId": null, "norma": "UNE-EN 13374", "clase": "C", "laboratorio": "DEKRA", "laboratorioId": 15,
  "estado": "en_ensayo",                    // pendiente|en_ensayo|superado|fallido|certificado
  "fechaInforme": null, "notas": null, "createdAt": "…", "updatedAt": "…" }

// Document
{ "id": 40, "projectId": 12, "productId": null, "supplierId": null,
  "tipo": "manual",                         // plano|despiece|manual|certificado|oferta|ficha|presentacion|foto|otro
  "titulo": "Manual de montaje", "url": null, "hasFile": true, "fileName": "manual.pdf", "mime": "application/pdf", "size": 120334,
  "subidoPor": 1, "downloadUrl": "/api/safety-dev/documents/40/file",   // null si es enlace
  "createdAt": "…", "updatedAt": "…" }
// file_path NUNCA sale en JSON.

// HistoryEntry
{ "id": 500, "projectId": 12, "entidad": "action", "entidadId": 80, "accion": "update",
  "detalle": { "cambios": { "estado": { "antes": "pendiente", "despues": "hecho" } } },
  "userId": 1, "userName": "Jesús Gómez", "createdAt": "…" }

// Kpis (por proyecto) = domain.projectKpis(...)
{ "accionesAbiertas": 3, "accionesVencidas": 1, "entregablesHechos": 7, "entregablesTotal": 22,
  "entregablesFaseHechos": 2, "entregablesFaseTotal": 5,
  "presupuesto": { "EUR": { "previsto": 52716, "real": 0, "desviacion": -52716, "lineas": 1 } },
  "semaforo": "ambar" }                     // verde|ambar|rojo|gris (domain.projectSignal)

// Totales (totalsByCurrency): { "<MONEDA>": { "previsto": n, "real": n, "desviacion": real-previsto, "lineas": n } }
```

---

## 2. Bootstrap

### `GET /bootstrap` — todos

```jsonc
{
  "user": { "id": 1, "name": "Jesús Gómez", "email": "jgomezc@alsina.com" },   // de req.user
  "isAppAdmin": true,
  "myPersonIds": [3],                       // personas con portalUserId = user.id
  "families": [ Family /* con fields[] ordenados por orden */ ],   // todas (activas e inactivas), orden ASC
  "people": [ Person ],                     // todas, orden nombre ASC (el frontend filtra activo)
  "suppliers": [ Supplier ],                // orden nombre ASC
  "templates": [ Template ],                // orden camino, fase, orden
  "catalog": {
    "caminos": ["propio", "oem"],
    "caminoLabels": { "propio": "Desarrollo propio", "oem": "Fabricante OEM" },
    "phasesByCamino": { "propio": ["ideacion", …], "oem": ["busqueda", …] },
    "phaseLabels": { "ideacion": "Ideación", … },
    "enums": domain.ENUMS,                  // { projectEstado: [...], prioridad: [...], ... }
    "enumLabels": domain.ENUM_LABELS,
    "empresas": ["Alsina HQ", "MEC India", "MEC China", "Externo"],
    "signalWarningDays": 15
  },
  "today": "2026-10-29"                     // fecha del servidor (Europe/Madrid)
}
```

---

## 3. Proyectos

### `GET /projects` — todos

Filtros (query, todos opcionales; valor no válido → 400 `validation`):
`familia` (family code), `camino`, `fase`, `estado`, `responsable` (id de persona: coincide con designerId, sourcingId,
homologationId o ownerId de alguna acción abierta del proyecto), `q` (texto en nombre o código).

```jsonc
{
  "projects": [
    { ...Project,
      "faseFechaObjetivo": "2026-12-01",    // fechaObjetivo de la fase actual (o null)
      "kpis": Kpis,
      "role": "responsable"                 // rol del usuario en ese proyecto
    }
  ]
}
```
Orden: prioridad (alta, media, baja), luego nombre ASC. Los KPI se calculan con `domain.projectKpis` pasando `project` con `faseFechaObjetivo`.

### `GET /projects/:id` — todos · ficha completa

```jsonc
{
  "project": { ...Project, "faseFechaObjetivo": "2026-12-01" },
  "role": "admin",
  "permissions": domain.permissionsFor(role),   // { role, project: true, products: true, phaseAdvance: true, ... }
  "kpis": Kpis,
  "products": [ Product ],                  // orden id ASC
  "phases": [ Phase ],                      // orden ASC
  "deliverables": [ Deliverable ],          // orden fase(orden de la fase), orden, id
  "approvals": [ Approval ],                // created_at DESC
  "actions": [ Action ],                    // abiertas primero, luego fechaLimite ASC (null al final), id
  "suppliers": [ ProjectSupplier ],         // con quotes[] y lastQuote; orden estado y supplierNombre
  "budget": {
    "lines": [ BudgetLine ],                // orden tipo, id
    "totalsByCurrency": { "EUR": {…} },     // domain.totalsByCurrency
    "totalsByType": { "compra_inicial": { "EUR": {…} } }   // domain.totalsByTypeAndCurrency
  },
  "certifications": [ Certification ],
  "documents": [ Document ],                // created_at DESC
  "history": [ HistoryEntry ]               // últimas 50, created_at DESC
}
```
404 si no existe.

### `POST /projects` — admin (`projectCreate`)

Cuerpo: campos de `Project` editables (`nombre`*, `familyCode`*, `camino`*, `codigo`, `estado`, `prioridad`, `gama`, `modalidad`,
`centroDiseno`, `mercados`, `fechaObjetivo`, `descripcion`, `designerId`, `sourcingId`, `homologationId`, `sharepointUrl`) más opcionales:
- `faseActual`: fase inicial del camino (por defecto la primera). Las anteriores quedan `saltada`.
- `phaseTargets`: `{ "<fase>": "YYYY-MM-DD" }` fechas objetivo por fase.

Efectos: inserta el proyecto (`fase_actual`, `created_by`), crea sus fases (`domain.buildInitialPhases`) y copia los entregables
de la plantilla de su camino (`domain.deliverablesFromTemplates`). Historial `project/create`.
Valida `familyCode` existente y que las personas existan (si no → 400 `validation` con el campo).
Respuesta **201**: la misma forma que `GET /projects/:id`. Nombre repetido → 409 `conflict` `reason: "duplicate"`.

### `PUT /projects/:id` — admin o responsable (`project`)

Cuerpo parcial con los mismos campos editables. `camino` y `faseActual` se **ignoran** (usar `/advance`).
Si un responsable envía `designerId`, `sourcingId` u `homologationId` **distinto** del actual → 403 `forbidden` (`projectLocked`).
Respuesta 200: `{ "project": Project }`. Historial `project/update` con `cambios`.

### `DELETE /projects/:id` — admin (`projectDelete`)

Borra el proyecto (cascada en BD) y su carpeta `uploads/safety-dev/<id>/`. Historial `project/delete` (queda con `projectId: null`,
`detalle: { nombre }`). Respuesta 200: `{ "ok": true }`.

### `POST /projects/:id/advance` — admin (`phaseAdvance` / `caminoChange`)

a) Cambio de fase: `{ "to": "aprovisionamiento", "comentario": "…" }`
   - `domain.validateAdvanceInput` + `domain.canAdvance({ camino, from: faseActual, to, deliverables, comentario })`.
   - Si `!ok` por comentario → 400 `comment_required` con `pendientes`. Otros errores → 400 `validation`.
   - Aplica `domain.planPhaseTransition(camino, from, to, hoy)` a `safety_dev_phases`, actualiza `fase_actual`,
     inserta `safety_dev_phase_approvals` (`tipo` = `avance|retroceso`, `pendientes`, `aprobado_por`, `comentario`)
     e historial (`accion` = `advance` o `retroceso`).

b) Cambio de camino: `{ "camino": "oem", "confirm": true, "comentario": "…" }` (sin `confirm: true` → 400 `validation`)
   - Si es el mismo camino → 400 `validation` (`fields.camino`).
   - Borra las fases y las recrea con `buildInitialPhases(nuevoCamino)` (primera fase en curso desde hoy), `fase_actual` = primera fase.
   - Entregables: se borran los de fases que no existen en el nuevo camino; se añaden los de plantilla del nuevo camino que no existan ya
     (mismo `fase` y `texto`). Los de fases comunes (`aprovisionamiento`, `escalado`) se conservan con su estado.
   - Las acciones con `fase` fuera del nuevo camino pasan a `fase = null`.
   - Aprobación `tipo: "cambio_camino"`, `deCamino`, `aCamino`, `deFase`, `aFase`. Historial `project/cambio_camino`.

Respuesta 200 (ambos): `{ "project": Project, "phases": [Phase], "deliverables": [Deliverable], "approval": Approval }`.

### `PUT /projects/:id/phases/:fase` — admin o responsable (`phases`)

Cuerpo parcial: `{ "fechaObjetivo", "fechaInicio", "fechaFin" }` (`domain.validatePhaseDates`). El `estado` no se cambia aquí.
`:fase` no perteneciente al proyecto → 404. Respuesta: `{ "phase": Phase }`.

---

## 4. Recursos anidados del proyecto

Reglas comunes: `:id` debe existir (404); el recurso hijo debe pertenecer a ese proyecto (si no, 404);
permiso `canEdit(role, entidad)` con el rol del usuario en ese proyecto (si no, 403). Todas las respuestas de creación son **201**.
`DELETE` → `{ "ok": true }`. No hay GET de listas anidadas: la ficha (`GET /projects/:id`) las trae todas.

| Método y ruta | Entidad permiso | Cuerpo (validador) | Respuesta |
|---|---|---|---|
| `POST /projects/:id/products` | `products` | `nombre`*, `componente`, `codigoAlsina`, `origen`, `specs`, `pesoKg`, `dimsTransporte`, `udsPorCamion`, `piezasTransporte` (`validateProduct(body, { fields: campos de la familia del proyecto, familyCode })`; errores de specs con clave `specs.<key>`) | `{ "product": Product }` |
| `PUT /projects/:id/products/:productId` | `products` | parcial, mismo | `{ "product": Product }` |
| `DELETE /projects/:id/products/:productId` | `products` | — | `{ "ok": true }` |
| `POST /projects/:id/deliverables` | `deliverables` | `fase`*, `texto`*, `obligatorio`, `orden`, `hecho` (`validateDeliverable`, opts `{ camino }`) | `{ "deliverable": Deliverable }` |
| `PUT /projects/:id/deliverables/:deliverableId` | `deliverables` | parcial. `hecho: true` fija `hecho_por = req.user.id`, `hecho_en = NOW()`; `hecho: false` los pone a NULL | `{ "deliverable": Deliverable }` |
| `DELETE /projects/:id/deliverables/:deliverableId` | `deliverables` | — | `{ "ok": true }` |
| `POST /projects/:id/actions` | `actions` | `texto`*, `fase`, `ownerId`, `fechaLimite`, `estado`, `origen` (`validateAction`, opts `{ camino }`); fija `created_by` | `{ "action": Action }` |
| `PUT /projects/:id/actions/:actionId` | `actions` | parcial | `{ "action": Action }` |
| `DELETE /projects/:id/actions/:actionId` | `actions` | — | `{ "ok": true }` |
| `POST /projects/:id/suppliers` | `projectSuppliers` | `supplierId`*, `productId`, `rol`, `estado`, `notas` (`validateProjectSupplier`); supplier y product deben existir (product del mismo proyecto) | `{ "projectSupplier": ProjectSupplier }` |
| `PUT /projects/:id/suppliers/:psId` | `projectSuppliers` | parcial | `{ "projectSupplier": ProjectSupplier }` |
| `DELETE /projects/:id/suppliers/:psId` | `projectSuppliers` | — (borra sus ofertas en cascada) | `{ "ok": true }` |
| `POST /projects/:id/suppliers/:psId/quotes` | `quotes` | `referencia`, `fecha`, `validez`, `incoterm`, `plazoTexto`, `moneda`, `importe`, `notas` (`validateQuote`) | `{ "quote": Quote }` |
| `PUT /projects/:id/suppliers/:psId/quotes/:quoteId` | `quotes` | parcial | `{ "quote": Quote }` |
| `DELETE /projects/:id/suppliers/:psId/quotes/:quoteId` | `quotes` | — | `{ "ok": true }` |
| `POST /projects/:id/budget` | `budget` | `concepto`*, `tipo`, `supplierId`, `unidades`, `precioUnitario`, `porte`, `moneda`, `previsto`, `real`, `estado` (`validateBudgetLine`; en PUT pasar `existing` = fila actual) | `{ "line": BudgetLine, "totalsByCurrency": {…}, "totalsByType": {…} }` |
| `PUT /projects/:id/budget/:lineId` | `budget` | parcial | ídem |
| `DELETE /projects/:id/budget/:lineId` | `budget` | — | `{ "ok": true, "totalsByCurrency": {…}, "totalsByType": {…} }` |
| `POST /projects/:id/certifications` | `certifications` | `norma`*, `productId`, `clase`, `laboratorio`, `laboratorioId`, `estado`, `fechaInforme`, `notas` (`validateCertification`) | `{ "certification": Certification }` |
| `PUT /projects/:id/certifications/:certId` | `certifications` | parcial | `{ "certification": Certification }` |
| `DELETE /projects/:id/certifications/:certId` | `certifications` | — | `{ "ok": true }` |
| `POST /projects/:id/documents` | `documents` | ver abajo | `{ "document": Document }` |
| `PUT /projects/:id/documents/:docId` | `documents` | parcial: `tipo`, `titulo`, `productId`, `supplierId`, `url` (solo si el documento es enlace; en uno con fichero `url` vacía/`null` se ignora y un enlace → 400) | `{ "document": Document }` |
| `DELETE /projects/:id/documents/:docId` | `documents` | — (borra también el fichero en disco) | `{ "ok": true }` |

Si un responsable intenta cambiar `obligatorio` de un entregable, cambiar `fase` o `texto` de uno obligatorio, o borrar uno obligatorio
→ 403 `forbidden` (de un obligatorio solo puede marcar `hecho` y cambiar `orden`).

### Documentos

- **Enlace** (`Content-Type: application/json`): `{ "tipo", "titulo"*, "url"*, "productId", "supplierId" }` → `validateDocument(body)`.
- **Fichero** (`multipart/form-data`, multer en memoria o disco): campo de fichero `file` + campos de texto `tipo`, `titulo`*, `productId`, `supplierId`
  → `validateDocument(body, { hasFile: true })`. Límite 25 MB (413 `file_too_large`). Extensiones bloqueadas (400 `validation`, `fields.file`):
  `.exe .bat .cmd .com .msi .ps1 .sh .js .vbs .scr`. Se guarda en `backend/uploads/safety-dev/<projectId>/<timestamp>-<aleatorio><ext>`;
  `file_name` = nombre original (saneado), `mime`, `size`, `subido_por`. Historial `document/upload`.
- Un documento tiene `url` **o** fichero, nunca ambos.

### `GET /documents/:docId/file` — todos

Comprueba que el documento existe y tiene fichero (si no, 404) y lo envía con `Content-Type: <mime>` y
`Content-Disposition: attachment; filename*=UTF-8''<fileName codificado>`. La ruta en disco se resuelve con `path.resolve` y se
comprueba que queda dentro de `uploads/safety-dev/` (si no, 404). El frontend lo descarga con `fetch` + token (no `<a href>` directo).

---

## 5. Directorio y configuración

| Método y ruta | Permiso | Cuerpo / query | Respuesta |
|---|---|---|---|
| `GET /suppliers` | todos | query `tipo`, `pais`, `region`, `q` | `{ "suppliers": [ Supplier & { "proyectos": [ { "projectId", "projectNombre", "rol", "estado" } ] } ] }` |
| `GET /suppliers/:supplierId` | todos | — | `{ "supplier": Supplier, "proyectos": [ { "projectSupplierId", "projectId", "projectNombre", "faseActual", "rol", "estado", "lastQuote": Quote\|null } ] }` |
| `POST /suppliers` | admin (`suppliers`) | `nombre`*, `pais`, `region`, `tipo`, `web`, `contacto`, `email`, `telefono`, `notas`, `homologadoSistema` (`validateSupplier`) | 201 `{ "supplier": Supplier }` |
| `PUT /suppliers/:supplierId` | admin | parcial | `{ "supplier": Supplier }` |
| `DELETE /suppliers/:supplierId` | admin | — ; si está en `safety_dev_project_suppliers` → 409 `in_use` | `{ "ok": true }` |
| `GET /people` | todos | — | `{ "people": [ Person ] }` |
| `POST /people` | admin (`people`) | `nombre`*, `papel`, `empresa`, `email`, `portalUserId`, `activo` (`validatePerson`) | 201 `{ "person": Person }` |
| `PUT /people/:personId` | admin | parcial | `{ "person": Person }` |
| `DELETE /people/:personId` | admin | — (referencias pasan a NULL; recomendado desactivar con `activo: false`) | `{ "ok": true }` |
| `GET /families` | todos | — | `{ "families": [ Family con fields[] ] }` |
| `POST /families` | admin (`families`) | `code`*, `nombre`*, `anclaEspecialista`, `orden`, `activo` (`validateFamily`) | 201 `{ "family": Family }` |
| `PUT /families/:code` | admin | parcial (`code` no se cambia) | `{ "family": Family }` |
| `DELETE /families/:code` | admin | — ; con proyectos → 409 `in_use` | `{ "ok": true }` |
| `POST /families/:code/fields` | admin (`familyFields`) | `key`*, `label`*, `type`, `unit`, `options`, `calculado`, `orden` (`validateFamilyField`; `familyCode` = `:code`) | 201 `{ "field": FamilyField }` |
| `PUT /families/:code/fields/:fieldId` | admin | parcial | `{ "field": FamilyField }` |
| `DELETE /families/:code/fields/:fieldId` | admin | — (no toca las `specs` ya guardadas) | `{ "ok": true }` |
| `GET /templates` | todos | query `camino` opcional | `{ "templates": [ Template ] }` |
| `POST /templates` | admin (`templates`) | `camino`*, `fase`*, `texto`*, `obligatorio`, `orden` (`validateTemplate`) | 201 `{ "template": Template }` |
| `PUT /templates/:templateId` | admin | parcial (`validateTemplate(body, { partial: true, camino, fase })` con los valores actuales) | `{ "template": Template }` |
| `DELETE /templates/:templateId` | admin | — (no afecta a proyectos existentes) | `{ "ok": true }` |

---

## 6. Resumen

### `GET /summary` — todos

Filtros opcionales: `familia`, `responsable` (persona), `estado` (por defecto todos los estados; el frontend pasa `activo` en el panel).

```jsonc
{
  "today": "2026-10-29",
  "totals": {
    "proyectos": 16,
    "activos": 14,
    "porCamino": { "propio": 9, "oem": 7 },
    "porEstado": { "activo": 14, "en_pausa": 2, "terminado": 0, "cancelado": 0 },
    "accionesAbiertas": 25,
    "accionesVencidas": 4
  },
  "porFase": [ { "camino": "propio", "fase": "ideacion", "label": "Ideación", "count": 2 } ],   // todas las fases de ambos caminos, count 0 incluido, en orden
  "porFamilia": [ { "familyCode": "borde", "nombre": "Protección de borde (TEPS/SPPB)", "count": 4 } ],   // solo familias con proyectos, orden familia
  "semaforos": { "verde": 8, "ambar": 4, "rojo": 2, "gris": 2 },
  "presupuesto": { "EUR": { "previsto": 0, "real": 0, "desviacion": 0, "lineas": 0 } },        // totalsByCurrency de todas las partidas filtradas
  "accionesVencidas": [
    { "id": 80, "projectId": 9, "projectNombre": "Escalera Strumin Modulo 18", "texto": "…", "ownerId": 5, "ownerNombre": "Francisca Ugarte",
      "fechaLimite": "2026-10-20", "diasVencida": 9, "estado": "pendiente" }
  ],                                        // orden fechaLimite ASC
  "proximasFechas": [
    { "tipo": "proyecto", "projectId": 1, "projectNombre": "…", "fase": null, "fecha": "2027-01-15", "dias": 78, "texto": "Fecha objetivo del proyecto" },
    { "tipo": "fase", "projectId": 3, "projectNombre": "…", "fase": "mvp", "fecha": "2026-11-30", "dias": 32, "texto": "Objetivo de fase MVP" },
    { "tipo": "accion", "projectId": 9, "projectNombre": "…", "fase": null, "fecha": "2026-11-05", "dias": 7, "texto": "<texto de la acción>" }
  ]                                         // fechas >= hoy y <= hoy+60 días; acciones abiertas, fases pendientes/en curso, proyectos activos; orden fecha ASC; máx. 30
}
```

---

## 7. Exportación

### `GET /export` — todos

Datos planos para el Excel (lo genera el frontend con `write-excel-file`; hojas Proyectos, Acciones, Presupuesto, Fabricantes, Certificaciones).
Mismos filtros que `GET /projects`. Etiquetas ya resueltas (texto legible en español) y nombres de personas/fabricantes resueltos.

```jsonc
{
  "generatedAt": "2026-10-29T10:00:00.000Z",
  "proyectos": [ {
    "id": 1, "codigo": "", "nombre": "…", "familia": "Protección de borde (TEPS/SPPB)", "camino": "Fabricante OEM",
    "fase": "Aprovisionamiento", "estado": "Activo", "prioridad": "Alta", "gama": "", "modalidad": "Venta",
    "diseno": "Javier Martín", "busqueda": "Miquel Piñeira", "homologacion": "", "centroDiseno": "", "mercados": "",
    "fechaObjetivo": "2027-01-31", "semaforo": "ambar", "accionesAbiertas": 2, "accionesVencidas": 0,
    "entregablesHechos": 3, "entregablesTotal": 22,
    "presupuesto": "EUR previsto 27.500,00 / real 0,00",   // texto; una moneda por línea separada por "; "
    "sharepointUrl": "" } ],
  "acciones": [ {
    "id": 80, "proyecto": "…", "fase": "", "texto": "…", "responsable": "Francisca Ugarte", "fechaLimite": "2026-11-15",
    "estado": "Pendiente", "vencida": false, "origen": "MoM 27/10/2026" } ],
  "presupuesto": [ {
    "id": 20, "proyecto": "…", "tipo": "Compra inicial", "concepto": "…", "fabricante": "Strumin", "unidades": 32,
    "precioUnitario": 1538, "porte": 3500, "moneda": "EUR", "previsto": 52716, "real": null, "desviacion": null, "estado": "Previsto" } ],
  "fabricantes": [ {
    "id": 6, "proyecto": "…", "fabricante": "Strumin", "pais": "Polonia", "region": "Europa", "tipoFabricante": "Proveedor",
    "rol": "Candidato OEM", "estado": "Oferta", "ultimaOfertaRef": "…", "ultimaOfertaFecha": "2026-10-07", "ultimaOfertaImporte": 49216,
    "ultimaOfertaMoneda": "EUR", "ultimaOfertaIncoterm": "FCA", "ultimaOfertaValidez": "2026-12-30" } ],   // una fila por relación proyecto-fabricante
  "certificaciones": [ {
    "id": 3, "proyecto": "…", "producto": "", "norma": "UNE-EN 13374", "clase": "C", "laboratorio": "DEKRA", "estado": "En ensayo",
    "fechaInforme": "" } ]
}
```
`desviacion` = `real - previsto` si hay `real`, si no `null`. Fechas como `"YYYY-MM-DD"` o `""`.

---

## 8. Datos iniciales

### `POST /seed` — admin (`seed`)

Sin cuerpo. Llama a `applySeed({ query, queryOne, withTransaction }, req.user.id)` (con la transacción de `config/db`: toda la
escritura se confirma o se deshace junta) y responde 200 con su resultado:
```jsonc
{ "created": { "people": 18, "suppliers": 25, "projects": 16, "products": 30, "phases": 72, "deliverables": 300, "actions": 20,
               "projectSuppliers": 30, "quotes": 10, "budgetLines": 15, "certifications": 5, "documents": 4, "approvals": 0 },
  "skipped": { "people": 0, "suppliers": 0, "projects": 0 } }
```

### Interfaz del seed

Módulo `backend/src/modules/safetyDev/seed/applySeed.js` (CommonJS):

```js
// Lee seed/seed-data.json (require o fs relativo a __dirname) y lo inserta. Idempotente por nombre.
async function applySeed({ query, queryOne, withTransaction? }, userId) → { created: {...}, skipped: {...} }
module.exports = { applySeed };
```

Reglas:
- **Idempotente por nombre**: persona (`safety_dev_people.nombre`), fabricante (`safety_dev_suppliers.nombre`) y proyecto
  (`safety_dev_projects.nombre`) existentes se cuentan en `skipped` y **no** se modifican; los hijos de un proyecto existente no se tocan.
  Una segunda ejecución devuelve todo `created` a 0.
- Personas y fabricantes se referencian por **nombre** en el JSON; el seed resuelve ids (los existentes también). Un nombre no encontrado
  → error (`throw new Error('Seed: persona desconocida «X» en proyecto «Y»')`), la ruta responde 400 `validation` con ese `message`.
- Cada registro pasa por los validadores de `safetyDev.domain.js` (mismo saneado que la API). Si falla → error como arriba.
- Proyecto nuevo: fases con el orden y estados de `buildInitialPhases(camino, { startPhase: faseActual, phaseTargets })`, pero las
  **fechas salen solo de `phasesDates`** (objetivo/inicio/fin): lo que no consta queda `NULL`, sin inventar `fecha_inicio = hoy` en la
  fase actual. Todas las fases anteriores a `faseActual` quedan `hecha` (tengan o no `fechaFin`: son proyectos que ya pasaron
  esas fases antes de existir la app), la actual `en_curso` y las siguientes `pendiente`.
- Entregables de plantilla (`deliverablesFromTemplates`): quedan `hecho` **todos** los de fases ya superadas y, además, los textos
  de `deliverablesDone` (normalmente de la fase actual). Un texto que ya no esté en la plantilla se ignora.
- Historial: una entrada `seed/create` por proyecto creado (`user_id = userId`).
- `userId` se usa para `created_by`, `hecho_por` y `subido_por`.

### Estructura de `seed/seed-data.json`

```jsonc
{
  "version": 1,
  "source": "Revisión de correos, actas y benchmarks del 29/10/2026 (docs/seed-sources.md)",
  "people": [
    { "nombre": "Jesús Gómez", "papel": "New Ventures", "empresa": "Alsina HQ", "email": "", "portalUserId": null }
  ],
  "suppliers": [
    { "nombre": "Strumin", "pais": "Polonia", "region": "Europa", "tipo": "proveedor", "web": "", "contacto": "Joanna Budzowska-Wójcik",
      "email": "", "telefono": "", "notas": "Lista de precios válida hasta 30/12/2026, FCA Morawica.", "homologadoSistema": false }
  ],
  "projects": [
    {
      "nombre": "Escalera Strumin Modulo 18",          // clave de idempotencia
      "codigo": null,
      "familyCode": "escaleras",
      "camino": "oem",
      "faseActual": "aprovisionamiento",
      "estado": "activo", "prioridad": "alta", "gama": null, "modalidad": "venta_alquiler",
      "centroDiseno": "", "mercados": "España", "fechaObjetivo": "2027-02-28", "descripcion": "…", "sharepointUrl": "",
      "designer": null, "sourcing": "Miquel Piñeira", "homologation": "Javier Martín",   // nombres de personas (o null)

      "phasesDates": {                                  // opcional; por fase del camino
        "busqueda": { "inicio": "2026-10-05", "fin": "2026-10-14", "objetivo": null },
        "aprovisionamiento": { "inicio": "2026-10-14", "fin": null, "objetivo": "2027-01-31" }
      },
      "deliverablesDone": [ "Lista de fabricantes candidatos" ],   // textos de plantilla ya hechos (opcional)

      "products": [
        { "nombre": "Escalera Modulo 18", "componente": "", "codigoAlsina": null, "origen": "oem",
          "specs": { "peldanos": 18, "peso_kg": 162 }, "pesoKg": 162, "dimsTransporte": "4900×900×1300", "udsPorCamion": 32,
          "piezasTransporte": [ { "nombre": "Base", "pesoKg": 142.6, "dims": "4900×900×300" } ], "notas": "" }
      ],
      "actions": [
        { "texto": "Pedir desglose de códigos y pesos", "owner": "Francisca Ugarte", "fechaLimite": "2026-11-15",
          "estado": "enviado", "fase": "aprovisionamiento", "origen": "MoM 27/10/2026" }
      ],
      "projectSuppliers": [
        { "supplier": "Strumin", "product": "Escalera Modulo 18",   // product: nombre de un producto de este proyecto (o null)
          "rol": "fabricante", "estado": "oferta", "notas": "",
          "quotes": [
            { "referencia": "261006_ALSINA_ES_price_list", "fecha": "2026-10-07", "validez": "2026-12-30", "incoterm": "FCA",
              "plazoTexto": "~2 meses", "moneda": "EUR", "importe": 1538, "notas": "Precio unitario Modulo 18" }
          ] }
      ],
      "budget": [
        { "tipo": "compra_inicial", "concepto": "32 × Modulo 18", "supplier": "Strumin", "unidades": 32, "precioUnitario": 1538,
          "porte": 3500, "moneda": "EUR", "previsto": null, "real": null, "estado": "previsto" }
      ],
      "certifications": [
        { "norma": "EN 12811", "clase": "", "laboratorio": "", "laboratorioSupplier": null, "product": null,
          "estado": "pendiente", "fechaInforme": null, "notas": "" }
      ],
      "documents": [
        { "tipo": "oferta", "titulo": "Lista de precios Strumin 07/10/2026", "url": "https://…", "product": null, "supplier": "Strumin" }
      ]
    }
  ]
}
```
Referencias por nombre: `designer`, `sourcing`, `homologation`, `actions[].owner` → `people[].nombre` (o persona ya existente en BD);
`projectSuppliers[].supplier`, `budget[].supplier`, `certifications[].laboratorioSupplier`, `documents[].supplier` → `suppliers[].nombre`
(o existente); `product` → `products[].nombre` del mismo proyecto. Los documentos del seed son solo **enlaces** (`url`); sin URL real no se incluyen.
Todas las claves de hijos son opcionales (listas vacías por defecto).

---

## 9. Historial

`safety_dev_history`: `entidad` ∈ `project, phase, product, deliverable, action, projectSupplier, quote, budgetLine, certification, document,
supplier, person, family, familyField, template, seed`; `accion` ∈ `create, update, delete, advance, retroceso, cambio_camino, upload, seed`.
`detalle` (JSON): en `update` `{ "cambios": { campoCamelCase: { "antes", "despues" } } }` (solo campos que cambian); en `create`/`delete`
`{ "nombre" | "texto" | "titulo": … }`; en cambios de fase `{ "de", "a", "comentario", "pendientes" }`.
`project_id` = proyecto afectado (NULL para directorio/configuración). `GET /projects/:id` devuelve las últimas 50 con `userName` (LEFT JOIN users).
