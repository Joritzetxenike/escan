import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity } from 'react-native';
import { styles } from '../styles/styles';

export default function CantidadModal({ 
  visible, 
  onConfirm, 
  onCancel, 
  articulo, 
  ubicacion 
}) {
  const [cantidad, setCantidad] = useState('');

  useEffect(() => {
    if (!visible) setCantidad(''); // limpiar al cerrar
  }, [visible]);

  const handleConfirm = () => {
    if (!cantidad || isNaN(cantidad) || Number(cantidad) <= 0) {
      alert('Introduce una cantidad válida');
      return;
    }
    onConfirm(Number(cantidad));
    setCantidad('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
            <Text style={{ marginBottom: 10, fontSize: 16 }}>
              Introduce cantidad
            </Text>

            <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
              Ubicación: {ubicacion}
            </Text>

            <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
              Artículo: {articulo}
            </Text>

            <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="Cantidad"
                value={cantidad}
                onChangeText={setCantidad}
                autoFocus
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, width: '100%' }}>
                <TouchableOpacity style={styles.customButton} onPress={handleConfirm}>
                <Text style={styles.buttonText}>Confirmar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.customButton, { backgroundColor: '#888' }]} onPress={onCancel}>
                <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
            </View>
            </View>
        </View>
    </Modal>

  );
}
