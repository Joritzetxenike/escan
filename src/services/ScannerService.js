const LECTURAS_NECESARIAS = 10;
const TIMEOUT = 1200;

const ScannerService = {

  esCodigoValido(data) {

    if (!data) return false;

    if (data.length < 6) return false;

    return true;
  },

  actualizarBuffer(buffer, data) {

    const now = Date.now();

    // Código nuevo
    if (buffer.value !== data) {

      return {
        validado: false,
        buffer: {
          value: data,
          count: 1,
          lastTime: now,
        },
      };
    }

    // Mismo código
    const nuevoBuffer = {
      value: data,
      count: buffer.count + 1,
      lastTime: now,
    };

    console.log(
      `VALIDACIÓN ${data}: ${nuevoBuffer.count}/${LECTURAS_NECESARIAS}`
    );

    // Ya es válido
    if (nuevoBuffer.count >= LECTURAS_NECESARIAS) {

      return {
        validado: true,
        buffer: {
          value: '',
          count: 0,
          lastTime: 0,
        },
      };
    }

    return {
      validado: false,
      buffer: nuevoBuffer,
    };
  },

  resetBufferIfStale(buffer) {

    if (!buffer.value)
      return buffer;

    const now = Date.now();

    if (now - buffer.lastTime > TIMEOUT) {

      return {
        value: '',
        count: 0,
        lastTime: 0,
      };
    }

    return buffer;
  },

};

export default ScannerService;