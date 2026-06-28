import HomeView from './HomeView';
import { useHomeLogic } from './HomeLogic';

export default function HomeScreen({ setCamaraAbierta }) {
  const logic = useHomeLogic(setCamaraAbierta);

  return (
    <HomeView
      state={logic}
      actions={logic}
    />
  );
}