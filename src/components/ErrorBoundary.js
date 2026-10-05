import { Component } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors } from '../styles/styles';

/* =======================================================
 * ERROR BOUNDARY DE LA APP
 * =======================================================
 *
 * Reacciona a los fallos de render de los hijos. Sin esto,
 * cualquier error de render deja la pantalla en blanco sin
 * más pista: el `catch` de Metro no existe en release, así
 * que en un APK tampoco hay caja de error roja ni log.
 *
 * La 1.0.5 se quedó así por otra razón (faltaban las
 * variables de Supabase y el módulo las pedía al import),
 * pero el efecto en pantalla era el mismo: blanco. Este
 * componente cubre el resto de fallos de render, que por
 * definición no se pueden anticipar.
 *
 * Es la red de seguridad del último nivel: por encima está
 * `PantallaError`, que sustituye al árbol entero.
 * ======================================================= */

export default class ErrorBoundary extends Component {

  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('[InventoryScanner] error de render:', error);
  }

  render() {
    const { error } = this.state;

    if (error) return <PantallaError mensaje={error.message} />;

    return this.props.children;
  }

}

/* =======================================================
 * PANTALLA DE ERROR
 * =======================================================
 *
 * Lo que se ve en lugar del blanco. Muestra el motivo real
 * y, si viene de un fallo de configuración, la lista de
 * variables que faltan: es el dato que hace falta para
 * arreglarlo, y antes había que deducirlo del bundle.
 * ======================================================= */

export function PantallaError({ mensaje, detalle }) {
  return (

    <View style={pantalla} testID="pantalla-error">

      <ScrollView contentContainerStyle={contenido}>

        <MaterialIcons
          name="error-outline"
          size={44}
          color={colors.danger}
        />

        <Text style={titulo} testID="pantalla-error-titulo">
          La app no pudo arrancar
        </Text>

        <Text style={texto} testID="pantalla-error-mensaje">
          {mensaje}
        </Text>

        {detalle}

      </ScrollView>

    </View>

  );

}

/* Detalle de configuración: qué variables exactas faltan. */

export function AvisoConfig({ configError }) {
  return (
    <PantallaError
      mensaje="La app se compiló sin su configuración de Supabase."
      detalle={

        <View style={caja} testID="aviso-config">

          <Text style={etiqueta}>Falta en el build:</Text>

          <Text style={codigo} testID="aviso-config-faltan">
            {configError}
          </Text>

          <Text style={texto}>
            Las variables van en `eas.json`, dentro del bloque `env`
            del perfil de build. También se pueden pasar como
            secretos de GitHub Actions (EXPO_PUBLIC_SUPABASE_URL y
            EXPO_PUBLIC_SUPABASE_KEY).
          </Text>

        </View>

      }
    />
  );
}

const pantalla = {
  flex: 1,
  backgroundColor: '#FFFFFF',
};

const contenido = {
  flexGrow: 1,
  alignItems: 'center',
  justifyContent: 'center',
  padding: 28,
  gap: 12,
};

const titulo = {
  fontSize: 20,
  fontWeight: '700',
  color: colors.text,
  textAlign: 'center',
};

const texto = {
  fontSize: 14,
  color: colors.textSecondary,
  textAlign: 'center',
  lineHeight: 20,
};

const caja = {
  alignSelf: 'stretch',
  marginTop: 8,
  padding: 14,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.danger,
  backgroundColor: '#FEE2E2',
  gap: 8,
};

const etiqueta = {
  fontSize: 13,
  fontWeight: '700',
  color: colors.danger,
};

const codigo = {
  fontSize: 13,
  fontWeight: '600',
  color: colors.text,
  fontFamily: 'monospace',
};