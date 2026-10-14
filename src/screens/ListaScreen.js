import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { styles, colors } from '../styles/styles';
import ArticulosModal from '../components/ArticulosModal';
import ManualCodeModal from '../components/ManualCodeModal';
import EstadoBanner from '../components/EstadoBanner';
import InventoryService from '../services/InventoryService';
import UbicacionValidator from '../validators/UbicacionValidator';
import { nombreCsvUbicacion, leerCsvUbicacion } from '../helpers/csvHelper';

export default function ListaScreen() {
  const navigation = useNavigation();

  const [csvs, setCsvs] = useState([]);
  const [csvSeleccionado, setCsvSeleccionado] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  /* Fila en edición dentro del modal del CSV. El índice es el
     real en `registros`, no el de la lista filtrada. */

  const [editandoIndex, setEditandoIndex] = useState(null);
  const [nuevaCantidad, setNuevaCantidad] = useState('');

  const [mostrarManualUbicacion, setMostrarManualUbicacion] =
    useState(false);

  /* ---------- CARGAR CSV ---------- */
  const cargarCsvs = async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
      setCsvs(files.filter((f) => f.endsWith('.csv')));
    } catch (e) {
      console.error('Error leyendo CSVs', e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      cargarCsvs();
    }, [])
  );

  /* ---------- EDICIÓN DE CANTIDAD ---------- */

  const cerrarEdicion = () => {
    setEditandoIndex(null);
    setNuevaCantidad('');
  };

  /* =====================================================
   * ABRIR CSV POR UBICACIÓN
   *
   * Para ver un CSV hay que conocer su ubicación: se abre
   * escaneándola o escribiéndola a mano. No se valida contra
   * la copia del maestro (solo el formato): el objetivo es
   * abrir un CSV local que ya existe, y exigir la copia
   * bloquearía verlo si la copia está desactualizada.
   * ===================================================== */

  const abrirCsvParaUbicacion = async (codigo) => {
    const ubicacion = UbicacionValidator.normalizar(codigo);

    if (!UbicacionValidator.validarFormato(ubicacion)) {
      Alert.alert(
        'Ubicación inválida',
        `El código ${ubicacion} no sigue el formato seccion-area-subzona (ej. LIN2-A01-Z01)`
      );
      return false;
    }

    const filas = await leerCsvUbicacion(ubicacion);

    if (filas.length === 0) {
      Alert.alert(
        'Sin registros',
        `No hay registros para ${ubicacion}`
      );
      /* El formato es correcto: se cierra el modal manual para
         mostrar el aviso, no hay nada que corregir en lo tecleado. */
      return true;
    }

    setCsvSeleccionado(nombreCsvUbicacion(ubicacion));
    setRegistros(filas);
    cerrarEdicion();
    setModalVisible(true);

    return true;
  };

  const abrirScannerUbicacion = () => {
    navigation.navigate('Scanner', {
      tipo: 'ubicacion',
      onScan: ({ codigo }) => {
        abrirCsvParaUbicacion(codigo);
      },
    });
  };

  /* ---------- EXPORTAR CSV ---------- */
  const exportarCsv = async (nombre) => {
    const uri = FileSystem.documentDirectory + nombre;
    const ubicacion = nombre.replace(/\.csv$/i, '');

    /* Compartir y cerrar no son la misma cosa. Solo se cierra si
       la ubicación sigue abierta: si ya estaba terminada, volver
       a enviarla no cambia nada, avisa de algo que no ha pasado
       y sin conexión encola un `finalizar` duplicado (esa
       operación nunca se fusiona en la cola). Mismo patrón que
       se sigue al borrar un registro. */

    let sigueAbierta = true;

    try {
      sigueAbierta = !(await InventoryService.estaUbicacionFinalizada(
        ubicacion
      ));
    } catch (e) {
      /* Sin poder comprobarlo no se cierra: cerrar a ciegas es
         justo lo que duplica la cola. Compartir no tiene efectos
         secundarios, así que continúa igualmente. */

      console.error('No se pudo comprobar el estado de la ubicación:', e);
      sigueAbierta = false;
    }

    if (sigueAbierta) {
      try {
        const resultado =
          await InventoryService.finalizarUbicacion(ubicacion);

        if (resultado?.pendiente) {
          Alert.alert(
            'Sin conexión',
            `La ubicación ${ubicacion} se marcará como terminada al sincronizar`
          );
        } else {
          Alert.alert(
            'Ubicación terminada',
            `La ubicación ${ubicacion} se ha marcado como terminada`
          );
        }
      } catch (e) {
        console.error('Error finalizando ubicación:', e);
        Alert.alert(
          'Aviso',
          `No se pudo marcar la ubicación ${ubicacion} como terminada`
        );
      }
    }

    try {
      await Sharing.shareAsync(uri, {
        mimeType: 'text/csv',
        dialogTitle: `Exportar ${nombre}`,
      });
    } catch (e) {
      Alert.alert('Error', 'No se pudo exportar el CSV');
      console.error(e);
    }
  };

  /* ---------- BORRAR CSV ---------- */
  const borrarCsv = (nombre) => {
    Alert.alert('Borrar CSV', `¿Eliminar ${nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await FileSystem.deleteAsync(FileSystem.documentDirectory + nombre);
          setCsvSeleccionado(null);
          setRegistros([]);
          setModalVisible(false);
          cargarCsvs();
        },
      },
    ]);
  };

  /* ---------- ABRIR CSV ---------- */
  const abrirCsv = async (nombre) => {
    try {
      const uri = FileSystem.documentDirectory + nombre;
      const contenido = await FileSystem.readAsStringAsync(uri);
      const filas = contenido
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => {
          const [ubicacion, articulo, cantidad] = line.split(',');
          return { ubicacion, articulo, cantidad };
        });
      setCsvSeleccionado(nombre);
      setRegistros(filas);
      cerrarEdicion();
      setModalVisible(true);
    } catch (e) {
      Alert.alert('Error', 'No se pudo abrir el CSV');
      console.error(e);
    }
  };

  /* ---------- BORRAR REGISTRO INDIVIDUAL ---------- */
  const borrarRegistro = async (index) => {
    const reg = registros[index];

    try {
      const finalizada =
        await InventoryService.estaUbicacionFinalizada(reg.ubicacion);

      if (finalizada) {
        Alert.alert(
          'Ubicación terminada',
          `La ubicación ${reg.ubicacion} está terminada y no admite borrados`
        );
        return;
      }
    } catch (e) {
      console.error('No se pudo comprobar el estado de la ubicación:', e);
    }

    Alert.alert(
      'Borrar registro',
      `¿Eliminar ${reg.articulo} de ${reg.ubicacion}?\nEsta acción también lo borrará de la base de datos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            try {
              await InventoryService.eliminarMovimiento(
                reg.ubicacion,
                reg.articulo
              );
              setRegistros((actual) =>
                actual.filter((_, i) => i !== index)
              );
              cerrarEdicion();
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'No se pudo eliminar el registro');
            }
          },
        },
      ]
    );
  };

  /* ---------- GUARDAR CANTIDAD EDITADA ----------
   *
   * Escribe el CSV y la base de datos (o la cola) igual que la
   * pestaña Estado. Si la ubicación ya está terminada no se
   * cambia nada: la comprobación se repite aquí, aparte de la
   * que hace el propio modal, por si pasó a `Fin` mientras
   * estaba abierto.
   */

  const guardarCantidad = async (index) => {
    const cant = Number(nuevaCantidad);

    if (!Number.isInteger(cant) || cant < 0) {
      Alert.alert('Error', 'Introduce una cantidad válida');
      return;
    }

    const reg = registros[index];

    try {
      const finalizada =
        await InventoryService.estaUbicacionFinalizada(reg.ubicacion);

      if (finalizada) {
        Alert.alert(
          'Ubicación terminada',
          `La ubicación ${reg.ubicacion} está terminada y no admite cambios`
        );
        return;
      }
    } catch (e) {
      console.error('No se pudo comprobar el estado de la ubicación:', e);
    }

    try {
      await InventoryService.actualizarMovimiento({
        ubicacion: reg.ubicacion,
        articulo: reg.articulo,
        cantidad: cant,
      });

      setRegistros((actual) =>
        actual.map((r, i) =>
          i === index ? { ...r, cantidad: cant } : r
        )
      );

      cerrarEdicion();

    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo actualizar la cantidad');
    }
  };

  /* ---------- RENDER ITEM CSV ---------- */
  const renderItemCsv = ({ item }) => (
    <View style={stylesCsv.rowCsv}>
      <TouchableOpacity style={{ flex: 1 }} onPress={() => abrirCsv(item)}>
        <Text style={{ fontSize: 18 }}>{item}</Text>
      </TouchableOpacity>

      <MaterialIcons name="chevron-right" size={26} color={colors.textSecondary} />
    </View>
  );

  return (
    <View style={[styles.container, { flex: 1, padding: 10 }]}>
      <EstadoBanner />

      {/* ---------- ESCANEAR / ESCRIBIR UBICACIÓN ---------- */}

      <View style={{ flexDirection: 'row', marginBottom: 15 }}>
        <TouchableOpacity
          style={[styles.customButton, styles.botonEscanear]}
          testID="btn-escanear-ubicacion-lista"
          onPress={abrirScannerUbicacion}
        >
          <Text style={styles.buttonText}>Escanear ubicación</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.customButton, styles.botonMas]}
          accessibilityRole="button"
          accessibilityLabel="Introducir ubicación a mano"
          testID="btn-manual-ubicacion-lista"
          onPress={() => setMostrarManualUbicacion(true)}
        >
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>

      {csvs.length === 0 ? (
        <Text style={{ fontSize: 16, color: colors.textSecondary }}>No hay archivos CSV</Text>
      ) : (
        <FlatList
          data={csvs}
          keyExtractor={(item) => item}
          renderItem={renderItemCsv}
        />
      )}

      <ManualCodeModal
        visible={mostrarManualUbicacion}
        titulo="Introduce el código de ubicación"
        placeholder="LIN2-A01-Z01"
        autoCapitalize="characters"
        testID="input-ubicacion-manual-lista"
        onConfirm={async (codigo) => {
          const valida = await abrirCsvParaUbicacion(codigo);
          if (valida) {
            setMostrarManualUbicacion(false);
          }
          return valida;
        }}
        onCancel={() => setMostrarManualUbicacion(false)}
      />

      <ArticulosModal
        visible={modalVisible}
        titulo={csvSeleccionado}
        articulos={registros}
        onCerrar={() => {
          cerrarEdicion();
          setModalVisible(false);
        }}
        codigoUbicacion={csvSeleccionado?.replace(/\.csv$/i, '')}
        editandoIndex={editandoIndex}
        editandoValor={nuevaCantidad}
        onIniciarEdicion={(index) => {
          setEditandoIndex(index);
          setNuevaCantidad(String(registros[index].cantidad ?? 0));
        }}
        onChangeValor={setNuevaCantidad}
        onGuardarEdicion={guardarCantidad}
        onEliminar={borrarRegistro}
        onExportar={exportarCsv}
        onBorrar={borrarCsv}
      />
    </View>
  );
}

const stylesCsv = StyleSheet.create({
  rowCsv: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
