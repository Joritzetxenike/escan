# InventoryScanner — App de Inventario con Escáner de Códigos de Barras

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
| Offline    | CSV local + cola `pending-operations.json`      |
| OTA        | expo-updates 29 + EAS Update                    |
| Tests      | Jest + jest-expo + react-test-renderer          |

---

## Estructura del proyecto

```
escan/
├── App.js                     # Entrada: SafeAreaProvider + Main
├── Main.js                    # AuthProvider + NavigationContainer + RootNavigator + UpdateModal + arranque de sync
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
    ├── context/               # AuthContext (matrícula del operario en memoria)
    ├── screens/               # IdentificacionScreen, HomeScreen, ListaScreen, EstadoScreen, ScannerScreen
    ├── views/                 # IdentificacionView, HomeView, ScannerView (presentacional, recibe state+actions)
    ├── logic/                 # Hooks de negocio: useIdentificacionLogic, useHomeLogic, useScannerLogic, useConectividad
    ├── hooks/                 # useScanner.js (alternativa al refactor de ScannerLogic)
    ├── components/            # HeaderSesion, HeaderTabs, ArticulosModal, CantidadModal, ManualCodeModal, EstadoCard, UpdateModal, EstadoBanner, MaestrosBanner, EstadoResumen
    ├── navigation/            # RootNavigator (stack), MainTabs (bottom-tabs)
    ├── services/              # authService, InventoryService, ScannerService, ubicacionesService, updateService, conectividadService, pendientesService, ubicacionActivaService, syncService
    ├── providers/             # Provider Pattern (estrategia de datos intercambiable)
    │   ├── DataSource.js      # Backend activo: 'supabase' (csv/api comentados)
    │   ├── DataProvider.js    # Router → SupabaseProvider | CsvProvider
    │   ├── InventoryDataProvider.js  # Contrato (interface base)
    │   ├── supabase/          # SupabaseProvider + supabaseClient (activo)
    │   ├── csv/               # csvProvider (parcial, offline)
    │   └── api/               # apiProvider (stub, no implementado)
    ├── validators/            # ArticuloValidator, UbicacionValidator
    ├── constants/             # scannerConstants.js
    ├── helpers/               # archivoHelper.js, csvHelper.js, estadosResumenHelper.js, redHelper.js
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
2. **Lógica** — Custom hooks (`useIdentificacionLogic`, `useHomeLogic`, `useScannerLogic`). Contienen todo el estado y las reglas de negocio.
3. **Servicios** — Operaciones de dominio (sesión, inventario, escáner, ubicaciones, actualización).
4. **Proveedores de datos** — Estrategia de persistencia intercambiable (Provider Pattern).

### Sesión del operario

Antes de montar las pestañas, la app pide una **matrícula**. La sesión vive
**solo en memoria** (`authService` + `AuthContext`): al arrancar de nuevo se
vuelve a pedir, no se guarda en el dispositivo.

- `authService.validarMatricula()` es el único punto de validación; hoy acepta
  cualquier número no vacío y deja preparado el cambio a una consulta a
  Supabase.
- `RootNavigator` muestra `IdentificacionScreen` mientras no hay matrícula y
  `MainTabs` + `Scanner` en cuanto la hay.
- La cabecera de las pestañas tiene dos filas: arriba la
  `Matrícula: <número>` y el botón de **cerrar sesión** (pide confirmación);
  debajo, el título de la pestaña. Al cerrar sesión se vuelve a la pantalla de
  identificación sin borrar CSVs, maestros ni la cola de pendientes.
- La matrícula se guarda en la **4ª columna del CSV** al guardar o editar una
  cantidad. No se envía a Supabase ni se añade a `pending-operations.json`.

### Provider Pattern

`DataSource.js` define el backend activo y `DataProvider.js` expone la implementación correspondiente. Los servicios consumen `DataProvider` sin conocer el backend concreto.

```
DataSource ('supabase')
  └── DataProvider → SupabaseProvider (activo)
                  → CsvProvider    (parcial, offline)
                  → ApiProvider    (stub, no implementado)
