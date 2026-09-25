import { useCallback, useEffect, useState } from 'react';
import {
  listarAreas,
  listarSecciones,
  listarUbicacionesDeArea,
} from '../services/inventoryApi';
import StatusBadge from './StatusBadge';

export default function LocationTree({
  selectedLocation,
  onSelect,
  updatedLocation,
}) {
  const [secciones, setSecciones] = useState([]);
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({});
  const [areasPorSeccion, setAreasPorSeccion] = useState({});
  const [cargandoAreas, setCargandoAreas] = useState({});
  const [errorAreas, setErrorAreas] = useState({});
  const [areasAbiertas, setAreasAbiertas] = useState({});
  const [ubicacionesPorArea, setUbicacionesPorArea] = useState({});
  const [cargandoUbicaciones, setCargandoUbicaciones] = useState({});
  const [errorUbicaciones, setErrorUbicaciones] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    setSeccionesAbiertas({});
    setAreasAbiertas({});
    setAreasPorSeccion({});
    setUbicacionesPorArea({});

    try {
      const datos = await listarSecciones();
      setSecciones(datos);
    } catch (loadError) {
      setError(loadError.message || 'No se pudieron cargar las secciones');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  useEffect(() => {
    if (!updatedLocation) {
      return;
    }

    const { seccion, area, subzona, stat, areaStat, seccionStat } = updatedLocation;

    setSecciones((actual) =>
      actual.map((item) =>
        item.seccion === seccion
          ? { ...item, stat: seccionStat ?? item.stat }
          : item,
      ),
    );

    setAreasPorSeccion((actual) => ({
      ...actual,
      [seccion]: (actual[seccion] || []).map((item) =>
        item.area === area ? { ...item, stat: areaStat ?? item.stat } : item,
      ),
    }));

    const idArea = `${seccion}-${area}`;
    setUbicacionesPorArea((actual) => ({
      ...actual,
      [idArea]: (actual[idArea] || []).map((item) =>
        item.subzona === subzona ? { ...item, stat } : item,
      ),
    }));
  }, [updatedLocation]);

  const alternarSeccion = async (seccion) => {
    const abrir = !seccionesAbiertas[seccion];
    setSeccionesAbiertas((actual) => ({ ...actual, [seccion]: abrir }));

    if (abrir && !areasPorSeccion[seccion]) {
      setCargandoAreas((actual) => ({ ...actual, [seccion]: true }));
      setErrorAreas((actual) => ({ ...actual, [seccion]: null }));

      try {
        const areas = await listarAreas(seccion);
        setAreasPorSeccion((actual) => ({ ...actual, [seccion]: areas }));
      } catch (loadError) {
        setAreasPorSeccion((actual) => ({ ...actual, [seccion]: [] }));
        setErrorAreas((actual) => ({
          ...actual,
          [seccion]: loadError.message || 'No se pudieron cargar las áreas',
        }));
      } finally {
        setCargandoAreas((actual) => ({ ...actual, [seccion]: false }));
      }
    }
  };

  const alternarArea = async (seccion, area) => {
    const idArea = `${seccion}-${area}`;
    const abrir = !areasAbiertas[idArea];
    setAreasAbiertas((actual) => ({ ...actual, [idArea]: abrir }));

    if (abrir && !ubicacionesPorArea[idArea]) {
      setCargandoUbicaciones((actual) => ({ ...actual, [idArea]: true }));
      setErrorUbicaciones((actual) => ({ ...actual, [idArea]: null }));

      try {
        const ubicaciones = await listarUbicacionesDeArea(seccion, area);
        const datos = ubicaciones.map((ubicacion) => ({
          ...ubicacion,
          ubicacion: `${seccion}-${area}-${ubicacion.subzona}`,
        }));
        setUbicacionesPorArea((actual) => ({ ...actual, [idArea]: datos }));
      } catch (loadError) {
        setUbicacionesPorArea((actual) => ({ ...actual, [idArea]: [] }));
        setErrorUbicaciones((actual) => ({
          ...actual,
          [idArea]:
            loadError.message || 'No se pudieron cargar las ubicaciones',
        }));
      } finally {
        setCargandoUbicaciones((actual) => ({ ...actual, [idArea]: false }));
      }
    }
  };

  if (cargando) {
    return <div className="state-message">Cargando secciones…</div>;
  }

  if (error) {
    return (
      <div className="state-message state-error">
        {error}
        <button className="button button-secondary" type="button" onClick={recargar}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="tree">
      <div className="tree-toolbar">
        <span>{secciones.length} secciones</span>
        <button className="button button-secondary button-small" type="button" onClick={recargar}>
          Recargar
        </button>
      </div>

      {secciones.map((seccion) => {
        const seccionAbierta = seccionesAbiertas[seccion.seccion];
        const areas = areasPorSeccion[seccion.seccion] || [];
        const areaCargando = cargandoAreas[seccion.seccion];
        const areaError = errorAreas[seccion.seccion];

        return (
          <div className="tree-section" key={seccion.seccion}>
            <button
              className="tree-node tree-seccion"
              type="button"
              onClick={() => alternarSeccion(seccion.seccion)}
            >
              <span className="tree-caret">{seccionAbierta ? '▾' : '▸'}</span>
              <span className="tree-label">Sección {seccion.seccion}</span>
              <StatusBadge status={seccion.stat} />
            </button>

            {seccionAbierta && (
              <div className="tree-children">
                {areaCargando ? (
                  <div className="tree-mensaje">Cargando áreas…</div>
                ) : areaError ? (
                  <div className="tree-mensaje tree-mensaje-error">{areaError}</div>
                ) : areas.length === 0 ? (
                  <div className="tree-mensaje">Sin áreas.</div>
                ) : (
                  areas.map((area) => {
                    const idArea = `${seccion.seccion}-${area.area}`;
                    const areaAbierta = areasAbiertas[idArea];
                    const ubicaciones = ubicacionesPorArea[idArea] || [];
                    const ubicacionesCargando =
                      cargandoUbicaciones[idArea];
                    const ubicacionesError = errorUbicaciones[idArea];

                    return (
                      <div key={idArea}>
                        <button
                          className="tree-node tree-area"
                          type="button"
                          onClick={() => alternarArea(seccion.seccion, area.area)}
                        >
                          <span className="tree-caret">{areaAbierta ? '▾' : '▸'}</span>
                          <span className="tree-label">Área {area.area}</span>
                          <StatusBadge status={area.stat} />
                        </button>

                        {areaAbierta && (
                          <div className="tree-children">
                            {ubicacionesCargando ? (
                              <div className="tree-mensaje">Cargando ubicaciones…</div>
                            ) : ubicacionesError ? (
                              <div className="tree-mensaje tree-mensaje-error">
                                {ubicacionesError}
                              </div>
                            ) : ubicaciones.length === 0 ? (
                              <div className="tree-mensaje">Sin ubicaciones.</div>
                            ) : (
                              ubicaciones.map((ubicacion) => {
                                const seleccionada =
                                  selectedLocation?.ubicacion ===
                                  ubicacion.ubicacion;

                                return (
                                  <button
                                    className={`tree-node tree-ubicacion${
                                      seleccionada ? ' tree-ubicacion-seleccionada' : ''
                                    }`}
                                    type="button"
                                    key={ubicacion.ubicacion}
                                    onClick={() => onSelect(ubicacion)}
                                  >
                                    <span className="tree-label">
                                      {ubicacion.ubicacion}
                                    </span>
                                    <StatusBadge status={ubicacion.stat} />
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}