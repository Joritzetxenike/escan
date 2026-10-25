import React, { useState, useEffect } from 'react';
import { Text, TextInput, Alert } from 'react-native';

import ModalFormulario from './ModalFormulario';

import { styles } from '../styles/styles';

export default function CantidadModal({ 
  visible, 
  onConfirm, 
  onCancel, 
  articulo, 
  ubicacion,
  descripcion = '',
  unidad = '',
}) {
  const [cantidad, setCantidad] = useState('');

  useEffect(() => {
    if (!visible) setCantidad(''); // limpiar al cerrar
  }, [visible]);

  const handleConfirm = () => {
    if (!cantidad || isNaN(cantidad) || Number(cantidad) <= 0) {
      /* `alert` global no existe en React Native: con una
         cantidad inválida reventaba la app. */
      Alert.alert(
        'Cantidad no válida',
        'Introduce una cantidad mayor que cero'
      );
      return;
    }
    onConfirm(Number(cantidad));
    setCantidad('');
  };

  return (
    <ModalFormulario
      visible={visible}
      titulo="Introduce cantidad"
      onConfirm={handleConfirm}
      onCancel={onCancel}
    >
      <Text style={styles.modalFila}>
        Ubicación: {ubicacion}
      </Text>

      <Text style={styles.modalFila}>
        Artículo: {articulo}
      </Text>

      <Text style={styles.modalFila}>
        Descripción: {descripcion || '—'}
      </Text>

      <Text style={styles.modalFila}>
        Unidad: {unidad || '—'}
      </Text>

      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="Cantidad"
        value={cantidad}
        onChangeText={setCantidad}
        autoFocus
      />
    </ModalFormulario>
  );
}