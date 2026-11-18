# Auditoría completa — InventoryScanner (`escan`)

**Fecha:** 17 nov 2026
**Commit auditado:** `ceeaa23` (rama `master`, árbol limpio)
**Ámbito:** app móvil (Expo SDK 54), migraciones de Supabase, panel `web-admin`, scripts de importación y CI/CD (GitHub Actions + EAS).
**Contexto:** `README.md`, `TODO.md` y la auditoría anterior (`AUDITORIA.md`, que se conserva sin cambios).
**Método:** lectura del código fuente, ejecución de los tests (sin modificar nada) y comprobación de que las afirmaciones del README, el TODO y `AUDITORIA.md` se corresponden con el código actual.

> Cada hallazgo sigue el mismo formato: **qué pasa**, **por qué importa** (el motivo), **escenario concreto** y **qué hacer**. Las severidades tienen en cuenta que la app es de uso interno y que su prioridad es el **guardado offline fiable** y la **trazabilidad por matrícula**.

---

## 0. Resumen ejecutivo

La arquitectura es buena: las capas están bien separadas, el CSV local se escribe antes de cualquier operación de red, hay una cola de pendientes, una copia local de los maestros y un CI que comprueba el bundle. Desde `AUDITORIA.md` (13 nov) se han corregido varias cosas (RPC transaccional, `matricula` y `updated_at` en `conteo`, descarga de maestros validada antes de escribir, borrado de `useScanner.js`).

Pero la revisión del código actual encuentra **problemas que hay que resolver antes de la próxima build u OTA**:

1. **`src/data/operarios.json` no es un JSON válido.** Lo más probable es que Metro no pueda generar el bundle, así que no saldría ni build ni OTA. Los tests no lo detectan porque todos mockean `operariosHelper`.
2. **La RPC `guardar_movimiento` asigna `'Proceso'::text` a una columna enum.** Postgres no convierte automáticamente de `text` a enum, así que probablemente falla en **todos** los guardados online y en todos los que se sincronizan desde la cola.
3. **La cola offline pierde la matrícula.** `pendientesService.encolar()` descarta el campo `matricula`, así que todo lo que se cuenta sin conexión llega a Supabase sin operario. Justo el caso que más importa.
4. **La cola offline puede perderse entera.** Se escribe sin el `escribirAtomico` que ya existe en el proyecto, y si el JSON aparece corrupto se reinicia vacía en silencio.
5. **Guardar → editar sin conexión deja la ubicación bloqueada para siempre** al sincronizar (la fusión de la cola convierte un `guardar` en `actualizar`).
6. **Un guardado tardío reabre ubicaciones terminadas.** La RPC pone `Proceso` sin comprobar `Fin`.
7. **Seguridad:** la clave pública está en `eas.json` y en el APK (y el repositorio parece público), y las RPC dan escritura a `anon`. Cualquiera con la clave puede modificar o borrar el conteo.

Tests: **app móvil: 424 pasan y 3 fallan** (los tres por timeout de 5 s en el primer test de su suite, ver §9). **web-admin: 17/17 pasan.**

---

## 1. Tabla de hallazgos

| ID | Severidad | Área | Hallazgo |
|----|-----------|------|----------|
| C1 | 🔴 Crítico | Build | `operarios.json` es JSON inválido (comentario `/* */` dentro) |
| C2 | 🔴 Crítico (verificar) | SQL | `guardar_movimiento` asigna `text` a la columna enum `stat` |
| C3 | 🔴 Crítico | Offline | La cola descarta `matricula`, así que lo contado offline llega sin operario |
| C4 | 🔴 Crítico | Offline | La cola se escribe sin atomicidad y se reinicia vacía si está corrupta |
| A1 | 🟠 Alto | Offline | La fusión `guardar`+`actualizar` acaba en un `UPDATE` sobre una fila inexistente y bloquea la ubicación |
| A2 | 🟠 Alto | SQL/Offline | Un `guardar` tardío vuelve a poner en `Proceso` una ubicación que estaba en `Fin` |
| A3 | 🟠 Alto | Offline | Los envíos online directos se saltan la cola, que se puede aplicar después fuera de orden |
| A4 | 🟠 Alto | Seguridad | Escritura total con la clave pública (RPC para `anon` y RLS inactiva) |
| A5 | 🟠 Alto | Datos | "Borrar CSV" + volver a contar sobrescribe la cantidad del servidor |
| A6 | 🟠 Alto | Login | Solo existen 2 operarios de ejemplo y el fichero local se reescribe en cada login |
| A7 | 🟠 Alto | SQL | Las migraciones tienen versiones duplicadas (`20261113`, `20261114`) |
| M1 | 🟡 Medio | UX/Datos | "Exportar" marca la ubicación como `Fin` sin pedir confirmación |
| M2 | 🟡 Medio | Funcional | Una ubicación en `Fin` se puede cargar y admite artículos durante un instante |
| M3 | 🟡 Medio | Offline | Cualquier `TypeError` del código se trata como "sin red" |
| M4 | 🟡 Medio | Offline | Las peticiones no tienen timeout y una red débil deja la UI colgada |
| M5 | 🟡 Medio | Datos | La cantidad admite decimales o valores > 32767 y la BD (`smallint`) los rechaza |
| M6 | 🟡 Medio | Datos | CSV sin escritura atómica, sin escapado y con condiciones de carrera |
| M7 | 🟡 Medio | Offline | Las operaciones fallidas quedan bloqueadas para siempre, sin UI para resolverlas |
| M8 | 🟡 Medio | SQL | `finalizar_ubicacion` no serializa por área/sección (carrera entre dispositivos) |
| M9 | 🟡 Medio | Trazabilidad | `actualizarMovimiento` no envía la matrícula ni actualiza `updated_at` |
| M10 | 🟡 Medio | Escáner | Puede llamar dos veces a `onScan` antes de cerrarse |
| M11 | 🟡 Medio | Scripts | `importArticulos` pasa los códigos a mayúsculas y envía `unidad`, que no existe en la tabla |
| M12 | 🟡 Medio | CI/CD | El workflow de release hace bump y push a `master` antes de pasar los tests |
| M13 | 🟡 Medio | Datos | Editar desde Estado crea CSV parciales de ubicaciones ajenas |
| B1–B12 | 🟢 Bajo | Varios | Calidad, rendimiento, código muerto y documentación (ver §7 y §8) |

