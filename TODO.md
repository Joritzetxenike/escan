# TODO

> Lista de tareas pendientes del proyecto. Sobrevive entre sesiones (este fichero se versiona en el repo).

## Pendientes

- [x] **Renombrar app (opción 1) — HECHO**: la app pasa de `escan` a **`InventoryScanner`**. Solo se cambió `expo.name` en `app.json`, tal y como estaba previsto: sin tocar `android.package` (`conteo.koxka`), `expo.slug` (`escan`, que es la identidad del proyecto en EAS), `extra.eas.projectId`, `updates.url` ni `GITHUB_REPO` de `updateService.js`. El nombre se escribe en el launcher del móvil, así que **no se pudo hacer con un OTA**: hizo falta el build de `v1.0.5`. También se renombraron el APK y el título del release en `.github/workflows/build-android.yml`.
  - Recordatorio: al haber subido a `1.0.5`, las updates de runtime `1.0.4` quedan *stranded*. A partir de ahora las `eas update` van a `1.0.5`.
  - Prioridad: cerrada.

- [x] **Import masivo de `maestroArticulo`** (HECHO): 211.578 artículos importados (0→211.578) desde `maestro_articulos.xlsx` con la hoja `articulos_escan` (item=col1, filtrar `Fantasma==2`, `tipo` solo MRP/SIC, `dsca='-'`). 67.438 filas descartadas por filtro. `maestro_articulos.xlsx` añadido a `.gitignore`.

- [ ] **Descripción de artículos (`dsca`)**: decidir qué hacer con la descripción más adelante. Hoy se importa con `'-'` como placeholder (luego quizás se borre/rellene).
  - Prioridad: baja.

- [ ] **Filtrar más los artículos** (NOTA para el usuario al crear el Excel): refinar los filtros del maestro de artículos antes del import (fantasma, método, posibles exclusores de ítems, etc.).
  - Prioridad: media.

- [x] **Hacer real el recuadro del escáner** (HECHO): el marco era decorativo y el decoder de `CameraView` procesaba toda la imagen (`src/views/ScannerView.js`). Se implementó el **filtro por posición** (sin dependencias nuevas, sigue funcionando en Expo Go):
  - El marco mide su posición con `onLayout` (`testID="scan-frame"`) y el hook la guarda (`state.frameRect` / `actions.onFrameLayout` en `src/logic/ScannerLogic.js`).
  - `handleBarcodeScanned` descarta en silencio (sin alerta, sin tocar el buffer) los códigos cuyo centro de `bounds` cae fuera del marco, con `TOLERANCIA_MARCO = 32` px (`src/constants/scannerConstants.js`). El filtro va antes de las validaciones.
  - Fallbacks a favor del usuario: sin `frameRect` medido (primeros eventos) o sin `bounds`/rect vacío (puede devolverlos expo-camera) → se acepta.
  - Tests en `__tests__/logic/ScannerLogic.test.js` (bloque "filtro del marco") y `__tests__/views/ScannerView.test.js` (bloque "marco").
  - **Pendiente manual**: verificar en dispositivo que el espacio de coordenadas de `bounds` coincide con el overlay (iOS/Android/web).
  - Prioridad: media.

- [ ] **Unificar las constantes del escáner**: hay dos copias de los parámetros de lectura que se mantienen a mano y pueden divergir.
  - Reales (en uso): `LECTURAS_NECESARIAS = 7` y `TIMEOUT = 1200` en `src/services/ScannerService.js:1-2`, y el `6` hardcodeado en `esCodigoValido` (línea 10).
  - Fantasma: `src/constants/scannerConstants.js` — `REQUIRED_READS`, `BUFFER_TIMEOUT` y `MIN_CODE_LENGTH` **no las importa nadie**; `RESET_INTERVAL` solo la usa `src/hooks/useScanner.js` (código muerto).
  - Hacer que `ScannerService` importe de `scannerConstants` y borrar las locales; `ScannerLogic.js:140` debería usar `RESET_INTERVAL` en vez del `500` inline.
  - Arreglar el test `__tests__/services/ScannerService.test.js:105` ("después de 10 lecturas" cuando el valor es 7) usando `REQUIRED_READS`.
  - Decidir si se borra `src/hooks/useScanner.js`.
  - Prioridad: baja.

## Visualización de datos vía web

- [x] **Crear un panel web administrativo separado**: iniciar una aplicación React + Vite, responsive y sin módulos nativos de la app móvil.
  - Reutilizar el cliente Supabase y los mappings existentes.
  - Prioridad: alta.

