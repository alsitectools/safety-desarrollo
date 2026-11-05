# Safety Desarrollo — diseño (spec)

Fecha: 2026-10-29 · Autor: Jesús Gómez (New Ventures) con Claude · Estado: aprobado en conversación el 29/10/2026

## 1. Propósito

Aplicación del portal ALSIAPPS para seguir el **diseño, búsqueda, homologación y aprovisionamiento de nuevos productos de Alsina Safety**.
Sustituye la información dispersa (correos, WhatsApp, enlaces temporales, actas) por una ficha única por proyecto con fase,
responsables, fabricantes, ofertas, presupuestos, certificaciones, acciones y documentos.

Usuarios: equipo Safety y producto (Jesús, Juan Francisco Comes, Francisca Ugarte, Javier Martín, Daniel Rodilla…),
compras/fabricación (Miquel Piñeira, Toni López), ingeniería (Manuel González, Maximilian Koschmieder, MEC India) y dirección (consulta).

Éxito: en la reunión mensual de «Productos safety» se proyecta la app en lugar del acta; cada acción tiene responsable, fecha y estado;
se ve en un vistazo qué proyecto está en qué fase, cuánto se ha comprometido frente a lo previsto y qué falta para pasar de fase.

## 2. Alcance v1

Incluye: proyectos con productos, dos caminos de fases, checklist de entregables y aprobación de paso de fase, acciones,
responsables, fabricantes (directorio + relación con proyectos + ofertas), partidas de presupuesto previsto/real,
certificaciones/ensayos, documentos (enlace SharePoint o fichero subido), historial, panel resumen/kanban con KPI,
exportación a Excel y datos iniciales (14 proyectos reales).

Fuera de v1: integración con Axapta/Power BI (pedidos reales), notificaciones por correo, importación automática de actas,
multi-idioma (la app está en español), app móvil nativa (sí debe verse bien en móvil).

## 3. Arquitectura

Sigue el patrón de las subapps del portal (ver `client/AGENTS.md`):

| Pieza | Ubicación | Notas |
|---|---|---|
| Frontend | `apps/safety-desarrollo/` (repo propio) | React 19 + Vite 6, JS/JSX, `base: '/safety-desarrollo/'`, puerto dev **4039** (4033 lo usa ya el Especialista en Safety) |
| Backend | `backend/src/modules/safetyDev/` | Express, router montado en `/api/safety-dev` |
| SQL | `backend/changes/db/2026-10-29_safety-desarrollo.sql` | registro de la app **APP_ID 40** + tablas `safety_dev_*` + permisos por rol |
| Proxy dev | `client/devAppPorts.js` | añadir `'/safety-desarrollo': 4039` (solo esa línea) |
| Ficheros subidos | `backend/uploads/safety-dev/<projectId>/` | servidos solo por la API con permiso |

Autenticación: `usePortalAuth` (copiado de `apps/calculadora-pva/src/usePortalAuth.ts`, APP_ID 40) y en backend
`authRequired` + `requireAppAccess(40)`; admin de app con `findAppAdminFlag`.

Registro de la app: nombre «Safety Desarrollo», descripción «Seguimiento de diseño, homologación y aprovisionamiento de nuevos productos Safety»,
icono 👷, url `/safety-desarrollo/`, color `#2E7D32` (verde Safety del Especialista), sort_order 40; permisos role 1 admin, roles 2 y 3 acceso sin admin.

## 4. Dominio

### 4.1 Caminos y fases

| Camino | Fases (en orden) |
|---|---|
| `propio` (desarrollo propio) | `ideacion` → `prototipaje` → `mvp` → `aprovisionamiento` → `escalado` |
| `oem` (fabricante OEM) | `busqueda` → `personalizacion_certificacion` → `aprovisionamiento` → `escalado` |

Etiquetas visibles: Ideación, Prototipaje, MVP, Aprovisionamiento, Escalado, Búsqueda, Personalización y certificación.
Estado del proyecto (independiente de la fase): `activo`, `en_pausa`, `terminado`, `cancelado`.

Paso de fase: solo admin. Requiere comentario si quedan entregables obligatorios sin marcar (aviso, no bloqueo).
Se registra en `safety_dev_phase_approvals` y en el historial; la fase anterior queda con `fecha_fin = hoy` y la nueva con `fecha_inicio = hoy`.
Se permite retroceder de fase (también registrado). Cambiar de camino reinicia las fases (confirmación explícita).

### 4.2 Familias

