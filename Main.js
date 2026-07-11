import { NavigationContainer } from '@react-navigation/native';

import RootNavigator from './src/navigation/RootNavigator';

export default function Main() {

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}