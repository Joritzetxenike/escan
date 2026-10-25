import { View, Text, TouchableOpacity } from 'react-native';

import CantidadModal from '../components/CantidadModal';
import ArticuloExistenteModal from '../components/ArticuloExistenteModal';
import ManualCodeModal from '../components/ManualCodeModal';
import EstadoBanner from '../components/EstadoBanner';

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
          CONTENIDO
      ===================================================== */}

      <View style={styles.homeContent}>

        {/* ---------- AVISOS DE CONEXIÓN Y COLA ---------- */}

        <EstadoBanner soloAvisos />

        {/* ---------- UBICACIÓN ---------- */}

        <View
          style={{
            flexDirection: 'row',
            marginBottom: 15,
          }}
        >

          {/* ---------- ESCANEAR UBICACIÓN ---------- */}

          <TouchableOpacity
            style={[
              styles.customButton,
              styles.botonEscanear,
            ]}
            onPress={actions.abrirScannerUbicacion}
          >

            <Text style={styles.buttonText}>
              Escanear ubicación
            </Text>

          </TouchableOpacity>


          {/* ---------- INTRODUCCIÓN MANUAL ---------- */}
          {/* También sin conexión: el código se valida contra la
              copia local del maestro, igual que al escanear.
              Mismo estilo que el "+" de artículos: `botonMas` */}

          <TouchableOpacity
            style={[
              styles.customButton,
              styles.botonMas,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Introducir ubicación a mano"
            testID="btn-manual-ubicacion"
            onPress={actions.abrirModalManualUbicacion}
          >

            <Text style={styles.buttonText}>
              +
            </Text>

          </TouchableOpacity>

        </View>


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
              styles.botonEscanear,
            ]}
            onPress={actions.abrirScannerArticulo}
          >

            <Text style={styles.buttonText}>
              Escanear artículo
            </Text>

          </TouchableOpacity>


          {/* ---------- INTRODUCCIÓN MANUAL ---------- */}
          {/* Sin conexión también se admiten códigos a mano: se
              validan contra la copia local del maestro.
              Mismo estilo que el "+" de ubicaciones: `botonMas` */}

          <TouchableOpacity
            style={[
              styles.customButton,
              styles.botonMas,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Introducir artículo a mano"
            testID="btn-manual-articulo"
            onPress={actions.abrirModalManual}
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
                  {`${item.articulo} — Cantidad: ${item.cantidad}${
                    item.pendiente ? ' (pendiente)' : ''
                  }`}
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

        sugerencias={actions.sugerirArticulos}

        onConfirm={async (codigo) => {

          const valido =
            await actions.onManualCode(codigo);

          /* Igual que el de ubicación: si el artículo no
             existe el modal se queda abierto y conserva lo
             tecleado para poder corregirlo. */

          if (valido) {

            actions.setMostrarManual(false);

          }

          return valido;

        }}

        onCancel={() =>
          actions.setMostrarManual(false)
        }
      />


      {/* =====================================================
          MODAL CÓDIGO MANUAL DE UBICACIÓN
      ===================================================== */}

      <ManualCodeModal
        visible={state.mostrarManualUbicacion}

        titulo="Introduce el código de ubicación"
        placeholder="LIN2-A01-Z01"
        autoCapitalize="characters"
        testID="input-ubicacion-manual"

        onConfirm={async (codigo) => {

          const valida =
            await actions.onManualUbicacion(codigo);

          /* Si el código no existe el modal se queda abierto:
             con tres partes es fácil equivocarse y obligar a
             volver a pulsarlo sería un fastidio. */

          if (valida) {
            actions.setMostrarManualUbicacion(
              false
            );
          }

          return valida;

        }}

        onCancel={() =>
          actions.setMostrarManualUbicacion(false)
        }
      />


      {/* =====================================================
          MODAL ARTÍCULO YA CONTADO
      ===================================================== */}

      <ArticuloExistenteModal
        visible={state.mostrarExistente}

        articulo={state.articuloTemp}

        ubicacion={state.ubicacion}

        cantidad={state.cantidadExistente}

        onSumar={actions.elegirSumar}

        onSobrescribir={actions.elegirSobrescribir}

        onCancelar={actions.cancelarExistente}
      />


      {/* =====================================================
          MODAL CANTIDAD
      ===================================================== */}

      <CantidadModal
        visible={state.mostrarCantidad}

        ubicacion={state.ubicacion}

        articulo={state.articuloTemp}

        onConfirm={actions.confirmarCantidad}

        onCancel={actions.descartarArticulo}
      />

    </View>
  );
}