```

Para cambiar de backend solo hay que modificar la constante en `DataSource.js`.

> Nota: `InventoryService` escribe además en el CSV local como respaldo (`CsvProvider.guardarMovimiento`), aunque el backend activo sea Supabase. Ese CSV se escribe **siempre primero**, antes de cualquier operación con Supabase (ver «Conectividad y sincronización diferida»).

### Escáner — Multi-lectura

El escáner requiere que un mismo código se lea **3 veces consecutivas en 1200ms** antes de darlo por válido. Esto evita lecturas parciales o incorrectas. El buffer se reinicia automáticamente tras 1200ms de inactividad. La lógica está en `ScannerService` y se orquesta en `useScannerLogic`.

---

## Flujo de la app (conteo)

0. **Arranque** → `IdentificacionScreen`: el operario teclea su matrícula (solo
   dígitos). Al pulsar **Entrar** se guarda en memoria y se montan las pestañas.
   La cabecera muestra la matrícula y permite cerrar sesión.
1. **Home** → "Escanear ubicación" → `ScannerScreen` (tipo `ubicacion`) → el código vuelve por `onScan` → `cargarUbicacion()` guarda la ubicación actual y obtiene sus artículos (1 petición).
   - El dispositivo solo puede tener **una ubicación activa**. Si ya hay una
     abierta, se permite volver a cargar la misma, pero se rechaza cualquier
     otra hasta terminarla. El bloqueo cubre cámara y entrada manual.
   - La ubicación activa se guarda en `ubicacion-activa.json`; al arrancar se
     consulta la nube para saber si ya está en `Fin`. Si lo está, se libera.
2. **Home** → "Escanear artículo" (o botón `+` para introducción manual) → `procesarArticulo()`:
   - Si la ubicación actual está **terminada** (`Fin`), el aviso "Ubicación terminada" sale **al pulsar** el botón (antes de abrir la cámara o el modal); `procesarArticulo()` conserva la misma comprobación como red de seguridad.
   - `validarArticulo()` comprueba contra la copia local: existe ubicación escaneada → existe en `maestroArticulo` (y no es genérico).
   - Si `tipo === 'SIC'` muestra un aviso antes de continuar.
   - Si el artículo es **genérico** (tipo `GEN`/`GENERICO`) se rechaza indicando el motivo, aunque exista en el maestro.
   - Si el código **no existe** en el maestro, el aviso lo dice expresamente.
   - Si el artículo **ya está contado** en la ubicación (lo dice el CSV local, la fuente de verdad), avisa con su cantidad actual y ofrece **Sumar** (existente + lo tecleado), **Sobrescribir** (solo lo tecleado) o **Cancelar**. Ver más abajo.
3. **Cantidad** → modal `CantidadModal` → `confirmarCantidad()` → `guardarMovimiento()`:
   - `upsert` en la tabla `conteo` (ubicación, item, cant).
   - Actualiza `stat = 'Proceso'` en `maestroUbicacion`, `maestroArea` y `maestroSeccion` (4 peticiones en total).
4. Los últimos 5 artículos de la sesión se muestran en Home.

---

## Pantallas

| Ruta             | Pantalla             | Descripción                                                                 |
| ---------------- | -------------------- | --------------------------------------------------------------------------- |
| `Identificacion` | IdentificacionScreen | Pide la matrícula del operario antes de entrar (se muestra en cada arranque) |
| `Home`           | HomeScreen           | Escáner de ubicación, escaneo de artículos, últimos artículos de la sesión  |
| `Lista`          | ListaScreen          | Abre el CSV de una ubicación escaneándola o tecleándola; lista de CSVs guardados. Exportar/borrar viven en el modal |
| `Estado`         | EstadoScreen         | Resumen de estados por defecto y, tras el conmutador, el árbol sección → área → ubicación con artículos por ubicación |
| `Scanner`        | ScannerScreen        | Cámara con overlay para escanear códigos                                    |

Los modales de entrada manual de **artículo** y **ubicación** usan el teclado
**alfanumérico completo**: letras y números, sin autocorrección ni corrección
ortográfica.

### Abrir un CSV (pestaña Lista)

Para ver o modificar el CSV de una ubicación hay que **conocer su ubicación**:
se abre con el botón **"Escanear ubicación"** (cámara) o con el **`+`** para
teclearla a mano. El código se normaliza y se comprueba el **formato**
(`seccion-area-subzona`); no se valida contra la copia del maestro, porque el
objetivo es abrir un CSV local que ya existe y exigir la copia podría bloquearlo
si está desactualizada. Si no hay CSV para esa ubicación se muestra el aviso
**"Sin registros"**.

La pantalla sigue mostrando además la **lista de CSVs** guardados: al tocar un
nombre se abre igualmente su modal. Los botones de **exportar/terminar** y
**borrar CSV** ya no están en cada fila: viven **dentro del modal de artículos**
(ver más abajo).

### Buscar códigos en el modal de artículos

El modal de artículos (el mismo en Lista y en Estado) tiene un **buscador**
arriba de la lista: filtra los artículos por **código** con coincidencia tipo
**"contiene"**, **ignorando mayúsculas/minúsculas** (teclear `4010` encuentra
`-BXC05.4010`). Si no coincide ninguno muestra **"Sin resultados para «…»"** y
el botón **×** limpia el filtro. El filtro se reinicia al cerrar el modal.

No busca por descripción (los CSV no la guardan) ni por cantidad, y no altera
las filas: editar o eliminar una fila filtrada sigue actuando sobre el artículo
correcto (se conserva su posición real en el CSV).

Desde la lista de artículos, el modal de cantidad, el aviso de artículo repetido
y los **últimos artículos escaneados** se muestran **Descripción** y **Unidad**
cuando el maestro local las conoce. El CSV sigue teniendo el mismo formato
(`ubicacion,articulo,cantidad,matricula`): esos datos se enriquecen en memoria
por código y, si faltan, se muestran como `—`.

### EstadoScreen (resumen + lista)

- Abre en el **resumen**, que se pide solo al entrar (1 petición). El conmutador
  de arriba cambia a la **lista**, que sigue siendo la de carga por niveles.
- La lista **no hace peticiones** al cambiar a ella: botón **"Cargar
  ubicaciones"** → trae solo las **secciones** (1 petición).
- Al **expandir una sección** se cargan sus áreas; al **expandir un área** se cargan sus ubicaciones (1 petición por nivel).
- Los artículos de una ubicación se cargan **solo al tocar** la ubicación (1 petición por ubicación).
- Botón de **recarga** (icono ↻ en la cabecera) → recarga la vista que se esté viendo: el resumen o las secciones, limpiando los niveles cacheados.
- Si la carga falla muestra un `Alert` y permite reintentar.

### Borrado de movimientos

- El borrado **solo** se realiza desde el modal de artículos de la pestaña Lista (CSV): al eliminar una fila se muestra un aviso de que **también se borrará de la base de datos** y se elimina en ambos sitios.
- En el modal de artículos de Estado ya no aparece la columna **Eliminar**.

### Resumen de estados (porcentajes)

- Es la **vista por defecto** de la pestaña Estado. Antes era una pantalla
  aparte a la que había que entrar desde un botón; ahora es un conmutador
  Resumen / Lista dentro de la misma pantalla.
- El pintado vive en `src/components/EstadoResumen.js` y solo recibe datos:
  `EstadoScreen` es quien los pide y quien decide cuándo recargar.
- Hace **una sola petición** (`obtenerEstadoUbicaciones`, árbol anidado) y muestra para secciones, áreas y ubicaciones el total y el **porcentaje** en cada estado (`Fin`, `Proceso`, `Inicio`) con su barra de progreso.
- El cálculo vive en `src/helpers/estadosResumenHelper.js` (función pura `resumirEstados`).

---

## Estados de ubicación

- **Inicio** (gris) — No se ha iniciado el conteo
- **Proceso** (naranja) — Conteo en curso
- **Fin** (verde) — Conteo completado

---

## Terminar una ubicación desde Lista

Al pulsar el botón **"Exportar"** dentro del modal de artículos (se abre escaneando
o tecleando la ubicación, o tocando su CSV en la lista):

1. La ubicación correspondiente al archivo se marca como **`Fin`** en la base de datos (`maestroUbicacion.stat = 'Fin'`).
2. Si **todas** las ubicaciones de su área están en `'Fin'`, el área pasa a `'Fin'`; si **todas** las áreas de su sección están en `'Fin'`, la sección pasa a `'Fin'` (mismo patrón que el cambio a `'Proceso'` al guardar movimientos).
3. Después se abre el menú de **compartir** del sistema (correo/WhatsApp, etc.) con el CSV.

Una ubicación en `'Fin'` **no admite más operaciones**:
- Home cachea el estado de la ubicación al escanearla: con `'Fin'` no permite escanear ni introducir artículos (aviso «Ubicación terminada»). Al volver a la pestaña Home desde Lista se reconsulta el estado en el maestro (1 petición) para recoger un `'Fin'` recién marcado.
- El modal de artículos (el mismo en Lista y en Estado) consulta él mismo `estaUbicacionFinalizada` al abrirse: con `'Fin'` no permite **editar cantidades** ni **eliminar filas**.
- En la pestaña Lista, dentro del modal del CSV, se puede **editar la cantidad** tocándola (y **eliminar filas**): al guardar se escribe el **CSV y la base de datos** (o la cola), igual que en Estado. Todo queda bloqueado si la ubicación está en `'Fin'`. El CSV completo se sigue pudiendo borrar con **"Borrar CSV"** o exportar con **"Exportar"**.

---

## Conectividad y sincronización diferida

La app **funciona sin conexión**: todo lo que se escanea se guarda en el
dispositivo y se envía a Supabase en cuanto vuelve la red. Sin dependencias
nativas adicionales (nada de NetInfo), por lo que se despliega por **OTA**.

### Detección de conexión

El estado se deduce de una sonda ligera a Supabase
(`SupabaseProvider.estaDisponible()`), no del estado del sistema:

- `src/services/conectividadService.js` es un singleton con el estado
  (`online`, `comprobando`, `sincronizando`, `pendientes`, `ultimoIntento`,
  `ultimoError`) y una lista de suscriptores.
- Se comprueba **al iniciar la app** (`Main.js` → `conectividadService.iniciar()`),
  **al volver a primer plano** (`AppState`) y **cada 30 s mientras no hay
  conexión**.
- Cualquier petición que falla por red marca el estado (`marcarSinConexion`) y
  cualquier petición que sale bien lo restablece (`marcarConexion`).
- `esErrorDeRed()` (`src/helpers/redHelper.js`) distingue un fallo de red de un
  rechazo del maestro: lo primero se encola y se reintenta; lo segundo es un
  error real y se muestra al usuario.

### Orden de escritura

`InventoryService` aplica siempre el mismo orden en guardar, editar, eliminar y
finalizar:

```
1. CSV local            → fuente local de verdad (una fila: ubicacion,articulo,cantidad,matricula)
2. Cola de pendientes  → solo si no hay conexión, o si la petición falla por red
3. Supabase             → solo si hay conexión
4. Confirmación         → la operación sale de la cola
```

- Si hay conexión, la operación va directa a Supabase (no se escribe en la cola
  para no gastar escrituras: el CSV sí queda actualizado como espejo local).
- Si no hay conexión, o la petición se cae, la operación **se encola** y la UI
  recibe `{ pendiente: true }`: nunca se muestra como guardada en Supabase.
- Un error que no es de red (FK, RLS, código inexistente) se propaga a la UI.

### Matrícula en el CSV

- Formato de fila: `ubicacion,articulo,cantidad,matricula`.
- La matrícula es la del operario identificado en ese momento; se actualiza al
  guardar o editar la cantidad, de modo que queda constancia del último cambio.
- Los CSV antiguos de 3 columnas se siguen leyendo: su matrícula se interpreta
  como vacía. Al reescribir el fichero, las filas pasan a tener 4 columnas.
- La matrícula **no** se incluye en la cola de pendientes ni en las peticiones
  a Supabase: solo vive en el CSV local y en el fichero exportado.

### Ubicación activa: `ubicacion-activa.json`

Vive en `documentDirectory` y guarda solo el código de la ubicación que el
dispositivo tiene abierta. Es un estado del **dispositivo**, no de la sesión:
no se borra al cerrar sesión ni al reiniciar la app.

- Al arrancar, `HomeLogic` recupera el código y consulta la nube con
  `InventoryService.estaUbicacionFinalizada()`.
- Si la ubicación sigue abierta, queda restaurada y no se puede escanear otra
  distinta. Volver a escanear la misma sí se permite.
- Si la nube la devuelve en `Fin`, se borra el fichero y queda libre.
- Sin conexión manda la cola de finalizaciones pendientes, igual que en el
  resto de comprobaciones de estado.
- Al exportar/compartir el CSV desde Lista se finaliza la ubicación y se borra
  el marcador. Si el cierre falla, el bloqueo continúa.
- Abrir un CSV desde Lista no cambia la ubicación activa.

### Cola de pendientes: `pending-operations.json`

Vive en `documentDirectory`, junto a los CSV. Es un `.json`, así que **no
aparece en la pestaña Lista** (que solo lista `.csv`) y borrar o compartir un
CSV no la afecta.

```json
{
  "version": 1,
  "operaciones": [
    {
      "operation_id": "op-1730000000000-1-a1b2c3",
      "tipo": "guardar",
      "ubicacion": "50100-111-Z101",
      "articulo": "123456",
      "cantidad": 5,
      "created_at": "2026-10-04T10:00:00.000Z",
      "intentos": 0,
      "ultimo_error": null,
      "provisional": false,
      "ubicacion_provisional": false
    }
  ]
}
```

- `tipo` ∈ `guardar` | `actualizar` | `eliminar` | `finalizar`.
- **Coalescencia conservadora**: dos guardados/actualizaciones *consecutivos*
  del mismo artículo se fusionan en una sola operación (se queda el último
  valor y el `operation_id` original). En cambio `guardar` → `eliminar` **se
  conservan ambos**, porque el artículo puede existir ya en `conteo` y el
  borrado tiene que llegar al servidor.
- Una finalización pendiente marca esa ubicación como **terminada localmente**:
  no admite más operaciones, igual que en Supabase.

### Sincronización

`src/services/syncService.js` envía las operaciones **en orden y de una en una**:

- Se valida lo marcado como `provisional` contra `maestroArticulo` /
  `maestroUbicacion` antes de aplicarlo.
- Ese marcado es **herencia de las primeras versiones del offline**: hoy nada se
  encola como provisional, porque tanto artículos como ubicaciones se validan
  contra la copia local. Los dos campos siguen en el formato de la cola para
  poder revalidar las operaciones que ya estaban ahí.
- Si un código no existe en el maestro, la operación **se conserva** con su
  error y se bloquea el resto de esa ubicación; las demás ubicaciones siguen.
- Si se cae la red, se para todo (reintentar en desorden dejaría el estado
  inconsistente) y se incrementa `intentos`.
- Una operación solo se borra de la cola tras la confirmación del servidor.

Los reintentos **no pueden duplicar**: `guardarMovimiento` hace `upsert` sobre
la PK `(ubicacion,item)` y los borrados son idempotentes, así que no hace falta
ninguna tabla de deduplicación en servidor (el `operation_id` se reutiliza tal
cual en cada reintento).

Disparadores: arranque de la app, recuperación de conexión, vuelta a primer
plano y el botón **Reintentar** de `EstadoBanner`.

### Copia local del maestro

`src/services/maestrosService.js` mantiene una copia local de los maestros para
poder validar artículos y ubicaciones **sin red**. En memoria son tres `Set`
(códigos, SIC y genéricos), un `Set` de ubicaciones y dos mapas opcionales
(`descripciones` y `unidades`), cargados desde dos ficheros:

| Fichero                | Contenido                                             |
| ---------------------- | ----------------------------------------------------- |
| `maestro-articulos.json` | `version`, `actualizado_at`, `total`, `codigos`, `sic`, `genericos`, `descripciones`, `unidades` |
| `maestro-ubicaciones.json` | `version`, `actualizado_at`, `ubicaciones` (`seccion-area-subzona`) |
| `maestros-meta.json`   | Fechas de descarga y `rechazada_hasta` (aplazamiento) |

`descripciones` y `unidades` son mapas **código → valor** opcionales, pensados
para enriquecer la UI sin tocar el CSV. De momento se guardan **vacíos** porque
la RPC `descargar_maestro_articulos()` no devuelve esos datos; los maestros
antiguos siguen siendo válidos y los campos se muestran como `—` cuando faltan.

El maestro de artículos se baja con una única llamada a la RPC
`descargar_maestro_articulos()` (PostgREST limita a 1.000 filas por respuesta, así
que hacerlo con REST exigía unas 212 peticiones). Las ubicaciones se leen con la
consulta anidada de siempre: son 199 filas.

```
supabase/migrations/20261004_maestro_snapshot.sql
supabase/migrations/20261014_maestro_genericos.sql
```

La primera migración ya está aplicada: la RPC devuelve 211.578 códigos y 1.669
SIC. La segunda **añade** `genericos` al mismo resultado (los artículos de tipo
`GEN`/`GENERICO`), para rechazarlos al escanear en lugar de dejarlos pasar. Sin
ella la validación de artículos es estricta y no hay forma de escanear. Una copia
local descargada antes de aplicarla no lleva `genericos`: los genéricos se siguen
aceptando hasta refrescar la copia (icono ⟳).

La copia **no se actualiza sola**. La descarga de 3 MB en mitad de un conteo es
molesta y deja al operario sin conexión, así que la decisión es suya:

| Situación                        | Qué pasa                                       |
| -------------------------------- | ---------------------------------------------- |
| Sin copia (primer uso)           | Descarga obligatoria al abrir la app           |
| Copia al día (< 24 h)            | Franja verde con la antigüedad y el botón      |
| Copia vieja (> 24 h)             | Aviso con `Actualizar` / `Ahora no`            |
| Tras `Ahora no`                  | No se vuelve a preguntar en 12 h               |
| Copia de más de 7 días           | El aviso avisa de que puede rechazar artículos nuevos |

El actualizador del maestro (`MaestrosBanner`) vive en la franja superior fija
de la pantalla de identificación, antes del formulario. Así está disponible
antes de empezar a contar, incluso si la copia acaba de caducar. El botón
`Actualizar` está en todos los estados salvo mientras baja.

### MaestrosBanner: copia local

`src/components/MaestrosBanner.js` muestra el estado de la copia y permite
forzar la descarga antes de entrar. Es el único banner de estado de la parte
superior: si la copia está al día dice `Sincronizado`; si toca actualizarla,
dice `Pendiente de actualizar`. Gana el problema más urgente:

| Prioridad | Estado                                        | Fondo |
| --------- | --------------------------------------------- | ----- |
| 1 | Descargando el maestro                        | gris  |
| 2 | Sin copia del maestro (bloquea la validación) | rojo  |
| 3 | Error al bajar el maestro                     | rojo  |
| 4 | Pendiente de actualizar: `Actualizar` / `Ahora no` | ámbar |
| 5 | Copia al día: `Sincronizado · hace X`         | verde |

Si la descarga falla se conserva la copia anterior intacta y el aviso muestra el
error: nunca se descarta un maestro que ya funcionaba. Si la RPC devolviera un
maestro vacío, la descarga se aborta antes de tocar los ficheros.

### EstadoBanner: conexión y cola

`src/components/EstadoBanner.js` se usa con `soloAvisos` en identificación,
Home y Lista: el estado “todo bien” no ocupa espacio, pero siguen visibles los
avisos de sin conexión, error, sincronización en curso y cambios pendientes. En
identificación va debajo del banner de la copia del maestro. El botón
**Reintentar** relanza la comprobación y la sincronización de la cola.

Las operaciones que ya estaban en la cola como `provisional` (creadas por
versiones anteriores del offline) siguen validándose contra Supabase al
sincronizar, para no perderlas.

Las dos copias son independientes: la de artículos son 211.578 códigos y la de
ubicaciones 199. Si la de ubicaciones se pierde o se corrompe, la app la
recupera por su cuenta al cargar la copia de artículos, sin obligar a bajarse
los 3 MB del maestro entero. Si aun así no puede, la validación de ubicaciones
se rechaza con un aviso explícito en vez de aceptar códigos sin comprobar.

### Autocompletado en la entrada manual de artículos

Al teclear un artículo a mano (`+` de Home), el modal sugiere códigos de la
copia local **que empiezan por lo tecleado**. Funciona sin conexión (usa la
misma copia que la validación) y muestra el **código** y, si está disponible en
el maestro local, su **descripción** y **unidad**.

- Se compara **ignorando mayúsculas/minúsculas** (`bxc05` sugiere `-BXC05…`),
  pero al elegir se escribe el código **real**.
- Aparece a partir de **2 caracteres**, con un pequeño retardo (200 ms) para no
  filtrar en cada pulsación, y muestra hasta **8** sugerencias ordenadas.
- Al pulsar una sugerencia solo se **rellena el campo**: el operario revisa y
  confirma (puede seguir editándolo).
- Sin copia local no hay sugerencias, igual que no hay validación.

La lógica vive en `maestrosService.sugerirArticulos()` y
`maestrosService.obtenerDetalleArticulo()` (expuestas por `InventoryService` y
`HomeLogic`), y el desplegable en `ManualCodeModal` a través del prop opcional
`sugerencias`; el detalle del código tecleado se pide con `obtenerDetalle`.

### Artículo ya contado: sumar o sobrescribir

Al escanear/teclear un artículo que **ya está contado en la ubicación**, la app
no lo da por nuevo ni lo pisa en silencio: abre un modal propio
(`ArticuloExistenteModal`) con la cantidad que ya había y deja elegir entre
**Sumar** y **Sobrescribir**, con **Cancelar** debajo. Se usa un modal propio y
no un `Alert` nativo para poder maquetar los tres botones.

- El criterio es el **CSV local de la ubicación** (la fuente de verdad de lo
  contado), consultado con `InventoryService.obtenerCantidadGuardada()` →
  `CsvProvider.obtenerRegistroUbicacion()`. Funciona también sin conexión.
- **Sumar** → la cantidad tecleada se **suma** a la existente (`existente + nueva`).
- **Sobrescribir** → la cantidad tecleada **reemplaza** la que había.
- **Cancelar** → no se cambia nada (no se abre el modal de cantidad).
- La cantidad final se guarda con el `upsert` habitual (`conteo` y CSV), así que
  el resultado es el mismo con o sin conexión.

La decisión vive en `HomeLogic`: `procesarArticulo()` abre el modal
(`mostrarExistente` y `cantidadExistente`), `elegirSumar()`/`elegirSobrescribir()`
fijan `modoGuardar` y `cancelarExistente()` descarta el artículo; la cantidad
final la calcula `confirmarCantidad()` antes de guardar. El porcentaje/estado de
la ubicación no cambia por esto: sigue siendo `upsert` de una fila por artículo.

### Sin conexión, qué se puede y qué no

| Acción                              | Sin conexión                                   |
| ----------------------------------- | ---------------------------------------------- |
| Escanear ubicación                  | Sí (formato + contra la copia local) |
| Escanear artículo                   | Sí, validado contra la copia local    |
| Meter ubicación a mano (`+`)        | Sí, validada contra la copia local            |
| Meter el artículo a mano (`+`)      | Sí, validado contra la copia local            |
| Guardar / editar cantidad           | Sí (CSV + cola)                                 |
| Borrar fila                         | Sí (CSV + cola)                                 |
| Marcar ubicación como `Fin`         | Sí, se encola y se aplica al sincronizar        |
| Pestañas Estado / Resumen           | No (necesitan los datos de conteo, no el maestro) |

La entrada a mano (`+`) se desbloqueó en cuanto existió la copia local del
maestro: antes se rechazaba sin conexión porque el código solo se podía validar
contra el maestro, que está en la red. Ahora se valida contra la copia, igual que
al escanear, y si no hay copia sale el aviso de "Sin copia de maestros".

Ambas entradas siguen siendo históricas: el `+` de artículos **exige** una
ubicación previa (no se puede contar sin saber dónde), mientras que el de
ubicaciones no la necesita, porque lo que se está introduciendo es precisamente
la ubicación.

Si la ubicación actual está **terminada** (`stat = 'Fin'`), tanto "Escanear
artículo" como el `+` de artículo avisan al pulsarlos y no abren cámara ni
modal. El botón "Escanear ubicación" (y su `+`) siguen libres: son la forma de
pasar a otra ubicación.

Los códigos de ubicación se normalizan a mayúsculas y sin espacios antes de
validarlos, porque al teclearlos es fácil equivocarse de capitalización y los
códigos del maestro son `SECCION-AREA-SUBZONA` en mayúsculas (p. ej.
`LIN2-A01-Z01`). Esta normalización no afecta a los artículos, cuyos códigos
sí distinguen mayúsculas y minúsculas (`-BXC05.4010 -SUB`).

### Limitaciones conocidas

1. `guardarMovimiento` en Supabase son 4 peticiones: si la red se cae a mitad,
   el `conteo` puede quedar guardado y los `stat` no. El reintento lo converge,
   pero la solución definitiva es la RPC transaccional (ver `TODO.md`).
2. La copia local del maestro guarda los **códigos** y, opcionalmente,
   `descripciones`/`unidades`; ahora mismo esos mapas están vacíos porque la RPC
   no los devuelve. Sin conexión, un artículo se acepta o se rechaza por el
   código; la descripción y la unidad solo se muestran si están en la copia. El
   riesgo real es que un código nuevo se rechace porque la copia tiene más de
   24 h: de ahí el aviso de refresco.
3. Validar una ubicación **exige** la copia de ubicaciones, sin excepción. Antes,
   si ese fichero faltaba, se aceptaba cualquier código con formato correcto
   como provisional; con la entrada manual abierta eso habría dejado pasar
   ubicaciones inventadas tipo `LIN2-A99-Z99`. Si el fichero se pierde, la app
   lo recupera sola (son 199 filas, no los 3 MB del maestro de artículos).
4. La propagación `Fin` → área → sección no se simula en local: se aplica al
   sincronizar.
5. La cola se drena secuencialmente (una ubicación detrás de otra).

---

## Modelo de datos (Supabase)

### Esquema DDL

Las tablas están creadas **con comillas**, así que su nombre real conserva las
mayúsculas: `public."maestroArticulo"`. Sin las comillas, Postgres pliega el
nombre a minúsculas y responde `relation "maestroarticulo" does not exist`, así
que cualquier función SQL nueva tiene que respetar las comillas. Por la API de
PostgREST sí funciona escribirlas sin comillas, porque las rutas no se pliegan.

```sql
CREATE TABLE public."maestroSeccion" (
  seccion character varying NOT NULL,
  stat USER-DEFINED,
  CONSTRAINT maestroSeccion_pkey PRIMARY KEY (seccion)
);

