import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainTabs from './MainTabs';
import { useAuth } from '../context/AuthContext';

import IdentificacionScreen from '../screens/IdentificacionScreen';
import ScannerScreen from '../screens/ScannerScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { identificado } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!identificado ? (
        <Stack.Screen
          name="Identificacion"
          component={IdentificacionScreen}
        />
      ) : (
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
          />

          <Stack.Screen
            name="Scanner"
            component={ScannerScreen}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
