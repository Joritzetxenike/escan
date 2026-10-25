import { useState } from 'react';

import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';

export function useIdentificacionLogic() {
  const { identificar } = useAuth();

  const [matricula, setMatricula] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cambiarMatricula = (valor) => {
    setMatricula(authService.normalizarMatricula(valor));

    if (error) {
      setError(null);
    }
  };

  const entrar = async () => {
    if (enviando) {
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      const resultado = await identificar(matricula);

      if (!resultado.valida) {
        setError(resultado.error || 'Matrícula no válida');
      }
    } catch (e) {
      console.error('Error validando la matrícula:', e);
      setError('No se pudo validar la matrícula');
    } finally {
      setEnviando(false);
    }
  };

  return {
    matricula,
    maxLongitud: authService.MAX_LONGITUD,
    error,
    enviando,
    cambiarMatricula,
    entrar,
  };
}
