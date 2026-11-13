# Auditoría de seguridad, uso, escalabilidad y funcionamiento — `escan` (InventoryScanner)

**Fecha:** 13 nov 2026  
**Versión auditada:** 1.0.5 (Expo SDK 54 / React Native 0.81.5)  
**Ámbito:** App móvil (Expo), backend Supabase, panel web-admin, CI/CD (GitHub Actions / EAS).  
**Contexto de uso:** App privada para almacén. Todos los usuarios de la app pueden meter datos y modificar estados. El objetivo principal es el **guardado offline**; el web-admin es solo de visualización. La matrícula del operario sirve para saber quién registró cada movimiento, no para control de acceso estricto.

---

## 1. Resumen ejecutivo

Es una app de inventario para almacén con escaneo de códigos de barras, sincronización diferida offline (CSV local + cola de operaciones), copias locales del maestro (211.578 artículos + 199 ubicaciones), actualizaciones OTA y un panel web separado. El flujo principal funciona, pero hay **debilidades de seguridad menores** (dado el uso privado) y varios bugs funcionales y de arquitectura que deben corregirse antes de un despliegue estable. La prioridad real es el **guardado offline robusto** y la **traceabilidad de quién registró cada movimiento** (matrícula).

---

## 2. Seguridad — niveles y hallazgos (uso privado)

Dado que es una app privada y todos los usuarios pueden escribir, el nivel de exigencia de autenticación y RLS es bajo. No hace falta Supabase Auth complejo.

### Medio (higiene básica)

| # | Hallazgo | Riesgo | Dónde |
|---|----------|--------|-------|
| S1 | **Secretos en entorno local**: `.env` raíz expone `SUPABASE_SERVICE_ROLE_KEY` y anon key. `web-admin/.env.local` expone URL y anon key reales del panel. `eas.json` lleva URL y anon key en texto plano (commiteado). | Bajo para uso privado, pero `SUPABASE_SERVICE_ROLE_KEY` es innecesario en la app móvil y `eas.json` está versionado. | `.env`, `web-admin/.env.local`, `eas.json` |
| S2 | **Sin autenticación real**: `authService.validarMatricula()` acepta cualquier número no vacío. La matrícula vive solo en memoria y no se guarda en Supabase con el movimiento. | No se sabe con certeza quién registró cada movimiento en la base de datos. | `src/services/authService.js`, `src/context/AuthContext.js` |
| S3 | **RLS ausente/laxa**: las migraciones solo definen políticas para el rol `admin` del web-admin. No se ven políticas que limiten el anon key de la app móvil. | Si RLS no está habilitado, el anon key tiene acceso total. Aceptable para uso privado si la key no se filtra públicamente. | `supabase/migrations/` |
| S4 | **`finalizarUbicacion` sin control de permisos**: cualquier usuario de la app puede marcar una ubicación como `Fin`. | Aceptable en uso privado donde todos pueden modificar estados. | `src/providers/supabase/SupabaseProvider.js:87` |
| S5 | **Check de actualizaciones hacia GitHub sin token**: peticiones anónimas a `api.github.com`, sujetas a rate-limit (60 req/h). | El modal de actualización puede dejar de funcionar bajo uso frecuente. | `src/services/updateService.js` |

### Soluciones de seguridad (ajustadas a uso privado)

1. **Quitar `SUPABASE_SERVICE_ROLE_KEY` del `.env` local**: la app móvil solo necesita anon key. El service role solo para el script de import, vía secret de CI, nunca en el repo local.
2. **Guardar matrícula en cada movimiento**: añadir columna `matricula` (o `operario`) a `conteo` y persistirla al hacer `upsert`. Ya tenéis `authService.obtenerMatricula()` en memoria.
3. **RLS opcional/ligero**: si es uso privado y compartís la misma anon key, no hace falta RLS estricto por usuario. Si queréis higiene básica, habilitar RLS con políticas mínimas.
4. **Web-admin solo lectura**: confirmar que el panel web no tiene rutas de escritura crítica (solo consulta y cambio de estado de ubicación, que es aceptable).
5. **Token de GitHub para actualizaciones** (opcional): añadir `GITHUB_TOKEN` a `updateService.js` o mover el check a endpoint propio.

---

## 3. Uso / flujo funcional

La app cubre bien el ciclo de conteo de almacén:

