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

  /* El campo solo se vacía si el llamador confirma que el
     código se ha aceptado. Si vuelve a decir que no, el modal
     sigue abierto y el texto se conserva para corregirlo. Al
     cerrarse el modal, `visible` a false ya lo limpia. */

  const handleConfirm = async () => {
    if (!codigo) return;
    const aceptado = await onConfirm(codigo);
    if (aceptado) setCodigo('');
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