- [ ] **Configurar autenticación de administradores**:
  - Inicio de sesión mediante Supabase Auth.
  - Identificar administradores mediante un rol de backend.
  - Proteger consultas y cambios con RLS; nunca incluir `service_role` en el panel.
  - Prioridad: alta.

- [x] **Crear consultas de consulta y resumen**:
  - Obtener totales y porcentajes de ubicaciones en `Inicio`, `Proceso` y `Fin`.
  - Permitir buscar y filtrar por sección, área, ubicación y estado.
  - Reutilizar la lógica de `obtenerEstadoUbicaciones()` y `resumirEstados()`.
  - Prioridad: alta.

- [x] **Permitir consultar los artículos contados**:
  - Navegar desde el resumen hasta sección → área → ubicación.
  - Mostrar código, descripción, tipo y cantidad de cada artículo contado.
  - Reutilizar `obtenerArticulosUbicacion()` con paginación.
  - Prioridad: alta.

- [x] **Permitir cambiar el estado de una ubicación**:
  - Seleccionar `Inicio`, `Proceso` o `Fin`.
  - Pedir confirmación y actualizar la pantalla después del cambio.
  - Prioridad: alta.

- [x] **Propagar automáticamente los estados**:
  - Crear una RPC transaccional para actualizar la ubicación, área y sección.
  - Área `Fin` cuando todas sus ubicaciones estén `Fin`.
  - Área `Inicio` cuando todas estén `Inicio`; en cualquier mezcla, `Proceso`.
  - Aplicar la misma regla a las áreas para calcular la sección.
  - Si falla alguna actualización, no debe quedar ninguna modificación parcial.
  - La RPC y la serialización por sección están implementadas; falta aplicar y verificar contra Supabase.
  - Prioridad: alta.

- [ ] **Gestionar errores y permisos**:
  - Mostrar estados de carga, vacío y error.
  - Impedir modificaciones no autorizadas o sobre ubicaciones inexistentes.
  - Informar claramente cuando otro administrador ya haya realizado el cambio.
  - Prioridad: media.

- [ ] **Añadir pruebas**:
  - Resumen y filtros.
  - Navegación hasta los artículos contados.
  - Cambio de estado y propagación a área/sección.
  - RLS, autenticación, errores y reversión de la transacción.
  - Las pruebas unitarias web están creadas; las pruebas de integración Supabase siguen pendientes.
  - Prioridad: media.

- [ ] **Preparar despliegue web**:
  - Build de producción, variables públicas de Supabase y despliegue del panel.
  - Integrar el build y las pruebas en CI/CD.
  - Documentar uso, configuración y seguridad en `README.md`.
  - Prioridad: media.

## Conectividad: CSV local y sincronización diferida

> Entregado en dos fases. La **fase 1** (vertical) está hecha: detección de
> conexión por sonda a Supabase, cola de pendientes en
> `pending-operations.json` y sincronización diferida al recuperar la conexión.
> La copia local de los maestros también está hecha; de la **fase 2** solo queda
> la RPC transaccional de movimientos.
>
> Decisión tomada: la entrada a mano (`+` de Home) **también funciona sin
> conexión**. Estaba bloqueada porque el código solo se podía validar contra el
> maestro, que está en la red; con la copia local el bloqueo ya no tenía
> sentido, así que se levantó tanto para artículos como para ubicaciones.

- [x] **P0. Hacer que el CSV sea la fuente local de movimientos**:
  - El CSV se escribe antes de cualquier operación con Supabase.
  - Mantiene el formato actual de tres columnas para no romper la exportación.
  - Se actualiza al guardar, editar o eliminar un artículo.
  - Sin conexión, los artículos de una ubicación se leen del CSV.
  - Pendiente: leer también el CSV en la pestaña Lista cuando la red falla.
  - Prioridad: alta.

- [x] **P0. Mantener los dos maestros locales**:
  - Copia local en `maestro-articulos.json`, `maestro-ubicaciones.json` y
    `maestros-meta.json` (`src/services/maestrosService.js`), aparte del CSV.
  - Solo guarda códigos, no descripciones: 211.578 artículos en ~3 MB.
  - El maestro de artículos se baja con la RPC `descargar_maestro_articulos()`
    (en `supabase/migrations/20261004_maestro_snapshot.sql`) porque PostgREST
    limita a 1.000 filas por respuesta.
