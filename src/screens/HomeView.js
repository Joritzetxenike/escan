import { View, Text, TouchableOpacity } from 'react-native';
import Scanner from '../components/Scanner';
import CantidadModal from '../components/CantidadModal';
import ManualCodeModal from '../components/ManualCodeModal';
import { styles } from '../styles/styles';

export default function HomeView({
  state,
  actions,
}) {
  /* ---------- ESCÁNER ---------- */
  if (state.modoScanner) {
    return (
      <Scanner
        hintText={
          state.modoScanner === 'ubicacion'
            ? 'Escanea una ubicación'
            : 'Escanea un artículo'
        }
        onBack={actions.cerrarScanner}
        onCodeScanned={actions.onCodeScanned}
      />
    );
  }

  /* ---------- VISTA PRINCIPAL ---------- */
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* CABECERA */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Inventario App</Text>
      </View>

      {/* CONTENIDO */}
      <View style={styles.homeContent}>
        <TouchableOpacity
          style={[styles.customButton, { marginBottom: 15 }]}
          onPress={() => actions.abrirScanner('ubicacion')}
        >
          <Text style={styles.buttonText}>Escanear ubicación</Text>
        </TouchableOpacity>

        <Text style={styles.ubicacionText}>
          Ubicación actual: {state.ubicacion ?? '—'}
        </Text>

        {/* BOTONES EN PARALELO */}
        <View style={{ flexDirection: 'row', marginTop: 30 }}>
          <TouchableOpacity
            style={[styles.customButton, { flex: 1, marginRight: 8 }]}
            onPress={() => actions.abrirScanner('articulo')}
          >
            <Text style={styles.buttonText}>Escanear artículo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.customButton,
              { flex: 1, marginLeft: 8, justifyContent: 'center', alignItems: 'center' },
            ]}
            onPress={() => actions.setMostrarManual(true)}
          >
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* ÚLTIMOS ARTÍCULOS */}
        {state.ultimosArticulos.length > 0 && (
          <View style={styles.listaArticulos}>
            <Text style={styles.ultimosArticulosTitle}>
              Últimos artículos escaneados
            </Text>
            {state.ultimosArticulos.map((item, index) => (
              <Text key={index} style={styles.itemArticulo}>
                {item.articulo} — Cantidad: {item.cantidad}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* MODAL MANUAL */}
      <ManualCodeModal
        visible={state.mostrarManual}
        onConfirm={(codigo) => {
          actions.onManualCode(codigo);
          actions.setMostrarManual(false);
        }}
        onCancel={() => actions.setMostrarManual(false)}
      />

      {/* MODAL CANTIDAD */}
      <CantidadModal
        visible={state.mostrarCantidad}
        ubicacion={state.ubicacion}
        articulo={state.articuloTemp}
        onConfirm={actions.confirmarCantidad}
        onCancel={() => actions.setMostrarCantidad(false)}
      />
    </View>
  );
}