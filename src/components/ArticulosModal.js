import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../styles/styles';

import InventoryService from '../services/InventoryService';
import PlanosModal from './PlanosModal';

/* =======================================================
 * ARTÍCULOS DE UNA UBICACIÓN (Lista y Estado)
 * =======================================================
 *
 * La lista solo enseña lo imprescindible para repasar un
 * conteo: el CÓDIGO COMPLETO (sin recortar, aunque ocupe dos
 * líneas) y la CANTIDAD. Al tocar una fila se abre el detalle
 * con artículo, descripción, unidad y cantidad, y desde ahí se
 * modifica o se elimina.
 *
 * El detalle lo controla la pantalla, igual que antes la
 * edición en línea:
 *
 *   editandoIndex      índice (real, no el filtrado) abierto
 *   editandoValor      cantidad que se está tecleando
 *   onIniciarEdicion   abrir el detalle de una fila
 *   onChangeValor      teclear la cantidad
 *   onGuardarEdicion   guardar (CSV + Supabase o cola)
 *   onEliminar         borrar la fila (solo Lista)
 *   onCancelarEdicion  cerrar el detalle sin guardar
 *
 * Con la ubicación terminada (`Fin`) el detalle se abre igual,
 * pero en solo lectura: se puede consultar, no modificar.
 *
 *   conPlanos          muestra en la cabecera el botón de planos
 *                      de la sección y el área de la ubicación
 * ======================================================= */

