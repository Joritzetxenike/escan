import { View, Text, TouchableOpacity } from 'react-native';

import CantidadModal from '../components/CantidadModal';
import ArticuloExistenteModal from '../components/ArticuloExistenteModal';
import ManualCodeModal from '../components/ManualCodeModal';
import EstadoBanner from '../components/EstadoBanner';
import PlanosModal from '../components/PlanosModal';
// import ImportEmergenciaModal from '../components/ImportEmergenciaModal'; // COMENTADO - emergencia

import { MaterialIcons } from '@expo/vector-icons';

import { styles, colors } from '../styles/styles';

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

      <View style={styles.container}>

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

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >

          <Text style={[styles.ubicacionText, { flex: 1 }]}>
            Ubicación actual: {state.ubicacion ?? '—'}
          </Text>

          {/* ---------- PLANOS DE LA SECCIÓN / ÁREA ---------- */}

          {state.ubicacion && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingVertical: 8,
                paddingHorizontal: 12,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: colors.primary,
                borderRadius: 6,
              }}
              accessibilityRole="button"
              accessibilityLabel="Ver planos de la sección"
              testID="btn-planos-home"
              onPress={actions.abrirPlanos}
            >
              <MaterialIcons name="map" size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                Planos
              </Text>
            </TouchableOpacity>
          )}

        </View>

        {/* ---------- IMPORTACIÓN DE EMERGENCIA — COMENTADO ---------- */}
        {/* Solo visible si el administrador habilitó la bandera y
            hay una ubicación activa seleccionada. Sobrescribe el
            CSV local con los datos de Supabase. */}
        {/* {state.puedeImportarEmergencia && state.ubicacion && (
          <TouchableOpacity
            style={[
              styles.customButton,
              styles.botonEmergencia,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Importar desde nube (emergencia)"
            testID="btn-importar-emergencia"
            onPress={actions.importarDesdeNube}
          >
            <Text style={styles.botonEmergenciaTexto}>
              Importar desde nube (emergencia)
            </Text>
          </TouchableOpacity>
        )} */}


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

                /* Una fila por artículo: código completo y, debajo,
                   la descripción en pequeño (una línea, con "…" si
                   no cabe); cantidad + unidad a la derecha. */
                <View
                  key={index}
                  style={styles.filaUltimo}
                  testID={`ultimo-${index}`}
                >

                  <View style={{ flex: 1 }}>
                    <Text style={styles.ultimoCodigo}>
                      {item.articulo}
                    </Text>

                    {!!item.descripcion && (
                      <Text
                        style={styles.ultimoDescripcion}
                        numberOfLines={1}
                      >
                        {item.descripcion}
                      </Text>
                    )}

                    {item.pendiente && (
                      <Text style={styles.ultimoPendiente}>
                        Pendiente de enviar
                      </Text>
                    )}
                  </View>

                  <Text style={styles.ultimoCantidad}>
                    {`${item.cantidad}${item.unidad ? ` ${item.unidad}` : ''}`}
                  </Text>

                </View>

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

        obtenerDetalle={actions.obtenerDetalleArticulo}

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

        descripcion={state.detalleArticulo?.descripcion}

        unidad={state.detalleArticulo?.unidad}

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

        descripcion={state.detalleArticulo?.descripcion}

        unidad={state.detalleArticulo?.unidad}

        onConfirm={actions.confirmarCantidad}

        onCancel={actions.descartarArticulo}
      />

      {/* =====================================================
          MODAL PLANOS
      ===================================================== */}

      {state.planosSeccion && (
        <PlanosModal
          visible={state.mostrarPlanos === true}

          seccion={state.planosSeccion}

          area={state.planosArea}

          onCerrar={actions.cerrarPlanos}
        />
      )}

      {/* =====================================================
          MODAL IMPORTACIÓN DE EMERGENCIA — COMENTADO
      ===================================================== */}

      {/* <ImportEmergenciaModal
        visible={state.mostrarImportEmergencia}

        resumen={state.importResult}

        onCerrar={() => actions.setMostrarImportEmergencia(false)}
      /> */}

    </View>
  );
}