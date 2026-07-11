import HomeView from './../views/HomeView';
import { useHomeLogic } from '../logic/HomeLogic';

export default function HomeScreen({ navigation }) {

  const logic = useHomeLogic(navigation);

  return (
    <HomeView
      state={logic}
      actions={logic}
    />
  );
}