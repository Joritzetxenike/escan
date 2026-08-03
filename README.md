# escan — App de Inventario con Escáner de Códigos de Barras

App móvil desarrollada con **React Native (Expo SDK 54)** para la gestión de inventario mediante escaneo de códigos de barras. Permite registrar movimientos de artículos por ubicación, consultar el estado de las ubicaciones y exportar datos a CSV.

---

## Stack

| Capa       | Tecnología                                      |
| ---------- | ----------------------------------------------- |
| Framework  | React Native 0.81 + Expo SDK 54                 |
| Lenguaje   | JavaScript (ESM)                                |
| Navegación | React Navigation 7 (native-stack + bottom-tabs) |
| Cámara     | expo-camera 17 (escáner de códigos)             |
| Backend    | Supabase (PostgreSQL)                           |
| Offline    | CSV local via expo-file-system                  |
| OTA        | expo-updates 29 + EAS Update                    |
| Tests      | Jest + jest-expo + react-test-renderer          |

---

## Estructura del proyecto

```
escan/
├── App.js                     # Entrada: SafeAreaProvider + Main
├── Main.js                    # NavigationContainer + RootNavigator + UpdateModal
├── index.js                   # registerRootComponent
├── app.json                   # Configuración Expo (versión, runtimeVersion, updates)
├── eas.json                   # Perfiles de build EAS (development/preview/production)
├── package.json
├── jest.config.js             # Preset jest-expo (carga .env)
├── .env                       # EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_KEY (gitignored)
│
├── .github/workflows/
│   ├── build-android.yml      # Build APK automático al crear un tag v*
│   └── tests.yml              # Tests en push/PR a master
│
└── src/
    ├── screens/               # HomeScreen, ListaScreen, EstadoScreen, ScannerScreen
    ├── views/                 # HomeView, ScannerView (presentacional, recibe state+actions)
    ├── logic/                 # Hooks de negocio: useHomeLogic, useScannerLogic
    ├── hooks/                 # useScanner.js (alternativa al refactor de ScannerLogic)
    ├── components/            # ArticulosModal, CantidadModal, ManualCodeModal, EstadoCard, UpdateModal
    ├── navigation/            # RootNavigator (stack), MainTabs (bottom-tabs)
    ├── services/              # InventoryService, ScannerService, ubicacionesService, updateService
    ├── providers/             # Provider Pattern (estrategia de datos intercambiable)
    │   ├── DataSource.js      # Backend activo: 'supabase' (csv/api comentados)
    │   ├── DataProvider.js    # Router → SupabaseProvider | CsvProvider
    │   ├── InventoryDataProvider.js  # Contrato (interface base)
    │   ├── supabase/          # SupabaseProvider + supabaseClient (activo)
    │   ├── csv/               # csvProvider (parcial, offline)
    │   └── api/               # apiProvider (stub, no implementado)
    ├── constants/             # scannerConstants.js
    ├── helpers/               # csvHelper.js
    ├── styles/                # styles.js (estilos globales)
    ├── data/                  # ubicacionesMock.js (mock, no usado)
    ├── domain/models/         # (vacío — planificado)
    ├── domain/validators/     # (vacío — planificado)
    └── assets/                # icon.png, favicon.png
```

---

## Arquitectura

### Capas

1. **UI** — Screens + Views + Components. Reciben `state` y `actions` desde los hooks.
2. **Lógica** — Custom hooks (`useHomeLogic`, `useScannerLogic`). Contienen todo el estado y las reglas de negocio.
3. **Servicios** — Operaciones de dominio (inventario, escáner, ubicaciones, actualización).
4. **Proveedores de datos** — Estrategia de persistencia intercambiable (Provider Pattern).

### Provider Pattern

`DataSource.js` define el backend activo y `DataProvider.js` expone la implementación correspondiente. Los servicios consumen `DataProvider` sin conocer el backend concreto.

```
DataSource ('supabase')
  └── DataProvider → SupabaseProvider (activo)
                  → CsvProvider    (parcial, offline)
                  → ApiProvider    (stub, no implementado)
```

Para cambiar de backend solo hay que modificar la constante en `DataSource.js`.

> Nota: `InventoryService` siempre escribe además en CSV local como respaldo (`CsvProvider.guardarMovimiento`), aunque el backend activo sea Supabase.

### Escáner — Multi-lectura

