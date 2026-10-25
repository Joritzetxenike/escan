import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import useMaestros from '../logic/useMaestros';
import { colors } from '../styles/styles';

/* =======================================================
 * COPIA LOCAL DEL MAESTRO
 * =======================================================
 *
 * Vive en la franja superior fija de la pantalla de identificación
 * para que el operario pueda descargar o forzar la actualización
 * antes de entrar.
 *
 * Prioridad, de más a menos grave:
 *
 *   1. Descargando el maestro    → gris   progreso
 *   2. Sin copia del maestro     → rojo   bloquea la validación
 *   3. Error al bajar el maestro → rojo   se conserva la copia
 *   4. Pendiente de actualizar   → ámbar  actualizar o aplazar
 *   5. Sincronizado              → verde  con el botón siempre
 * ======================================================= */

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

export default function MaestrosBanner() {

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

  const textoPendiente = antiguedadTexto
    ? `Pendiente de actualizar · ${antiguedadTexto}`
    : 'Pendiente de actualizar';

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
      testID="maestros-banner"
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

  /* ---------- 4. Maestro viejo: decide el operario ---------- */

  if (pideActualizar) {

    const color = peligroso ? colors.danger : colors.warning;

    const texto = peligroso
      ? `${textoPendiente} · puede estar rechazando artículos nuevos`
      : textoPendiente;

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

  /* ---------- 5. Maestro viejo, ya decidido ---------- */

  if (viejo) {

    return franja(
      'update',
      colors.textSecondary,
      textoPendiente,
      {
        fondo: colors.surfaceAlt,
        borde: colors.borderStrong,
        color: colors.textSecondary,
        hijos: actualizarBoton(colors.primary),
      }
    );

  }

  /* ---------- 6. Todo bien ---------- */

  return franja(
    'cloud-done',
    colors.success,
    `Sincronizado${
      antiguedadTexto
        ? ` · ${antiguedadTexto}`
        : ''
    }`,
    {
      fondo: colors.successBg,
      borde: colors.success,
      color: colors.success,
      hijos: actualizarBoton(colors.primary),
    }
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
  texto: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
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
