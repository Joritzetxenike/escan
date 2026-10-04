import { useEffect, useState } from 'react';

import maestrosService from '../services/maestrosService';

/* =======================================================
 * ESTADO DE LA COPIA LOCAL DE LOS MAESTROS
 * =======================================================
 *
 * Devuelve el estado del `maestrosService` más las acciones
 * que consume el `EstadoBanner`:
 *
 *   - `hayCopia`, `descargando`, `descargandoQue`
 *   - `pideActualizar`: la copia está vieja y toca decidir
 *   - `antiguedadTexto`: "hace 3 días", para el banner
 *   - `actualizar()`: fuerza la descarga ahora
 *   - `aplazar()`: "ahora no", no se vuelve a preguntar en 12 h
 * ======================================================= */

const humanizar = (horas) => {

  if (horas === null || horas === undefined) {
    return null;
  }

  if (horas < 1) return 'hace menos de 1 h';

  if (horas < 24) {
    return `hace ${Math.floor(horas)} h`;
  }

  const dias = Math.floor(horas / 24);

  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;

};

export function useMaestros() {

  const [estado, setEstado] = useState(
    maestrosService.obtenerEstado()
  );

  useEffect(
    () => maestrosService.suscribir(setEstado),
    []
  );

  const horas = maestrosService.antiguedadHoras();

  const actualizar = () => {
    maestrosService.descargar();
  };

  const aplazar = () => {
    maestrosService.rechazarRefresco();
  };

  return {
    ...estado,
    viejo: maestrosService.estaViejo(),
    peligroso:
      horas !== null &&
      horas > maestrosService.DIAS_PELIGROSO * 24,
    antiguedadTexto: humanizar(horas),
    actualizar,
    aplazar,
  };

}

export default useMaestros;