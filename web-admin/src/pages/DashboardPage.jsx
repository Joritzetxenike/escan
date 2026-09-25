import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { obtenerResumen } from '../services/inventoryApi';
import LocationDetail from '../components/LocationDetail';
import LocationTree from '../components/LocationTree';
import SummaryCard from '../components/SummaryCard';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [summary, setSummary] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [updatedLocation, setUpdatedLocation] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

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

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleStatusUpdated = (nextLocation) => {
    setSelectedLocation(nextLocation);
    setUpdatedLocation(nextLocation);
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
              <p>Despliega una sección para ver sus áreas y ubicaciones.</p>
            </div>
          </div>
          <div className="locations-layout">
            <div className="locations-list">
              <LocationTree
                selectedLocation={selectedLocation}
                onSelect={setSelectedLocation}
                updatedLocation={updatedLocation}
              />
            </div>

            {selectedLocation && (
              <LocationDetail
                key={`${selectedLocation.ubicacion}-${editMode ? 'edit' : 'read'}`}
                location={selectedLocation}
                editMode={editMode}
                onUpdated={handleStatusUpdated}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}