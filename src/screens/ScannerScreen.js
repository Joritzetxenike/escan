import ScannerView from './../views/ScannerView';
import { useScannerLogic } from './../logic/ScannerLogic';

export default function ScannerScreen({ navigation, route }) {

    const logic = useScannerLogic(
        navigation,
        route
    );

    return (
        <ScannerView
            state={logic}
            actions={logic}
        />
    );
}