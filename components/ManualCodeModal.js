import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { styles } from '../styles';

export default function ManualCodeModal({
  visible,
  onCancel,
  onConfirm,
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
          <Text style={{ marginBottom: 10 }}>Introduce código de artículo</Text>

          <TextInput
            style={styles.input}
            placeholder="Código"
            value={codigo}
            onChangeText={setCodigo}
            autoFocus
          />

          <TouchableOpacity
            style={styles.customButton}
            onPress={handleConfirm}
          >
            <Text style={styles.buttonText}>Aceptar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.customButton, { marginTop: 10, backgroundColor: '#ccc' }]}
            onPress={onCancel}
          >
            <Text>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}