---

## 2. Críticos

> **Estado (17 nov 2026):** C1–C4 y A1, A2, A3, A5, A6 y A7 corregidos, con tests (469 en verde). M8 queda resuelto de paso con `finalizar_ubicacion` v2. A4 se deja fuera por decisión del responsable (uso privado).
> **Pendiente de aplicar en Supabase, en orden:** `20261117000000_rpc_guardar_movimiento_v2.sql` (C2 + A2), `20261117000100_rpc_descargar_operarios.sql` (A6) y `20261117000200_rpc_finalizar_ubicacion_v2.sql` (mismo orden de bloqueos + M8). Las migraciones se renombraron con timestamps únicos de 14 dígitos (A7); en la tabla de abajo siguen apareciendo con su nombre antiguo.
>
> En §3, A1 se refiere al **tipo de operación de la cola** (`guardar`/`actualizar`/`eliminar`/`finalizar`), no al estado `stat` de las ubicaciones (`Inicio`/`Proceso`/`Fin`).

### C1 — `src/data/operarios.json` no es JSON válido

**Qué pasa.** El commit `1b6a1e4` dejó un comentario de bloque dentro del array:

```json
[
  { "matricula": "00123", "nombre": "Juan Pérez", "activo": true },
  { "matricula": "00456", "nombre": "María García", "activo": true }
/*   { ... "esAdminEmergencia": false }, ... */
]
```

Comprobado con `JSON.parse`: *"Expected ',' or ']' after array element … (line 4 column 1)"*.

**Por qué importa.** JSON no admite comentarios. Metro carga los `.json` importados (`operariosHelper.js` hace `import operariosPlantilla from '../data/operarios.json'`) con un parser estricto, así que lo esperable es que **`eas build` y `eas update` fallen al generar el bundle**. Si por algún motivo llegara a pasar, el login no funcionaría: la plantilla es lo que se copia a `documentDirectory/operarios.json`.

**Por qué no lo detectan los tests.** Los seis tests que tocan el login (`authService`, `AuthContext`, `HeaderSesion`, `HeaderTabs`, `IdentificacionScreen`, `HomeLogic`) hacen `jest.mock('../../src/helpers/operariosHelper')`, así que el JSON real nunca se carga. Esto es justo lo que el README describe como origen de la pantalla blanca de la 1.0.5: un fallo de arranque que solo aparece fuera de los tests.

**Qué hacer.** Quitar el comentario (en JSON los "comentarios" se guardan en git, no en el fichero). Añadir un test sin mock que haga `require('../src/data/operarios.json')`, o un paso de CI con `node -e "JSON.parse(...)"` para todos los `.json` de `src/`.

---

### C2 — `guardar_movimiento` asigna `text` a una columna enum *(verificar en Supabase)*