- La validación es local y estricta: un código que no está en la copia se
    rechaza. Las operaciones `provisional` de versiones anteriores se siguen
    validando contra Supabase al sincronizar.
  - Validar ubicaciones **exige** su copia, sin excepción: antes se aceptaba
    cualquier código con formato correcto cuando el fichero faltaba, lo que con
    la entrada manual abierta habría dejado pasar ubicaciones inventadas.
    `descargarUbicaciones()` recupera ese fichero solo (199 filas) si se pierde,
    sin obligar a bajar los 3 MB del maestro de artículos.
  - La copia no se refresca sola: a los 24 h avisa y el operario decide; puede
    aplazarlo 12 h. La franja sale siempre, con la copia al día incluida, para
    que el botón `Actualizar` esté disponible en cualquier momento.
  - **Pendiente**: aplicar la migración en Supabase antes de desplegar la app.
    _Aplicada y verificada: la RPC devuelve 211.578 códigos y 1.669 SIC._

- [x] **P0. Entrada manual de ubicación y artículos sin conexión**:
  - Botón `+` junto a "Escanear ubicación" y junto a "Escanear artículo", ambos
    operativos sin red (`src/logic/HomeLogic.js`).
  - El `+` de artículos sigue exigiendo ubicación previa; el de ubicaciones no,
    porque lo que se introduce es precisamente la ubicación.
  - Los códigos de ubicación se normalizan a mayúsculas y sin espacios antes de
    validar. No se hace en artículos, cuyos códigos distinguen mayúsculas y
    minúsculas (`-BXC05.4010 -SUB`).
  - El modal de ubicación se queda abierto si el código no es válido, para no
    obligar a volver a pulsarlo.
  - Los códigos reales son `SECCION-AREA-SUBZONA` en mayúsculas (18 secciones,
    áreas `A00`-`A14`, subzonas de 3 caracteres), p. ej. `LIN2-A01-Z01`.

- [x] **P0. Crear la cola de operaciones pendientes**:
  - `pending-operations.json` registra guardados, ediciones, borrados y
    finalizaciones (`src/services/pendientesService.js`).
  - Incluye `operation_id`, tipo, ubicación, artículo, valor, `created_at`,
    `intentos` y `ultimo_error`.
  - El CSV se mantiene actualizado aunque Supabase no esté disponible.
  - Prioridad: alta.

- [x] **P0. Sincronizar únicamente lo pendiente**:
  - `src/services/syncService.js` envía solo lo que hay en la cola.
  - Se intenta al iniciar, al recuperar conexión, al volver a primer plano
    (`AppState`) y con el botón ↻ del banner.
  - Una operación sale de la cola solo tras la confirmación del servidor.
  - Se reutiliza el mismo `operation_id` en los reintentos; además el `upsert`
    de `conteo` es idempotente por PK `(ubicacion,item)`, así que no hay
    duplicados ni hace falta deduplicar en servidor.
  - Respeta el orden de las operaciones de cada ubicación.
  - Prioridad: alta.

- [x] **P0. Validar códigos provisionales**:
  - Sin conexión, un código que no se pudo comprobar se acepta con
    `provisional: true` (o `ubicacion_provisional`).
  - Al sincronizar se valida contra `maestroArticulo` / `maestroUbicacion`.
  - Si no existe, la operación se conserva con su error y se bloquea el resto
    de esa ubicación; nunca se elimina en silencio.
  - **Hoy es una red de seguridad heredada**: nada nuevo se marca provisional
    porque todo se valida contra la copia local. El mecanismo se conserva para
    las operaciones ya encoladas.
  - Prioridad: alta.

- [ ] **P0. Hacer segura la sincronización con Supabase** (fase 2):
  - Usar una RPC transaccional para aplicar cada operación pendiente.
  - Actualizar conteo y estados sin dejar cambios parciales. Hoy
    `guardarMovimiento` son 4 peticiones: si la red se cae a mitad, el `conteo`
    puede quedar guardado y los `stat` no. El reintento lo converge.
  - Si varios dispositivos escanean ubicaciones distintas, no añadir
    resolución manual de conflictos.
  - Prioridad: alta.

- [x] **P1. Mostrar el estado de sincronización**:
  - `EstadoBanner` (Home y Lista), una sola franja para conexión y maestro:
    `Sin conexión · N cambios pendientes`,
    `Sincronizando…`, `Error al sincronizar: …` y `Sincronizado · HH:MM`.
  - Botones `Reintentar` (cola) y `Actualizar` (maestro), y hora de la última
    sincronización. Antes eran dos banners apilados; ahora gana el problema más
    urgente según la prioridad de la tabla del `README.md`.
  - Un fallo de red nunca muestra la operación como guardada en Supabase: la
    UI recibe `{ pendiente: true }` y marca el artículo como `(pendiente)`.
  - Prioridad: media.

