import { Modal, View, Text, TouchableOpacity, Linking, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../styles/styles';

export default function UpdateModal({ visible, versionActual, ultimaVersion, apkUrl, notas, onCerrar }) {
  const handleActualizar = () => {
    if (apkUrl) {
      Linking.openURL(apkUrl);
    }
    onCerrar();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Nueva versión disponible</Text>

          <View style={styles.versionRow}>
            <Text style={styles.label}>Actual:</Text>
            <Text style={styles.version}>{versionActual}</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.label}>Nueva:</Text>
            <Text style={[styles.version, styles.newVersion]}>{ultimaVersion}</Text>
          </View>

          {notas ? (
            <>
              <Text style={styles.notasLabel}>Notas de la versión:</Text>
              <ScrollView style={styles.notasScroll}>
                <Text style={styles.notasText}>{notas}</Text>
              </ScrollView>
            </>
          ) : null}

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.updateButton} onPress={handleActualizar}>
              <Text style={styles.updateButtonText}>Actualizar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.laterButton} onPress={onCerrar}>
              <Text style={styles.laterButtonText}>Más tarde</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    maxHeight: '80%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: colors.primaryDark,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 16,
    color: colors.textSecondary,
    marginRight: 8,
  },
  version: {
    fontSize: 16,
    fontWeight: '600',
  },
  newVersion: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  notasLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
    color: colors.text,
  },
  notasScroll: {
    maxHeight: 150,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
  },
  notasText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  updateButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  laterButton: {
    flex: 1,
    backgroundColor: '#E8E8E8',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  laterButtonText: {
    color: colors.text,
    fontSize: 16,
  },
});
