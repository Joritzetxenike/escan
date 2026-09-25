import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { obtenerResumen, listarUbicaciones } from '../services/inventoryApi';
import Filters, { initialFilters } from '../components/Filters';
import LocationDetail from '../components/LocationDetail';
import LocationTable from '../components/LocationTable';
import Pagination from '../components/Pagination';
import SummaryCard from '../components/SummaryCard';

const PAGE_SIZE = 25;

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [summary, setSummary] = useState(null);
  const [locations, setLocations] = useState([]);
  const [totalLocations, setTotalLocations] = useState(0);
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [summaryError, setSummaryError] = useState(null);
  const [locationsError, setLocationsError] = useState(null);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);

    try {
      const result = await obtenerResumen();
      setSummary(result);
      setSummaryError(null);
    } catch (loadError) {
      setSummaryError(loadError.message || 'No se pudo cargar el resumen');
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    setLoadingLocations(true);

    try {
      const result = await listarUbicaciones({
        ...filters,
        page,
        pageSize: PAGE_SIZE,
      });
      setLocations(result.items);
      setTotalLocations(result.total);
      setLocationsError(null);
    } catch (loadError) {
      setLocationsError(
        loadError.message || 'No se pudieron cargar las ubicaciones',
      );
    } finally {
      setLoadingLocations(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const updateFilters = (nextFilters) => {
    setPage(1);
    setFilters(nextFilters);
  };

  const refresh = () => {
    loadSummary();
    loadLocations();
  };

  const handleStatusUpdated = (updatedLocation) => {
    setSelectedLocation(updatedLocation);
    setLocations((current) =>
      current.map((location) =>
        location.ubicacion === updatedLocation.ubicacion
          ? updatedLocation
          : location,
      ),
    );
    loadSummary();
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Panel de inventario</p>
          <h1>Control de ubicaciones</h1>
        </div>
        <div className="header-actions">
          <button
            className={`button ${editMode ? 'button-warning' : 'button-primary'}`}
            type="button"
            onClick={() => setEditMode((current) => !current)}
          >
            {editMode ? 'Salir de edición' : 'Modificar datos'}
          </button>
          <span className="user-label">{user?.email}</span>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => signOut()}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="content">
        {summaryError && <div className="banner-error">{summaryError}</div>}
        {locationsError && <div className="banner-error">{locationsError}</div>}

        <section className="mode-banner">
          <div>
            <strong>{editMode ? 'Modo edición' : 'Modo consulta'}</strong>
            <span>
              {editMode
                ? 'Puedes cambiar el estado de una ubicación.'
                : 'Los datos son de solo lectura.'}
            </span>
          </div>
          <span className="sync-note">Fuente: Supabase · datos sincronizados</span>
        </section>

        {loadingSummary ? (
          <div className="state-message">Cargando resumen…</div>
        ) : summary ? (
          <div className="summary-grid">
            <SummaryCard title="Secciones" data={summary.secciones} />
            <SummaryCard title="Áreas" data={summary.areas} />
            <SummaryCard title="Ubicaciones" data={summary.ubicaciones} />
          </div>
        ) : (
          <div className="state-message state-error">No se pudo cargar el resumen.</div>
        )}

        <section className="locations-section">
          <div className="section-heading">
            <div>
              <h2>Ubicaciones</h2>
              <p>Consulta los conteos y abre una ubicación para ver sus artículos.</p>
            </div>
          </div>
          <Filters
            value={filters}
            onChange={updateFilters}
            onClear={refresh}
          />
          <LocationTable
            locations={locations}
            selectedLocation={selectedLocation}
            onSelect={setSelectedLocation}
            loading={loadingLocations}
            error={locationsError}
            editMode={editMode}
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={totalLocations}
            onPage={setPage}
          />
        </section>

        {selectedLocation && (
          <LocationDetail
            key={`${selectedLocation.ubicacion}-${editMode ? 'edit' : 'read'}`}
            location={selectedLocation}
            editMode={editMode}
            onUpdated={handleStatusUpdated}
          />
        )}
      </main>
    </div>
  );
}
