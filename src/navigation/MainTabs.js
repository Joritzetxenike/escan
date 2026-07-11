import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import ListaScreen from '../screens/ListaScreen';
import EstadoScreen from '../screens/EstadoScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {

  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,

        tabBarStyle: {
          backgroundColor: '#007BFF',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },

        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#CCCCCC',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
      />

      <Tab.Screen
        name="Lista"
        component={ListaScreen}
      />

      <Tab.Screen
        name="Estado"
        component={EstadoScreen}
      />
    </Tab.Navigator>
  );
}