Siguen los especialistas del «Especialista en Safety»: `borde` (TEPS/SPPB, protección de borde), `plataformas` (plataformas de carga),
`escaleras` (escaleras y pasarelas), `pva` (Pantalla de Vida), `redes` (redes y catch fan), `geotrench` (entibaciones),
`alsipercha`, `tornapuntas`, `otros`. Cada familia lleva el ancla del Especialista (`#eps`, `#loading`, `#escaleras`, `#pva`,
`#redes`, `#geotrench`, `#alsipercha`, `#tornapuntas`) y su plantilla de campos técnicos.

Campos técnicos por familia (`safety_dev_family_fields`; tipo `number|text|bool|select`, unidad, orden):
- borde: peso_kg, kg_por_m, altura_cm, largo_cm, clase_en13374 (A/B/C/A+B), diametro_varilla_mm, espesor_mm, acabado, tornillos_base.
- plataformas: carga_max_kg, ancho_mm, largo_mm, peso_propio_kg, ratio_carga_peso (calculado si hay ambos), tipo (fija/retráctil/MF/trampilla), fijacion (apriete forjados/atornillada/embebidos/voladizo), cabe_contenedor (bool), norma.
- escaleras: peldanos, alcance_m, ancho_cm, peso_kg, carga_peldano_kg, carga_central_kg, empalmable (bool), material, norma.
- pva: altura_m, clase_en13374, peso_kg_m, material_guia.
- redes: tamano, peso_kg, clase.
- resto: sin campos predefinidos (texto libre en especificaciones).

### 4.3 Responsables y personas

`safety_dev_people`: nombre, papel/cargo, empresa/centro (Alsina HQ, MEC India, MEC China, externo), email, `portal_user_id` opcional.
Proyecto: `designer_id`, `sourcing_id`, `homologation_id` (Diseño, Búsqueda, Homologación) → personas.
Acciones: `owner_id` → persona.

### 4.4 Permisos

- **Admin de app** (findAppAdminFlag): todo (crear/borrar proyectos, aprobar fases, gestionar personas, familias, plantillas y fabricantes).
- **Responsable**: usuario del portal enlazado (`portal_user_id`) a la persona que es Diseño, Búsqueda u Homologación del proyecto,
  o dueño de una acción **abierta** (pendiente o enviada; una hecha o cancelada no da permisos). Un responsable puede asignar
  acciones a otras personas y, con ello, hacerlas responsables mientras la acción siga abierta (aceptado: es como se reparten
  las acciones del acta). Edita su proyecto: datos generales salvo fase/camino/responsables, productos, entregables, acciones,
  partidas, fabricantes del proyecto y ofertas, certificaciones, documentos.
- **Lector**: resto de usuarios con acceso a la app; solo consulta y exportación.
La API comprueba siempre en servidor; el frontend solo oculta botones.

## 5. Modelo de datos (MySQL, tablas `safety_dev_*`)

Todas con `id INT AUTO_INCREMENT`, `created_at`, `updated_at`; FK con `ON DELETE CASCADE` hacia el proyecto.
Importes `DECIMAL(14,2)`, moneda `CHAR(3)` (EUR por defecto).

| Tabla | Campos principales |
|---|---|
| `safety_dev_families` | `code` (PK lógico único), nombre, ancla_especialista, orden, activo |
| `safety_dev_family_fields` | family_code, key, label, type, unit, options (JSON), orden |
| `safety_dev_people` | nombre, papel, empresa, email, portal_user_id NULL, activo |
| `safety_dev_projects` | codigo (p. ej. I-114) NULL, nombre, family_code, camino ENUM, fase_actual, estado ENUM, prioridad (alta/media/baja), gama (premium/estandar/economica) NULL, modalidad (venta/alquiler/venta_alquiler) NULL, centro_diseno, mercados (texto), fecha_objetivo DATE NULL, descripcion TEXT, designer_id, sourcing_id, homologation_id, sharepoint_url |
| `safety_dev_products` | project_id, nombre, componente, codigo_alsina NULL, origen ENUM(propio, oem, componente_comprado), specs JSON, peso_kg, dims_transporte (texto), uds_por_camion INT NULL, piezas_transporte JSON (lista {nombre, peso_kg, dims}) , notas |
| `safety_dev_phases` | project_id, fase, orden, fecha_objetivo, fecha_inicio, fecha_fin, estado ENUM(pendiente, en_curso, hecha, saltada) |
| `safety_dev_deliverable_templates` | camino, fase, texto, obligatorio, orden |
| `safety_dev_deliverables` | project_id, fase, texto, obligatorio, hecho, hecho_por (user id), hecho_en |
| `safety_dev_phase_approvals` | project_id, de_fase, a_fase, aprobado_por (user id), comentario, created_at |
| `safety_dev_actions` | project_id, fase NULL, texto, owner_id, fecha_limite, estado ENUM(pendiente, enviado, hecho, cancelado), origen (p. ej. «MoM 27/10/2026») |
| `safety_dev_suppliers` | nombre, pais, region, tipo ENUM(competidor, proveedor, ambos, laboratorio), web, contacto, email, telefono, notas, homologado_sistema BOOL |
| `safety_dev_project_suppliers` | project_id, supplier_id, product_id NULL, rol ENUM(candidato_oem, fabricante, proveedor_componente, laboratorio, referencia), estado ENUM(identificado, contactado, oferta, muestras, ensayos, homologado, pedido, aparcado, descartado), notas |
| `safety_dev_quotes` | project_supplier_id, referencia, fecha, validez, incoterm, plazo_texto, moneda, notas |
| `safety_dev_budget_lines` | project_id, tipo ENUM(prototipaje, compra_inicial, ensayos, utillaje, otros), concepto, supplier_id NULL, unidades DECIMAL, precio_unitario, porte, moneda, previsto, real, estado ENUM(previsto, comprometido, pagado) |
| `safety_dev_certifications` | project_id, product_id NULL, norma, clase, laboratorio (texto o supplier_id), estado ENUM(pendiente, en_ensayo, superado, fallido, certificado), fecha_informe, notas |
| `safety_dev_documents` | project_id, product_id NULL, supplier_id NULL, tipo ENUM(plano, despiece, manual, certificado, oferta, ficha, presentacion, foto, otro), titulo, url NULL, file_path NULL, file_name, mime, size, subido_por |
| `safety_dev_history` | project_id NULL, entidad, entidad_id, accion, detalle JSON, user_id, created_at |

