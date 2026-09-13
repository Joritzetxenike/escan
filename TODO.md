# TODO

> Lista de tareas pendientes del proyecto. Sobrevive entre sesiones (este fichero se versiona en el repo).

## Pendientes

- [ ] **Renombrar app (opción 1)**: cambiar `expo.name` en `app.json` al nuevo nombre, sin tocar `android.package` (`conteo.koxka`), `extra.eas.projectId`, `updates.url` ni `GITHUB_REPO` de `updateService.js`. Requiere un `eas build` nuevo (el nombre se incrusta en el APK en build time; un OTA no lo cambia en el launcher). Preparar tag `v1.0.5` para el build.
  - Prioridad: baja.

- [x] **Import masivo de `maestroArticulo`** (HECHO): 211.578 artículos importados (0→211.578) desde `maestro_articulos.xlsx` con la hoja `articulos_escan` (item=col1, filtrar `Fantasma==2`, `tipo` solo MRP/SIC, `dsca='-'`). 67.438 filas descartadas por filtro. `maestro_articulos.xlsx` añadido a `.gitignore`.

- [ ] **Descripción de artículos (`dsca`)**: decidir qué hacer con la descripción más adelante. Hoy se importa con `'-'` como placeholder (luego quizás se borre/rellene).
  - Prioridad: baja.

- [ ] **Filtrar más los artículos** (NOTA para el usuario al crear el Excel): refinar los filtros del maestro de artículos antes del import (fantasma, método, posibles exclusores de ítems, etc.).
  - Prioridad: media.

## Optimización de peticiones (NO por ahora)

> Reducir round-trips a Supabase para agilizar operaciones y evitar rate-limit.

- [ ] **Agrupar operaciones en RPC de Postgres**: `guardarMovimiento` hoy hace 4 peticiones (upsert en `conteo` + update `maestroUbicacion`/`maestroArea`/`maestroSeccion`) y `finalizarUbicacion` hasta 5. Se podrían implementar funciones SQL (`guardar_movimiento`, `finalizar_ubicacion`) y llamarlas con `.rpc()` en una única transacción.
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