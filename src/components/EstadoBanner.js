import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import useConectividad from '../logic/useConectividad';
import { colors } from '../styles/styles';

/* =======================================================
 * CONEXIÓN Y COLA DE PENDIENTES
 * =======================================================
 *
 * La copia del maestro se muestra aparte, en
 * `MaestrosBanner`, dentro de la pantalla de identificación.
 * Aquí queda solo lo que afecta al trabajo ya iniciado:
 *
 *   1. Sin conexión        → ámbar  la cola acumula
 *   2. Error al sincronizar → rojo  una operación falló
 *   3. Sincronizando       → gris   progreso
 *   4. Todo bien           → verde  última sincronización
 *
 * En Home y Lista se usa `soloAvisos`: el estado "todo bien"
 * se oculta y solo quedan los problemas. En la pantalla de
 * identificación se muestra completo, arriba del formulario.
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

export default function EstadoBanner({ soloAvisos = false }) {

  const {
    online,
    comprobando,
    sincronizando,
    pendientes,
    ultimoIntento,
    ultimoError,
    reintentar,
  } = useConectividad();

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

  /* ---------- 1. Sin conexión ---------- */

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

  /* ---------- 2. Error al sincronizar ---------- */

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

  /* ---------- 3. Sincronizando ---------- */

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

  /* ---------- 4. Todo bien ---------- */

  /* En las pantallas de trabajo no ocupamos sitio con el
     estado normal; los avisos de arriba ya cubren problemas
     y la cola pendiente. */

  if (soloAvisos && pendientes === 0) {
    return null;
  }

  /* Sin recuadro: es el estado normal y no debe gritar. */

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
            }`}
      </Text>

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
