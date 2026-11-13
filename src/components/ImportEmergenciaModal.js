import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ImportEmergenciaModal({
  visible,
  resumen,
  onCerrar,
}) {
  if (!visible) return null;

  const { importados, errores, detalles } = resumen;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalBox}>
        <Text style={styles.modalTitle}>
          Importación de emergencia
        </Text>

        <Text style={styles.modalSubtitle}>
          Ubicación: {detalles?.ubicacion ?? '—'}
        </Text>

        <Text style={styles.metric}>
          Importados: {importados}
        </Text>

        <Text style={styles.metricError}>
          Errores: {errores}
        </Text>

        {detalles?.importados?.length > 0 && (
          <View style={styles.lista}>
            <Text style={styles.listaTitulo}>
              Artículos importados:
            </Text>
            {detalles.importados.map((item) => (
              <Text key={item.articulo} style={styles.listaItem}>
                {item.articulo} — {item.cantidad}
              </Text>
            ))}
          </View>
        )}

        {detalles?.errores?.length > 0 && (
          <View style={styles.listaError}>
            <Text style={styles.listaTituloError}>
              Errores:
            </Text>
            {detalles.errores.map((e) => (
              <Text key={e.articulo} style={styles.listaItemError}>
                {e.articulo}: {e.mensaje}
              </Text>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.botonCerrar}
          onPress={onCerrar}
          accessibilityRole="button"
          accessibilityLabel="Cerrar resumen"
        >
          <Text style={styles.botonTexto}>
            Cerrar
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
  },

  botonTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
