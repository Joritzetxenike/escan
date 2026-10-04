import { useEffect, useState } from 'react';

import conectividadService from '../services/conectividadService';

/**
 * Estado de conexión y de la cola de pendientes.
 *
 * Devuelve:
 *   - `online`: `true` / `false` / `null` (aún sin comprobar)
 *   - `comprobando`, `sincronizando`
 *   - `pendientes`: nº de operaciones esperando al servidor
 *   - `ultimoIntento`, `ultimoError`
 *   - `reintentar()`: fuerza una comprobación + sincronización
 */
export function useConectividad() {

  const [estado, setEstado] = useState(
    conectividadService.obtenerEstado()
  );

  useEffect(
    () => conectividadService.suscribir(setEstado),
    []
  );

  const reintentar = () => {
    conectividadService.comprobar();
  };

  return {
    ...estado,
    reintentar,
  };

}

export default useConectividad;