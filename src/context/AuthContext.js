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
  const [esAdminEmergencia, setEsAdminEmergencia] = useState(
    () => authService.obtenerEsAdminEmergencia()
  );

  const identificar = useCallback(async (valor) => {
    const resultado = await authService.validarMatricula(valor);

    if (!resultado.valida) {
      return resultado;
    }

    authService.iniciarSesion(
      resultado.matricula,
      resultado.nombre,
      resultado.esAdminEmergencia
    );
    setMatricula(resultado.matricula);
    setNombre(resultado.nombre);
    setEsAdminEmergencia(resultado.esAdminEmergencia);

    return resultado;
  }, []);

  const cerrarSesion = useCallback(() => {
    authService.cerrarSesion();
    setMatricula(null);
    setNombre(null);
    setEsAdminEmergencia(false);
  }, []);

  const value = useMemo(
    () => ({
      matricula,
      nombre,
      esAdminEmergencia,
      identificado: matricula !== null,
      identificar,
      cerrarSesion,
    }),
    [matricula, nombre, esAdminEmergencia, identificar, cerrarSesion]
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
