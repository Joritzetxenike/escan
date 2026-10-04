import React, { useEffect, useState } from 'react';
import { TextInput } from 'react-native';

import ModalFormulario from './ModalFormulario';

import { styles } from '../styles/styles';

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
    <ModalFormulario
      visible={visible}
      titulo={titulo}
      onConfirm={handleConfirm}
      onCancel={onCancel}
    >
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={codigo}
        onChangeText={setCodigo}
        autoFocus
        autoCapitalize={autoCapitalize}
        testID={testID}
      />
    </ModalFormulario>
  );
}