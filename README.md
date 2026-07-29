# escan — App de Inventario con Escáner de Códigos de Barras

App móvil desarrollada con **React Native (Expo SDK 54)** para la gestión de inventario mediante escaneo de códigos de barras. Permite registrar movimientos de artículos por ubicación, consultar el estado de las ubicaciones y exportar datos a CSV.

---

## Stack

| Capa       | Tecnología                                         |
| ---------- | -------------------------------------------------- |
| Framework  | React Native 0.81 + Expo SDK 54                    |
| Lenguaje   | JavaScript (ESM)                                   |
| Navegación | React Navigation 7 (native-stack + bottom-tabs)    |
| Cámara     | expo-camera 17 (escáner de códigos)                |
| Backend    | Supabase (PostgreSQL)                              |
| Offline    | CSV local via expo-file-system                     |
| Tests      | Jest + jest-expo                                   |

---

## Estructura del proyecto

```
escan/
├── App.js                     # Entrada: SafeAreaProvider + Main
├── Main.js                    # NavigationContainer + RootNavigator
├── index.js                   # registerRootComponent
├── app.json                   # Configuración Expo
├── package.json
├── .env                       # Supabase URL + anon key
│
├── src/
│   ├── screens/               # Pantallas (HomeScreen, ListaScreen, EstadoScreen, ScannerScreen)
│   ├── views/                 # Componentes de vista (HomeView, ScannerView)
│   ├── logic/                 # Hooks con lógica de negocio (HomeLogic, ScannerLogic)
│   ├── hooks/                 # Hooks reutilizables (useScanner)
│   ├── components/            # UI reutilizable (CantidadModal, ManualCodeModal, EstadoCard)
│   ├── navigation/            # Configuración de navegación (RootNavigator, MainTabs)
│   ├── services/              # Servicios de aplicación
│   │   ├── InventoryService   # Alta/baja de movimientos, validaciones
│   │   ├── ScannerService     # Buffer de escaneo multi-lectura
│   │   ├── ubicacionesService # Consulta de estructura de ubicaciones
│   │   └── updateService      # Actualización vía GitHub Releases
│   ├── providers/             # Estrategia de acceso a datos (Provider Pattern)
│   │   ├── DataProvider.js    # Router: selecciona backend activo
│   │   ├── DataSource.js      # Config: 'supabase' | 'csv' | 'api'
│   │   ├── InventoryDataProvider.js  # Contrato (interface)
│   │   ├── supabase/          # Implementación Supabase (activa)
│   │   ├── csv/               # Implementación CSV local (parcial)
│   │   └── api/               # Stub REST API (no implementada)
│   ├── helpers/               # Utilidades (csvHelper)
│   ├── styles/                # Estilos globales (styles.js)
│   ├── constants/             # Constantes del escáner
│   ├── data/                  # Datos mock (no usado activamente)
│   ├── domain/models/         # (vacío — planificado)
│   ├── domain/validators/     # (vacío — planificado)
│   └── assets/                # Iconos, splash, favicon
```

---

## Arquitectura

### Capas

1. **UI** — Screens + Views + Components. Reciben props y callbacks desde los hooks.
2. **Lógica** — Custom hooks (`useHomeLogic`, `useScannerLogic`). Contienen todo el estado y las reglas de negocio.
3. **Servicios** — Operaciones de dominio (inventario, escáner, ubicaciones, actualización).
4. **Proveedores de datos** — Estrategia de persistencia intercambiable.

### Provider Pattern

El acceso a datos sigue el patrón **Strategy**. `DataSource.js` define el backend activo (`'supabase'` actualmente) y `DataProvider.js` expone la implementación correspondiente. Los servicios consumen `DataProvider` sin conocer el backend concreto.

```
DataSource ('supabase')
  └── DataProvider → SupabaseProvider (activo)
                  → CsvProvider    (parcial, offline)
                  → ApiProvider    (stub, no implementado)
```

Para cambiar de backend, solo hay que modificar la constante en `DataSource.js`.

### Escáner — Multi-lectura

El escáner requiere que un mismo código se lea **10 veces consecutivas en 1200ms** antes de darlo por válido. Esto evita lecturas parciales o incorrectas típicas de escáneres de barras. El buffer se reinicia automáticamente tras 1200ms de inactividad.

---

## Funcionalidades

| Funcionalidad               | Descripción                                                                 |
| --------------------------- | --------------------------------------------------------------------------- |
| Escanear ubicación          | Escanea código QR/barras de una ubicación para iniciar una sesión           |
| Escanear artículo           | Escanea código de artículo en la ubicación actual                           |
| Ingreso manual              | Modal para tipear código de artículo manualmente                            |
| Confirmar cantidad          | Modal para ingresar cantidad del artículo escaneado                         |
| Ubicación actual            | Muestra la ubicación activa en la pantalla principal                        |
| Últimos artículos           | Lista los últimos 5 artículos escaneados en la sesión                       |
| Validación por sesión       | Impide escanear el mismo artículo dos veces en la misma ubicación           |
| Estado de ubicaciones       | Vista jerárquica (sección → área → ubicación) con indicador de estado       |
| Exportar CSV                | Exporta/Comparte archivos CSV desde la lista                                |
| Actualización OTA           | Comprueba nuevas versiones en GitHub Releases                               |

