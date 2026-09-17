# Decisiones de Diseño — Sistema de Reservas de Vuelos (Pipes & Filters)

> Cada decisión sigue la plantilla: **Decisión · Problema · Alternativas · Opción elegida · Motivo · Consecuencias/Trade-offs**. El seguimiento de avance vive en `IMPLEMENTATION_PLAN.md`; este documento es la fuente de verdad de **por qué** se construyó así.

## Índice
- [D1–D13 (decisiones ya aprobadas)](#d1d13)
- [Decisiones menores / de implementación](#decisiones-menores)
- [Interpretaciones de la letra](#interpretaciones-de-la-letra)

---

## D1–D13

### D1 — Moneda de conversión y agregación del total local
- **Problema:** la letra pide detectar la moneda del país de destino y convertir precios, pero el pipeline calcula en base a un precio por clase que se deriva del precio base del vuelo, y hay múltiples filtros de precio en cadena.
- **Alternativas:** (a) convertir en cada filtro de precio (F4–F7) a moneda local; (b) convertir solo el precio base del vuelo una vez en F3 y calcular todo el resto en USD, agregando el total en moneda local al final.
- **Opción elegida:** (b). F3 convierte el **precio base del vuelo** USD → moneda del destino y guarda original + convertido en `metadata.exchange`. F4–F7 seguyen calculando en USD. La respuesta agrega `totalLocal` usando la tasa de la metadata.
- **Motivo:** evita arrastrar redondeos de conversión por cada filtro (error acumulado) y mantiene la lógica de precios (multiplicadores, descuentos, impuestos) simple y testeable en una sola moneda de referencia.
- **Consecuencias/Trade-offs:** el usuario final solo ve `totalLocal` como conversión directa del total USD con la tasa vigente al momento de F3, no una suma de conversiones parciales. Es un enfoque simplificado pero consistente y fácil de verificar en tests.

### D2 — Fallback ante fallo de la API de cambio
- **Problema:** la API externa de tipo de cambio puede fallar (timeout, red, HTTP, payload inválido) y el procesamiento de la reserva no debe detenerse por eso.
- **Alternativas:** (a) fallar la reserva completa (`FAILED`); (b) usar una tasa por defecto configurable con warning; (c) usar siempre tasa 1 (USD) con warning.
- **Opción elegida:** tabla `fallbackRates` configurable por moneda; si la moneda buscada no está en la tabla, se usa USD (tasa 1). Siempre se agrega un warning (`EXCHANGE_RATE_FALLBACK`), nunca error.
- **Motivo:** el tipo de cambio es un enriquecimiento, no una validación de negocio: la reserva sigue siendo válida aunque no se pueda mostrar el precio en moneda local.
- **Consecuencias/Trade-offs:** el cliente debe revisar `warnings` para saber si el monto en moneda local es aproximado (tasa de fallback) en vez de la tasa real de mercado.

### D3 — Fórmula de impuestos, combustible y tasa aeroportuaria
- **Problema:** la letra pide calcular impuestos, cargo por combustible y tasa aeroportuaria, sin fijar las bases de cálculo.
- **Alternativas:** aplicar todos los porcentajes sobre el precio final con descuentos, o sobre distintas bases (precio original vs. precio con descuentos).
- **Opción elegida:** impuestos 12% sobre el **subtotal con descuentos** (salida de F6); combustible 8% sobre el **precio base por clase** (salida de F4, antes de descuentos); tasa aeroportuaria fija de **$25** (no proporcional).
- **Motivo:** los impuestos deben reflejar lo que el pasajero efectivamente paga (post-descuento), mientras que el cargo por combustible es un costo operativo del vuelo/clase que no varía por el perfil del pasajero.
- **Consecuencias/Trade-offs:** si F5/F6 están deshabilitados, `TaxesAndFeesFilter` usa el precio corriente disponible como base de impuestos (ver TICKET-19), evitando que la ausencia de esos filtros rompa el cálculo.

### D4 — Descuentos secuenciales
- **Problema:** hay dos descuentos porcentuales (lealtad y tipo de pasajero) y no se especifica si se combinan sobre el precio original o se encadenan.
- **Alternativas:** (a) ambos descuentos sobre el precio base por clase (aditivos); (b) cada filtro aplica sobre el precio que recibe del filtro anterior (multiplicativos/secuenciales).
- **Opción elegida:** (b), secuencial: `afterLoyalty = classBase × (1 − loyalty)`, `subtotal = afterLoyalty × (1 − tipo)`.
- **Motivo:** modela cada filtro como una transformación independiente e idempotente sobre "el precio actual", que es el patrón natural de Pipes & Filters (cada filtro no necesita conocer el precio original ni los descuentos previos).
- **Consecuencias/Trade-offs:** el descuento combinado no es la simple suma de porcentajes (ej. gold 15% + child 25% no da 40% sobre el precio base, da 1 − 0.85×0.75 = 36.25%). Se documenta explícitamente para evitar confusión.

### D5 — Semántica de fallos por reserva
- **Problema:** distinguir cuándo una reserva queda `REJECTED` (regla de negocio) vs `FAILED` (error técnico), y cómo afecta al resto del lote.
- **Alternativas:** (a) cualquier error detiene todo el lote; (b) un error solo detiene esa reserva puntual, sin afectar a las demás.
- **Opción elegida:** (b). Una validación de negocio fallida (F1/F2) → `REJECTED`. Una excepción no controlada o datos corruptos (`CorruptContextError`) → `FAILED`. El fallo de la API de cambio nunca es una excepción (D2): se resuelve con fallback + warning, sin afectar el status de error. Las demás reservas del lote se procesan independientemente (`Promise.all` con manejo de errores por ítem).
- **Motivo:** un lote de reservas es un conjunto de operaciones independientes; el fallo de una no debe impedir procesar las otras (requisito explícito de la letra sobre manejo de lote).
- **Consecuencias/Trade-offs:** el runner del pipeline (`Pipeline.run`) nunca propaga excepciones hacia el llamador; las captura y las traduce a issues, así el servicio de aplicación no necesita try/catch por reserva.

### D6 — Tipo de pasajero y coherencia con la edad
- **Problema:** el sistema necesita el tipo de pasajero (child/adult/senior) para aplicar descuentos, y debe validar que sea coherente con la edad real.
- **Alternativas:** (a) derivar el tipo siempre de la edad (ignorar cualquier campo `passengerType`); (b) mockear `passengerType` y `dateOfBirth` en los datos del pasajero, y validar que coincidan.
- **Opción elegida:** (b). El mock de pasajero trae ambos campos. F1 (`PassengerValidationFilter`) valida la coherencia con `calculateAge`/`passengerTypeForAge` (child < 12, adult 12–65, senior > 65) y agrega error `PASSENGER_TYPE_AGE_MISMATCH` si no coinciden.
- **Motivo:** simula un sistema real donde el tipo de pasajero puede haber sido cargado manualmente (con posibilidad de error humano) y donde la letra pide explícitamente detectar esa inconsistencia como caso de prueba.
- **Consecuencias/Trade-offs:** los filtros de precio (F6) confían en `passenger.passengerType` tal cual viene, ya validado por F1; no vuelven a derivarlo de la edad.

### D7 — Validación de ítems malformados
- **Problema:** un lote de reservas puede traer ítems con estructura inválida (campos faltantes, tipos incorrectos), y hay que decidir si eso es un error HTTP 400 global o un resultado por ítem.
- **Alternativas:** (a) rechazar todo el request con 400 si algún ítem es inválido; (b) validar cada ítem individualmente y reportarlo como `REJECTED` dentro de los resultados, sin pasar por el pipeline; 400 solo si falta el array `reservations`.
- **Opción elegida:** (b), con Zod por ítem.
- **Motivo:** permite procesar el resto del lote aunque un ítem esté malformado (coherente con D5), y reserva el 400 para errores estructurales del request completo (contrato HTTP roto).
- **Consecuencias/Trade-offs:** el cliente debe revisar el array de `results` para detectar ítems rechazados por formato, no solo el status code HTTP.

### D8 — Carga de entidades antes del pipeline
- **Problema:** los filtros de validación (F1, F2) necesitan el pasajero y el vuelo cargados; hay que decidir si cada filtro hace su propia búsqueda o si se centraliza.
- **Alternativas:** (a) cada filtro busca la entidad que necesita (F1 busca pasajero, F2 busca vuelo); (b) un componente previo al pipeline (`ReservationContextLoader`) busca ambas entidades y arma el contexto inicial; F1/F2 solo validan lo ya cargado.
- **Opción elegida:** (b). El loader actúa como la "fuente" (source) del pipeline en el patrón Pipes & Filters, separada de los filtros propiamente dichos.
- **Motivo:** evita duplicar lógica de acceso a datos en los filtros de validación, y respeta la idea de Pipes & Filters de tener una fuente de datos separada de las etapas de procesamiento.
- **Consecuencias/Trade-offs:** F1/F2 no lanzan al no encontrar la entidad; asumen que puede venir `null` y lo traducen a un issue de negocio (`PASSENGER_NOT_FOUND` / `FLIGHT_NOT_FOUND`).

### D9 — Los asientos no se descuentan al procesar
- **Problema:** procesar una reserva válida podría, en un sistema real, decrementar `availableSeats` del vuelo.
- **Alternativas:** (a) descontar asientos al completar una reserva; (b) no mutar el estado de los vuelos mock.
- **Opción elegida:** (b), no se descuentan asientos.
- **Motivo:** el ejercicio no pide gestión de inventario ni persistencia entre procesamientos; los mocks se cargan una sola vez al iniciar el proceso y se busca previsibilidad total en los tests (correr el mismo POST dos veces da el mismo resultado de disponibilidad).
- **Consecuencias/Trade-offs:** `NO_SEATS_AVAILABLE` depende únicamente del dato fijo del mock (ej. `LA8070` con 0 asientos), no de reservas previas procesadas en la misma corrida del servidor.

### D10 — Reintentos y timeout de la API de cambio
- **Problema:** cuántas veces reintentar la llamada a la API externa y con qué timeout, sin bloquear el request más de lo razonable.
- **Alternativas:** timeout único global vs. timeout por intento; número fijo de reintentos vs. backoff exponencial largo.
- **Opción elegida:** hasta 3 intentos totales, timeout de 5 s **por intento** (no acumulado), con backoff corto entre intentos (`delayMs × número de intento`).
- **Motivo:** balance entre dar oportunidad a fallos transitorios de red y no demorar excesivamente el procesamiento de un lote de reservas (peor caso ~15 s solo en timeouts, mitigado por el backoff corto).
- **Consecuencias/Trade-offs:** en tests, `delayMs = 0` para no esperar tiempos reales; en producción el backoff es configurable vía `PipelineConfig`.

### D11 — Orden fijo de filtros, configuración solo habilita/parametriza
- **Problema:** la letra permite configurar el pipeline, pero el orden de los 7 filtros está definido por el dominio (ej. no tiene sentido calcular impuestos antes que el precio base).
- **Alternativas:** (a) permitir reordenar filtros vía configuración; (b) fijar el orden en código y que la configuración solo habilite/deshabilite filtros y ajuste sus parámetros.
- **Opción elegida:** (b). `PipelineFactory` define el orden 1→7 en código; `PipelineConfig` solo tiene `enabled` + parámetros por filtro.
- **Motivo:** reordenar filtros de negocio (ej. impuestos antes que descuentos) no es un caso de uso válido del dominio y agregar esa flexibilidad solo introduce riesgo de configuraciones inconsistentes sin beneficio real.
- **Consecuencias/Trade-offs:** la configuración es más simple de validar (Zod parcial por filtro) y más segura, a costa de menos flexibilidad teórica.

### D12 — Invalidación manual de cache
- **Problema:** la letra menciona "invalidación manual de cache si es necesario" como funcionalidad opcional/deseable.
- **Alternativas:** (a) no exponerla; (b) exponerla solo internamente (método de servicio, sin endpoint HTTP); (c) exponerla como endpoint HTTP adicional.
- **Opción elegida:** ambas: `ExchangeRateService.invalidateCache()` a nivel de servicio, y un endpoint adicional `DELETE /exchange-rates/cache` que lo expone por HTTP.
- **Motivo:** cumple la funcionalidad opcional de la letra de forma completa y testeable end-to-end (los tests de integración pueden forzar una invalidación real vía HTTP).
- **Consecuencias/Trade-offs:** es un 5º endpoint no listado explícitamente entre los 4 principales de la letra; se documenta como adicional en el README.

### D13 — Procesamiento sincrónico y estado en memoria
- **Problema:** la letra pide un endpoint de estado (`GET /reservations/:id/status`), lo que sugiere procesamiento asincrónico, pero también pide una respuesta directa del POST con los resultados.
- **Alternativas:** (a) POST asincrónico que solo encola y el estado se consulta después; (b) POST sincrónico que procesa y devuelve el resultado completo, guardando también el estado consultable por id.
- **Opción elegida:** (b). El `id` de cada reserva es **obligatorio** y lo envía el cliente (no se genera server-side). El POST procesa sincrónicamente y devuelve el resultado completo; el mismo resultado (y un estado `PROCESSING` transitorio antes de terminar) se guarda en un store en memoria consultable vía `GET /reservations/:id/status` (404 si no existe).
- **Motivo:** simplifica el modelo (sin colas, sin jobs en background) mientras se sigue cumpliendo el contrato de un endpoint de status independiente, útil por ejemplo para que un cliente reconsulte el resultado sin reenviar el POST.
- **Consecuencias/Trade-offs:** el estado en memoria se pierde al reiniciar el servidor (aceptable para un ejercicio); si el cliente reutiliza un `id` ya usado, el nuevo resultado sobrescribe al anterior en el store.

---

## Decisiones menores

### Arquitectura del pipeline (Pipes & Filters)
- **Decisión:** separar claramente "fuente" (`ReservationContextLoader`), "filtros" (7 clases con contrato `Filter`) y "runner" (`Pipeline`, que orquesta y no contiene lógica de negocio), ensamblados por una `PipelineFactory`.
- **Problema:** evitar que la lógica de orquestación (orden, manejo de errores, trazabilidad) se mezcle con la lógica de negocio de cada filtro.
- **Alternativas:** un único "service" monolítico que hace todos los pasos inline vs. el patrón Pipes & Filters explícito con componentes intercambiables.
- **Opción elegida:** Pipes & Filters explícito, como pide la letra.
- **Motivo:** requisito del ejercicio; además favorece testear cada filtro de forma aislada.
- **Consecuencias/Trade-offs:** más archivos/indirección que una función única, pero cada pieza es unitariamente testeable y reemplazable (p. ej. deshabilitar un filtro por config).

### Contrato `Filter`
- **Decisión:** `interface Filter { readonly name: FilterName; process(ctx: ReservationContext): Promise<ReservationContext> }`, siempre async y siempre devuelve un contexto nuevo (inmutable).
- **Motivo:** uniformidad (todos los filtros son async aunque algunos sean síncronos internamente, como F4–F7) y facilidad para testear con fakes que implementen la misma interfaz.
- **Consecuencias/Trade-offs:** los filtros síncronos devuelven `Promise.resolve(...)` sin overhead relevante.

### Estructura del `ReservationContext`
- **Decisión:** objeto inmutable con `reservation`, `passenger`, `flight` (nullable hasta que el loader los resuelve), `pricing` (parcial, se va completando), `metadata.exchange` (opcional), `issues` (array de `Issue`), `trace` (array de pasos con nombre/estado/duración) y `halted` (boolean).
- **Motivo:** un único objeto que fluye por todo el pipeline evita parámetros posicionales y permite trazabilidad completa del recorrido.
- **Consecuencias/Trade-offs:** helpers (`withError`, `withWarning`, `withPricing`, `withExchangeMetadata`) siempre devuelven un objeto nuevo (spread), nunca mutan el original — necesario para que el runner pueda registrar la traza sin efectos secundarios inesperados.

### Manejo de errores/warnings (relacionado con D5, D7)
- **Decisión:** `Issue` tiene `severity: 'error' | 'warning'`. Un error marca `halted = true` (detiene el resto de los filtros); un warning no detiene nada.
- **Motivo:** distinción clara entre "esto impide continuar" y "esto es informativo pero no bloqueante" (p. ej. fallback de tipo de cambio).

### Configuración del pipeline (relacionado con D11)
- **Decisión:** la configuración vive en memoria (`PipelineConfigService`), con una config global mutable vía `PUT /pipeline/config` y la posibilidad de un override parcial por request (sin persistir) en `POST /reservations/process`.
- **Motivo:** permite tanto cambiar el comportamiento del sistema en caliente como probar un comportamiento puntual sin afectar otras reservas concurrentes.

### API de tipo de cambio elegida
- **Decisión:** ExchangeRate-API v4 (`https://api.exchangerate-api.com/v4/latest/{base}`), gratuita y sin API key para el endpoint `latest`.
- **Motivo:** no requiere credenciales (evita manejar secretos en un ejercicio académico) y el formato de respuesta (`{ base, rates: { XXX: number, ... } }`) es simple de validar con Zod.
- **Consecuencias/Trade-offs:** la URL base es configurable por `EXCHANGE_API_BASE_URL`, por lo que cambiar de proveedor no requiere tocar código, solo la variable de entorno (y potencialmente el schema de validación si el shape cambia).

### Retry, timeout y cache (relacionado con D10, D12)
- **Decisión:** `withRetry` genérico (no acoplado a HTTP) + `RateCache` con TTL de 1 hora + `ExchangeRateService` que combina ambos con single-flight (llamadas concurrentes al mismo tiempo de cambio comparten una única promesa en curso) para evitar llamadas duplicadas a la API bajo carga.
- **Motivo:** el single-flight es importante porque un lote de reservas se procesa en paralelo (`Promise.all`) y varias reservas pueden necesitar la misma tasa de cambio simultáneamente.
- **Corrección (Sesión 6, durante TICKET-37):** el `ExchangeRateService` es un singleton (para compartir el cache entre requests), pero `timeoutMs`/`maxAttempts`/`retryDelayMs`/`fallbackRates` **no** pueden fijarse en su constructor, porque entonces un override de config por request (`POST /reservations/process` con `config.exchangeRate.*`, o un `PUT /pipeline/config` previo) no tendría ningún efecto real sobre esos parámetros. Se movieron a un parámetro `ExchangeRateOperationalConfig` pasado en cada llamada a `getRate(target, config)`.
- **Corrección (revisión de código post-Sesión 6):** por el mismo motivo, `cacheTtlMs` tampoco puede fijarse en el constructor del cache — se movió de `RateCache`/constructor a un parámetro de `RateCache.get(base, ttlMs)`, tomado también de `ExchangeRateOperationalConfig` en cada llamada. Así un override de `cacheTtlMs` por request sí afecta si una entrada cacheada se considera vigente para esa llamada puntual.
- **Limitación conocida (no resuelta, documentada a propósito):** el single-flight (`fetchRatesSingleFlight`) comparte la promesa de fetch en curso entre llamadas concurrentes, pero si dos requests concurrentes llegan con `timeoutMs`/`maxAttempts`/`retryDelayMs` **distintos** mientras ya hay un fetch en vuelo, la llamada que llega segunda queda sujeta a los parámetros de la primera (no a los propios) hasta que ese fetch se resuelva. No se resolvió porque ningún caso de la letra ejercita overrides de config distintos en simultáneo, y la alternativa (no compartir la promesa entre configs distintas) reintroduciría llamadas duplicadas a la API bajo carga, que es justamente lo que el single-flight evita. Detectado en la revisión de código posterior a la Sesión 6.

### Organización de mocks con fechas relativas
- **Decisión:** `dateOfBirth` de pasajeros y `departureAt` de vuelos se generan con helpers relativos a "ahora" (`yearsAgo`, `daysFromNow`) en vez de fechas absolutas hardcodeadas.
- **Motivo:** evita que los tests (y los fixtures de la letra, como "vuelo en el pasado") se rompan con el paso del tiempo real.

### Cálculo y orden de precios (D1, D3, D4)
- Ver fórmula completa en `IMPLEMENTATION_PLAN.md`. Redondeo a 2 decimales **solo en la respuesta** (`ReservationResultMapper`), nunca durante los cálculos intermedios del pipeline, para no acumular error de redondeo entre filtros.

### Redondeo monetario
- **Decisión:** `round2(n)` usa `Math.round((n + Number.EPSILON) * 100) / 100` (sumar `EPSILON` **antes** de multiplicar por 100, no después) corrigiendo el caso clásico de imprecisión de punto flotante (ej. `2.675 * 100` da `267.49999...` en JS puro). Verificado experimentalmente contra `159.375 → 159.38` y `2.675 → 2.68`.
- **Motivo:** los montos de dinero deben redondear "half up" de forma predecible en los casos de prueba de la letra.

### Forma de la respuesta pública de una reserva (`ReservationResult`)
- **Decisión:** además de `pricing` y `totalLocal`, la respuesta incluye un campo `exchange` con la metadata completa de la conversión de moneda (`baseCurrency`, `targetCurrency`, `rate`, `source`, `retrievedAt`, `originalPrice`, `convertedPrice`, redondeado a 2 decimales igual que `pricing`) cuando F3 estuvo habilitado.
- **Motivo:** surgió al escribir los tests de integración de C1/C2 (TICKET-37): esos casos piden verificar explícitamente `source: api`, el precio original y el convertido, no solo el total final en moneda local — exponer solo `totalLocal` no alcanzaba para eso.

### Endpoint de status y redondeo de resultados guardados
- **Decisión:** el resultado guardado en `ReservationStatusStore` ya viene con el pricing redondeado (el mapeo a `ReservationResult` ocurre antes de guardar), así `GET /status` devuelve exactamente lo mismo que devolvió el POST.

### Procesamiento paralelo del lote
- **Decisión:** cada ítem del lote se procesa con su propia promesa (`Promise.all` sobre un `.map` async), nunca `Promise.allSettled` "a mano": cada función de procesamiento por ítem ya captura sus propios errores internamente (vía el `Pipeline`, que nunca propaga excepciones) y siempre resuelve, nunca rechaza.
- **Motivo:** un error de programación real en un filtro no debe convertirse en una excepción no controlada a nivel de `Promise.all` que tire abajo el request completo.

### Stack de testing
- **Decisión:** Jest + ts-jest, sin llamadas reales a Internet (siempre con fakes/stubs para `fetch` y para `ExchangeRateProvider`), `supertest` para integración HTTP, `FakeClock` para todo lo sensible al tiempo.

### Idioma
- **Decisión:** código (nombres de variables, funciones, tipos, mensajes de error internos) en inglés; documentación (`README.md`, `DESIGN_DECISIONS.md`, `IMPLEMENTATION_PLAN.md`) en español.
- **Motivo:** convención habitual en proyectos de software en equipos hispanohablantes: código en inglés para legibilidad/convención de la industria, documentación en el idioma del equipo y de la letra del ejercicio.

### Estrategia de testing
- **Decisión original:** tests unitarios por cada filtro/servicio/utilidad con dependencias inyectadas (Clock, Logger, repos, provider) reemplazadas por fakes; tests de integración HTTP (supertest) que cubren específicamente cada caso de prueba numerado de la letra (B1–B4, P1–P4, C1–C4, R1–R4), mapeados 1 a 1 en `tests/integration/letter.*.test.ts`.
- **Ajuste de alcance (replanificación, ver `IMPLEMENTATION_PLAN.md`):** procesar el plan ticket a ticket con verificación completa en cada uno resultó demasiado lento. Se redujo el alcance de tests unitarios **dedicados** al núcleo del pipeline: `Filter`/`ReservationContext`/`Pipeline` (runner), los 7 filtros, `ReservationContextLoader`, `PipelineFactory`, y el soporte de F3 (`RateCache`, `withRetry`, `ExchangeRateApiProvider`, `ExchangeRateService`) — porque ahí vive la lógica de negocio y la letra pide casos concretos de timeout/retry/cache/fallback. Los utilitarios (`shared/`), el dominio (`domain/`) y los repositorios (`repositories/`) de las primeras sesiones mantienen sus tests (ya estaban hechos antes del ajuste). El resto del código (schemas Zod, mapper, stores, servicios de configuración/procesamiento, capa HTTP completa) se implementó **sin** suite unitaria dedicada, verificado con `build`+`lint` y con los 16 tests de integración de la letra (que son un entregable obligatorio, no un test "extra") — esos sí cubren indirectamente todo ese código, porque cada request HTTP real de la Fase 8 atraviesa la app completa.
- **Motivo del ajuste:** priorizar velocidad de entrega sin resignar cobertura donde más importa (reglas de negocio del pipeline) ni los 16 casos explícitos de la letra.

---

## Interpretaciones de la letra

> Esta sección distingue explícitamente qué pidió la letra del ejercicio y qué tuvo que **interpretarse** por no estar completamente especificado.

| Lo que pidió la letra | Qué se interpretó |
|---|---|
| "Detección de moneda por país" con 4 ejemplos (AR, BR, US, EU) | Se interpretó "EU" como cualquier país de la eurozona (ES, FR, DE, IT, PT, NL, …) → EUR, y se agregó una tabla más amplia de países (CL, UY, MX, CO, PE, GB, JP) para cubrir los fixtures de vuelos pedidos. |
| Cálculo de precio con descuentos por lealtad y por tipo de pasajero | La letra no especifica si los descuentos son secuenciales o aditivos sobre el precio base → D4 (secuenciales). |
| Impuestos, combustible y tasa aeroportuaria | La letra no especifica la base de cálculo de cada uno → D3 (impuestos sobre subtotal con descuentos, combustible sobre precio base por clase, tasa fija). |
| Manejo de fallas de la API de tipo de cambio | La letra no dice explícitamente si debe haber una tasa de fallback configurable o fija → D2 (tabla configurable + fallback a USD). |
| "Invalidación manual de cache si es necesario" (aclaración, no requisito estricto) | Se interpretó como una funcionalidad a implementar igual, exponiéndola como endpoint adicional (D12) para que sea verificable end-to-end. |
| Endpoint de estado de una reserva | La letra no aclara si el procesamiento es asincrónico → D13 (sincrónico, con estado igualmente consultable por id). |
| `passengerType` y coherencia con la edad | La letra pide simular pasajeros de distintos tipos, pero no especifica si el tipo se deriva de la edad o es un dato independiente que puede estar mal cargado → D6 (dato independiente + validación de coherencia como caso de error explícito). |
| Reintentos/timeout de la API externa | La letra no fija números exactos → D10 (3 intentos totales, 5 s por intento, elegido para acotar la latencia máxima del peor caso a un valor razonable para un ejercicio). |
| Formato exacto de la respuesta de error / status de reserva | No especificado en detalle por la letra → se definió un contrato propio (`{ error: { code, message, details? } }` para errores HTTP, y `ReservationResult` con `status`, `errors`, `warnings`, `pricing`, `trace` para resultados de reserva), documentado en el README. |