1. **Identificación**: operario teclea matrícula (solo dígitos, sin validación contra BD).
2. **Home**: escanea ubicación (cámara o tecleo), valida contra maestro local; escanea artículos (multi-lectura: 3 lecturas en 1200 ms, filtro por marco de cámara); entrada manual con autocompletado.
3. **Cantidad**: si el artículo ya está contado, elige Sumar / Sobrescribir / Cancelar.
4. **Guarda**: `upsert` en `conteo` (ubicacion, item, cant) + actualiza `stat` a `Proceso` en ubicación/área/sección (4 peticiones).
5. **Lista / Estado**: ver CSVs locales, exportar, marcar ubicación como `Fin`, resumen de porcentajes por sección/área/ubicación.
6. **Offline**: todo se escribe primero en CSV local; si no hay red, va a `pending-operations.json` y se sincroniza al recuperar conexión (cola secuencial, idempotente por PK).
7. **Maestros offline**: copia local de 211k artículos y 199 ubicaciones; descarga bajo demanda del operario, refresco cada 24h.

**Uso previsto:** operarios de almacén con Android, conteo físico por códigos de barras, sincronización cuando hay red. Todos pueden escribir.

---

## 4. Escalabilidad

| Dimensión | Estado actual | Límite / Riesgo |
|-----------|---------------|-----------------|
| Catálogo de artículos | 211.578 filas en memoria como `Set` (~15 MB RAM), descarga de 3 MB en una RPC. | Funciona en un dispositivo; no escala a catálogos mucho mayores sin paginación ni filtrado. |
| Conteo por ubicación | Lectura sin paginación real (sin fecha, ordena por `ubicacion,item`). | Lentas con muchas filas por ubicación; no hay orden cronológico. |
| Cola offline | Procesamiento secuencial, una operación a la vez, reintentos bloquean toda la cola si cae la red. | Con cientos de operaciones pendientes, la sincronización es lenta y bloqueante. |
| Multi-dispositivo | No hay resolución de conflictos; `upsert` por PK evita duplicados pero no merge de cantidades. | Dos dispositivos contando la misma ubicación pueden sobrescribirse. |
| Backend | Supabase (PostgREST), 1.000 filas por respuesta REST; se evita con RPC para el maestro. | La RPC de maestro devuelve todo de golpe; sin paginación. |
| Web-admin | Paginación server-side (25 items), filtrado por sección/área/estado. | Bien para administración, pero sin pruebas de integración contra Supabase. |

**Soluciones de escalabilidad:** RPC transaccional para `guardarMovimiento`/`finalizarUbicacion` (una llamada en lugar de 4-5), columna `updated_at` en `conteo`, paginación en lecturas del móvil, índice en `conteo(item)`, estrategia de último-escrito-gana o merge de cantidades para conflictos, y procesamiento por lotes de la cola.

---

## 5. Posibles bugs / problemas de funcionamiento

| # | Problema | Impacto | Dónde |
|---|----------|---------|-------|
| B1 | `guardarMovimiento` hace 4 peticiones separadas no transaccionales: si la red cae a mitad, `conteo` queda guardado pero los `stat` no se actualizan. | Inconsistencia de datos (prioridad alta: afecta al núcleo offline). | `SupabaseProvider.js:307` |
| B2 | `console.log` de depuración en producción en `guardarMovimiento`. | Ruido en logs. | `SupabaseProvider.js:309-312` |
| B3 | `DataProvider.js` importa `ApiProvider` pero nunca lo usa. Código muerto. | Confusión de mantenimiento. | `src/providers/DataProvider.js` |
| B4 | `conteo` no tiene columna de fecha/hora → `obtenerUltimosMovimientos` ordena por `ubicacion,item`, no cronológicamente. | Los "últimos artículos" no son reales. | DDL + `SupabaseProvider.js:434` |
| B5 | `matrícula` no se guarda en Supabase con el movimiento. Solo vive en CSV local. | No se sabe quién registró cada movimiento en BD. | `InventoryService.js`, `SupabaseProvider.js` |
| B6 | `maestrosService.descargar()` escribe ubicaciones en disco antes de los artículos; si falla la descarga de artículos, quedan ubicaciones sin el maestro de artículos. | Estado inconsistente entre ficheros de maestro. | `maestrosService.js:356-440` |
| B7 | `pendientesService.vaciar()` escribe `[]` sin el campo `version`. | Menor; puede romper parseo estricto futuro. | `pendientesService.js:309` |
| B8 | Detección de conexión mediante sonda a Supabase: si Supabase está caído pero hay internet, la app se cree offline y encola todo. | Sincronización innecesaria en cola. | `conectividadService.js` |
| B9 | El escáner filtra por marco (`frameRect`) pero falta verificar en dispositivo que las coordenadas de `bounds` coincidan con el overlay en iOS/Android/web. | Lecturas rechazadas o aceptadas erróneamente. | `ScannerView.js`, `ScannerLogic.js` |
| B10 | `useScanner.js` (hooks/) es código muerto/medio refactor que referencia métodos inexistentes. | Confusión; posible import accidental. | `src/hooks/useScanner.js` |
| B11 | No hay perfil de pre-lanzamiento (`develop`); los builds salen directamente de tags sobre `master`. | Riesgo de releases rotas (pantalla blanca sin Supabase). | `eas.json`, `build-android.yml`, TODO.md |

