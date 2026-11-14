import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import HeaderSesion from './HeaderSesion';
import { useAuth } from '../context/AuthContext';
import maestrosService from '../services/maestrosService';
import { colors } from '../styles/styles';

export default function HeaderTabs({ titulo }) {
  const insets = useSafeAreaInsets();
  const { esAdminEmergencia, matricula } = useAuth();

  const toggleEmergencia = async () => {
    const activa = await maestrosService.estaHabilitadaImportacionEmergencia();

    if (activa) {
      await maestrosService.deshabilitarImportacionEmergencia(matricula);
    } else {
      await maestrosService.habilitarImportacionEmergencia(matricula);
    }
  };

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: colors.primary }}>
      <StatusBar style="light" />

      <View style={styles.filaSesion}>
        <HeaderSesion />
      </View>

      <View style={styles.filaTitulo}>
        <Text
          style={styles.titulo}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {titulo}
        </Text>

        {esAdminEmergencia && (
          <TouchableOpacity
            style={styles.botonEmergencia}
            onPress={toggleEmergencia}
            accessibilityRole="button"
            accessibilityLabel="Activar importación de emergencia"
            testID="btn-toggle-emergencia"
          >
            <MaterialIcons
              name="flash_on"
              size={20}
              color={colors.warningBg}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filaSesion: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.25)',
  },

  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 16,
  },

  titulo: {
    color: colors.onPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },

  botonEmergencia: {
    marginLeft: 12,
    padding: 4,
  },
});
