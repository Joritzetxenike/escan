import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import useConectividad from '../logic/useConectividad';
import useMaestros from '../logic/useMaestros';
import { colors } from '../styles/styles';

/* =======================================================
 * ESTADO DE LA APP EN UNA FRANJA
 * =======================================================
 *
 * Antes eran dos banners apilados: el de conectividad y el
 * del maestro. Con dos, el que importa se quedaba debajo
 * del que no, y con el maestro recién descargado (que es
 * cuando más falta hace el de conectividad) se veían los
 * dos a la vez. Ahora es uno solo y gana el problema más
 * urgente.
 *
 * Prioridad, de más a menos grave:
 *
 *   1. Descargando el maestro    → rojo   no se puede validar
 *   2. Sin copia del maestro     → rojo   bloquea todo
 *   3. Error al bajar el maestro → rojo   se conserva la copia
 *   4. Sin conexión              → ámbar  la cola acumula
 *   5. Error al sincronizar      → rojo   una operación falló
 *   6. Sincronizando             → gris   progreso
 *   7. Maestro viejo             → ámbar  actualizar o aplazar
 *   8. Todo bien                 → verde  con el botón siempre
 *
 * Los dos últimos estados incluyen el botón `Actualizar`
 * aunque no haya nada que actualizar: es la única forma de
 * forzar la descarga si un artículo sale rechazado y no
 * queremos esperar 24 h.
 *
 * Un fallo de red nunca muestra la operación como
 * guardada en Supabase: aparece como "pendiente".
 * ======================================================= */

const formatHora = (timestamp) => {

  if (!timestamp) return '';

  const fecha = new Date(timestamp);

  const hh = String(fecha.getHours()).padStart(2, '0');
  const mm = String(fecha.getMinutes()).padStart(2, '0');

  return `${hh}:${mm}`;

};

/* Botón de acción: píldora blanca con borde. El color lo
   pone el estado para que no desaparezca sobre el fondo
   ámbar o rojo. `hitSlop` para no fallar el toque. */

const Boton = ({ onPress, testID, icono, texto, color }) => (
  <TouchableOpacity
    onPress={onPress}
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={texto}
    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    style={[
      styles.boton,
      { borderColor: color },
    ]}
  >
    <MaterialIcons
      name={icono}
      size={18}
      color={color}
    />

    <Text
      style={[
        styles.botonTexto,
        { color },
      ]}
    >
      {texto}
    </Text>
  </TouchableOpacity>
);