El escáner requiere que un mismo código se lea **10 veces consecutivas en 1200ms** antes de darlo por válido. Esto evita lecturas parciales o incorrectas. El buffer se reinicia automáticamente tras 1200ms de inactividad. La lógica está en `ScannerService` y se orquesta en `useScannerLogic`.

---

## Flujo de la app (conteo)

1. **Home** → "Escanear ubicación" → `ScannerScreen` (tipo `ubicacion`) → el código vuelve por `onScan` → `cargarUbicacion()` guarda la ubicación actual y obtiene sus artículos (1 petición).
2. **Home** → "Escanear artículo" (o botón `+` para introducción manual) → `procesarArticulo()`:
   - `validarArticulo()` comprueba: existe ubicación escaneada → el artículo no está repetido en la sesión → existe en `maestroArticulo`.
   - Si `tipo === 'SIC'` muestra un aviso antes de continuar.
3. **Cantidad** → modal `CantidadModal` → `confirmarCantidad()` → `guardarMovimiento()`:
   - `upsert` en la tabla `conteo` (ubicación, item, cant).
   - Actualiza `stat = 'Proceso'` en `maestroUbicacion`, `maestroArea` y `maestroSeccion` (4 peticiones en total).
4. Los últimos 5 artículos de la sesión se muestran en Home.

---

## Pantallas

| Ruta      | Pantalla       | Descripción                                                                 |
| --------- | -------------- | --------------------------------------------------------------------------- |
| `Home`    | HomeScreen     | Escáner de ubicación, escaneo de artículos, últimos artículos de la sesión  |
| `Lista`   | ListaScreen    | Archivos CSV guardados en el dispositivo (abrir, exportar, borrar)          |
| `Estado`  | EstadoScreen   | Árbol sección → área → ubicación con estado y artículos por ubicación      |
| `Scanner` | ScannerScreen  | Cámara con overlay para escanear códigos                                    |

### EstadoScreen (carga bajo demanda)

- **No hace peticiones al abrir** la pantalla.
- Botón **"Cargar ubicaciones"** → trae la estructura completa (1 petición).
- Botón de **recarga independiente** (icono ↻ en la cabecera) → vuelve a pedir los datos.
- Los artículos de una ubicación se cargan **solo al tocar** la ubicación (1 petición por ubicación).
- Si la carga falla muestra un `Alert` y permite reintentar.

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

| Tabla              | Uso                                                        |
| ------------------ | ---------------------------------------------------------- |
| `maestroSeccion`   | Secciones de la planta                                     |
| `maestroArea`      | Áreas dentro de cada sección                               |
| `maestroUbicacion` | Ubicaciones individuales (PK compuesta: sección, área, subzona) |
| `maestroArticulo`  | Catálogo de artículos (`item` = código, `dsca` = descripción, `tipo` = tipo, ej. `'SIC'`) |
| `conteo`           | Movimientos / conteo por ubicación-artículo (no tiene columna de fecha) |

### Notas sobre el modelo

- `conteo.ubicacion` guarda la ubicación completa como string `seccion-area-subzona` (ej. `50100-111-Z101`). En `SupabaseProvider` se mapean `item → articulo` y `cant → cantidad` para mantener la misma interfaz que `CsvProvider`.
- Las columnas `stat` usan un enum con valores `'Inicio'`, `'Proceso'`, `'Fin'`.
- La tabla `conteo` **no tiene timestamp**: `obtenerUltimosMovimientos` no ordena cronológicamente (ordena por `ubicacion, item`). Si se necesita orden real, habría que añadir `updated_at timestamp default now()`.
- `maestroArticulo.tipo` es un enum; si es `'SIC'`, la app avisa al escanearlo.

---

## Actualizaciones

La app tiene **dos mecanismos de actualización**:

### 1. Check manual vía GitHub Releases (`updateService.js` + `UpdateModal`)

`Main.js` consulta `https://api.github.com/repos/Joritzetxenike/escan/releases/latest` al arrancar. Si el tag más reciente es mayor que la versión embebida (`Constants.expoConfig.version`), muestra el `UpdateModal` con enlace de descarga del APK (`apkUrl`). Si la petición falla, no muestra nada.

### 2. OTA vía expo-updates (EAS Update)

En `app.json`:

```json
"runtimeVersion": { "policy": "appVersion" },
"updates": { "url": "https://u.expo.dev/1f1976cd-945c-4e99-99cd-eebc96418b31" }
```

- Con la política `appVersion`, el `runtimeVersion` que pide la app instalada = la **versión embebida en el APK**.
- Un update publicado con `eas update` **solo llega a las apps cuyo `runtimeVersion` coincida**. `eas update` genera el runtimeVersion a partir de la versión de `app.json`.

