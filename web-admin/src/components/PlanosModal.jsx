import { useCallback, useEffect, useRef, useState } from 'react';
import {
  borrarPlano,
  listarPlanos,
  subirPlano,
  urlPlano,
} from '../services/planosApi';

/* =======================================================
 * PLANOS DE UNA SECCIÓN (y de su área, si se indica)
 * =======================================================
 *
 * - Lista los ficheros de `planos/<seccion>/` y, si llega
 *   `area`, también los de `planos/<seccion>/<area>/`.
 * - El primero se abre solo. PDF → visor del navegador (zoom,
 *   páginas, imprimir); imagen → a tamaño ajustado, clic para
 *   verla a tamaño real en otra pestaña.
 * - En modo edición: subir (con aviso si ya existe uno con el
 *   mismo nombre) y borrar.
 * ======================================================= */

const formatearTamano = (bytes) => {
  if (bytes == null) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export default function PlanosModal({ seccion, area, editMode, onCerrar }) {
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [seleccionado, setSeleccionado] = useState(null);
  const [url, setUrl] = useState(null);
  const [cargandoUrl, setCargandoUrl] = useState(false);
  const [errorUrl, setErrorUrl] = useState(null);

  const [fichero, setFichero] = useState(null);
  const [destino, setDestino] = useState(area ? 'area' : 'seccion');
  const [subiendo, setSubiendo] = useState(false);
  const [mensajeSubida, setMensajeSubida] = useState(null);
  const inputFichero = useRef(null);

  const titulo = area ? `Sección ${seccion} · Área ${area}` : `Sección ${seccion}`;

  /* ---------- Carga de la lista ---------- */

  const cargar = useCallback(
    async (seleccionarRuta) => {
      setCargando(true);
      setError(null);

      try {
        const [deSeccion, deArea] = await Promise.all([
          listarPlanos(seccion),
          area ? listarPlanos(seccion, area) : Promise.resolve([]),
        ]);

        const nuevos = [
          { clave: 'seccion', titulo: `Sección ${seccion}`, planos: deSeccion },
          ...(area ? [{ clave: 'area', titulo: `Área ${area}`, planos: deArea }] : []),
        ];

        setGrupos(nuevos);

        const todos = nuevos.flatMap((g) => g.planos);
        const elegido =
          todos.find((p) => p.ruta === seleccionarRuta) ?? todos[0] ?? null;

        setSeleccionado(elegido);
      } catch (loadError) {
        setError(loadError.message || 'No se pudieron cargar los planos');
      } finally {
        setCargando(false);
      }
    },
    [seccion, area],
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  /* ---------- URL firmada del plano seleccionado ---------- */

  useEffect(() => {
    let activo = true;

    setUrl(null);
    setErrorUrl(null);

    if (!seleccionado) {
      return undefined;
    }

    setCargandoUrl(true);

    urlPlano(seleccionado.ruta)
      .then((nueva) => {
        if (activo) setUrl(nueva);
      })
      .catch((urlError) => {
        if (activo) setErrorUrl(urlError.message || 'No se pudo abrir el plano');
      })
      .finally(() => {
        if (activo) setCargandoUrl(false);
      });

    return () => {
      activo = false;
    };
  }, [seleccionado]);

  /* ---------- Cerrar con Escape ---------- */

  useEffect(() => {
    const alPulsar = (event) => {
      if (event.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [onCerrar]);

  /* ---------- Acciones ---------- */

  const descargar = async () => {
    try {
      const enlace = document.createElement('a');
      enlace.href = await urlPlano(seleccionado.ruta, { descargar: true });
      enlace.rel = 'noopener';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
    } catch (downloadError) {
      setErrorUrl(downloadError.message || 'No se pudo descargar el plano');
    }
  };

  const borrar = async () => {
    if (!window.confirm(`¿Borrar el plano «${seleccionado.nombre}»? No se puede deshacer.`)) {
      return;
    }

    try {
      await borrarPlano(seleccionado.ruta);
      await cargar();
    } catch (deleteError) {
      setErrorUrl(deleteError.message || 'No se pudo borrar el plano');
    }
  };

  const subir = async (event) => {
    event.preventDefault();
    if (!fichero) return;

    setSubiendo(true);
    setMensajeSubida(null);

    const datos = {
      seccion,
      area: destino === 'area' ? area : undefined,
      fichero,
    };

    try {
      let resultado;

      try {
        resultado = await subirPlano(datos);
      } catch (uploadError) {
        if (!uploadError.duplicado) throw uploadError;

        if (!window.confirm(`${uploadError.message}. ¿Quieres sustituirlo?`)) {
          setMensajeSubida({ tipo: 'info', texto: 'Subida cancelada.' });
          return;
        }

        resultado = await subirPlano({ ...datos, sobrescribir: true });
      }

      setMensajeSubida({ tipo: 'ok', texto: `Plano «${resultado.nombre}» subido.` });
      setFichero(null);
      if (inputFichero.current) inputFichero.current.value = '';
      await cargar(resultado.ruta);
    } catch (uploadError) {
      setMensajeSubida({
        tipo: 'error',
        texto: uploadError.message || 'No se pudo subir el plano',
      });
    } finally {
      setSubiendo(false);
    }
  };

  const total = grupos.reduce((n, g) => n + g.planos.length, 0);

  /* ---------- Render ---------- */

  return (
    <div
      className="planos-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCerrar();
      }}
    >
      <div
        className="planos-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="planos-titulo"
      >
        <header className="planos-header">
          <div>
            <p className="eyebrow eyebrow-dark">Planos</p>
            <h2 id="planos-titulo">{titulo}</h2>
          </div>
          <button className="button button-secondary" type="button" onClick={onCerrar}>
            Cerrar
          </button>
        </header>

        <div className="planos-body">
          <aside className="planos-lista">
            {cargando ? (
              <div className="state-message">Cargando planos…</div>
            ) : error ? (
              <div className="state-message state-error">
                {error}
                <button className="button button-secondary button-small" type="button" onClick={() => cargar()}>
                  Reintentar
                </button>
              </div>
            ) : (
              grupos.map((grupo) => (
                <div className="planos-grupo" key={grupo.clave}>
                  <h3>{grupo.titulo}</h3>
                  {grupo.planos.length === 0 ? (
                    <p className="planos-vacio">Sin planos.</p>
                  ) : (
                    <ul>
                      {grupo.planos.map((plano) => (
                        <li key={plano.ruta}>
                          <button
                            type="button"
                            className={`planos-item${
                              seleccionado?.ruta === plano.ruta ? ' planos-item-activo' : ''
                            }`}
                            onClick={() => setSeleccionado(plano)}
                          >
                            <span className="planos-tipo">{plano.tipo === 'pdf' ? 'PDF' : 'IMG'}</span>
                            <span className="planos-nombre">{plano.nombre}</span>
                            <span className="planos-tamano">{formatearTamano(plano.bytes)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}

            {editMode && (
              <form className="planos-subida" onSubmit={subir}>
                <h3>Subir plano</h3>
                <input
                  ref={inputFichero}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                  aria-label="Fichero del plano"
                  onChange={(event) => {
                    setFichero(event.target.files?.[0] ?? null);
                    setMensajeSubida(null);
                  }}
                />
                {area && (
                  <label>
                    Guardar en
                    <select value={destino} onChange={(event) => setDestino(event.target.value)}>
                      <option value="seccion">Sección {seccion}</option>
                      <option value="area">Área {area}</option>
                    </select>
                  </label>
                )}
                <button className="button button-full" type="submit" disabled={!fichero || subiendo}>
                  {subiendo ? 'Subiendo…' : 'Subir'}
                </button>
                <small>PDF, PNG, JPG o WEBP · máx. 50 MB</small>
                {mensajeSubida && (
                  <div
                    className={`planos-mensaje planos-mensaje-${mensajeSubida.tipo}`}
                    role="status"
                  >
                    {mensajeSubida.texto}
                  </div>
                )}
              </form>
            )}
          </aside>

          <section className="planos-visor">
            {!cargando && !error && total === 0 ? (
              <div className="state-message">
                {editMode
                  ? 'Esta sección no tiene planos. Puedes subir uno desde la izquierda.'
                  : 'Esta sección no tiene planos. Para subir uno, entra en «Modificar datos».'}
              </div>
            ) : seleccionado ? (
              <>
                <div className="planos-visor-barra">
                  <strong title={seleccionado.ruta}>{seleccionado.nombre}</strong>
                  <div className="planos-visor-acciones">
                    {url && (
                      <a className="button button-secondary button-small" href={url} target="_blank" rel="noopener noreferrer">
                        Abrir en pestaña nueva
                      </a>
                    )}
                    <button className="button button-secondary button-small" type="button" onClick={descargar}>
                      Descargar
                    </button>
                    {editMode && (
                      <button className="button button-danger button-small" type="button" onClick={borrar}>
                        Borrar
                      </button>
                    )}
                  </div>
                </div>

                {errorUrl && <div className="state-message state-error">{errorUrl}</div>}

                {cargandoUrl ? (
                  <div className="state-message">Abriendo plano…</div>
                ) : url && seleccionado.tipo === 'pdf' ? (
                  <iframe className="planos-pdf" src={url} title={`Plano ${seleccionado.nombre}`} />
                ) : url && seleccionado.tipo === 'imagen' ? (
                  <a className="planos-imagen" href={url} target="_blank" rel="noopener noreferrer" title="Ver a tamaño real">
                    <img src={url} alt={`Plano ${seleccionado.nombre}`} />
                  </a>
                ) : url ? (
                  <div className="state-message">
                    Este formato no se puede mostrar aquí. Usa «Descargar».
                  </div>
                ) : null}
              </>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