export default function EstadoBanner() {

  const {
    online,
    comprobando,
    sincronizando,
    pendientes,
    ultimoIntento,
    ultimoError,
    reintentar,
  } = useConectividad();

  const {
    hayCopia,
    descargando,
    descargandoQue,
    pideActualizar,
    error: errorMaestro,
    viejo,
    peligroso,
    antiguedadTexto,
    actualizar,
    aplazar,
  } = useMaestros();

  const pendienteTexto =
    pendientes === 1
      ? '1 cambio pendiente'
      : `${pendientes} cambios pendientes`;

  const reintentarBoton = (color) => (
    <Boton
      onPress={reintentar}
      testID="reintentar-sincronizacion"
      icono="refresh"
      texto="Reintentar"
      color={color}
    />
  );

  const actualizarBoton = (color) => (
    <Boton
      onPress={actualizar}
      testID="maestros-actualizar"
      icono="refresh"
      texto="Actualizar"
      color={color}
    />
  );

  const franja = (icono, colorIcono, texto, acciones) => (

    <View
      style={[
        styles.banner,
        {
          backgroundColor: acciones.fondo,
          borderColor: acciones.borde,
        },
      ]}
      testID="estado-banner"
    >

      <MaterialIcons
        name={icono}
        size={18}
        color={colorIcono}
      />

      <Text
        style={[
          styles.texto,
          { color: acciones.color },
        ]}
        numberOfLines={3}
      >
        {texto}
      </Text>

      {acciones.hijos}

    </View>

  );

  /* ---------- 1. Descargando el maestro ---------- */

  if (descargando) {

    return franja(
      'cloud-download',
      colors.textSecondary,
      descargandoQue === 'ubicaciones'
        ? 'Descargando las ubicaciones…'
        : 'Descargando el maestro de artículos…',
      {
        fondo: colors.surfaceAlt,
        borde: colors.borderStrong,
        color: colors.textSecondary,
        hijos: null,
      }
    );

  }

  /* ---------- 2. Sin copia: bloquea la validación ---------- */

  if (!hayCopia) {

    return franja(
      'inventory',
      colors.danger,
      'Sin copia del maestro: conéctate una vez para poder validar los códigos',
      {
        fondo: '#FEE2E2',
        borde: colors.danger,
        color: colors.danger,
        hijos: actualizarBoton(colors.danger),
      }
    );

  }

  /* ---------- 3. Error al bajar el maestro ---------- */

  if (errorMaestro) {

    return franja(
      'error-outline',
      colors.danger,
      `No se pudo actualizar el maestro: ${errorMaestro}`,
      {
        fondo: '#FEE2E2',
        borde: colors.danger,
        color: colors.danger,
        hijos: actualizarBoton(colors.danger),
      }
    );

  }

  /* ---------- 4. Sin conexión ---------- */

  if (online === false && !sincronizando) {

    return franja(
      'wifi-off',
      colors.warning,
      `Sin conexión · ${pendienteTexto}`,
      {
        fondo: colors.warningBg,
        borde: colors.warning,
        color: colors.warning,
        hijos: reintentarBoton(colors.warning),
      }
    );

  }

  /* ---------- 5. Error al sincronizar ---------- */

  if (ultimoError) {

    return franja(
      'error-outline',
      colors.danger,
      `Error al sincronizar: ${ultimoError.mensaje}`,
      {
        fondo: '#FEE2E2',
        borde: colors.danger,
        color: colors.danger,
        hijos: reintentarBoton(colors.danger),
      }
    );

  }

  /* ---------- 6. Sincronizando ---------- */

  if (comprobando || sincronizando) {

    return franja(
      'sync',
      colors.textSecondary,
      'Sincronizando…',
      {
        fondo: colors.surfaceAlt,
        borde: colors.borderStrong,
        color: colors.textSecondary,
        hijos: null,
      }
    );

  }

  /* ---------- 7. Maestro viejo: decide el operario ---------- */

  if (pideActualizar) {

    const color = peligroso ? colors.danger : colors.warning;

    const texto = peligroso
      ? `La copia del maestro (${antiguedadTexto}) puede estar rechazando artículos nuevos`
      : `Actualizar el maestro · ${antiguedadTexto}`;

    return franja(
      'update',
      color,
      texto,
      {
        fondo: peligroso ? '#FEE2E2' : colors.warningBg,
        borde: color,
        color,
        hijos: (

          <View style={styles.acciones}>

            <TouchableOpacity
              onPress={aplazar}
              testID="maestros-aplazar"
              accessibilityRole="button"
              accessibilityLabel="Aplazar la actualización del maestro"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text
                style={[
                  styles.accion,
                  { color },
                ]}
              >
                Ahora no
              </Text>
            </TouchableOpacity>

            {actualizarBoton(color)}

          </View>

        ),
      }
    );

  }

  /* ---------- 8. Maestro viejo, ya decidido ---------- */

  if (viejo) {

    return franja(
      'update',
      colors.textSecondary,
      `Copia del maestro · ${antiguedadTexto}`,
      {
        fondo: colors.surfaceAlt,
        borde: colors.borderStrong,
        color: colors.textSecondary,
        hijos: actualizarBoton(colors.primaryStrong),
      }
    );

  }

  /* ---------- 9. Todo bien ---------- */

  /* Sin recuadro: es el estado normal y no debe gritar.
     El botón se queda para poder forzar la descarga. */

  return (

    <View style={styles.bannerOk} testID="estado-banner">

      <MaterialIcons
        name="cloud-done"
        size={16}
        color={colors.success}
      />

      <Text style={styles.textoOk}>
        {pendientes > 0
          ? `Sincronizando ${pendienteTexto}…`
          : `Sincronizado${
              ultimoIntento
                ? ` · ${formatHora(ultimoIntento)}`
                : ''
            } · Maestro al día`}
      </Text>

      {actualizarBoton(colors.primaryStrong)}

    </View>

  );

}

const styles = {
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  bannerOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  texto: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  textoOk: {
    flex: 1,
    fontSize: 12,
    color: colors.success,
  },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accion: {
    fontSize: 13,
    fontWeight: '700',
  },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  botonTexto: {
    fontSize: 13,
    fontWeight: '700',
  },
};