**Dónde.** [supabase/migrations/20261113_rpc_guardar_movimiento.sql:52-67](supabase/migrations/20261113_rpc_guardar_movimiento.sql#L52-L67)

```sql
update public."maestroUbicacion" set stat = 'Proceso'::text ...
```

**Qué pasa.** Según el DDL del README, `stat` es `USER-DEFINED` (un enum), y la migración `finalizar_ubicacion` lo confirma al usar `'Fin'::"Stat"`. En Postgres **no hay conversión de asignación de `text` a enum**: un literal sin tipo (`'Proceso'`) sí se convierte, pero uno ya tipado como `text` no. El error esperado es `column "stat" is of type "Stat" but expression is of type text`.

**Por qué importa.** Si es así, todas las llamadas a la RPC fallan con un error que no es de red, y por eso:
- **Online:** `InventoryService.guardarMovimiento` propaga el error y el operario ve "No se pudo guardar el registro", pero el CSV ya tiene la fila, así que CSV y BD se separan.
- **Offline → sync:** cada `guardar` de la cola falla, bloquea su ubicación y nunca sale de la cola.

Los tests mockean Supabase, así que nunca ejecutan el SQL. El TODO dice "falta aplicar y verificar contra Supabase".

**Qué hacer.** Usar `'Proceso'::"Stat"` (igual que en `finalizar_ubicacion`) o un literal sin tipo. Antes, confirmar el nombre real del enum (`select typname from pg_type where typtype='e'`), porque `finalizar_ubicacion` también depende de que se llame exactamente `"Stat"`. Probar las dos RPC a mano en el SQL editor con una ubicación de prueba.

---

### C3 — La cola de pendientes descarta la matrícula

**Dónde.** [src/services/pendientesService.js:205-212](src/services/pendientesService.js#L205-L212) frente a [src/services/InventoryService.js:242-249](src/services/InventoryService.js#L242-L249)

**Qué pasa.** `InventoryService` llama a `encolar({ tipo, ubicacion, articulo, cantidad, matricula, ... })`, pero `encolar` desestructura solo `tipo, ubicacion, articulo, cantidad, provisional, ubicacionProvisional`. **`matricula` se pierde** y no se guarda en `pending-operations.json`. Después, `syncService` envía `op.matricula ?? null`, que siempre es `null` ([src/services/syncService.js:41](src/services/syncService.js#L41)).

**Por qué importa.** Según `AUDITORIA.md`, el objetivo principal es el guardado offline y la trazabilidad por matrícula. Con este fallo, **todo lo contado sin conexión llega a Supabase sin operario**. La RPC hace `coalesce(excluded.matricula, conteo.matricula)`, así que en el mejor caso conserva la matrícula del recuento anterior, que es de otra persona: el dato no solo falta, puede ser **incorrecto**.

**Qué hacer.** Añadir `matricula = null` a la desestructuración y al objeto `operacion`, conservarla en la fusión y crear un test que encole con matrícula y compruebe que `syncService` la envía.

---

### C4 — La cola se escribe sin atomicidad y se reinicia vacía si está corrupta

**Dónde.** [src/services/pendientesService.js:94-101](src/services/pendientesService.js#L94-L101) y [:137-149](src/services/pendientesService.js#L137-L149)

**Qué pasa.**
1. `Persistencia.escribir` usa `FileSystem.writeAsStringAsync` directamente sobre `pending-operations.json`. El proyecto ya tiene `escribirAtomico` en `archivoHelper.js`, cuyo comentario dice literalmente que existe para que, *"en el caso de la cola de pendientes"*, un cierre a mitad de escritura no lo pierda todo. Pero la cola no lo usa (solo lo usan los maestros y la ubicación activa).
2. Si el JSON no se puede parsear, `parsear()` registra un `console.error` y devuelve `colaVacia()`. La siguiente operación encolada **sobrescribe el fichero corrupto con una cola nueva**, así que no hay recuperación posible.
3. `encolar`, `quitar` y `registrarFallo` hacen leer → modificar → escribir sin ningún bloqueo. Si la sincronización (lanzada sin `await` desde `marcarConexion`) ejecuta `quitar()` mientras el operario guarda y eso hace un `encolar()`, una de las dos escrituras pisa a la otra (*lost update*).

**Por qué importa.** La cola es la **única copia** de lo que aún no ha llegado al servidor. Android cierra apps en segundo plano y los terminales de almacén se quedan sin batería. Una escritura truncada o una carrera hacen desaparecer operaciones **sin ningún aviso**.

**Qué hacer.** Usar `escribirJson` (atómico) en `Persistencia.escribir`. Si el parseo falla, renombrar el fichero a `pending-operations.corrupt-<fecha>.json` en vez de descartarlo y avisar en el banner. Serializar todas las operaciones de la cola con una promesa en cadena (un mutex simple: `let cola = Promise.resolve(); cola = cola.then(fn)`).

**Bug menor relacionado.** `vaciar()` ([:307](src/services/pendientesService.js#L307)) pasa a `escribir()` un objeto en lugar de un array, así que escribe `{version, operaciones: {version, operaciones: []}}`. Funciona por casualidad, porque `parsear` lo trata como corrupto. `AUDITORIA.md` (B7) lo describe mal ("escribe `[]` sin `version`"): lo correcto es `escribir([])`.

---

## 3. Altos

### A1 — Guardar y luego editar sin conexión bloquea la ubicación para siempre

**Dónde.** [src/services/pendientesService.js:216-235](src/services/pendientesService.js#L216-L235), [src/providers/supabase/SupabaseProvider.js:267-283](src/providers/supabase/SupabaseProvider.js#L267-L283)

**Escenario.** Sin conexión: el operario escanea el artículo X (`guardar`) y luego corrige la cantidad en Lista (`actualizar`). Las dos operaciones son consecutivas y del mismo artículo, así que la cola las **fusiona y se queda con `tipo: 'actualizar'`**. Al sincronizar se ejecuta `UPDATE conteo ... .single()` sobre una fila que **nunca llegó a insertarse**. PostgREST devuelve un error que no es de red, `syncService` **bloquea toda esa ubicación** y la operación se queda en la cola indefinidamente (ver M7). Además, la ubicación no pasa a `Proceso`.

**Por qué importa.** Corregir una cantidad justo después de contarla es habitual, y sin red es precisamente cuando más se usa la cola.

**Qué hacer.** En la fusión, conservar el tipo de la primera operación cuando es `guardar` (`tipo: ultima.tipo === 'guardar' ? 'guardar' : tipo`). Mejor aún: que `actualizar` también use la RPC `guardar_movimiento` (es un upsert, funciona exista o no la fila) y eliminar el `UPDATE` directo.

### A2 — Un guardado tardío vuelve a abrir ubicaciones terminadas

**Dónde.** [supabase/migrations/20261113_rpc_guardar_movimiento.sql:51-67](supabase/migrations/20261113_rpc_guardar_movimiento.sql#L51-L67)

**Qué pasa.** La RPC pone ubicación, área y sección en `Proceso` **sin condiciones**. No comprueba si la ubicación ya está en `Fin` ni si existe (no hay FK de `conteo.ubicacion` a `maestroUbicacion`).

**Escenario.** El dispositivo A cuenta la ubicación U sin conexión. El dispositivo B (o el web-admin) la marca `Fin`. A recupera la red y sincroniza: U, su área y su sección **vuelven a `Proceso`** y el resumen de porcentajes retrocede. También pasa en el mismo dispositivo con A3.

**Por qué importa.** La app afirma que *"una ubicación en `Fin` no admite más operaciones"*, pero el servidor, que es la única fuente compartida, no lo garantiza: solo lo comprueba el cliente, y con un estado que puede estar desactualizado.

**Qué hacer.** En la RPC: `select stat ... for update` de la ubicación; si no existe, `raise` con `P0002`; si está en `Fin`, `raise` con un código propio (p. ej. `P0001 'Ubicación terminada'`), que la app mostrará como error real. No subir el área ni la sección si ya están en `Fin` por otra vía.

### A3 — Los envíos online se saltan la cola

**Dónde.** [src/services/InventoryService.js:51-98](src/services/InventoryService.js#L51-L98), [src/services/conectividadService.js:247-255](src/services/conectividadService.js#L247-L255)

**Qué pasa.** `enviarOEncolar` envía directamente a Supabase siempre que `estaOnline()` es `true`, **aunque la cola tenga operaciones pendientes**. Cuando vuelve la red, `marcarConexion()` lanza `sincronizar()` sin `await`, así que los envíos nuevos y el drenado de la cola corren en paralelo.

**Escenario.** Sin conexión se encola `eliminar X`. Vuelve la red y el operario guarda X de nuevo (envío directo, la fila queda en el servidor). Después la cola aplica el `eliminar` antiguo y **borra el dato nuevo**. Otro caso: "Exportar" (finalizar) se envía directamente mientras la cola aún tiene `guardar` de esa ubicación, que luego llegan y la reabren (A2).

**Por qué importa.** El README dice que la cola *"respeta el orden de las operaciones de cada ubicación"*, pero ese orden solo se respeta dentro de la cola, no entre la cola y los envíos directos.

**Qué hacer.** Si `pendientes > 0` (en general, o al menos para esa ubicación), encolar en vez de enviar y disparar `sincronizar()`. También vale que `enviarOEncolar` espere a que termine un drenado en curso.

### A4 — La clave pública permite escribirlo todo

**Dónde.** `eas.json` (líneas 25-26, 38-39, 50-51), las migraciones `*_rpc_*.sql` y [supabase/migrations/20260925000000_web_admin.sql](supabase/migrations/20260925000000_web_admin.sql)

**Qué pasa.**
- `EXPO_PUBLIC_SUPABASE_KEY` (clave *publishable*) está en texto plano en `eas.json`, que está versionado, y embebida en el APK que se publica en GitHub Releases.
- Todo indica que el repositorio es **público**: `updateService.js` consulta `api.github.com/repos/Joritzetxenike/escan/releases/latest` **sin token**, y eso solo funciona en repos públicos.
- `guardar_movimiento` y `finalizar_ubicacion` se conceden a `anon` y **no** son `security definer`, así que solo funcionan si `anon` tiene permisos directos de escritura sobre `conteo` y los maestros.
- La migración del web-admin crea políticas RLS pero **nunca ejecuta `enable row level security`** en esas tablas, así que no se aplican. Si RLS estuviera activa con esas políticas, la app móvil (que usa `anon`) dejaría de funcionar. Por eso cabe suponer que RLS está desactivada y que `anon` tiene CRUD completo vía PostgREST.

**Por qué importa.** `AUDITORIA.md` lo clasifica como "bajo, uso privado". Pero si el repo o el APK son públicos, la clave **ya no es privada**: cualquiera puede hacer `DELETE /rest/v1/conteo?ubicacion=neq.x` y borrar el inventario entero, o poner todas las ubicaciones en `Fin`. La clave publishable está pensada para ser pública **solo** si RLS protege los datos.

**Qué hacer (proporcional al uso interno).**
1. Confirmar si el repo es público. Si lo es, valorar hacerlo privado (la comprobación de actualizaciones necesitaría otra fuente, ver B9).
2. Activar RLS en las cinco tablas y dar a `anon` solo `select` en los maestros. Convertir `guardar_movimiento`, `finalizar_ubicacion` y un nuevo `eliminar_movimiento` en `security definer` con `search_path` fijado, y que las escrituras de la app pasen **solo** por esas RPC. Así una clave filtrada solo permite lo que hace la app (contar), no borrar en masa.
3. Revocar `delete` y `update` directos de `conteo` a `anon`.

### A5 — "Borrar CSV" y volver a contar sobrescribe el servidor

**Dónde.** [src/screens/ListaScreen.js:191-206](src/screens/ListaScreen.js#L191-L206), y `HomeLogic.procesarArticulo` + `confirmarCantidad`

**Qué pasa.** "Borrar CSV" solo borra el fichero local: no consulta la cola, no comprueba si la ubicación está abierta ni toca la BD. El aviso de "artículo ya contado" (Sumar/Sobrescribir) **solo mira el CSV**, y la RPC guarda una cantidad absoluta (`cant = excluded.cant`).

**Escenario.** Se cuentan 10 unidades de X en U y se guardan en el servidor. El operario borra el CSV de U (por ejemplo, para "limpiar"). Vuelve a escanear X en U: la app cree que es nuevo, guarda 5 y **el servidor pasa de 10 a 5** sin ningún aviso.

**Por qué importa.** El CSV es la "fuente de verdad local", pero se puede borrar con dos toques y el servidor no se protege.

**Qué hacer.** No permitir "Borrar CSV" si la ubicación no está en `Fin` o si tiene operaciones en la cola, o bien explicar las consecuencias en la confirmación. Con conexión, consultar también `conteo` al detectar duplicados.

### A6 — Login: solo hay 2 operarios de ejemplo y el fichero se reescribe siempre

**Dónde.** [src/helpers/operariosHelper.js:36-50](src/helpers/operariosHelper.js#L36-L50)

**Qué pasa.**
1. La lista de operarios válidos es la plantilla del bundle (`00123 Juan Pérez`, `00456 María García`). La tabla `operarios` de Supabase **no la usa la app** (y además su política de `select` es solo para `authenticated`, no para `anon`).
2. `asegurarArchivoOperarios` reescribe el fichero local si algún operario no tiene `esAdminEmergencia`. Al haberse comentado ese campo, la condición **se cumple siempre**: el fichero se sobrescribe en cada login y es imposible editarlo en el dispositivo, aunque el comentario del helper diga que esa era su finalidad.

**Por qué importa.** Los operarios reales no pueden entrar salvo que se añadan al bundle (con una OTA o una build). Además, poner nombres y matrículas reales en `src/data/` los publica en el repo y en el APK (datos personales, RGPD).

**Qué hacer.** Quitar la condición de `esAdminEmergencia`. A medio plazo, descargar los operarios desde Supabase junto con los maestros (RPC `security definer` que devuelva solo `matricula, nombre, activo`) y guardarlos en `documentDirectory`, con la plantilla solo como último recurso.

### A7 — Versiones de migración duplicadas

**Dónde.** `supabase/migrations/`

**Qué pasa.** Hay dos ficheros `20261113_*` y dos `20261114_*`. La CLI de Supabase toma como versión el prefijo numérico, que debe ser único (y conviene que tenga 14 dígitos, como `20260925000000_`). Con duplicados, `supabase db push` falla por clave duplicada en `schema_migrations` o aplica las migraciones en un orden incierto. Además, la migración de operarios inserta datos de ejemplo en producción y tiene caracteres mal codificados (`conexi�n`).

**Por qué importa.** La aplicación de las migraciones (pendiente según el TODO) no será reproducible y cuesta saber qué se ha aplicado.

**Qué hacer.** Renombrar con timestamps completos y únicos (`20261113000000_conteo_matricula…`, `20261113000100_rpc_guardar…`), mover el seed a un `seed.sql` aparte y guardar los ficheros en UTF-8.

---

## 4. Medios

### M1 — "Exportar" termina la ubicación sin confirmación
[src/screens/ListaScreen.js:116-188](src/screens/ListaScreen.js#L116-L188). Pulsar "Exportar" pone la ubicación en `Fin` de forma **irreversible desde la app** (solo el web-admin puede devolverla a otro estado), aunque luego se cancele el menú de compartir. **Por qué:** mezclar "compartir" con "cerrar" hace que un toque accidental bloquee una ubicación a medio contar. **Qué hacer:** pedir confirmación ("¿Terminar la ubicación U? No se podrá modificar") o separar los botones "Terminar" y "Compartir".

### M2 — Una ubicación en `Fin` se puede cargar y admite artículos durante un instante
`UbicacionValidator.validar` siempre devuelve `stat: null` ([:153](src/validators/UbicacionValidator.js#L153)), así que en [HomeLogic.js:499](src/logic/HomeLogic.js#L499) `finalizada` es siempre `false` y la ubicación se guarda como **activa**. El `Fin` solo se detecta después, de forma asíncrona, con el `useFocusEffect`. Sin conexión solo se mira la cola, no el estado remoto. **Por qué:** durante ese intervalo (y siempre sin conexión) se pueden añadir artículos a una ubicación cerrada, que después la reabrirían en el servidor (A2). **Qué hacer:** en `cargarUbicacion`, esperar a `estaUbicacionFinalizada()` antes de aceptar la ubicación. Aprovechar también que `InventoryService.cargarUbicacion()` (línea 536) hace una petición cuyo resultado **se descarta**: quitarla o usar sus datos.

### M3 — Cualquier `TypeError` cuenta como "sin red"
[src/helpers/redHelper.js:33](src/helpers/redHelper.js#L33). `error instanceof TypeError` es cierto para fallos de red, pero también para cualquier bug (`Cannot read property 'x' of undefined`). **Por qué:** un bug dentro de `enviar()` se encola como si no hubiera red, la app pasa a "Sin conexión" y en cada sincronización vuelve a fallar con `redCaida`, así que **la cola nunca avanza** y el problema no se ve. **Qué hacer:** reconocer solo mensajes de red concretos (`Network request failed`, `Failed to fetch`, `fetch failed`, `AbortError` del timeout) y tratar el resto de `TypeError` como errores reales.

### M4 — Sin timeouts de red
`createClient(url, key)` usa `fetch` sin límite de tiempo ([supabaseClient.js:61](src/providers/supabase/supabaseClient.js#L61)). **Por qué:** con wifi débil una petición puede quedarse colgada mucho tiempo. El operario espera sin poder hacer nada, `estaDisponible()` no termina y no se encola nada hasta que el sistema corta la conexión. Para una app *offline-first*, una red mala es peor que no tener red. **Qué hacer:** pasar `global: { fetch: fetchConTimeout }` con `AbortController` (8-10 s) y tratar el `AbortError` como error de red.

### M5 — Validación de cantidad incompleta
[src/components/CantidadModal.js:24](src/components/CantidadModal.js#L24) acepta `2.5`, `1e3` o `99999`. `conteo.cant` es `smallint` (entero, máx. 32 767) y la RPC espera `smallint`. **Por qué:** el CSV guarda el valor y el servidor lo rechaza con un error que no es de red, así que CSV y BD se separan (el online muestra un error, el offline bloquea la ubicación). La opción "Sumar" puede además superar el límite. **Qué hacer:** exigir `Number.isInteger(n) && n > 0 && n <= 32767` (como ya hace `ListaScreen.guardarCantidad`) y comprobar el total tras sumar. Valorar si `cant` debería ser `integer` o `numeric` cuando haya artículos que se cuentan por peso o longitud (la columna `unidad` apunta a ello).

### M6 — CSV no atómico, sin escapado y con carreras
[src/providers/csv/csvProvider.js:117, 164](src/providers/csv/csvProvider.js#L117).
- Se escribe con `writeAsStringAsync` directo, igual que en C4. **Por qué:** el CSV es la copia local de lo contado, y si se trunca se pierde la ubicación.
- No hay escapado: un código con `,` rompe la fila. Además, los códigos que empiezan por `-`, `=`, `+` o `@` (en este maestro hay muchos, como `-BXC05.4010`) **se interpretan como fórmulas al abrir el CSV exportado en Excel** (salen `#¿NOMBRE?` o, en el peor caso, *CSV injection*). **Qué hacer:** entrecomillar los campos y anteponer `'` (o una tabulación) a los valores que empiecen por esos caracteres en el fichero exportado. Añadir una cabecera.
- Leer → modificar → escribir sin bloqueo: dos guardados rápidos (doble toque en "Confirmar", que no tiene protección) pueden perder una fila.
- `csvHelper.js` duplica el parser y el serializador de `csvProvider.js` (`ListaScreen` usa uno y `InventoryService` el otro). Si se arregla el formato en uno, el otro sigue igual.

### M7 — Las operaciones fallidas no tienen salida
`syncService` bloquea la ubicación y `registrarFallo` aumenta `intentos` sin límite. **No hay ninguna pantalla** para ver, reintentar o descartar una operación atascada. **Por qué:** el banner muestra "Error al sincronizar: …", pero el operario no puede hacer nada y todas las operaciones posteriores de esa ubicación quedan retenidas en el dispositivo. **Qué hacer:** una pantalla sencilla de "Pendientes" (lista, reintentar, exportar como JSON y descartar con confirmación) y un límite de intentos que la marque para revisión.

### M8 — Carrera en `finalizar_ubicacion`
[supabase/migrations/20261114_rpc_finalizar_ubicacion.sql](supabase/migrations/20261114_rpc_finalizar_ubicacion.sql). Bloquea solo la fila de la ubicación. **Escenario:** dos dispositivos terminan a la vez las dos últimas ubicaciones de un área. Con `READ COMMITTED`, ninguna transacción ve el `Fin` de la otra, así que **el área no pasa nunca a `Fin`**. **Por qué:** `actualizar_estado_ubicacion` (web-admin) sí lo evita bloqueando antes `maestroSeccion ... for update`. **Qué hacer:** copiar ese `perform 1 from "maestroSeccion" where seccion = p_seccion for update` al principio de `finalizar_ubicacion` (y de `guardar_movimiento`).

### M9 — Editar cantidades pierde la trazabilidad
`SupabaseProvider.actualizarMovimiento` hace un `UPDATE` de `cant` sin `matricula` ni `updated_at`, y `InventoryService.actualizarMovimiento` no la encola. **Por qué:** en la BD queda la matrícula de quien contó primero y no la de quien corrigió, mientras que el CSV muestra al último (README: *"queda constancia del último cambio"*). Además, los "últimos movimientos" no reflejan la edición. **Qué hacer:** usar `guardar_movimiento` también para editar (ver A1).

### M10 — El escáner puede llamar dos veces a `onScan`
[src/logic/ScannerLogic.js:265-275](src/logic/ScannerLogic.js#L265-L275). Cuando un código se valida, el buffer vuelve a 0 y se llama a `goBack()`, pero `onBarcodeScanned` sigue recibiendo eventos hasta que la pantalla se desmonta. Con 13 tipos de código activos y la cámara a 30 fps, se pueden acumular 3 lecturas más. **Por qué:** se procesaría dos veces la misma ubicación o artículo (dos modales o dos avisos). **Qué hacer:** usar un `useRef(false)` como "ya entregado" y no hacer nada después de la primera entrega. Limitar `barcodeTypes` a los que se usan de verdad, porque además acelera la decodificación y reduce las lecturas falsas.

### M11 — `importArticulos.js` cambia los códigos
[scripts/importArticulos.js:11, 47, 63](scripts/importArticulos.js#L11). `normalizarTexto()` pasa `ITEM` a **mayúsculas y le quita los acentos**, pero el README insiste en que *"los códigos de artículo distinguen mayúsculas y minúsculas"*. También envía `unidad`, una columna que no aparece en el DDL ni en ninguna migración. **Por qué:** un código con minúsculas se importaría distinto del que imprime la etiqueta y el escáner lo rechazaría como "no existe". Y si el CSV trae `UNIDAD`, el upsert falla entero. Además, `upsertLotes` usa `ignoreDuplicates: true`, así que **reimportar operarios no puede desactivar a nadie** (`activo=false` se ignora) ni corregir nombres. **Qué hacer:** solo `trim()` en los códigos, crear la columna `unidad` si se va a usar, y en operarios y artículos hacer un upsert real (`ignoreDuplicates: false`) para los campos que se deban actualizar.

### M12 — El release hace push a `master` antes de los tests
[.github/workflows/build-android.yml:26-50](.github/workflows/build-android.yml#L26-L50). El bump de versión se commitea y se sube a `master` antes de `npm ci` y `npm test`. Además, se hace `git push origin HEAD:master` desde el checkout de un **tag**: si el tag no apunta a la punta de `master`, el push es *non-fast-forward* y el workflow falla. Si apunta, `master` avanza aunque luego fallen los tests o la build. **Por qué:** se acaban teniendo versiones "publicadas" en `master` sin APK. **Qué hacer:** pasar los tests primero y hacer el bump y el push solo después de que la build y la verificación del bundle salgan bien (o hacer el bump en local antes de crear el tag). Fijar también la versión de `eas-cli` (`npm i -g eas-cli@<versión>`), porque instalar siempre la última hace las builds poco reproducibles.

### M13 — Editar desde Estado crea CSV parciales
`EstadoScreen.handleGuardarCantidad` → `InventoryService.actualizarMovimiento` → `CsvProvider.guardarMovimiento`. Si el dispositivo no contó esa ubicación (los datos vienen del servidor y los contó otro), **se crea un CSV local con una sola fila**. **Por qué:** después aparece en Lista y, al "Exportar", se comparte un CSV incompleto **y se termina la ubicación**. **Qué hacer:** desde Estado, editar solo en la BD (o en la cola), sin tocar el CSV, o no permitir editar ubicaciones que no tienen CSV local.

---

## 5. Bajos

| ID | Hallazgo | Por qué importa | Qué hacer |
|----|----------|-----------------|-----------|
| B1 | `console.log` en el camino crítico: `ScannerService.js:42` (cada lectura), `ScannerLogic.js:193, 258`, `HomeLogic.js:672` | En release ralentiza el puente JS en un bucle de 30 fps y ensucia `adb logcat` | Quitarlos o envolverlos en `if (__DEV__)` |
| B2 | Código muerto: `apiProvider.js`, `ubicacionesMock.js`, `EstadoCard.js`, `ImportEmergenciaModal.js`, `ImportarArchivoModal.js`, `InventoryDataProvider` (solo se usa con spread), `esOperarioValido` y `obtenerNombreOperario`, `SupabaseProvider.sincronizar`, `existeArticulo`, carpetas vacías `src/hooks/` y `src/domain/` | Despista al leer y al buscar, y el código comentado de "emergencia" (14 ficheros) se queda desactualizado mientras el resto cambia | Borrarlo; para reactivarlo está git (una rama o un tag `emergencia-v1`) |
| B3 | `normalizarMatricula` está duplicada en `authService.js` y `operariosHelper.js` (con el `20` escrito a mano en uno de ellos), y en `HomeLogic` queda el `useState` `mostrarImportEmergencia`, que ya no se usa | Si cambia la regla de la matrícula en un sitio y no en el otro, el login rechaza matrículas válidas | Exportar una sola función y borrar el estado sobrante |
| B4 | Fichero vacío `8` en la raíz, versionado | Restos de una redirección mal escrita (`… > 8`) | `git rm 8` |
| B5 | `jest-expo` y `babel-preset-expo` en `dependencies` | Son herramientas de test y build, no de ejecución; se instalan y auditan como si fueran runtime | Pasarlas a `devDependencies` |
| B6 | `xlsx@0.18.5` (SheetJS en npm, sin mantenimiento) tiene CVE conocidos (prototype pollution, ReDoS) | Riesgo bajo: solo lo usan los scripts locales con ficheros propios | Instalar SheetJS desde su CDN oficial o leer CSV, que ya existe |
| B7 | `maestrosService.iniciar` se suscribe a **todos** los cambios de conectividad ([:855](src/services/maestrosService.js#L855)), que se emiten muchas veces (`comprobando`, `pendientes`, …) y cada uno ejecuta `evaluarRefresco` (lee el meta del disco y, si no hay caché, parsea los 3 MB) | Trabajo y E/S repetidos en terminales lentos | Reaccionar solo al cambio `online: false → true` |
| B8 | `descargar()` dice ser "escritura atómica", pero escribe ubicaciones y artículos por separado | Si falla la segunda escritura, quedan ubicaciones nuevas con artículos viejos (lo grave, que falle la red, sí está resuelto) | Ajustar el comentario o guardar los dos ficheros con un "manifest" |
| B9 | La comprobación de actualización contra GitHub no tiene token (60 req/h por IP) y depende de que el repo sea público | Si se privatiza el repo (A4) deja de funcionar. Varios móviles en la misma wifi (una IP) agotan el cupo | Servir un `latest.json` propio (Supabase Storage) o confiar en EAS Update |
| B10 | `sugerirArticulos` recorre los 211 k códigos con `toUpperCase()` en cada búsqueda y ordena los 8 primeros que encuentra, no los 8 primeros por orden alfabético | Coste de CPU por pulsación (con un debounce de 200 ms) y orden poco intuitivo | Precalcular una copia en mayúsculas ordenada y hacer búsqueda binaria por prefijo |
| B11 | Pasar callbacks (`onScan`) en `route.params` | React Navigation avisa de *non-serializable values*, y rompe la persistencia de estado y los deep links | Devolver el resultado con `navigation.navigate({ name, params, merge: true })` o con un pequeño event emitter |
| B12 | El perfil `development` declara `developmentClient: true` sin `expo-dev-client`. `development-apk` pone `appVersionSource` **dentro** del perfil (es una opción de `cli`, probablemente se ignora) y no aplica el `version`/`versionCode` dev que pedía el TODO. El workflow `develop` tiene `contents: write` sin necesitarlo | Lo que está configurado no hace lo que se cree que hace | Revisar con `eas build:inspect`, implementar el `versionCode = 900000 + run_number` y dejar `permissions: contents: read` |

---

## 6. Escalabilidad

| Dimensión | Situación | Por qué es un límite | Recomendación |
|-----------|-----------|----------------------|---------------|
| Maestro de artículos | 3 MB de JSON parseados en el hilo JS al arrancar; `Set` de 211 k (~15 MB) | En gama baja bloquea la UI 1-2 s; si el catálogo crece mucho, el parseo y la RAM crecen igual | Si crece: SQLite (`expo-sqlite`) con índice. Mientras tanto, cargarlo después del primer render |
| Varios dispositivos en la misma ubicación | El bloqueo de "ubicación activa" es **por dispositivo**; la cantidad se calcula en local y se envía en absoluto | Dos operarios en la misma ubicación se pisan en silencio (gana el último) | Bloqueo en servidor (`maestroUbicacion.bloqueada_por`) o enviar deltas en vez de valores absolutos |
| Cola | Secuencial, una petición por operación y reescritura del fichero entero por cada `quitar` (O(n²) en E/S) | Con cientos de operaciones tras un día sin red, la sincronización tarda minutos | Enviar por lotes (una RPC que reciba un array y aplique en orden dentro de una transacción) |
| Árbol de ubicaciones | Una consulta anidada sin paginar (199 filas) | Bien hoy; PostgREST corta a 1 000 filas en el nivel superior | Pasarlo a una RPC si pasan de mil |
| Integridad del modelo | `conteo.ubicacion` es texto sin FK; `conteo.item` sí tiene FK | Se pueden guardar ubicaciones inexistentes vía API (A2) | La "Opción A" del TODO (FK compuesta) |

---

## 7. Documentación desactualizada

El README y `AUDITORIA.md` describen un estado anterior del código. **Por qué importa:** quien lea la documentación (o una IA que la use como contexto) tomará decisiones sobre premisas falsas.

**README.md**
- *"`validarMatricula()` acepta cualquier número no vacío"*: ya valida contra `operarios.json`.
- *"La matrícula no se envía a Supabase"*: ya se envía (aunque no desde la cola, ver C3).
- *"`conteo` no tiene timestamp"* y *"`guardarMovimiento` son 4 peticiones"* (Limitaciones conocidas n.º 1): ya existen `updated_at` y la RPC.
- `src/hooks/useScanner.js` aparece en la estructura y en las notas técnicas, pero ya no existe.
- No menciona la tabla `operarios`, los scripts `import:*` nuevos, el workflow `develop` ni el perfil `development-apk`.

**TODO.md**
- *"P0. Hacer segura la sincronización (fase 2)"* sigue abierto, aunque la RPC existe (pendiente de C2).
- La tarea P0 de rama `develop` está sin marcar, aunque ya existen la rama, el workflow y el script.

**AUDITORIA.md** (no se modifica, solo se aclara)
- B1, B2, B4, B5, B6 y B10 están resueltos o han cambiado de forma.
- B7 está descrito al revés (ver C4).
- S1 menciona `web-admin/.env.local`, que **sí** está en `.gitignore` y no se ha subido. El riesgo real es `eas.json` y el APK público (A4).

---

## 8. Lo que está bien (y por qué)

- **CSV antes que la red** en guardar, editar y borrar: una caída de Supabase no pierde lo contado.
- **`supabaseClient` sin `throw` al importarse + `ErrorBoundary` + verificación del bundle en CI**: las tres capas contra la pantalla blanca de la 1.0.5 son correctas y están bien explicadas en el código.
- **Descarga de maestros validada antes de escribir**, con rechazo de respuestas vacías: nunca sustituye una copia buena por una vacía.
- **Validación local estricta de ubicaciones**: cerrar el atajo del "formato válido" evita contar en ubicaciones inventadas.
- **`escribirAtomico`** está bien diseñado; solo falta usarlo donde más importa (C4, M6).
- **`actualizar_estado_ubicacion` (web-admin)**: `security definer`, `search_path` fijado, control de rol, `for update` por sección y valores validados. Es un buen modelo para las RPC de la app (A4, M8).
- **web-admin**: no usa `service_role`, comprueba el rol en el servidor, pagina en el servidor y limpia la búsqueda antes de pasarla a `or()`.
- **Tests**: 427 en la app y 17 en el panel, con buena cobertura de servicios. Lo que falta es probar lo que *no* se mockea (JSON real, SQL real).

---

## 9. Tests

- `npx jest --ci` → **424 pasan, 3 fallan**: `ArticulosModal › bloquea editar…`, `EstadoScreen › entra en el resumen…` y `ListaScreen › comparte sin volver a cerrar…`. Los tres son **timeouts de 5 s en suites que tardan más de 100 s en este equipo**; parece el coste de la primera transformación con `jest-expo`, no un fallo de lógica. **Por qué importa:** un test que depende de la velocidad de la máquina termina fallando en CI de forma intermitente. **Qué hacer:** subir `testTimeout` en `jest.config.js` o usar `jest.useFakeTimers()` en esas suites.
- `web-admin: npx vitest run` → **17/17 pasan**.
- **Huecos:** ningún test carga el JSON real de operarios (C1), ejecuta el SQL (C2), comprueba que la matrícula llega desde la cola (C3), prueba la fusión `guardar`→`actualizar` (A1) ni simula una cola corrupta (C4).

---

## 10. Plan de acción priorizado

**Antes de la siguiente build u OTA (bloqueante)**
1. C1: arreglar `operarios.json` y añadir un test o paso de CI que valide los JSON.
2. C2: corregir el cast del enum en `guardar_movimiento`, confirmar el nombre del enum y probar las dos RPC contra Supabase.
3. C3: conservar `matricula` en la cola, con test.
4. C4: escritura atómica de la cola, cuarentena en vez de reinicio y mutex.
5. A6: quitar la condición `esAdminEmergencia` y cargar los operarios reales.

**Siguiente iteración (integridad offline)**
6. A1 + M9: editar también con `guardar_movimiento`; arreglar el tipo en la fusión.
7. A2 + M8: la RPC rechaza ubicaciones en `Fin` o inexistentes y bloquea por sección.
8. A3: no enviar directamente mientras haya cola.
9. M3 + M4: detección de errores de red precisa y timeouts.
10. M5, M10: validar la cantidad y evitar el doble `onScan`.
11. A7: renombrar las migraciones.

**Seguridad (proporcional al uso interno)**
12. A4: confirmar si el repo es público; RLS + RPC `security definer` como única vía de escritura; revocar el `delete` directo.

**UX y operación**
13. M1, A5, M13: confirmación al terminar y protección de "Borrar CSV" y de las ediciones desde Estado.
14. M7: pantalla de pendientes atascados.
15. M6: CSV atómico, escapado y seguro para Excel; unificar `csvHelper`/`csvProvider`.

**Mantenimiento**
16. M11, M12, B1–B12, §7 (actualizar README/TODO) y §9 (timeouts de tests).
