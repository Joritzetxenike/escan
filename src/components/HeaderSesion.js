import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/styles';

export default function HeaderSesion() {
  const { matricula, cerrarSesion } = useAuth();

  if (!matricula) {
    return null;
  }

  const confirmarCierre = () => {
    Alert.alert(
      'Cerrar sesión',
      `¿Salir de la sesión de la matrícula ${matricula}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: cerrarSesion,
        },
      ]
    );
  };

  return (
    <View style={styles.contenedor}>
      <Text
        style={styles.matricula}
        numberOfLines={1}
        accessibilityLabel={`Matrícula ${matricula}`}
      >
        Matrícula: {matricula}
      </Text>

      <TouchableOpacity
        style={styles.boton}
        onPress={confirmarCierre}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
        testID="btn-cerrar-sesion"
      >
        <MaterialIcons
          name="logout"
          size={22}
          color={colors.onPrimary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },

  matricula: {
    flexShrink: 1,
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },

  boton: {
    marginLeft: 12,
    padding: 4,
  },
});
