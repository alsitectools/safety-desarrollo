// Listas fijas por código (vienen del backend en español) y mensajes de error de la API.
// Las claves deliverable.t<id> son los entregables de las plantillas: se traducen comparando el texto español.
export default {
  "camino": {
    "propio": "Desarrollo propio",
    "oem": "Fabricante OEM"
  },
  "phase": {
    "ideacion": "Ideación",
    "prototipaje": "Prototipaje",
    "mvp": "MVP",
    "aprovisionamiento": "Aprovisionamiento",
    "escalado": "Escalado",
    "busqueda": "Búsqueda",
    "personalizacion_certificacion": "Personalización y certificación"
  },
  "enum": {
    "projectEstado": {
      "activo": "Activo",
      "en_pausa": "En pausa",
      "terminado": "Terminado",
      "cancelado": "Cancelado"
    },
    "prioridad": {
      "alta": "Alta",
      "media": "Media",
      "baja": "Baja"
    },
    "gama": {
      "premium": "Premium",
      "estandar": "Estándar",
      "economica": "Económica"
    },
    "modalidad": {
      "venta": "Venta",
      "alquiler": "Alquiler",
      "venta_alquiler": "Venta y alquiler"
    },
    "productOrigen": {
      "propio": "Propio",
      "oem": "OEM",
      "componente_comprado": "Componente comprado"
    },
    "phaseEstado": {
      "pendiente": "Pendiente",
      "en_curso": "En curso",
      "hecha": "Hecha",
      "saltada": "Saltada"
    },
    "actionEstado": {
      "pendiente": "Pendiente",
      "enviado": "Enviado",
      "hecho": "Hecho",
      "cancelado": "Cancelado"
    },
    "supplierTipo": {
      "competidor": "Competidor",
      "proveedor": "Proveedor",
      "ambos": "Competidor y proveedor",
      "laboratorio": "Laboratorio"
    },
    "psRol": {
      "candidato_oem": "Candidato OEM",
      "fabricante": "Fabricante",
      "proveedor_componente": "Proveedor de componente",
      "laboratorio": "Laboratorio",
      "referencia": "Referencia"
    },
    "psEstado": {
      "identificado": "Identificado",
      "contactado": "Contactado",
      "oferta": "Oferta",
      "muestras": "Muestras",
      "ensayos": "Ensayos",
      "homologado": "Homologado",
      "pedido": "Pedido",
      "aparcado": "Aparcado",
      "descartado": "Descartado"
    },
    "budgetTipo": {
      "prototipaje": "Prototipaje",
      "compra_inicial": "Compra inicial",
      "ensayos": "Ensayos",
      "utillaje": "Utillaje",
      "otros": "Otros"
    },
    "budgetEstado": {
      "previsto": "Previsto",
      "comprometido": "Comprometido",
      "pagado": "Pagado"
    },
    "certEstado": {
      "pendiente": "Pendiente",
      "en_ensayo": "En ensayo",
      "superado": "Superado",
      "fallido": "Fallido",
      "certificado": "Certificado"
    },
    "docTipo": {
      "plano": "Plano",
      "despiece": "Despiece",
      "manual": "Manual",
      "certificado": "Certificado",
      "oferta": "Oferta",
      "ficha": "Ficha técnica",
      "presentacion": "Presentación",
      "foto": "Foto",
      "otro": "Otro"
    },
    "fieldType": {
      "number": "Número",
      "text": "Texto",
      "bool": "Sí/No",
      "select": "Lista"
    },
    "approvalTipo": {
      "avance": "Avance",
      "retroceso": "Retroceso",
      "cambio_camino": "Cambio de camino"
    }
  },
  "family": {
    "borde": "Protección de borde (TEPS/SPPB)",
    "plataformas": "Plataformas de carga",
    "escaleras": "Escaleras y pasarelas",
    "pva": "Pantalla de Vida (PVA)",
    "redes": "Redes y catch fan",
    "geotrench": "Entibaciones (Geotrench)",
    "alsipercha": "Alsipercha",
    "tornapuntas": "Tornapuntas",
    "otros": "Otros"
  },
  "field": {
    "borde": {
      "peso_kg": "Peso",
      "kg_por_m": "Peso por metro",
      "altura_cm": "Altura",
      "largo_cm": "Largo",
      "clase_en13374": "Clase EN 13374",
      "diametro_varilla_mm": "Diámetro de varilla",
      "espesor_mm": "Espesor",
      "acabado": "Acabado",
      "tornillos_base": "Tornillos en base"
    },
    "plataformas": {
      "carga_max_kg": "Carga máxima",
      "ancho_mm": "Ancho",
      "largo_mm": "Largo",
      "peso_propio_kg": "Peso propio",
      "ratio_carga_peso": "Ratio carga/peso",
      "tipo": "Tipo",
      "fijacion": "Fijación",
      "cabe_contenedor": "Cabe en contenedor",
      "norma": "Norma"
    },
    "escaleras": {
      "peldanos": "Peldaños",
      "alcance_m": "Alcance",
      "ancho_cm": "Ancho",
      "peso_kg": "Peso",
      "carga_peldano_kg": "Carga por peldaño",
      "carga_central_kg": "Carga en vano central",
      "empalmable": "Empalmable",
      "material": "Material",
      "norma": "Norma"
    },
    "pva": {
      "altura_m": "Altura",
      "clase_en13374": "Clase EN 13374",
      "peso_kg_m": "Peso por metro",
      "material_guia": "Material de la guía"
    },
    "redes": {
      "tamano": "Tamaño",
      "peso_kg": "Peso",
      "clase": "Clase"
    }
  },
  "deliverable": {
    "t1": "Necesidad de mercado y alcance definidos",
    "t2": "Benchmark de competidores",
    "t3": "Requisitos técnicos y norma aplicable identificados",
    "t4": "Coste objetivo y precio de venta objetivo",
    "t5": "Concepto o bocetos iniciales",
    "t6": "Planos y modelo 3D del prototipo",
    "t7": "Lista de materiales y despiece",
    "t8": "Presupuesto de prototipos aprobado",
    "t9": "Prototipo fabricado",
    "t10": "Pruebas internas de montaje y carga",
    "t11": "Ensayo según norma",
    "t12": "Certificado o informe de laboratorio",
    "t13": "Manual de montaje y uso en español",
    "t14": "Coste industrial validado",
    "t15": "Prueba piloto en obra con valoración",
    "t16": "Fabricante seleccionado y homologado",
    "t17": "Oferta aceptada",
    "t18": "Pedido emitido",
    "t19": "Códigos internos creados",
    "t20": "Recepción y control de calidad",
    "t21": "Ficha comercial y precio de tarifa publicados",
    "t22": "Formación a la red comercial",
    "t23": "Stock inicial disponible en almacén",
    "t24": "Producto publicado en el Especialista en Safety",
    "t25": "Revisión posterior al lanzamiento",
    "t26": "Especificación de necesidad definida",
    "t27": "Lista de fabricantes candidatos",
    "t28": "Petición de oferta enviada a candidatos",
    "t29": "Ofertas recibidas y comparadas",
    "t30": "Muestras solicitadas",
    "t31": "Ficha técnica del fabricante",
    "t32": "Personalización acordada (color, marcaje, embalaje)",
    "t33": "Ensayo según norma",
    "t34": "Certificado o informe de laboratorio",
    "t35": "Manual en español",
    "t36": "Códigos internos creados",
    "t37": "Oferta aceptada",
    "t38": "Pedido emitido",
    "t39": "Inspección previa al embarque",
    "t40": "Recepción y control de calidad",
    "t41": "Documentación de importación completa",
    "t42": "Ficha comercial y precio de tarifa publicados",
    "t43": "Formación a la red comercial",
    "t44": "Stock inicial disponible en almacén",
    "t45": "Producto publicado en el Especialista en Safety",
    "t46": "Revisión posterior al lanzamiento"
  },
  "errors": {
    "validation": "Revisa los campos marcados.",
    "fieldInvalid": "Valor no válido.",
    "conflict": "Conflicto con datos existentes.",
    "duplicate": "Ya existe un registro con ese valor.",
    "in_use": "No se puede borrar porque está en uso.",
    "not_found": "No encontrado.",
    "forbidden": "No tienes permiso para esta acción.",
    "comment_required": "Hay entregables obligatorios pendientes: añade un comentario para continuar.",
    "file_too_large": "El fichero supera el tamaño máximo (25 MB).",
    "schema_missing": "Faltan las tablas de Safety Desarrollo en la base de datos (hay que aplicar la migración).",
    "session": "Tu sesión del portal ha caducado. Vuelve a entrar.",
    "network": "No se ha podido conectar con el servidor.",
    "generic": "Error en la petición ({status})."
  }
};
