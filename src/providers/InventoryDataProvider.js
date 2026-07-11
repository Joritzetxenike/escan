/**
 * Interfaz de acceso a datos.
 *
 * Todos los proveedores (CSV, API, etc.) deben implementar
 * exactamente estos métodos.
 */

const InventoryDataProvider = {
  /* =======================================================
   * UBICACIONES
   * ======================================================= */

  /**
   * Devuelve todas las ubicaciones.
   */
  async obtenerUbicaciones() {
    throw new Error('obtenerUbicaciones() no implementado');
  },

  /**
   * Devuelve el estado de todas las ubicaciones.
   */
  async obtenerEstadoUbicaciones() {
    throw new Error('obtenerEstadoUbicaciones() no implementado');
  },

  /**
   * Devuelve todos los artículos de una ubicación.
   */
  async obtenerArticulosUbicacion(ubicacion) {
    throw new Error('obtenerArticulosUbicacion() no implementado');
  },

  /* =======================================================
   * ARTÍCULOS
   * ======================================================= */

  /**
   * Comprueba si un artículo existe.
   */
  async existeArticulo(codigoArticulo) {
    throw new Error('existeArticulo() no implementado');
  },

  /**
   * Obtiene la información de un artículo.
   */
  async obtenerArticulo(codigoArticulo) {
    throw new Error('obtenerArticulo() no implementado');
  },

  /* =======================================================
   * MOVIMIENTOS
   * ======================================================= */

  /**
   * Guarda un movimiento.
   */
  async guardarMovimiento(movimiento) {
    throw new Error('guardarMovimiento() no implementado');
  },

  /**
   * Actualiza un movimiento existente.
   */
  async actualizarMovimiento(movimiento) {
    throw new Error('actualizarMovimiento() no implementado');
  },

  /**
   * Elimina un movimiento.
   */
  async eliminarMovimiento(ubicacion, articulo) {
    throw new Error('eliminarMovimiento() no implementado');
  },

  /**
   * Devuelve los últimos movimientos.
   */
  async obtenerUltimosMovimientos(limite = 20) {
    throw new Error('obtenerUltimosMovimientos() no implementado');
  },

  /* =======================================================
   * SINCRONIZACIÓN
   * ======================================================= */

  /**
   * Indica si el proveedor tiene conexión.
   */
  async estaDisponible() {
    throw new Error('estaDisponible() no implementado');
  },

  /**
   * Sincroniza los datos pendientes.
   */
  async sincronizar() {
    throw new Error('sincronizar() no implementado');
  },
};

export default InventoryDataProvider; 