- [x] **P1. Adaptar exportación y borrado**:
  - El CSV sigue siendo la exportación local.
  - La cola vive en un `.json`, así que borrar o compartir un CSV no la toca.
  - Prioridad: media.

- [ ] **P0. Añadir pruebas de conectividad**:
  - [x] Unitarias: cola, orden, coalescencia, reintentos, códigos
    provisionales, validación y entrada manual sin conexión
    (`__tests__/services/{pendientesService,syncService,conectividadService,InventoryService,maestrosService}.test.js`).
  - [ ] Manuales en dispositivo: escanear y guardar sin conexión, reiniciar la
    app y comprobar que el CSV y la cola persisten, recuperar conexión y
    verificar que no hay duplicados, meter ubicación y artículo a mano sin
    conexión (incluido teclearla en minúsculas), y comprobar que el modal se
    queda abierto con un código inválido.
  - Prioridad: alta.

## Distribución de la app

- [ ] **P0. Rama `develop` con APK de prueba propia**: hoy **no hay forma de
  probar una APK real antes de publicarla**. Los builds salen de tags `v*` sobre
  `master`, así que la primera prueba de un cambio es la release que llega a los
  usuarios. Pasó el 2026-10-05: la `1.0.5` salió con el bundle sin configuración
  de Supabase y arrancaba en pantalla blanca.
  - Crear la rama `develop`. `master` + tag `v*` siguen siendo la ruta de
    release, sin cambios.
  - Nuevo perfil `development-apk` en `eas.json`: `distribution: internal`,
    `android.buildType: apk`, `channel: develop`,
    `appVersionSource: local` **sin** `autoIncrement` (para que los builds de
    prueba no roben la versión remota que usan las releases) y
    `EXPO_PUBLIC_APP_ENV: development` para que no salga el modal de
    actualización (`ES_DESPLIEGUE` en `Main.js`).
  - **Ese perfil tiene que llevar `EXPO_PUBLIC_SUPABASE_URL` y
    `EXPO_PUBLIC_SUPABASE_KEY`**: es justo lo que faltó en la `1.0.5`. El build
    ocurre en la nube de EAS, que no recibe el `.env` local; sin ellas el bundle
    sale sin credenciales y la app no arranca. Las variables ya están en
    `build.preview.env` y `build.production.env`, así que se pueden copiar.
  - Workflow `.github/workflows/build-android-develop.yml`: push a `develop` →
    `npm ci` → `npm test` → `eas build --profile development-apk` →
    verificación del bundle → **artifact** de Actions. Sin tag, sin GitHub
    Release y sin tocar la versión remota.
  - Extraer la verificación del bundle del `build-android.yml` (ahora está
    inline) a `scripts/verificar-bundle-apk.sh` y llamarla desde los dos
    workflows: es el candado que ya evitó publicar otra APK rota.
  - `tests.yml`: añadir `develop` a los `branches` de `push` y `pull_request`.
  - La APK de prueba necesita `version: 1.0.5-dev.<run_number>` y un
    `android.versionCode` siempre creciente (`900000 + run_number`): Android no
    reinstala un APK cuyo `versionCode` no sea mayor que el del ya instalado.
  - **Ojo con la firma**: un perfil nuevo de EAS genera su propia clave, así que
    la APK de `development-apk` **no se podrá instalar encima** de la de
    `preview` (mismo `android.package`, `conteo.koxka`) y habrá que desinstalar
    la anterior. Verificarlo. Si molesta, la alternativa es reutilizar el perfil
    `preview` (comparte firma, pero entonces los builds de prueba comparten
    clave y versión con las releases y sus updates se mezclan en el canal
    `preview`).
  - **No cambiar `android.package` solo en `develop`**: la divergencia acabaría
    en un merge a `master` y renombraría la app de los usuarios.
  - Prioridad: alta.

- [ ] **Revisar el perfil `development` de `eas.json`**: declara
  `developmentClient: true` pero **`expo-dev-client` no está instalado**
  (SDK 54), así que tal como está no se puede usar. Además no lleva las
  variables de Supabase, que es el escenario exacto que rompió la `1.0.5`.
  Decidir entre instalarlo (dev client + Metro, obliga a tener el PC con
  `npm start` encendido para usar la app) o borrar el perfil y quedarse solo con
  `development-apk`.
  - Prioridad: media.

