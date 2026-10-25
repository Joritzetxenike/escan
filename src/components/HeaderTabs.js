import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HeaderSesion from './HeaderSesion';
import { colors } from '../styles/styles';

export default function HeaderTabs({ titulo }) {
  const insets = useSafeAreaInsets();

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
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  titulo: {
    color: colors.onPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
