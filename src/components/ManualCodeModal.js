import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import ModalFormulario from './ModalFormulario';

import { styles } from '../styles/styles';

/* Retardo antes de pedir sugerencias: evita filtrar la copia
   local en cada pulsación mientras se teclea. */
const DEBOUNCE_SUGERENCIAS = 200;

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
  /* Opcional: `(texto) => string[]` con los códigos que
     empiezan por lo tecleado. Sin ella no hay sugerencias. */
  sugerencias,
}) {
  const [codigo, setCodigo] = useState('');

  const [sugs, setSugs] = useState([]);

  useEffect(() => {
    if (!visible) setCodigo('');
  }, [visible]);

  /* Al teclear, se piden sugerencias con un pequeño retardo
     para no filtrar la copia local en cada pulsación. Se
     ignoran si el modal no las ofrece, está oculto o hay
     menos de 2 caracteres. */
  useEffect(() => {

    if (
      !sugerencias ||
      !visible ||
      codigo.trim().length < 2
    ) {
      setSugs([]);
      return undefined;
    }

    const temporizador = setTimeout(() => {
      setSugs(sugerencias(codigo) ?? []);
    }, DEBOUNCE_SUGERENCIAS);

    return () => clearTimeout(temporizador);

  }, [codigo, sugerencias, visible]);

  /* El campo solo se vacía si el llamador confirma que el
     código se ha aceptado. Si vuelve a decir que no, el modal
     sigue abierto y el texto se conserva para corregirlo. Al
     cerrarse el modal, `visible` a false ya lo limpia. */

  const handleConfirm = async () => {
    if (!codigo) return;
    const aceptado = await onConfirm(codigo);
    if (aceptado) setCodigo('');
  };

  /* Al elegir una sugerencia solo se rellena el campo: el
     operario revisa y confirma (puede seguir editándolo). */
  const elegirSugerencia = (sugerido) => {
    setCodigo(sugerido);
    setSugs([]);
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

      {sugs.length > 0 && (
        <ScrollView
          style={styles.sugerencias}
          keyboardShouldPersistTaps="handled"
        >
          {sugs.map((sugerido) => (
            <TouchableOpacity
              key={sugerido}
              style={styles.sugerencia}
              testID={`sugerencia-articulo-${sugerido}`}
              onPress={() => elegirSugerencia(sugerido)}
            >
              <Text
                style={styles.sugerenciaTexto}
                numberOfLines={1}
              >
                {sugerido}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </ModalFormulario>
  );
}
