import { SafeAreaProvider } from 'react-native-safe-area-context';

import ErrorBoundary, { AvisoConfig } from './src/components/ErrorBoundary';
import { configError } from './src/providers/supabase/supabaseClient';
import Main from './Main';

/* `configError` viene del cliente de Supabase, que antes
 * fallaba al importarse y tumbaba la pantalla entera. Ahora
 * se lee aquí y, si falta algo, se muestra un aviso en vez de
 * dejar el splash blanco. `Main` solo se monta con la
 * configuración completa. */

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        {configError
          ? <AvisoConfig configError={configError} />
          : <Main />}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}