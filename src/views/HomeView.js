import { View, Text, TouchableOpacity } from 'react-native';

import CantidadModal from '../components/CantidadModal';
import ManualCodeModal from '../components/ManualCodeModal';

import { styles } from '../styles/styles';

export default function HomeView({
  state,
  actions,
}) {

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#FFFFFF',
      }}
    >

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <View style={styles.header}>

        <Text style={styles.headerTitle}>
          Mi Inventario App
        </Text>

      </View>


      {/* =====================================================
          CONTENIDO
      ===================================================== */}

      <View style={styles.homeContent}>

        {/* ---------- ESCANEAR UBICACIÓN ---------- */}

        <TouchableOpacity
          style={[
            styles.customButton,
            { marginBottom: 15 },
          ]}
          onPress={actions.abrirScannerUbicacion}
        >

          <Text style={styles.buttonText}>
            Escanear ubicaciónAAAAA
          </Text>

        </TouchableOpacity>


        {/* ---------- UBICACIÓN ACTUAL ---------- */}

        <Text style={styles.ubicacionText}>
          Ubicación actual: {state.ubicacion ?? '—'}
        </Text>


        {/* =================================================
            BOTONES ARTÍCULO
        ================================================= */}

        <View
          style={{
            flexDirection: 'row',
            marginTop: 30,
          }}
        >

          {/* ---------- ESCANEAR ARTÍCULO ---------- */}

          <TouchableOpacity
            style={[
              styles.customButton,
              {
                flex: 1,
                marginRight: 8,
              },
            ]}
            onPress={actions.abrirScannerArticulo}
          >

            <Text style={styles.buttonText}>
              Escanear artículo
            </Text>

          </TouchableOpacity>


          {/* ---------- INTRODUCCIÓN MANUAL ---------- */}

          <TouchableOpacity
            style={[
              styles.customButton,
              {
                flex: 1,
                marginLeft: 8,
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
            onPress={() =>
              actions.setMostrarManual(true)
            }
          >

            <Text style={styles.buttonText}>
              +
            </Text>

          </TouchableOpacity>

        </View>


        {/* =================================================
            ÚLTIMOS ARTÍCULOS
        ================================================= */}

        {state.ultimosArticulos.length > 0 && (

          <View style={styles.listaArticulos}>

            <Text style={styles.ultimosArticulosTitle}>
              Últimos artículos escaneados
            </Text>

            {state.ultimosArticulos.map(
              (item, index) => (

                <Text
                  key={index}
                  style={styles.itemArticulo}
                >
                  {item.articulo} — Cantidad: {item.cantidad}
                </Text>

              )
            )}

          </View>

        )}

      </View>


      {/* =====================================================
          MODAL CÓDIGO MANUAL
      ===================================================== */}

      <ManualCodeModal
        visible={state.mostrarManual}

        onConfirm={(codigo) => {

          actions.onManualCode(codigo);

          actions.setMostrarManual(false);

        }}

        onCancel={() =>
          actions.setMostrarManual(false)
        }
      />


      {/* =====================================================
          MODAL CANTIDAD
      ===================================================== */}

      <CantidadModal
        visible={state.mostrarCantidad}

        ubicacion={state.ubicacion}

        articulo={state.articuloTemp}

        onConfirm={actions.confirmarCantidad}

        onCancel={() =>
          actions.setMostrarCantidad(false)
        }
      />

    </View>
  );
}