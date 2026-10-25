import {
  KeyboardAvoidingView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import EstadoBanner from '../components/EstadoBanner';
import MaestrosBanner from '../components/MaestrosBanner';
import { styles, colors } from '../styles/styles';

export default function IdentificacionView({
  state,
  actions,
}) {
  return (
    <SafeAreaView style={styles.identificacionSafeArea}>
      <View style={styles.identificacionBanners}>
        <MaestrosBanner />
        <EstadoBanner soloAvisos />
      </View>

      <KeyboardAvoidingView
        style={styles.identificacionFlex}
        behavior="padding"
      >
        <ScrollView
          style={styles.identificacionFlex}
          contentContainerStyle={styles.identificacionContenido}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.identificacionIcono}>
            <MaterialIcons
              name="inventory-2"
              size={42}
              color={colors.primary}
            />
          </View>

          <Text style={styles.identificacionTitulo}>
            InventoryScanner
          </Text>

          <Text style={styles.identificacionSubtitulo}>
            Identifícate para continuar
          </Text>

          <Text style={styles.identificacionLabel}>
            Matrícula
          </Text>

          <TextInput
            style={[
              styles.identificacionInput,
              state.error && styles.identificacionInputError,
            ]}
            value={state.matricula}
            onChangeText={actions.cambiarMatricula}
            placeholder="Introduce tu número"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={state.maxLongitud}
            autoFocus
            accessibilityLabel="Matrícula"
            testID="input-matricula"
          />

          {state.error && (
            <Text
              style={styles.identificacionError}
              testID="error-matricula"
            >
              {state.error}
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.customButton,
              styles.identificacionBoton,
              state.enviando && styles.identificacionBotonDeshabilitado,
            ]}
            onPress={actions.entrar}
            disabled={state.enviando}
            accessibilityRole="button"
            accessibilityLabel="Entrar"
            testID="btn-entrar"
          >
            <Text style={styles.buttonText}>
              {state.enviando ? 'Comprobando…' : 'Entrar'}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