**Soluciones funcionales (orden de prioridad):**
1. RPC transaccional para `guardarMovimiento` y `finalizarUbicacion` (una llamada, todo o nada).
2. Añadir `matricula` a `conteo` y persistirla en cada `upsert`.
3. Añadir `updated_at` a `conteo` y ordenar por fecha real.
4. Descarga atómica de maestros (escribir todo o nada).
5. Quitar `console.log` y código muerto (`ApiProvider`, `useScanner.js`).
6. Corregir `pendientesService.vaciar()`.
7. Crear rama `develop` + perfil `development-apk` (ya en TODO.md).

---

## 6. Estructura de proyecto

```
escan/                      # App móvil (Expo)
├── App.js, Main.js, index.js
├── app.json, eas.json, .env (gitignored)
├── src/
│   ├── context/            # AuthContext (matrícula en memoria)
│   ├── screens/            # 5 pantallas (Identificacion, Home, Lista, Estado, Scanner)
│   ├── views/              # Vistas presentacionales
│   ├── logic/              # Hooks de negocio (useIdentificacionLogic, useHomeLogic, useScannerLogic, useConectividad)
│   ├── hooks/              # useScanner.js (código muerto/medio refactor)
│   ├── components/         # Componentes UI + ErrorBoundary + UpdateModal
│   ├── navigation/         # RootNavigator (stack), MainTabs
│   ├── services/           # authService, InventoryService, ScannerService, syncService, conectividadService, pendientesService, maestrosService, updateService, ubicacionesService, ubicacionActivaService
│   ├── providers/          # DataSource (supabase activo), DataProvider, SupabaseProvider, CsvProvider (parcial), ApiProvider (stub)
│   ├── validators/         # ArticuloValidator, UbicacionValidator (contra copia local)
│   ├── constants/          # scannerConstants (3 lecturas, 1200 ms)
│   ├── helpers/            # archivoHelper, csvHelper, estadosResumenHelper, redHelper
│   ├── styles/             # styles.js
│   ├── data/               # ubicacionesMock.js (no usado)
│   └── domain/models, domain/validators (vacíos, planificados)
├── supabase/migrations/    # 3 migraciones (web_admin, maestro_snapshot, maestro_genericos)
├── scripts/                # importExcel.js
├── __tests__/              # Jest + jest-expo (services, providers, logic, screens, validators, context)
├── web-admin/              # Panel web (React + Vite, solo lectura y cambio de estado de ubicación)
├── package.json, jest.config.js, babel.config.js
└── README.md, TODO.md
```

**Puntos a favor:** separación clara capas (UI → lógica → servicios → proveedores), patrón provider intercambiable, offline-first bien diseñado, tests automatizados, CI/CD con verificación de bundle.

**Debilidades estructurales:** `domain/` vacío, `ApiProvider` stub sin usar, `useScanner.js` duplicado/roto, credenciales en `eas.json`, falta de rama de pre-lanzamiento, tipado ausente (todo JS, no TypeScript).

---

## 7. Plan de remediación (prioridades ajustadas a uso privado)

### Fase 1 — Offline y traceabilidad (prioridad máxima)

1. **RPC transaccional para movimientos y finalización.**
   - Crear `guardar_movimiento` y `finalizar_ubicacion` en Postgres (una llamada, todo o nada).
   - Recordar tablas entrecomilladas (`"maestroArticulo"`, `"maestroUbicacion"`, `"conteo"`) y castear enums con `::text`.
   - Archivos: `supabase/migrations/YYYYMMDD_rpc_movimientos.sql`, `SupabaseProvider.js`.

2. **Guardar matrícula en cada movimiento.**
   - Añadir columna `matricula` a `conteo` y persistirla al hacer `upsert` desde `authService.obtenerMatricula()`.
   - Archivos: migración SQL, `InventoryService.js`, `SupabaseProvider.js`, `CsvProvider.js` (ya guarda matricula en CSV).

