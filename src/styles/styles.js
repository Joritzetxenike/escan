import { StyleSheet } from 'react-native';

/* =====================================================
 * PALETA DE COLORES — gris y limpio, con un único celeste
 * de marca
 * =====================================================
 *
 * Antes había dos celestes: `primary` (#009DE2) para bordes,
 * iconos y acentos, y `primaryStrong` (#00729E) para todo lo
 * que lleva texto blanco encima. El segundo existía porque el
 * blanco sobre el primero se queda en 3:1, por debajo del
 * mínimo 4.5:1.
 *
 * Ahora hay uno solo, `#00729E`, que da 5.38:1 con blanco y
 * cumple el mínimo. Es el color de los botones de escanear y
 * también el de la cabecera y la tab bar.
 */

export const colors = {
  primary: '#00729E',        // celeste de marca (barras, botones, acentos)
  onPrimary: '#FFFFFF',      // texto e iconos sobre `primary` (5.38:1)
  /* Variante para lo secundario sobre `primary`: 4.71:1, se
     distingue del blanco de la pestaña activa sin perder
     legibilidad. Un tono más apagado se quedaba en 3.23:1. */
  onPrimaryMuted: '#E8F1F7',
  primaryDark: '#1F2937',    // casi negro (cámara y títulos, nunca barras)
  text: '#111827',           // texto principal (casi negro)
  textSecondary: '#4B5563',  // texto secundario
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  surfaceAlt: '#F3F4F6',
  danger: '#DC2626',         // error y acciones destructivas
  warning: '#B45309',       // avisos de conectividad
  warningBg: '#FEF3C7',
  success: '#047857',       // estado sincronizado
  successBg: '#D1FAE5',
};

export const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: '#FFFFFF',
  padding: 20,
  // quitar justifyContent y alignItems
},


  /* ---------- BOTONES ---------- */
  customButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },

  /* =====================================================
   * PARES DE BOTONES DE HOME
   * =====================================================
   *
   * Los dos pares (escaneear ubicación / escanear artículo)
   * comparten estilo a propósito: si divergen, los botones
   * dejan de alinearse entre sí y el operario ya no sabe
   * cuál es cuál. El "+" es fijo y no `flex: 1` para que no
   * se lea como una acción principal. Por eso se anula el
   * `paddingHorizontal` de `customButton`.
   * ===================================================== */

  botonEscanear: {
    flex: 1,
    marginRight: 8,
  },

  botonMas: {
    width: 48,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ---------- HOME ---------- */
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 30,
  },

  ubicacionText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },

homeContent: {
  flex: 1,
  marginTop: 20,
  width: '100%',
  alignItems: 'center',
},


  listaArticulos: {
    marginTop: 25,
    width: '100%',
  },

  itemArticulo: {
    fontSize: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    textAlign: 'center',
  },

  /* ---------- CÁMARA ---------- */
  scannerContainer: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanFrame: {
    width: 300,
    height: 180,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 10,
  },
  scanFrameSquare: {
    width: 300,
    height: 300,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 10,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
  },

  /* ---------- FLASH DEL ESCÁNER ---------- */

  torchButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 10,
    borderRadius: 8,
  },

  /* Encendido: fondo ámbar de aviso, el mismo tono que
     usa el banner de conectividad. Apagado y encendido se
     distinguen de un vistazo, sin depender del icono. */

  torchButtonActivo: {
    backgroundColor: colors.warningBg,
    borderWidth: 2,
    borderColor: colors.warning,
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },

  /* ---------- MODAL ---------- */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 10,
    fontSize: 16,
  },
ultimosArticulosTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 8,
  textAlign: 'center',
},

  /* ---------- MODALES DE FORMULARIO ----------
     Los dos botones van en fila y se distinguen por color
     y por borde: el de confirmar va relleno con el celeste
     de marca y el de cancelar delineado en rojo. El rojo
     relleno queda reservado para lo que destruye datos,
     así que aquí el cancelar va delineado y no compite
     con "Eliminar". */

  modalTitulo: {
    marginBottom: 10,
    fontSize: 16,
  },

  modalFila: {
    fontWeight: 'bold',
    marginBottom: 10,
  },

  modalAcciones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    width: '100%',
  },

  modalBotonPrimario: {
    borderWidth: 2,
    borderColor: colors.primary,
  },

  modalBotonSecundario: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.danger,
  },

  modalTextoSecundario: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: 'bold',
  },

},);
