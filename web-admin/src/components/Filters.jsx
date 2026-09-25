const initialFilters = {
  seccion: '',
  area: '',
  estado: '',
  search: '',
};

export default function Filters({ value, onChange, onClear }) {
  const update = (field) => (event) => {
    onChange({ ...value, [field]: event.target.value });
  };

  return (
    <div className="filters" aria-label="Filtros de ubicaciones">
      <label>
        Buscar
        <input
          type="search"
          value={value.search}
          onChange={update('search')}
          placeholder="Código de ubicación"
        />
      </label>
      <label>
        Sección
        <input
          value={value.seccion}
          onChange={update('seccion')}
          placeholder="Sección"
        />
      </label>
      <label>
        Área
        <input
          value={value.area}
          onChange={update('area')}
          placeholder="Área"
        />
      </label>
      <label>
        Estado
        <select value={value.estado} onChange={update('estado')}>
          <option value="">Todos</option>
          <option value="Inicio">Inicio</option>
          <option value="Proceso">Proceso</option>
          <option value="Fin">Fin</option>
        </select>
      </label>
      <button
        className="button button-secondary"
        type="button"
        onClick={() => onChange(initialFilters)}
      >
        Limpiar
      </button>
      <button className="button button-secondary" type="button" onClick={onClear}>
        Recargar
      </button>
    </div>
  );
}

export { initialFilters };