CREATE TABLE public."maestroArea" (
  seccion character varying NOT NULL,
  area character varying NOT NULL,
  stat USER-DEFINED,
  CONSTRAINT maestroArea_pkey PRIMARY KEY (seccion, area),
  CONSTRAINT maestro_area_seccion_fkey FOREIGN KEY (seccion) REFERENCES public."maestroSeccion"(seccion)
);

CREATE TABLE public."maestroUbicacion" (
  seccion character varying NOT NULL,
  area character varying NOT NULL,
  subzona character varying NOT NULL,
  stat USER-DEFINED,
  CONSTRAINT maestroUbicacion_pkey PRIMARY KEY (seccion, area, subzona),
  CONSTRAINT maestro_ubicacion_seccion_area_fkey FOREIGN KEY (seccion, area) REFERENCES public."maestroArea"(seccion, area)
);

CREATE TABLE public."maestroArticulo" (
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
  CONSTRAINT conteo_item_fkey FOREIGN KEY (item) REFERENCES public."maestroArticulo"(item)
);
```

### Descripción de tablas

| Tabla              | Uso                                                        |
| ------------------ | ---------------------------------------------------------- |
| `maestroSeccion`   | Secciones de la planta                                     |
| `maestroArea`      | Áreas dentro de cada sección                               |
| `maestroUbicacion` | Ubicaciones individuales (PK compuesta: sección, área, subzona) |
| `maestroArticulo`  | Catálogo de artículos (`item` = código, `dsca` = descripción, `tipo` = tipo, ej. `'MRP'`, `'SIC'`, `'GEN'`) |
| `conteo`           | Movimientos / conteo por ubicación-artículo (no tiene columna de fecha) |

### Notas sobre el modelo

- `conteo.ubicacion` guarda la ubicación completa como string `seccion-area-subzona` (ej. `50100-111-Z101`). En `SupabaseProvider` se mapean `item → articulo` y `cant → cantidad` para mantener la misma interfaz que `CsvProvider`.
- Las columnas `stat` usan un enum con valores `'Inicio'`, `'Proceso'`, `'Fin'`.
- La tabla `conteo` **no tiene timestamp**: `obtenerUltimosMovimientos` no ordena cronológicamente (ordena por `ubicacion, item`). Si se necesita orden real, habría que añadir `updated_at timestamp default now()`.
- `maestroArticulo.tipo` es un enum; si es `'SIC'`, la app avisa al escanearlo y deja continuar; si es genérico (`GEN`/`GENERICO`), lo rechaza indicando el motivo.

---

## Actualizaciones

La app tiene **dos mecanismos de actualización**:

### 1. Check manual vía GitHub Releases (`updateService.js` + `UpdateModal`)

`Main.js` consulta `https://api.github.com/repos/Joritzetxenike/escan/releases/latest` al arrancar **solo en builds desplegadas** (`EXPO_PUBLIC_APP_ENV=production`). Si el tag más reciente es mayor que la versión embebida (`Constants.expoConfig.version`), muestra el `UpdateModal` con enlace de descarga del APK (`apkUrl`). Si la petición falla, no muestra nada. En desarrollo (`expo start` / Expo Go) la comprobación no se ejecuta.

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
### Canales: `preview`, no `production`

