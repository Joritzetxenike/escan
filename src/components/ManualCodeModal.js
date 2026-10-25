import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import ModalFormulario from './ModalFormulario';

import { styles, colors } from '../styles/styles';

/* Retardo antes de pedir sugerencias: evita filtrar la copia
   local en cada pulsación mientras se teclea. */
const DEBOUNCE_SUGERENCIAS = 200;

const normalizarSugerencia = (sugerido) =>
  typeof sugerido === 'string'
    ? {
        codigo: sugerido,
        descripcion: '',
        unidad: '',
      }
    : {
        codigo: sugerido?.codigo ?? '',
        descripcion: sugerido?.descripcion ?? '',
        unidad: sugerido?.unidad ?? '',
      };

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
  obtenerDetalle,
}) {
  const [codigo, setCodigo] = useState('');

  const [sugs, setSugs] = useState([]);

  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    if (!visible) {
      setCodigo('');
      setDetalle(null);
    }
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
      setSugs(
        (sugerencias(codigo) ?? []).map(
          normalizarSugerencia
        )
      );
    }, DEBOUNCE_SUGERENCIAS);

    return () => clearTimeout(temporizador);

  }, [codigo, sugerencias, visible]);

  useEffect(() => {

    if (
      !obtenerDetalle ||
      !visible ||
      codigo.trim().length < 2
    ) {
      setDetalle(null);
      return undefined;
    }

    setDetalle(null);

    const temporizador = setTimeout(() => {
      setDetalle(obtenerDetalle(codigo.trim()));
    }, DEBOUNCE_SUGERENCIAS);

    return () => clearTimeout(temporizador);

  }, [codigo, obtenerDetalle, visible]);

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
    setCodigo(sugerido.codigo);
    setSugs([]);
    setDetalle(sugerido);
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
        autoCorrect={false}
        spellCheck={false}
        keyboardType="default"
        inputMode="text"
        testID={testID}
      />

      {detalle && (
        <Text style={styles.detalleArticulo}>
          {`Descripción: ${detalle.descripcion || '—'} · Unidad: ${detalle.unidad || '—'}`}
        </Text>
      )}

      {sugs.length > 0 && (
        <ScrollView
          style={styles.sugerencias}
          keyboardShouldPersistTaps="handled"
        >
          {sugs.map((sugerido) => (
            <TouchableOpacity
              key={sugerido.codigo}
              style={styles.sugerencia}
              testID={`sugerencia-articulo-${sugerido.codigo}`}
              onPress={() => elegirSugerencia(sugerido)}
            >
              <Text
                style={styles.sugerenciaTexto}
                numberOfLines={1}
              >
                {sugerido.codigo}
              </Text>

              {(sugerido.descripcion || sugerido.unidad) && (
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                  }}
                  numberOfLines={1}
                >
                  {[sugerido.descripcion, sugerido.unidad]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </ModalFormulario>
  );
}