- [ ] **P1. Build de producción**: hoy **no existe ningún build del perfil
  `production`**; los ocho últimos de Android son `preview` / internal, así que
  el canal `production` no tiene a nadie detrás y las updates se publican solo en
  `preview`. Para dar una app instalable fuera del círculo de pruebas hace falta
  decidir entre Play Store (`build.production`, que ya genera `app-bundle`) o un
  perfil nuevo con `buildType: apk` para distribución por APK.
  - Mientras tanto, **publicar siempre en `preview`**: una update en `production`
    no llega al móvil y no da error, porque EAS no se la ofrece.
  - Ojo al subir la versión de `app.json`: con `runtimeVersion: appVersion` cada
    cambio de versión deja stranded las updates viejas para los builds nuevos.
  - Ver la sección «Canales» del `README.md`.

## Optimización de peticiones (NO por ahora)

> Reducir round-trips a Supabase para agilizar operaciones y evitar rate-limit.

- [ ] **Agrupar operaciones en RPC de Postgres**: `guardarMovimiento` hoy hace 4 peticiones (upsert en `conteo` + update `maestroUbicacion`/`maestroArea`/`maestroSeccion`) y `finalizarUbicacion` hasta 5. Se podrían implementar funciones SQL (`guardar_movimiento`, `finalizar_ubicacion`) y llamarlas con `.rpc()` en una única transacción.
  - **Las cinco tablas tienen nombre sensible a mayúsculas** (`"maestroArticulo"`, `"maestroUbicacion"`, `"conteo`, ...). En SQL hay que escribirlas entrecomilladas y cualificadas, o falla con `relation "maestroarticulo" does not exist`. Ver el aviso en el bloque DDL del `README.md`.
  - Recordar también que los enums (`tipo`, `stat`) necesitan `::text` para poder compararlos o aplicarles `upper()`.
  - Prioridad: media.

- [ ] **Optimizar/quitar selects redundantes**: revisar selects anidados y paginación de `obtenerUltimosMovimientos`; valorar caché local + cola offline (AsyncStorage con batcheo) para no disparar 1 request por escaneo.
  - Impacto principal en `SupabaseProvider.js` y sus tests.
  - Prioridad: media.

## Optimización de BD (NO hacer por ahora)

> Sustituir `conteo.ubicacion` (varchar `seccion-area-subzona`) por FKs reales para reducir tamaño y mejorar integridad. Cambiaría bastante backend + app + migración de datos.

- [ ] **Esquema SQL**:
  - **Opción A (recomendada, menos invasiva)**: FK real en `conteo` hacia `maestroUbicacion` con la PK compuesta ya existente `(seccion, area, subzona)`, con `ON UPDATE/DELETE` adecuados. Añadir índice en `conteo(item)`.
  - **Opción B**: PK numéricas (`identity`) en `maestroSeccion` / `maestroArea` / `maestroUbicacion` + FK en `conteo`. Ahorra más espacio pero implica reescribir más queries e índices.
  - En ambas: backfill en transacción (INSERT..SELECT mapeado), añadir constraints, revisar RLS (políticas por FK) y valorar columna `updated_at` en `conteo` para orden real. Migración con downtime breve; coordinar OTA + build para instalaciones existentes.
  - Prioridad: baja.

- [ ] **SupabaseProvider.js**: reescribir todas las queries (`guardarMovimiento`, `actualizarMovimiento`, `eliminarMovimiento`, `obtenerArticulosUbicacion`, `obtenerUltimosMovimientos`, `finalizarUbicacion`, `obtenerUbicacionesArea`, `obtenerEstadoUbicaciones`) para usar las FK/ids y mapear `id ↔ string seccion-area-subzona` (`buildUbicacionId`/`parseUbicacionId`), manteniendo intacto el contrato de salida para no propagar cambios.
  - Prioridad: baja.

- [ ] **Capa offline/servicios**: comprobar que `csvProvider.js`, `InventoryService.js` (respaldo CSV local), `csvHelper.js` y `ListaScreen.js` sigan usando el string `seccion-area-subzona` como clave de archivo. El mapeo `id↔string` debe quedar encapsulado en el provider de datos para que el respaldo CSV y el borrado/sync no dependan del nuevo id. Revisar `UbicacionValidator.js` (formato) y `HomeLogic.js` (estado de sesión).
  - Prioridad: baja.

- [ ] **Scripts y tests**: adaptar `scripts/importExcel.js` para insertar/mapear ids (o mantener la composición string si la FK usa la PK compuesta), actualizar los `__tests__` que mockean el provider (fixtures, queries anidadas de `obtenerEstadoUbicaciones`) y documentar en README el nuevo esquema + nota de migración para instalaciones existentes.
  - Prioridad: baja.