import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [matricula, setMatricula] = useState(
    () => authService.obtenerMatricula()
  );

  const identificar = useCallback(async (valor) => {
    const resultado = await authService.validarMatricula(valor);

    if (!resultado.valida) {
      return resultado;
    }

    authService.iniciarSesion(resultado.matricula);
    setMatricula(resultado.matricula);

    return resultado;
  }, []);

  const cerrarSesion = useCallback(() => {
    authService.cerrarSesion();
    setMatricula(null);
  }, []);

  const value = useMemo(
    () => ({
      matricula,
      identificado: matricula !== null,
      identificar,
      cerrarSesion,
    }),
    [matricula, identificar, cerrarSesion]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return contexto;
}
