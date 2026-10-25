import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../styles/styles';

import InventoryService from '../services/InventoryService';

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
  onExportar,
  onBorrar,
  codigoUbicacion,
}) {
  const [finalizada, setFinalizada] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const codigo = codigoUbicacion ?? titulo;

  useEffect(() => {
    if (!visible) {
      setFinalizada(false);
      setBusqueda('');
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

  const avisoFinalizada = () => {
    Alert.alert(
      'Ubicación terminada',
      `La ubicación ${codigo} está terminada y no admite cambios`
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCerrar}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{titulo}</Text>

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
                <Text style={[styles.headerCell, { flex: 2 }]}>Artículo</Text>
                <Text style={[styles.headerCell, { flex: 1.3, textAlign: 'center' }]}>Descripción</Text>
                <Text style={[styles.headerCell, { flex: 0.5, textAlign: 'center' }]}>Unidad</Text>
                <Text style={[styles.headerCell, { flex: 0.8, textAlign: 'center' }]}>Cantidad</Text>
                {onEliminar && (
                  <Text style={[styles.headerCell, { flex: 0.6, textAlign: 'center' }]}>Eliminar</Text>
                )}
              </View>

              <ScrollView style={styles.list}>
                {visibles.length === 0 ? (
                  <Text style={styles.empty}>
                    {`Sin resultados para «${busqueda.trim()}»`}
                  </Text>
                ) : (
                  visibles.map(({ item, index }) => (
                  <View key={index} style={styles.row}>
                    <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>
                      {item.articulo}
                    </Text>
                    <Text style={[styles.cell, { flex: 1.3, textAlign: 'center', color: colors.textSecondary, fontSize: 12 }]} numberOfLines={1}>
                      {item.dsca || '—'}
                    </Text>
                    <Text style={[styles.cell, { flex: 0.5, textAlign: 'center', color: colors.textSecondary, fontSize: 12 }]} numberOfLines={1}>
                      {item.unidad || '—'}
                    </Text>

                    {editandoIndex === index ? (
                      <View style={[styles.cell, { flex: 0.8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}>
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          value={editandoValor}
                          onChangeText={onChangeValor}
                          autoFocus
                        />
                        <TouchableOpacity
                          onPress={() =>
                            finalizada
                              ? avisoFinalizada()
                              : onGuardarEdicion(index)
                          }
                          style={{ marginLeft: 4 }}
                        >
                          <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>✓</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() =>
                          finalizada
                            ? avisoFinalizada()
                            : onIniciarEdicion?.(index)
                        }
                        style={[styles.cell, { flex: 0.8, alignItems: 'center' }]}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: onIniciarEdicion ? colors.primary : colors.text }}>
                          {item.cantidad ?? 0}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {onEliminar && (
                      <TouchableOpacity
                        onPress={() =>
                          finalizada
                            ? avisoFinalizada()
                            : onEliminar(index)
                        }
                        style={[styles.cell, { flex: 0.6, alignItems: 'center' }]}
                      >
                        <MaterialIcons name="delete-outline" size={26} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
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
  },
  headerCell: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 5,
  },
  cell: {
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 4,
    padding: 2,
    width: 45,
    textAlign: 'center',
    fontSize: 13,
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
});
