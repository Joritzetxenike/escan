import StatusBadge from './StatusBadge';

export default function LocationTable({
  locations,
  selectedLocation,
  onSelect,
  loading,
  error,
  editMode,
}) {
  if (loading) {
    return <div className="state-message">Cargando ubicaciones…</div>;
  }

  if (error) {
    return <div className="state-message state-error">{error}</div>;
  }

  if (locations.length === 0) {
    return <div className="state-message">No hay ubicaciones para mostrar.</div>;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Ubicación</th>
            <th>Sección</th>
            <th>Área</th>
            <th>Estado</th>
            <th>{editMode ? 'Acción' : 'Detalle'}</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((location) => {
            const selected =
              selectedLocation?.ubicacion === location.ubicacion;

            return (
              <tr
                className={selected ? 'selected-row' : undefined}
                key={location.ubicacion}
              >
                <td>
                  <button
                    className="link-button"
                    type="button"
                    onClick={() => onSelect(location)}
                  >
                    {location.ubicacion}
                  </button>
                </td>
                <td>{location.seccion}</td>
                <td>{location.area}</td>
                <td>
                  <StatusBadge status={location.stat} />
                </td>
                <td>
                  <button
                    className="button button-small"
                    type="button"
                    onClick={() => onSelect(location)}
                  >
                    {editMode ? 'Editar' : 'Ver artículos'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
