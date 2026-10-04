import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { STATUSES_RESUMEN } from '../helpers/estadosResumenHelper';
import { colors } from '../styles/styles';

/* =======================================================
 * RESUMEN DE ESTADOS
 * =======================================================
 *
 * Porcentaje de secciones, áreas y ubicaciones en cada
 * estado. Es la vista por defecto de la pantalla Estado:
 * responde "¿cómo va la fábrica?" de un vistazo, que es lo
 * que se pregunta al entrar, y hide el detalle que obliga a
 * desplegar sección por sección.
 *
 * Solo pinta: los datos y la recarga se los pasa
 * `EstadoScreen`, que es quien sabe cuándo toca pedirlos.
 * ======================================================= */

export const COLORES_ESTADO = {
  Inicio: '#7F8C8D',
  Proceso: '#F39C12',
  Fin: '#2ECC71',
};

const BLOQUES = [
  { clave: 'secciones', etiqueta: 'Secciones' },
  { clave: 'areas', etiqueta: 'Áreas' },
  { clave: 'ubicaciones', etiqueta: 'Ubicaciones' },
];

export default function EstadoResumen({
  resumen,
  cargando,
  error,
  onReintentar,
}) {

  if (cargando) {

    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );

  }

  if (error) {

    return (
      <View style={styles.centrado}>
        <Text style={styles.vacio}>
          No se pudieron cargar los estados
        </Text>

        <TouchableOpacity
          style={styles.boton}
          onPress={onReintentar}
          testID="reintentar-resumen"
          accessibilityRole="button"
          accessibilityLabel="Reintentar la carga de los estados"
        >
          <Text style={styles.botonTexto}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );

  }

  return (

    <ScrollView contentContainerStyle={styles.contenido}>

      <Text style={styles.subtitulo}>
        Porcentaje de secciones, áreas y ubicaciones en cada estado
      </Text>

      {BLOQUES.map(({ clave, etiqueta }) => {

        const bloque = resumen?.[clave];

        if (!bloque) return null;

        return (

          <View
            key={clave}
            style={styles.tarjeta}
            testID={`resumen-${clave}`}
          >

            <View style={styles.tarjetaCabecera}>

              <Text style={styles.tarjetaTitulo}>{etiqueta}</Text>

              <Text style={styles.tarjetaTotal}>
                {bloque.total === 0
                  ? 'Sin datos'
                  : `Total: ${bloque.total}`}
              </Text>

            </View>

            {STATUSES_RESUMEN.map((stat) => {

              const { cantidad, porcentaje } =
                bloque.desglose[stat];

              return (

                <View
                  key={stat}
                  style={styles.fila}
                >

                  <View
                    style={[
                      styles.punto,
                      { backgroundColor: COLORES_ESTADO[stat] },
                    ]}
                  />

                  <Text style={styles.statEtiqueta}>{stat}</Text>

                  <Text style={styles.statCantidad}>
                    {cantidad}
                  </Text>

                  <View style={styles.barraContenedor}>

                    <View
                      style={[
                        styles.barra,
                        {
                          width: `${porcentaje}%`,
                          backgroundColor:
                            COLORES_ESTADO[stat],
                        },
                      ]}
                    />

                  </View>

                  <Text style={styles.statPorcentaje}>
                    {porcentaje}%
                  </Text>

                </View>

              );

            })}

          </View>

        );

      })}

    </ScrollView>

  );

}

const styles = StyleSheet.create({
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  contenido: {
    padding: 15,
    paddingBottom: 30,
  },
  subtitulo: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  tarjeta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    elevation: 1,
  },
  tarjetaCabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tarjetaTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tarjetaTotal: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  punto: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statEtiqueta: {
    fontSize: 14,
    width: 70,
  },
  statCantidad: {
    fontSize: 14,
    fontWeight: '600',
    width: 30,
    textAlign: 'right',
    marginRight: 8,
  },
  barraContenedor: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barra: {
    height: 8,
    borderRadius: 4,
  },
  statPorcentaje: {
    fontSize: 14,
    fontWeight: '700',
    width: 46,
    textAlign: 'right',
    marginLeft: 8,
  },
  vacio: {
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  boton: {
    backgroundColor: colors.primaryStrong,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  botonTexto: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});