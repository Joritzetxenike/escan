import {
  MIN_CODE_LENGTH,
  REQUIRED_READS,
} from '../constants/scannerConstants';

const crearBuffer = () => ({
  value: '',
  count: 0,
  lastTime: 0,
});

const esCodigoValido = (codigo) => {
  if (!codigo) return false;
  if (codigo.length < MIN_CODE_LENGTH) return false;

  return true;
};

const procesarLectura = (buffer, type, codigo) => {

  if (!esCodigoValido(codigo)) {
    return {
      valido: false,
      buffer,
    };
  }

  const now = Date.now();

  // Código diferente
  if (buffer.value !== codigo) {
    return {
      valido: false,
      buffer: {
        value: codigo,
        count: 1,
        lastTime: now,
      },
    };
  }

  // Mismo código
  const nuevoBuffer = {
    value: codigo,
    count: buffer.count + 1,
    lastTime: now,
  };

  if (nuevoBuffer.count >= REQUIRED_READS) {
    return {
      valido: true,
      codigo,
      buffer: crearBuffer(),
    };
  }

  return {
    valido: false,
    buffer: nuevoBuffer,
  };
};

const limpiarBufferCaducado = (buffer) => {

  if (!buffer.value) {
    return buffer;
  }

  const now = Date.now();

  if (now - buffer.lastTime > 1200) {
    return crearBuffer();
  }

  return buffer;
};

export default {
  crearBuffer,
  procesarLectura,
  limpiarBufferCaducado,
};