---

## Pantallas

| Ruta       | Pantalla         | Descripción                                         |
| ---------- | ---------------- | --------------------------------------------------- |
| `Home`     | HomeScreen       | Escáner de ubicación, escaneo de artículos, últimos |
| `Lista`    | ListaScreen      | Archivos CSV guardados (abrir, exportar, borrar)    |
| `Estado`   | EstadoScreen     | Árbol de secciones/áreas/ubicaciones con estado     |
| `Scanner`  | ScannerScreen    | Cámara con overlay para escanear códigos            |

---

## Estados de ubicación

- **Inicio** (gris) — No se ha iniciado el conteo
- **Proceso** (naranja) — Conteo en curso
- **Fin** (verde) — Conteo completado

---

## Modelo de datos (Supabase)

### Esquema DDL

```sql
CREATE TABLE public.maestroSeccion (
  seccion character varying NOT NULL,
  stat USER-DEFINED,
  CONSTRAINT maestroSeccion_pkey PRIMARY KEY (seccion)
);

CREATE TABLE public.maestroArea (
  seccion character varying NOT NULL,
  area character varying NOT NULL,
  stat USER-DEFINED,
  CONSTRAINT maestroArea_pkey PRIMARY KEY (seccion, area),
  CONSTRAINT maestro_area_seccion_fkey FOREIGN KEY (seccion) REFERENCES public.maestroSeccion(seccion)
);

CREATE TABLE public.maestroUbicacion (
  seccion character varying NOT NULL,
  area character varying NOT NULL,
  subzona character varying NOT NULL,
  stat USER-DEFINED,
  CONSTRAINT maestroUbicacion_pkey PRIMARY KEY (seccion, area, subzona),
  CONSTRAINT maestro_ubicacion_seccion_area_fkey FOREIGN KEY (seccion, area) REFERENCES public.maestroArea(seccion, area)
);

CREATE TABLE public.maestroArticulo (
  item character varying NOT NULL,
  dsca character varying NOT NULL,
  tipo USER-DEFINED,
  CONSTRAINT maestroArticulo_pkey PRIMARY KEY (item)
);

CREATE TABLE public.conteo (
  ubicacion character varying NOT NULL,
  item character varying NOT NULL,
  cant smallint,
  CONSTRAINT conteo_pkey PRIMARY KEY (ubicacion, item),
  CONSTRAINT conteo_item_fkey FOREIGN KEY (item) REFERENCES public.maestroArticulo(item)
);
```

### Descripción de tablas

| Tabla              | Uso                                      |
| ------------------ | ---------------------------------------- |
| `maestroSeccion`   | Secciones de la planta                   |
| `maestroArea`      | Áreas dentro de cada sección             |
| `maestroUbicacion` | Ubicaciones individuales (PK compuesta: sección, área, subzona) |
| `maestroArticulo`  | Catálogo de artículos (`item` = código, `dsca` = descripción, `tipo` = tipo de artículo, ej. `'SIC'`) |
| `conteo`           | Movimientos / conteo por ubicación-artículo |

### Notas sobre el modelo

- La columna `tipo` en `maestroArticulo` es de tipo `USER-DEFINED` (enum). Si el tipo es `'SIC'`, la app muestra un aviso al escanear el artículo.
- `conteo.ubicacion` almacena la ubicación completa como string con formato `seccion-area-subzona` (ej. `A-01-01`).
- `conteo.item` es FK a `maestroArticulo.item`.
- Las columnas `stat` en las tablas de ubicación son del tipo enum con valores `'Inicio'`, `'Proceso'`, `'Fin'`.

---

## Scripts disponibles

```bash
npm start        # Iniciar Expo dev server
npm run ios      # Iniciar en iOS
npm run android  # Iniciar en Android
npm run web      # Iniciar en web
npm test         # Ejecutar tests con Jest
```

---

## Variables de entorno (`.env`)

```
EXPO_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<anon_key>
```

---

## Notas técnicas

- El doble hook de escáner (`ScannerLogic.js` vs `useScanner.js`) indica un refactor en curso. `useScanner.js` referencia métodos de `ScannerService` que aún no existen.
- Los directorios `domain/models/` y `domain/validators/` están vacíos (planificados para futuro).
- El `CsvProvider` solo implementa lectura/escritura de movimientos; el resto de métodos lanzan "No implementado".
- `ApiProvider` es funcionalmente un stub.
- `ubicacionesMock.js` no se usa actualmente.
- La tabla `conteo` no tiene columna de timestamp; el orden de "últimos movimientos" no es cronológico.
- La clave de Supabase en `.env` es una **anon key** (pública), diseñada para usarse con Row Level Security.