**Las updates se publican en el canal `preview`.** El motivo es que el único
build que existe del proyecto es del perfil `preview` (distribución interna), y
un build solo recibe updates del canal al que está apuntado.

- Canal `preview` → rama `preview`: es donde está el APK de pruebas (`ecb3bdab`,
  runtimeVersion `1.0.4`). **Aquí se publican las updates.**
- Canal `production` → rama `production`: **no tiene ningún build detrás**. Los
  ocho últimos builds de Android son todos `preview` / internal. Además
  `build.production` genera `buildType: app-bundle`, que es el formato de Play
  Store y no se instala a mano.

Un update publicado en `production` **no llega al móvil** y no da ningún error:
EAS no se lo ofrece porque la rama no es la suya. Comprueba el canal antes de
publicar.

Comprobar qué se le serviría a un dispositivo concreto, sin depender del móvil:

```bash
curl -s --compressed "https://u.expo.dev/1f1976cd-945c-4e99-99cd-eebc96418b31"   -H "expo-platform: android"   -H "expo-runtime-version: 1.0.4"   -H "expo-channel-name: preview"   -H "accept: multipart/mixed"
```

Devuelve un manifiesto `multipart/mixed`; dentro, el campo `"id"` es el
`updateId` que la app se descargaría. Si ese id no cambia tras publicar, el
canal o el runtimeVersion no son los del dispositivo. Los `assets[].url` del CDN
responden `403` a `curl` porque van firmados para el cliente que pide el
manifiesto: eso es normal y no significa que la subida esté mal.

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

