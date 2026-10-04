import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';

import RootNavigator from './src/navigation/RootNavigator';
import UpdateModal from './src/components/UpdateModal';
import { comprobarActualizacion } from './src/services/updateService';
import conectividadService from './src/services/conectividadService';
import maestrosService from './src/services/maestrosService';

const ES_DESPLIEGUE = process.env.EXPO_PUBLIC_APP_ENV === 'production';

export default function Main() {

  const [updateInfo, setUpdateInfo] = useState(null);

  /* ---------- Arranque de la sincronización diferida ---------- */

  useEffect(() => {
    conectividadService.iniciar();
  }, []);

  /* ---------- Copia local de los maestros ----------
     Sin copia no se puede validar ningún código, así que
     esta descarga sí es automática. Las siguientes solo se
     avisan (`BannerMaestros`) y las decide el operario. */

  useEffect(() => {
    maestrosService.iniciar();
  }, []);

  useEffect(() => {
    if (!ES_DESPLIEGUE) {
      return;
    }

    (async () => {
      const result = await comprobarActualizacion();
      if (result.hayActualizacion) {
        setUpdateInfo(result);
      }
    })();
  }, []);

  return (
    <NavigationContainer>
      <RootNavigator />

      <UpdateModal
        visible={updateInfo !== null}
        versionActual={updateInfo?.versionActual}
        ultimaVersion={updateInfo?.ultimaVersion}
        apkUrl={updateInfo?.apkUrl}
        notas={updateInfo?.notas}
        onCerrar={() => setUpdateInfo(null)}
      />
    </NavigationContainer>
  );
}