Reglas: `previsto` de una partida = `unidades × precio_unitario + porte` si hay unidades y precio, si no se introduce a mano.
Totales del proyecto por moneda (no se convierte divisa en v1). Un documento tiene `url` **o** `file_path`.
Al crear un proyecto se crean sus fases y se copian los entregables de la plantilla de su camino.

## 6. API (`/api/safety-dev`, todas con token del portal)

- `GET /bootstrap` → usuario, isAppAdmin, familias + campos, personas, fabricantes, plantillas.
- `GET /projects` (filtros: familia, camino, fase, estado, responsable) → lista con KPI por proyecto (acciones abiertas/vencidas, entregables hechos/total, previsto/real por moneda).
- `GET /projects/:id` → ficha completa (productos, fases, entregables, aprobaciones, acciones, fabricantes+ofertas, partidas, certificaciones, documentos, últimas 50 entradas de historial).
- `POST /projects` (admin) · `PUT /projects/:id` · `DELETE /projects/:id` (admin).
- `POST /projects/:id/advance` (admin) `{to, comentario}` · cambio de camino `{camino, confirm:true}`.
- CRUD anidados: `/projects/:id/products`, `/deliverables`, `/actions`, `/suppliers` (relación), `/suppliers/:psId/quotes`, `/budget`, `/certifications`, `/documents` (multipart para subida, JSON para enlace).
- `GET /documents/:docId/file` → descarga con comprobación de acceso.
- Directorio: `GET/POST/PUT/DELETE /suppliers`, `/people` (escritura admin), `/families` y `/templates` (admin).
- `GET /summary` → KPI globales: proyectos por fase y camino, por familia, previsto vs real por moneda, acciones vencidas, próximas fechas objetivo.
- `GET /export` → datos planos para el Excel (el Excel se genera en el frontend).
- `POST /seed` (admin, idempotente por nombre de proyecto) → carga los datos iniciales.

Errores: JSON `{error}` con 400 (validación), 403 (permiso), 404, 503 `schema_missing` si faltan tablas (como Innovation Tracker).
Validación en servidor de enums, fechas y numéricos; nunca concatenar SQL con valores de usuario.

## 7. Pantallas (frontend)

Cabecera común: logo/título «Safety Desarrollo», botón volver al portal, usuario. Verde Safety `#2E7D32`. Responsive (≥360 px, sin scroll horizontal).

1. **Panel** (inicio): KPI (proyectos activos, por camino, acciones vencidas, previsto vs real), gráfico de barras por fase,
   lista «próximas fechas» y «acciones vencidas». Filtros por familia, responsable, estado.
2. **Kanban**: dos carriles (Desarrollo propio / OEM) con columnas por fase; tarjeta = nombre, familia, responsables (iniciales),
   prioridad, semáforo (verde en plazo, ámbar fecha objetivo <15 días o acciones vencidas, rojo fecha objetivo superada). Clic → ficha.