| Perfil        | Uso            | Channel     | BuildType    | `EXPO_PUBLIC_APP_ENV` | Supabase |
| ------------- | -------------- | ----------- | ------------ | -------------------- | -------- |
| `development` | Dev client     | development | —            | `development`        | —        |
| `preview`     | APK de prueba  | preview     | apk          | `production`         | sí       |
| `production`  | Play Store     | production  | app-bundle   | `production`         | sí       |

- Cada perfil fija la variable de entorno `EXPO_PUBLIC_APP_ENV` en `eas.json`, de modo que el check de actualizaciones de `Main.js` solo se activa en los builds desplegados (`preview`/`production`).

- `preview` y `production` fijan también `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_KEY`. **Son necesarias ahí**: el build ocurre en la nube de EAS, que no recibe el `.env` local. Sin ellas el bundle sale sin credenciales (ver más abajo).
- `cli.appVersionSource: "remote"` y `cli.requireCommit: true`.
- `preview` y `production` con `autoIncrement: true`.

### Tests — `tests.yml`

En cada push/PR a `master`: `npm ci` + `npm test` con las env vars de Supabase inyectadas desde secrets.

---

## Variables de entorno (`.env`)

```
EXPO_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<anon_key>
EXPO_PUBLIC_APP_ENV=development
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>   # solo para el script de import
```

