import { useEffect } from 'react';
import { Alert } from 'react-native';
import Constants from 'expo-constants';

import HomeView from './../views/HomeView';
import { useHomeLogic } from '../logic/HomeLogic';

export default function HomeScreen({ navigation }) {

  const logic = useHomeLogic(navigation);

  useEffect(() => {
    Alert.alert(
      'Debug Escan',
      [
        `Versión: ${Constants.expoConfig?.version ?? '?'}`,
        `Entorno: ${Constants.executionEnvironment ?? '?'}`,
        `Supabase URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL ? 'OK' : 'FALTA'}`,
        `Supabase Key: ${process.env.EXPO_PUBLIC_SUPABASE_KEY ? 'OK' : 'FALTA'}`,
      ].join('\n')
    );
  }, []);

  return (
    <HomeView
      state={logic}
      actions={logic}
    />
  );
}