export const STATUSES = ['Inicio', 'Proceso', 'Fin'];

export const STATUS_COLORS = {
  Inicio: '#7f8c8d',
  Proceso: '#f39c12',
  Fin: '#2ecc71',
};

export function resumirEstados(arbol = []) {
  const contadores = {
    secciones: { Inicio: 0, Proceso: 0, Fin: 0 },
    areas: { Inicio: 0, Proceso: 0, Fin: 0 },
    ubicaciones: { Inicio: 0, Proceso: 0, Fin: 0 },
  };

  let totalAreas = 0;
  let totalUbicaciones = 0;

  for (const seccion of arbol) {
    if (STATUSES.includes(seccion.stat)) {
      contadores.secciones[seccion.stat] += 1;
    }

    for (const area of seccion.maestroArea || []) {
      totalAreas += 1;

      if (STATUSES.includes(area.stat)) {
        contadores.areas[area.stat] += 1;
      }

      for (const ubicacion of area.maestroUbicacion || []) {
        totalUbicaciones += 1;

        if (STATUSES.includes(ubicacion.stat)) {
          contadores.ubicaciones[ubicacion.stat] += 1;
        }
      }
    }
  }

  const construir = (clave, total) => {
    const desglose = {};

    for (const stat of STATUSES) {
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

export function formatPercent(value) {
  return `${value}%`;
}
