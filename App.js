import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './screens/HomeScreen';
import ListaScreen from './screens/ListaScreen';
import { useState } from 'react';

const Tab = createBottomTabNavigator();

export default function App() {
  // Estado global para saber si la cámara está activa
  const [camaraAbierta, setCamaraAbierta] = useState(false);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: camaraAbierta
            ? { display: 'none' }   // <--- barra desaparece cuando la cámara está abierta
            : { backgroundColor: '#007BFF', height: 60 },
          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: '#CCCCCC',
        }}
      >
        <Tab.Screen name="Home">
          {(props) => (
            <HomeScreen
              {...props}
              camaraAbierta={camaraAbierta}
              setCamaraAbierta={setCamaraAbierta}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Lista" component={ListaScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
