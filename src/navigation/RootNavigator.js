import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainTabs from './MainTabs';

import ScannerScreen from '../screens/ScannerScreen';
import EstadosResumenScreen from '../screens/EstadosResumenScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >

      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
      />

      <Stack.Screen
        name="Scanner"
        component={ScannerScreen}
      />

      <Stack.Screen
        name="EstadosResumen"
        component={EstadosResumenScreen}
      />

    </Stack.Navigator>
  );
} 