- `.env` está en `.gitignore`; **no se sube al repo** (y por eso **tampoco llega al builder de EAS**).
- `EXPO_PUBLIC_APP_ENV` distingue el entorno:
  - `development` → desarrollo con Expo (Expo Go / dev server). El check de actualización de `Main.js` **no** se ejecuta.
  - `production` → app desplegada (APK/AAB). El check de actualización **sí** se ejecuta.
  - En `eas.json` cada perfil fija el valor (`development`/`preview`/`production`), por lo que los builds remotos llevan su valor correcto aunque `.env` no esté subido.
- `supabaseClient.js` **no lanza** al importarse si faltan las variables: exporta `configError` y `App.js` muestra un aviso. Antes sí lanzaba, y eso tumbaba el bundle entero antes de montar React (pantalla blanca sin logs).
- En CI se inyectan vía secrets del repo: `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_KEY`.
- `EXPO_PUBLIC_*` se embebe en el bundle en **build time**. En los builds remotos los valores salen de `eas.json` (`build.<perfil>.env`), no del `.env` local: la anon key es pública y la RLS protege los datos.
- `build-android.yml` abre el APK recién construido y comprueba que el host de Supabase esté dentro de `assets/index.android.bundle`. Si falta, el release no se crea.

---

## Pantalla blanca en release: causa y prevención

