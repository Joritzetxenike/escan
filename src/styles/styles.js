import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: '#FFFFFF',
  padding: 20,
  // quitar justifyContent y alignItems
},


  /* ---------- BOTONES ---------- */
  customButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  /* ---------- HOME ---------- */
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 30,
  },

  ubicacionText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },

homeContent: {
  flex: 1,
  marginTop: 50,   // ⬅️ más abajo (antes era 10)
  width: '100%',
  alignItems: 'center',
},


  listaArticulos: {
    marginTop: 25,
    width: '100%',
  },

  itemArticulo: {
    fontSize: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    textAlign: 'center',
  },

  /* ---------- CÁMARA ---------- */
  scannerContainer: {
    flex: 1,
    backgroundColor: '#007BFF',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanFrame: {
    width: 300,
    height: 180,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 10,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },

  /* ---------- MODAL ---------- */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 10,
    fontSize: 16,
  },
header: {
  width: '100%',
  backgroundColor: '#007BFF',
  paddingTop: 50,      // espacio para notch / status bar
  paddingBottom: 15,
  alignItems: 'center',
},

headerTitle: {
  color: '#FFFFFF',
  fontSize: 22,
  fontWeight: 'bold',
},nItems: 'center',
ultimosArticulosTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 8,
  textAlign: 'center',
},

},);
