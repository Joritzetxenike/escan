import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';

import HeaderSesion from './HeaderSesion';
import { useAuth } from '../context/AuthContext';
import ImportEmergenciaModal from './ImportEmergenciaModal';
import ubicacionActivaService from '../services/ubicacionActivaService';
import { colors } from '../styles/styles';

export default function HeaderTabs({ titulo }) {
  const insets = useSafeAreaInsets();
  const { esAdminEmergencia, matricula } = useAuth();

  const [mostrarImportModal, setMostrarImportModal] = useState(false);
  const [ubicacionParaImportar, setUbicacionParaImportar] = useState(null);

  const pulsarEmergencia = async () => {

    /* Obtener la ubicación activa del dispositivo */
    const ubicacion = await ubicacionActivaService.obtener();

    if (!ubicacion) {
      Alert.alert(
        'Sin ubicación',
        'Primero escanea o selecciona una ubicación antes de importar.'
      );
      return;
    }

    setUbicacionParaImportar(ubicacion);
    setMostrarImportModal(true);
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
            onPress={pulsarEmergencia}
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

      <ImportEmergenciaModal
        visible={mostrarImportModal}
        ubicacion={ubicacionParaImportar}
        onCerrar={() => {
          setMostrarImportModal(false);
          setUbicacionParaImportar(null);
        }}
      />
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
