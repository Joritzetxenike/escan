import IdentificacionView from '../views/IdentificacionView';
import { useIdentificacionLogic } from '../logic/IdentificacionLogic';

export default function IdentificacionScreen() {
  const logic = useIdentificacionLogic();

  return (
    <IdentificacionView
      state={logic}
      actions={logic}
    />
  );
}