3. **Lista**: tabla filtrable y ordenable; botón **Exportar Excel** (hojas: Proyectos, Acciones, Presupuesto, Fabricantes, Certificaciones).
4. **Ficha de proyecto** con pestañas: Resumen (datos, responsables, enlace SharePoint y al Especialista) · Fases (línea de fases,
   fechas, checklist por fase, botón «Pasar a…» para admin, historial de aprobaciones) · Productos (ficha técnica con campos de la familia,
   datos logísticos, piezas de transporte) · Fabricantes (relación + estado + ofertas; **comparativa** lado a lado de candidatos con
   las especificaciones de sus productos y la última oferta) · Presupuesto (partidas previsto/real, totales por tipo y moneda, desviación) ·
   Certificaciones · Acciones (lista con responsable, fecha, estado; filtro abiertas) · Documentos (enlaces y subidas) · Historial.
5. **Fabricantes**: directorio con filtros (tipo, país, región), ficha con proyectos donde participa.
6. **Configuración** (admin): personas, familias y campos, plantillas de entregables.

Estados de carga/vacío/error en cada vista; formularios con validación y mensajes en español.

## 8. Datos iniciales (seed)

Fuente: revisión de correos, actas y benchmarks del 29/10/2026 (fichero de hallazgos de la sesión, copiado en `docs/seed-sources.md`).
Proyectos (familia · camino · fase):
1. Borde ECO solo venta (poste, barandilla D40, base, malla/red) · oem · aprovisionamiento — APAC (China) pedido piloto ≈27.500 € FOB entrega enero 2027.
2. Borde Premium alquilable, optimización del estándar · propio · ideación.
3. Malla Celsa + ensamblaje en Sentmenat · propio · mvp — Moreda-Celsa oferta 0051006710; piloto 500+500 uds antes de feb-2027; 18–25 €/ud.
4. Paño de red como barandilla (clase C) · propio · mvp — ensayo DEKRA, informe antes de enero; 11,20 €/ml.
5. Plataforma fija atornillada tipo Strumin (MEC India) · propio · prototipaje — ≈904 kg; objetivo 2 contenedores enero.
6. Plataforma retráctil · oem · búsqueda — TSS/KHK Dubái (documentación 26/10), GETO China (RFQ pendiente).
7. Plataforma ligera reforzada 2 t (rediseño Dacame) · propio · ideación — objetivo 1.500 USD.
8. Outrigger 10'×20' EE. UU. · oem · personalización y certificación — Capitol Steel, 11.000 + 1.000 USD (2 uds).
9. Escalera Strumin Modulo 18 · oem · aprovisionamiento — 32 × 1.538 € + porte 3.500 €; oferta válida hasta 30/12/2026.
10. Escalera modular propia M-09/M-14 (MEC India) · propio · prototipaje — objetivo 2 €/kg; 24+12 prototipos enero.
11. Pasarela de aluminio (Eduard Fita, Rubí) · propio · prototipaje.
12. PVA 2 «Pantalla de Vida Plus» (I-114) · propio · aprovisionamiento — extrusor China, DEKRA; obra Filipinas 277.000 €.
13. Catch fan · oem · búsqueda — APAC 281/240 USD; objetivo ventas 0,5 M€ 2027.
14. Geotrench TS100/300/600 industrialización India · propio · aprovisionamiento — PO26000014918.
Más «Scissorsafe» y «Spaghetti mat» en estado en_pausa (oem · búsqueda).
Personas, fabricantes (≈25: APAC, Protecciones Toledo, Moreda-Celsa, DEKRA, Strumin, TSS/KHK, GETO, Dacame, Capitol Steel, Vertemax/HAKI, Combisafe, Zulin, Hebei Zolo, Tejdhaval, Al Ameen, TLC, Safety Respect, PERI, Doka, ULMA…),
acciones del acta del 27/10/2026 y partidas/ofertas con los importes citados. El detalle exacto está en `backend/src/modules/safetyDev/seed/seed-data.json`.

## 9. Pruebas

- Backend: `node --test` sobre la lógica pura del dominio (`safetyDev.domain.js`: fases por camino, transición, permisos, cálculo de previsto,
  totales por moneda, semáforo) y validadores. Sin dependencias nuevas de test.
- Frontend: `node --test` sobre utilidades puras (formato, semáforo, agregados del panel, construcción de filas del Excel); build de Vite sin errores.
- Verificación manual/automatizada en navegador contra backend + MySQL local (instancia aparte si la principal no arranca).

## 10. Decisiones

- Documentos: enlace a SharePoint (fuente) + subida al servidor para lo que no está en SharePoint (aprobado 29/10).
- Datos solo en el servidor (MySQL del portal + carpeta uploads); nada de negocio en localStorage.
- Sin conversión de divisas en v1; totales separados por moneda.
- Excel generado en cliente con `write-excel-file` (solo escritura, ligera).
