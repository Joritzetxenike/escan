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
  const [nombre, setNombre] = useState(
    () => authService.obtenerNombre()
  );

  const identificar = useCallback(async (valor) => {
    const resultado = await authService.validarMatricula(valor);

    if (!resultado.valida) {
      return resultado;
    }

    authService.iniciarSesion(resultado.matricula, resultado.nombre);
    setMatricula(resultado.matricula);
    setNombre(resultado.nombre);

    return resultado;
  }, []);

  const cerrarSesion = useCallback(() => {
    authService.cerrarSesion();
    setMatricula(null);
    setNombre(null);
  }, []);

  const value = useMemo(
    () => ({
      matricula,
      nombre,
      identificado: matricula !== null,
      identificar,
      cerrarSesion,
    }),
    [matricula, nombre, identificar, cerrarSesion]
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