Pasó en la **1.0.5**. El APK se compila en la nube de EAS; como `.env` no se sube, el bundle embebido salió sin las variables de Supabase. `supabaseClient.js` pedía esas variables con un `throw` **en tiempo de import**, y como está en la cadena de arranque (`index.js → App.js → Main.js → … → DataProvider → SupabaseProvider → supabaseClient`), el bundle reventaba antes de que React montara nada. En release no hay caja de error roja ni log: solo el splash blanco, para siempre.

Con la 1.0.4 no se notó porque una OTA traía las credenciales y tapaba el bundle roto. Al instalar la 1.0.5, cuyo runtime no tenía OTA, el fallo quedó a la vista.

Prevención, en tres capas:

1. `eas.json` lleva las variables, así que el bundle remoto sale bien.
2. El paso **Verificar bundle del APK** en CI falla el release si el bundle no las trae.
3. `supabaseClient.js` no rompe el arranque y `ErrorBoundary` en `App.js` convierte cualquier fallo de render en un mensaje en pantalla.

---

## Scripts disponibles

```bash
npm start        # Iniciar Expo dev server
npm run ios      # Iniciar en iOS
npm run android  # Iniciar en Android
npm run web      # Iniciar en web
npm test         # Ejecutar tests con Jest
npm run import             # Import masivo desde excelQR.xlsx (o pasar ruta: npm run import -- ruta.xlsx)
npm run import -- --dry-run # Validar el Excel y ver resumen sin escribir
npm run import:template     # Generar plantilla_import.xlsx (hojas Datos QR y Articulos)
```

