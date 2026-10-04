import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { styles, colors } from '../styles/styles';

export default function ManualCodeModal({
  visible,
  onCancel,
  onConfirm,
  titulo = 'Introduce código de artículo',
  placeholder = 'Código',
  /* 'characters' solo para ubicaciones: los códigos de
     artículo distinguen mayúsculas y minúsculas. */
  autoCapitalize = 'none',
  testID,
}) {
  const [codigo, setCodigo] = useState('');

  useEffect(() => {
    if (!visible) setCodigo('');
  }, [visible]);

  const handleConfirm = () => {
    if (!codigo) return;
    onConfirm(codigo);
    setCodigo('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={{ marginBottom: 10 }}>{titulo}</Text>

          <TextInput
            style={styles.input}
            placeholder={placeholder}
            value={codigo}
            onChangeText={setCodigo}
            autoFocus
            autoCapitalize={autoCapitalize}
            testID={testID}
          />

          <TouchableOpacity
            style={styles.customButton}
            onPress={handleConfirm}
          >
            <Text style={styles.buttonText}>Aceptar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.customButton, { marginTop: 10, backgroundColor: colors.textSecondary }]}
            onPress={onCancel}
          >
            <Text>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}