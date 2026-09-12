export const STATUSES_RESUMEN = ['Fin', 'Proceso', 'Inicio'];

export function resumirEstados(arbol = []) {
  const contadores = {
    secciones: { Fin: 0, Proceso: 0, Inicio: 0 },
    areas: { Fin: 0, Proceso: 0, Inicio: 0 },
    ubicaciones: { Fin: 0, Proceso: 0, Inicio: 0 },
  };

  let totalAreas = 0;
  let totalUbicaciones = 0;

  for (const seccion of arbol) {
    if (STATUSES_RESUMEN.includes(seccion.stat)) {
      contadores.secciones[seccion.stat] += 1;
    }

    for (const area of seccion.maestroArea || []) {
      totalAreas += 1;
      if (STATUSES_RESUMEN.includes(area.stat)) {
        contadores.areas[area.stat] += 1;
      }

      for (const ubicacion of area.maestroUbicacion || []) {
        totalUbicaciones += 1;
        if (STATUSES_RESUMEN.includes(ubicacion.stat)) {
          contadores.ubicaciones[ubicacion.stat] += 1;
        }
      }
    }
  }

  const construir = (clave, total) => {
    const desglose = {};
    for (const stat of STATUSES_RESUMEN) {
      desglose[stat] = {
        cantidad: contadores[clave][stat],
        porcentaje:
          total === 0
            ? 0
            : Math.round((contadores[clave][stat] / total) * 100),
      };
    }
    return { total, desglose };
  };

  return {
    secciones: construir('secciones', arbol.length),
    areas: construir('areas', totalAreas),
    ubicaciones: construir('ubicaciones', totalUbicaciones),
  };
}