### Import masivo (Excel → Supabase)

`scripts/importExcel.js` importa **ubicaciones** y (opcionalmente) **catálogo de artículos** desde un `.xlsx`:

- **Detección por columnas** (no depende del nombre de hoja):
  - Ubicaciones: hoja con `SECCIÓN`, `ÁREA`, `SUBZONA` (+ `CÓDIGO` opcional que se valida con `seccion-area-subzona`).
  - Artículos: hoja con `ITEM`, `DSCA`, `TIPO` (`TIPO` opcional, p. ej. `SIC`).
- Inserta en **orden de FKs**: `maestroSeccion` → `maestroArea` → `maestroUbicacion` (con `stat: 'Inicio'`) y `maestroArticulo`.
- **Idempotente**: `upsert` con `ignoreDuplicates` — las filas ya existentes NO se tocan ni se resetea su `stat`.
- Usa `SUPABASE_SERVICE_ROLE_KEY` (omite RLS). Sin ella usa el anon key y puede fallar por políticas de RLS. La consigues en Supabase → Project Settings → API → `service_role` (es secreta, no compartir).
- La columna `tipo` es un enum Postgres: valores fuera del enum fallarán (habría que extenderlo vía SQL).
- `conteo` no se modifica.

### Publicar un update OTA de prueba

```bash
# 1. La versión de app.json debe coincidir con la del APK instalado,
#    porque de ella sale el runtimeVersion (política appVersion)
# 2. Working tree limpio (eas.json exige requireCommit)
# 3. Canal preview: es donde está el APK de pruebas
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

Cobertura actual: `authService`, `AuthContext`, `IdentificacionScreen`, `HeaderSesion`, `HeaderTabs`, `EstadoBanner`, `MaestrosBanner`, `ScannerService`, `InventoryService` (incl. `validarArticulo`, `eliminarMovimiento`, matrícula en CSV y el comportamiento offline), `pendientesService`, `syncService`, `conectividadService`, `updateService`, `supabaseClient`, `SupabaseProvider` (incl. árbol por niveles), `CsvProvider` (incl. `eliminarMovimiento` y lectura de matrícula), `ArticuloValidator`, `UbicacionValidator`, `useHomeLogic`, `useScannerLogic` y el comportamiento de `EstadoScreen` (carga por niveles, botón de recarga, artículos lazy).

---

## Notas técnicas

- `useScanner.js` (hooks/) es una versión alternativa del escáner a medio refactor; la activa es `ScannerLogic.js`. `useScanner.js` referencia métodos de `ScannerService` (`crearBuffer`, `procesarLectura`, `limpiarBufferCaducado`) que hoy no existen.
- `CsvProvider` implementa lectura/escritura/borrado de movimientos; los métodos del árbol de ubicaciones lanzan `No implementado`.
- `ApiProvider` es un stub.
- `ubicacionesMock.js` no se usa activamente.
- `domain/models/` y `domain/validators/` están vacíos (planificados).
- La clave de Supabase en `.env` es una **anon key** (pública), diseñada para usarse con Row Level Security.
- La petición del `UpdateModal` corre en un `useEffect` de `Main.js` solo cuando `EXPO_PUBLIC_APP_ENV === 'production'`, es decir, únicamente en la APK desplegada.
- Los servicios de conectividad son singletons a propósito (`conectividadService`, `pendientesService`, `syncService`): comparten estado entre Home, Lista y los `useEffect` de arranque, sin necesidad de un Context.
- `syncService` no llama a `conectividadService` (y viceversa el servicio de conectividad sí lo invoca): quien decide si la app pasa a "sin conexión" tras un drenado es `conectividadService`, en función del campo `redCaida` del resumen.
- Ojo con JavaScript al escribir servicios: `async nombreDeFuncion() {}` **no es válido** a nivel de sentencia (sí dentro de un objeto o una clase); hay que escribir `async function nombreDeFuncion() {}`.

