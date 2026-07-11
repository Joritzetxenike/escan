import ScannerView from '../views/ScannerView';
import { useScannerLogic } from './../logic/ScannerLogic';

export default function Scanner(props) {

  const logic = useScannerLogic(props.onCodeScanned);

  return (
    <ScannerView
      {...props}
      state={logic}
      actions={logic}
    />
  );
}