import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen';
import ListaScreen from './screens/ListaScreen';
import { useState } from 'react';

const Tab = createBottomTabNavigator();

export default function Main() {
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const insets = useSafeAreaInsets(); // ✅ ahora sí funciona bien

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,

          tabBarStyle: camaraAbierta
            ? { display: 'none' }
            : {
                backgroundColor: '#007BFF',
                height: 60 + insets.bottom,
                paddingBottom: insets.bottom,
              },

          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: '#CCCCCC',
        }}
      >
        <Tab.Screen name="Home">
          {(props) => (
            <HomeScreen
              {...props}
              setCamaraAbierta={setCamaraAbierta}
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="Lista" component={ListaScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}