3. **Columna `updated_at` en `conteo`.**
   - Añadir `updated_at timestamp default now()` y ordenar `obtenerUltimosMovimientos` por fecha real.
   - Archivos: migración SQL, `SupabaseProvider.js:434`.

### Fase 2 — Estabilidad de datos

4. **Descarga atómica de maestros.**
   - Escribir todos los ficheros de maestro o ninguno; evitar inconsistencias si falla la descarga de artículos.
   - Archivo: `src/services/maestrosService.js`.

5. **Eliminar `console.log` de producción y código muerto.**
   - Quitar logs de `guardarMovimiento`.
   - Eliminar `ApiProvider` o implementarlo; borrar `useScanner.js`.
   - Archivos: `SupabaseProvider.js:309-312`, `src/providers/DataProvider.js`, `src/hooks/useScanner.js`.

6. **Corregir `pendientesService.vaciar()`.**
   - Escribir `{ version: 1, operaciones: [] }` en lugar de `[]`.
   - Archivo: `src/services/pendientesService.js:309`.

### Fase 3 — Seguridad básica (higiene, uso privado)

7. **Quitar `SUPABASE_SERVICE_ROLE_KEY` del `.env` local.**
   - Solo anon key en la app móvil. Service role solo en CI para el script de import.
   - Archivo: `.env`, `eas.json` (usar `eas secret` en lugar de texto plano).

8. **RLS opcional/ligero.**
   - Si se desea, habilitar RLS con políticas mínimas. No es bloqueante para uso privado.
   - Archivo: nueva migración SQL.

9. **Token de GitHub para actualizaciones** (opcional).
   - Archivo: `src/services/updateService.js`.

### Fase 4 — Despliegue y escalabilidad

10. **Rama `develop` + perfil `development-apk`.**
    - Perfil con `distribution: internal`, `channel: develop`, `EXPO_PUBLIC_APP_ENV: development`, credenciales vía `eas secret`.
    - Workflow `.github/workflows/build-android-develop.yml`.
    - Extraer verificación de bundle a `scripts/verificar-bundle-apk.sh`.
    - Archivos: `eas.json`, `.github/workflows/build-android-develop.yml`, `scripts/verificar-bundle-apk.sh`, `tests.yml`.

11. **Paginación e índices en lecturas del móvil.**
    - Índice en `conteo(item)`; paginación en `obtenerArticulosUbicacion`.
    - Archivos: migración SQL, `SupabaseProvider.js`.

12. **Procesamiento por lotes de la cola offline + estrategia de conflictos.**
    - Enviar operaciones en lotes; último-escrito-gana o merge de cantidades por `(ubicacion, item)`.
    - Archivos: `syncService.js`, `SupabaseProvider.js`, `InventoryService.js`.

13. **Migrar a TypeScript** (opcional, a medio plazo).

---

## 8. Comandos de verificación recomendados

```bash
# Ejecutar tests de la app móvil
npm test

# Ejecutar tests del panel web
cd web-admin && npm test

# Build del panel web
cd web-admin && npm run build

# Verificar configuración de Expo
npx expo doctor
```

---

## 9. Archivos de referencia clave

| Archivo | Rol en la auditoría |
|---------|---------------------|
| `src/services/authService.js` | Matrícula en memoria (falta persistir en Supabase) |
| `src/context/AuthContext.js` | Contexto de sesión |
| `src/providers/supabase/SupabaseProvider.js` | `guardarMovimiento` no transaccional (B1), `finalizarUbicacion` (S4), `console.log` (B2), falta `matricula` (B5) |
| `src/providers/DataProvider.js` | Import inútil de `ApiProvider` (B3) |
| `src/services/maestrosService.js` | Descarga no atómica de maestros (B6) |
| `src/services/pendientesService.js` | `vaciar()` sin `version` (B7) |
| `src/services/conectividadService.js` | Sonda a Supabase como detección de red (B8) |
| `src/services/updateService.js` | Check a GitHub sin token (S5) |
| `src/hooks/useScanner.js` | Código muerto (B10) |
| `supabase/migrations/` | Migraciones SQL, falta `matricula` en `conteo`, falta `updated_at` |
| `web-admin/.env.local` | Credenciales expuestas (S1) |
| `eas.json` | Credenciales en texto plano (S1) |
| `.env` | `SUPABASE_SERVICE_ROLE_KEY` innecesario en app móvil (S1) |