export default function ArticulosModal({
  visible,
  titulo,
  articulos,
  onCerrar,
  editandoIndex,
  editandoValor,
  onIniciarEdicion,
  onChangeValor,
  onGuardarEdicion,
  onEliminar,
  onCancelarEdicion,
  onExportar,
  onBorrar,
  codigoUbicacion,
  conPlanos = false,
}) {
  const [finalizada, setFinalizada] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [verPlanos, setVerPlanos] = useState(false);

  const codigo = codigoUbicacion ?? titulo;

  useEffect(() => {
    if (!visible) {
      setFinalizada(false);
      setBusqueda('');
      setVerPlanos(false);
      return;
    }

    let activo = true;

    (async () => {
      try {
        const terminada =
          await InventoryService.estaUbicacionFinalizada(codigo);
        if (activo) {
          setFinalizada(terminada);
        }
      } catch (e) {
        console.error('Error comprobando el estado de la ubicación:', e);
      }
    })();

    return () => {
      activo = false;
    };
  }, [visible, codigo]);

  const termino = busqueda.trim().toUpperCase();
  const visibles = articulos
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        termino === '' ||
        String(item.articulo ?? '').toUpperCase().includes(termino)
    );

  const seleccionado =
    editandoIndex != null ? articulos[editandoIndex] ?? null : null;

  const puedeEditar = Boolean(onGuardarEdicion) && !finalizada;
  const puedeEliminar = Boolean(onEliminar) && !finalizada;

  const cerrarDetalle = () => {
    onCancelarEdicion?.();
  };

  /* Sección y área salen del código `SECCION-AREA-SUBZONA` */
  const [planosSeccion = null, planosArea = null] =
    String(codigo ?? '').split('-');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCerrar}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.cabecera}>
            <Text style={styles.title}>{titulo}</Text>

            {conPlanos && planosSeccion && (
              <TouchableOpacity
                style={styles.botonPlanos}
                onPress={() => setVerPlanos(true)}
                accessibilityRole="button"
                accessibilityLabel={`Ver planos de ${planosSeccion}`}
                hitSlop={8}
                testID="btn-planos-csv"
              >
                <MaterialIcons name="map" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {finalizada && (
            <Text style={styles.avisoTerminada} testID="aviso-terminada">
              Ubicación terminada: solo consulta
            </Text>
          )}

          {articulos.length === 0 ? (
            <Text style={styles.empty}>No hay artículos en esta ubicación</Text>
          ) : (
            <>
              <View style={styles.buscador}>
                <MaterialIcons name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.buscadorInput}
                  placeholder="Buscar código…"
                  placeholderTextColor={colors.textSecondary}
                  value={busqueda}
                  onChangeText={setBusqueda}
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="input-buscar-articulo"
                />
                {busqueda !== '' && (
                  <TouchableOpacity
                    onPress={() => setBusqueda('')}
                    testID="limpiar-busqueda"
                  >
                    <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.headerRow}>
                <Text style={[styles.headerCell, styles.colCodigo]}>Artículo</Text>
                <Text style={[styles.headerCell, styles.colCantidad]}>Cantidad</Text>
              </View>

              <ScrollView style={styles.list}>
                {visibles.length === 0 ? (
                  <Text style={styles.empty}>
                    {`Sin resultados para «${busqueda.trim()}»`}
                  </Text>
                ) : (
                  visibles.map(({ item, index }) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.row}
                      onPress={() => onIniciarEdicion?.(index)}
                      disabled={!onIniciarEdicion}
                      accessibilityRole="button"
                      accessibilityLabel={`Artículo ${item.articulo}, cantidad ${item.cantidad ?? 0}`}
                      testID={`fila-articulo-${index}`}
                    >
                      {/* Sin numberOfLines: el código se ve entero */}
                      <Text style={[styles.codigo, styles.colCodigo]}>
                        {item.articulo}
                      </Text>
                      <Text style={[styles.cantidad, styles.colCantidad]}>
                        {item.cantidad ?? 0}
                      </Text>
                      {onIniciarEdicion && (
                        <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </>
          )}

          {(onExportar || onBorrar) && (
            <View style={styles.accionesCsv}>
              {onExportar && (
                <TouchableOpacity
                  style={[styles.accionButton, styles.accionExportar]}
                  onPress={() => onExportar(titulo)}
                >
                  <MaterialIcons name="file-upload" size={20} color="#fff" />
                  <Text style={styles.accionText}>Exportar</Text>
                </TouchableOpacity>
              )}

              {onBorrar && (
                <TouchableOpacity
                  style={[styles.accionButton, styles.accionBorrar]}
                  onPress={() => onBorrar(titulo)}
                >
                  <MaterialIcons name="delete-outline" size={20} color="#fff" />
                  <Text style={styles.accionText}>Borrar CSV</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onCerrar}>
            <Text style={styles.closeText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ---------- DETALLE DEL ARTÍCULO ---------- */}

      <Modal
        visible={visible && seleccionado !== null}
        animationType="fade"
        transparent
        onRequestClose={cerrarDetalle}
      >
        <View style={styles.overlayDetalle}>
          {seleccionado && (
            <View style={styles.detalle} testID="detalle-articulo">
              <Text style={styles.detalleTitulo}>Artículo</Text>

              <Text style={styles.etiqueta}>Código</Text>
              <Text style={styles.valorCodigo} selectable>
                {seleccionado.articulo}
              </Text>

              <Text style={styles.etiqueta}>Descripción</Text>
              <Text style={styles.valor}>{seleccionado.dsca || '—'}</Text>

              <Text style={styles.etiqueta}>Unidad</Text>
              <Text style={styles.valor}>{seleccionado.unidad || '—'}</Text>

              <Text style={styles.etiqueta}>Cantidad</Text>
              {puedeEditar ? (
                <TextInput
                  style={styles.inputCantidad}
                  keyboardType="numeric"
                  value={editandoValor}
                  onChangeText={onChangeValor}
                  selectTextOnFocus
                  testID="input-cantidad-detalle"
                />
              ) : (
                <Text style={styles.valorCantidad}>{seleccionado.cantidad ?? 0}</Text>
              )}

              {finalizada && (
                <Text style={styles.avisoTerminada}>
                  {`La ubicación ${codigo} está terminada y no admite cambios`}
                </Text>
              )}

              {puedeEditar && (
                <TouchableOpacity
                  style={[styles.botonDetalle, styles.botonGuardar]}
                  onPress={() => onGuardarEdicion(editandoIndex)}
                  testID="btn-guardar-detalle"
                >
                  <Text style={styles.botonTexto}>Guardar</Text>
                </TouchableOpacity>
              )}

              {puedeEliminar && (
                <TouchableOpacity
                  style={[styles.botonDetalle, styles.botonEliminar]}
                  onPress={() => onEliminar(editandoIndex)}
                  testID="btn-eliminar-detalle"
                >
                  <MaterialIcons name="delete-outline" size={20} color="#fff" />
                  <Text style={styles.botonTexto}>Eliminar</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.botonDetalle, styles.botonCancelar]}
                onPress={cerrarDetalle}
                testID="btn-cerrar-detalle"
              >
                <Text style={styles.botonCancelarTexto}>
                  {puedeEditar ? 'Cancelar' : 'Cerrar'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* ---------- PLANOS DE LA SECCIÓN / ÁREA ---------- */}

      {conPlanos && planosSeccion && (
        <PlanosModal
          visible={visible && verPlanos}
          seccion={planosSeccion}
          area={planosArea}
          onCerrar={() => setVerPlanos(false)}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    height: '92%',
  },
  /* El título queda centrado; el botón de planos va a la
     derecha sin empujarlo (mismo hueco a la izquierda). */
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 46,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  botonPlanos: {
    position: 'absolute',
    right: 0,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 19,
    backgroundColor: '#fff',
  },
  avisoTerminada: {
    textAlign: 'center',
    color: colors.danger,
    fontWeight: '600',
    marginBottom: 10,
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginVertical: 20,
  },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  buscadorInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 15,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.borderStrong,
    paddingHorizontal: 5,
    paddingRight: 27,
  },
  headerCell: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  colCodigo: {
    flex: 1,
  },
  colCantidad: {
    width: 80,
    textAlign: 'right',
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 5,
  },
  codigo: {
    fontSize: 15,
    color: colors.text,
  },
  cantidad: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  accionesCsv: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  accionButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accionExportar: {
    backgroundColor: colors.primary,
  },
  accionBorrar: {
    backgroundColor: colors.danger,
  },
  accionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  closeButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 15,
  },
  closeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  /* ---------- Detalle ---------- */

  overlayDetalle: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  detalle: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  detalleTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  etiqueta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  valorCodigo: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  valor: {
    fontSize: 16,
    color: colors.text,
  },
  valorCantidad: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  inputCantidad: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  botonDetalle: {
    flexDirection: 'row',
    gap: 6,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  botonGuardar: {
    backgroundColor: colors.primary,
  },
  botonEliminar: {
    backgroundColor: colors.danger,
  },
  botonCancelar: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  botonTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  botonCancelarTexto: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