### Gotchas de versionado (IMPORTANTE)

- El workflow `build-android.yml` **sube la versión de `app.json` al tag** antes de compilar (ej. tag `v1.0.4` → `app.json` versión `1.0.4`) y hace commit + push a `master` (`chore: bump version to X [skip ci]`). Por eso `master` avanza solo en cada build.
- Para que un `eas update` llegue a la app instalada, la versión de `app.json` local debe coincidir con la versión que reporta el APK instalado. En caso contrario el update se sirve para otro runtimeVersion y la app lo ignora.
- `eas update` requiere **working tree limpio** (`eas.json` → `cli.requireCommit: true`).
- Existe un update OTA publicado en el canal `preview` con runtimeVersion `1.0.1`.

---

## Build y release (CI/CD)

### GitHub Actions — `build-android.yml`

Disparado al pushear un **tag `v*`**:

1. `checkout` del tag.
2. **Bump de versión**: edita `app.json` con la versión del tag, hace commit `[skip ci]` y **push a master**.
3. `npm ci`.
4. `npm test` con env vars desde secrets del repo.
5. `eas build --platform android --profile preview --non-interactive` (APK).
6. Descarga el APK y crea un **GitHub Release** con el tag.

### EAS — `eas.json`

| Perfil        | Uso            | Channel     | BuildType |
| ------------- | -------------- | ----------- | --------- |
| `development` | Dev client     | development | —         |
| `preview`     | APK de prueba  | preview     | apk       |
| `production`  | Play Store     | production  | app-bundle |

- `cli.appVersionSource: "remote"` y `cli.requireCommit: true`.
- `preview` y `production` con `autoIncrement: true`.

### Tests — `tests.yml`

En cada push/PR a `master`: `npm ci` + `npm test` con las env vars de Supabase inyectadas desde secrets.

---

## Variables de entorno (`.env`)

```
EXPO_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<anon_key>
```

- `.env` está en `.gitignore`; **no se sube al repo**.
- `supabaseClient.js` lanza un error al importarse si faltan las variables → la app no arranca.
- En CI se inyectan vía secrets del repo: `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_KEY`.
- `EXPO_PUBLIC_*` se embebe en el bundle en build time (EAS usa el `.env` local).

---

## Scripts disponibles

```bash
npm start        # Iniciar Expo dev server
npm run ios      # Iniciar en iOS
npm run android  # Iniciar en Android
npm run web      # Iniciar en web
npm test         # Ejecutar tests con Jest
```

### Publicar un update OTA de prueba

```bash
# 1. Asegurar que la versión de app.json coincide con la del APK instalado
# 2. Working tree limpio (requireCommit)
eas update --channel preview --platform android
```

---

## Testing

- **Preset**: `jest-expo` (configuración en `jest.config.js`, que además carga `.env`).
- **Suites** en `__tests__/`: services, providers, logic y screens.
- Los hooks y pantallas se prueban con **react-test-renderer** (sin `@testing-library`).
- **Importante (React 19)**: `create()` y `unmount()` de `react-test-renderer` deben envolverse en `act()`.

```bash
npm test                      # Todo
npx jest __tests__/screens    # Solo pantallas
npx jest --coverage           # Cobertura
```

Cobertura actual: `ScannerService`, `InventoryService` (incl. `validarArticulo`), `updateService`, `supabaseClient`, `SupabaseProvider`, `CsvProvider`, `useHomeLogic`, `useScannerLogic` y el comportamiento de `EstadoScreen` (carga bajo demanda, botón de recarga, artículos lazy).

---

## Notas técnicas

- `useScanner.js` (hooks/) es una versión alternativa del escáner a medio refactor; la activa es `ScannerLogic.js`. `useScanner.js` referencia métodos de `ScannerService` (`crearBuffer`, `procesarLectura`, `limpiarBufferCaducado`) que hoy no existen.
- `CsvProvider` solo implementa lectura/escritura de movimientos; el resto de métodos lanzan `No implementado`.
- `ApiProvider` es un stub.
- `ubicacionesMock.js` no se usa activamente.
- `domain/models/` y `domain/validators/` están vacíos (planificados).
- La clave de Supabase en `.env` es una **anon key** (pública), diseñada para usarse con Row Level Security.
- La petición del `UpdateModal` corre en un `useEffect` de `Main.js` sin guard de entorno: también ocurre en Expo Go/dev.
