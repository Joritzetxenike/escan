import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useState, useCallback } from 'react';

import InventoryService from '../services/InventoryService';
import conectividadService from '../services/conectividadService';
import maestrosService from '../services/maestrosService';

export default function ImportEmergenciaModal({
  visible,
  ubicacion,
  onCerrar,
}) {
  const [cargando, setCargando] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState(null);

  const importar = useCallback(async () => {
    setCargando(true);
    setError(null);
    setResumen(null);

    try {

      /* ---------- Bandera de emergencia ---------- */

      const habilitada =
        await maestrosService.estaHabilitadaImportacionEmergencia();

      if (!habilitada) {
        throw new Error(
          'Importación de emergencia no está habilitada. '
          + 'Contacte con el administrador.'
        );
      }

      /* ---------- Conexión ---------- */

      const online = await conectividadService.estaOnline();

      if (!online) {
        throw new Error(
          'Sin conexión: no se puede importar desde la nube'
        );
      }

      /* ---------- Importar desde la nube ---------- */

      const resultado =
        await InventoryService.importarUbicacionDesdeNube(ubicacion);

      setResumen({
        ...resultado,
        ubicacion,
      });

    } catch (e) {

      console.error('Error importando desde nube:', e);
      setError(e.message || 'No se pudo importar desde la nube');

    } finally {
      setCargando(false);
    }

  }, [ubicacion]);

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalBox}>
        <Text style={styles.modalTitle}>
          Importación de emergencia
        </Text>

        <Text style={styles.modalSubtitle}>
          Ubicación: {ubicacion ?? '—'}
        </Text>

        {cargando && (
          <Text style={styles.metric}>
            Importando desde la nube…
          </Text>
        )}

        {error && (
          <Text style={styles.metricError}>
            {error}
          </Text>
        )}

        {resumen && (
          <>
            <Text style={styles.metric}>
              Importados: {resumen.importados}
            </Text>

            <Text style={styles.metricError}>
              Errores: {resumen.errores}
            </Text>

            {resumen.detalles?.importados?.length > 0 && (
              <View style={styles.lista}>
                <Text style={styles.listaTitulo}>
                  Artículos importados:
                </Text>
                {resumen.detalles.importados.map((item) => (
                  <Text key={item.articulo} style={styles.listaItem}>
                    {item.articulo} — {item.cantidad}
                  </Text>
                ))}
              </View>
            )}

            {resumen.detalles?.errores?.length > 0 && (
              <View style={styles.listaError}>
                <Text style={styles.listaTituloError}>
                  Errores:
                </Text>
                {resumen.detalles.errores.map((e) => (
                  <Text key={e.articulo} style={styles.listaItemError}>
                    {e.articulo}: {e.mensaje}
                  </Text>
                ))}
              </View>
            )}
          </>
        )}

        <TouchableOpacity
          style={styles.botonCerrar}
          onPress={onCerrar}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          disabled={cargando}
        >
          <Text style={styles.botonTexto}>
            {cargando ? 'Importando…' : 'Cerrar'}
          </Text>
        </TouchableOpacity>

        {!cargando && !error && !resumen && (
          <TouchableOpacity
            style={styles.botonImportar}
            onPress={importar}
            accessibilityRole="button"
            accessibilityLabel="Importar desde nube"
          >
            <Text style={styles.botonImportarTexto}>
              Importar desde nube
            </Text>
          </TouchableOpacity>
        )}
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
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    maxHeight: '80%',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#111827',
  },

  modalSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 16,
    textAlign: 'center',
  },

  metric: {
    fontSize: 16,
    fontWeight: '600',
    color: '#047857',
    marginBottom: 4,
  },

  metricError: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 16,
  },

  lista: {
    width: '100%',
    maxHeight: 200,
    marginBottom: 12,
  },

  listaTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    alignSelf: 'flex-start',
  },

  listaItem: {
    fontSize: 13,
    color: '#111827',
    marginBottom: 3,
    alignSelf: 'flex-start',
  },

  listaError: {
    width: '100%',
    maxHeight: 150,
    marginBottom: 12,
  },

  listaTituloError: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 6,
    alignSelf: 'flex-start',
  },

  listaItemError: {
    fontSize: 13,
    color: '#DC2626',
    marginBottom: 3,
    alignSelf: 'flex-start',
  },

  botonCerrar: {
    backgroundColor: '#00729E',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
  },

  botonTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  botonImportar: {
    backgroundColor: '#B45309',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
  },

  botonImportarTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
