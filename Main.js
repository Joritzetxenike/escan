import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import Constants from 'expo-constants';

import RootNavigator from './src/navigation/RootNavigator';
import UpdateModal from './src/components/UpdateModal';
import { comprobarActualizacion } from './src/services/updateService';

export default function Main() {

  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    if (Constants.executionEnvironment !== 'standalone') return;

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