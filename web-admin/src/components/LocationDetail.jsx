import { useEffect, useState } from 'react';
import { obtenerArticulosUbicacion, actualizarEstadoUbicacion } from '../services/inventoryApi';
import StatusBadge from './StatusBadge';
import Pagination from './Pagination';
import { STATUSES } from '../lib/estados';

const PAGE_SIZE = 25;

export default function LocationDetail({ location, editMode, onUpdated }) {
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState(location.stat);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setSelectedStatus(location.stat);
    setPage(1);

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await obtenerArticulosUbicacion({
          ubicacion: location.ubicacion,
          page: 1,
          pageSize: PAGE_SIZE,
        });

        if (active) {
          setArticles(result.items);
          setTotal(result.total);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'No se pudieron cargar los artículos');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [location.ubicacion]);

  const changePage = async (nextPage) => {
    setLoading(true);
    setError(null);

    try {
      const result = await obtenerArticulosUbicacion({
        ubicacion: location.ubicacion,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setArticles(result.items);
      setTotal(result.total);
      setPage(nextPage);
    } catch (loadError) {
      setError(loadError.message || 'No se pudieron cargar los artículos');
    } finally {
      setLoading(false);
    }
  };

  const saveStatus = async () => {
    if (selectedStatus === location.stat) {
      return;
    }

    const confirmed = window.confirm(
      `¿Cambiar ${location.ubicacion} a ${selectedStatus}?`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = await actualizarEstadoUbicacion({
        seccion: location.seccion,
        area: location.area,
        subzona: location.subzona,
        stat: selectedStatus,
      });
      onUpdated({
        ...location,
        stat: selectedStatus,
        areaStat: data?.area_stat,
        seccionStat: data?.seccion_stat,
      });
    } catch (saveError) {
      setError(saveError.message || 'No se pudo actualizar el estado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <div>
          <p className="eyebrow">Ubicación seleccionada</p>
          <h2>{location.ubicacion}</h2>
        </div>
        <StatusBadge status={location.stat} />
      </div>

      {editMode && (
        <div className="editor-box">
          <label htmlFor="status-select">Cambiar estado</label>
          <div className="editor-actions">
            <select
              id="status-select"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              className="button"
              type="button"
              disabled={saving || selectedStatus === location.stat}
              onClick={saveStatus}
            >
              {saving ? 'Guardando…' : 'Guardar estado'}
            </button>
          </div>
          <small>El cambio también recalculará el área y la sección.</small>
        </div>
      )}

      <div className="detail-section-heading">
        <h3>Artículos contados</h3>
        <span>{total} filas</span>
      </div>

      {error && <div className="state-message state-error">{error}</div>}

      {loading ? (
        <div className="state-message">Cargando artículos…</div>
      ) : articles.length === 0 ? (
        <div className="state-message">Esta ubicación no tiene artículos.</div>
      ) : (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Artículo</th>
                  <th>Descripción</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.articulo}>
                    <td>{article.articulo}</td>
                    <td>{article.descripcion || '—'}</td>
                    <td>{article.tipo || '—'}</td>
                    <td>{article.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPage={changePage}
          />
        </>
      )}
    </aside>
  );
}
