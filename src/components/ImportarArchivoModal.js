import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useState, useCallback } from 'react';

import InventoryService from '../services/InventoryService';
import { nombreCsvUbicacion, leerCsvUbicacion } from '../helpers/csvHelper';
import { colors } from '../styles/styles';

export default function ImportarArchivoModal({
  visible,
  onCerrar,
  onArchivoSeleccionado,
}) {
  const [archivos, setArchivos] = useState([]);
  [cargando, setCargando] = useState(false);

  const listarArchivos = useCallback(async () => {
    setCargando(true);
    try {
      const files = await FileSystem.readDirectoryAsync(
        FileSystem.documentDirectory
      );
      const csvs = files.filter((f) => f.endsWith('.csv')).sort();
      setArchivos(csvs);
    } catch (e) {
      console.error('Error listando CSV:', e);
      Alert.alert('Error', 'No se pudieron listar los archivos CSV');
    } finally {
      setCargando(false);
    }
  }, []);

  const importarArchivo = async (nombreArchivo) => {
    setCargando(true);
    try {
      const uri = FileSystem.documentDirectory + nombreArchivo;
      const contenido = await FileSystem.readAsStringAsync(uri);

      const lineas = contenido
        .split('\n')
        .filter((l) => l.trim() !== '')
        .map((l) => l.split(','));

      const cabecera = lineas[0];
      const filas = lineas.slice(1);

      // Buscar índice de cada columna
      const idxUbicacion = cabecera.findIndex(
        (c) => c.trim().toUpperCase() === 'UBICACION'
      );
      const idxArticulo = cabecera.findIndex(
        (c) => c.trim().toUpperCase() === 'ARTICULO'
      );
      const idxCantidad = cabecera.findIndex(
        (c) => c.trim().toUpperCase() === 'CANTIDAD'
      );
      const idxMatricula = cabecera.findIndex(
        (c) => c.trim().toUpperCase() === 'MATRICULA'
      );

      if (idxUbicacion < 0 || idxArticulo < 0 || idxCantidad < 0) {
        throw new Error(
          'El CSV no tiene las columnas requeridas: UBICACION, ARTICULO, CANTIDAD'
        );
      }

      const importados = [];
      const errores = [];

      for (const fila of filas) {
        try {
          const ubicacion = fila[idxUbicacion]?.trim();
          const articulo = fila[idxArticulo]?.trim();
          const cantidad = Number(fila[idxCantidad]?.trim());
          const matricula = idxMatricula >= 0 ? fila[idxMatricula]?.trim() : '';

          if (!ubicacion || !articulo || isNaN(cantidad)) {
            throw new Error('Fila con datos inválidos');
          }

          await InventoryService.guardarMovimiento(
            {
              ubicacion,
              articulo,
              cantidad,
              matricula,
            },
            {
              provisionalArticulo: false,
              ubicacionProvisional: false,
            }
          );

          importados.push({ articulo, cantidad });
        } catch (e) {
          errores.push({
            fila: fila.join(','),
            mensaje: e.message,
          });
        }
      }

      onArchivoSeleccionado({
        archivo: nombreArchivo,
        importados: importados.length,
        errores: errores.length,
        detalles: { importados, errores },
      });
    } catch (e) {
      console.error('Error importando archivo:', e);
      Alert.alert('Error', e.message || 'No se pudo importar el archivo');
    } finally {
      setCargando(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalBox}>
        <Text style={styles.modalTitle}>
          Importar archivo CSV
        </Text>

        {cargando && archivos.length === 0 && (
          <Text style={styles.metric}>
            Cargando archivos…
          </Text>
        )}

        {!cargando && archivos.length === 0 && (
          <Text style={styles.metricError}>
            No hay archivos CSV en el dispositivo
          </Text>
        )}

        {!cargando && archivos.length > 0 && (
          <View style={styles.lista}>
            {archivos.map((archivo) => (
              <TouchableOpacity
                key={archivo}
                style={styles.filaArchivo}
                onPress={() => importarArchivo(archivo)}
              >
                <Text style={styles.textoArchivo}>{archivo}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.botonCerrar}
          onPress={onCerrar}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          disabled={cargando}
        >
          <Text style={styles.botonTexto}>
            {cargando ? 'Procesando…' : 'Cerrar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalBox: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '85%',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111827',
  },

  metric: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 16,
    textAlign: 'center',
  },

  metricError: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 16,
    textAlign: 'center',
  },

  lista: {
    maxHeight: 300,
    marginBottom: 16,
  },

  filaArchivo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  textoArchivo: {
    fontSize: 15,
    color: '#111827',
  },

  botonCerrar: {
    backgroundColor: '#00729E',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },

  botonTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
