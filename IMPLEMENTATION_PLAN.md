# Plan de implementación y seguimiento — Sistema de Reservas de Vuelos (Pipes & Filters)

> **Fuente de verdad del avance del proyecto.** La letra del ejercicio (*Ejercicio de Aplicación 1*) es la fuente de verdad funcional; `DESIGN_DECISIONS.md` registra las decisiones de diseño; este archivo registra **qué hay que hacer, en qué orden y qué ya está terminado**.

## Cómo usar este archivo

**Estados**
- `- [ ] TICKET-XX — …` → pendiente
- `- [ ] TICKET-XX — … 🚧 En progreso (@integrante)` → tomado por alguien (agregar la marca al empezar)
- `- [x] TICKET-XX — …` → terminado **y verificado**

**Reglas**
1. Tomar siempre un ticket pendiente cuyas **dependencias estén todas en `[x]`**. La tabla de *olas* muestra qué se puede hacer en paralelo.
2. Un ticket se marca `[x]` solo cuando se cumplen **todos** sus criterios de aceptación **y** la *Definición de Terminado* global.
3. Al cerrar un ticket, completar su campo **Notas de implementación** (qué se hizo, decisiones tomadas, desvíos).
4. Si aparece trabajo nuevo necesario, agregarlo como ticket nuevo en la posición que corresponda por dependencias (ID siguiente libre, p. ej. `TICKET-42`) y explicar en sus notas por qué fue necesario.
5. Si una decisión de diseño cambia o surge una nueva, actualizar `DESIGN_DECISIONS.md` en el mismo ticket.
6. Ante una ambigüedad de la letra no contemplada: **no asumir**, consultar al equipo y registrar la decisión.

**Flujo Git sugerido:** una rama por ticket (`feature/TICKET-XX-descripcion-corta`), PR hacia `main`, y en ese PR marcar el checkbox y completar las notas.

## Definición de Terminado (aplica a todos los tickets)
- `npm run build` sin errores de TypeScript (modo `strict`, sin `any` injustificados, sin `@ts-ignore`).
- `npm run lint` sin errores.
- `npm test` completo en verde (sin tests deshabilitados ni `.skip`).
- Tests nuevos para la funcionalidad del ticket (cuando aplique), sin llamadas reales a Internet.
- `DESIGN_DECISIONS.md` actualizado si hubo decisiones.
- Notas de implementación completadas en este archivo.

## Resumen de decisiones ya tomadas (detalle en `DESIGN_DECISIONS.md`)

| # | Decisión |
|---|----------|
| D1 | F3 (tipo de cambio) convierte el **precio base del vuelo** USD → moneda del destino y guarda original + convertido en metadata. F4–F7 calculan en USD. La respuesta agrega el total en moneda local usando la tasa de metadata. |
| D2 | Si la API falla: tasa de la tabla `fallbackRates` configurable; si la moneda no está → USD (tasa 1). Siempre con warning. |
| D3 | Impuestos 12% sobre el subtotal con descuentos · combustible 8% sobre el precio base por clase (salida F4) · tasa aeropuerto $25. |
| D4 | Descuentos secuenciales (cada filtro aplica sobre el precio que recibe). |
| D5 | Un fallo detiene **esa** reserva: validación → `REJECTED`; excepción/datos corruptos → `FAILED`. Las demás reservas del lote siguen. El fallo de la API de cambio no es excepción: fallback + warning. |
| D6 | `passengerType` y `dateOfBirth` están en el mock del pasajero; desajuste edad/tipo = error. Child < 12, adult 12–65, senior > 65. |
| D7 | Validación Zod por ítem: ítem malformado → `REJECTED` sin pasar por filtros; `400` solo si el body no trae `reservations: []`. |
| D8 | `ReservationContextLoader` (fuente del pipeline) busca pasajero y vuelo antes de F1; F1/F2 solo validan. |
| D9 | Procesar reservas **no** descuenta asientos. |
| D10 | Hasta 3 intentos totales, timeout de 5 s **por intento**, backoff corto. |
| D11 | Orden de filtros fijo (1–7); la config solo habilita/deshabilita y parametriza. |
| D12 | Invalidación manual de cache: `invalidateCache()` + endpoint extra `DELETE /exchange-rates/cache`. |
| D13 | `POST` sincrónico; `id` obligatorio enviado por el cliente; estado y resultado en memoria para `GET /reservations/:id/status` (404 si no existe). |

**Fórmula de precios (USD, precisión completa, redondeo a 2 decimales solo en la respuesta):**
```
classBase = flightBase × multiplicadorClase            (F4: economy 1 · business 2.5 · first 4)
afterLoyalty = classBase × (1 − descuentoTier)         (F5: bronze 5% · silver 10% · gold 15%)
subtotal = afterLoyalty × (1 − descuentoTipo)          (F6: child 25% · senior 15% · adult 0%)
taxes = subtotal × 0.12 · fuel = classBase × 0.08 · airportFee = 25   (F7)
total = subtotal + taxes + fuel + airportFee
```

## Olas de trabajo (qué se puede paralelizar)

| Ola | Tickets (paralelizables entre sí) |
|-----|-----------------------------------|
| 1 | 01, 03 |
| 2 | 02 |
| 3 | 04, 05, 21, 31 |
| 4 | 06, 07, 08, 10, 12, 20, 22, 26, 28 |
| 5 | 09, 11, 14, 15, 16, 17, 18, 19, 23, 27, 29 |
| 6 | 13, 24 |
| 7 | 25 |
| 8 | 30 |
| 9 | 32 |
| 10 | 33, 34, 35 |
| 11 | 36, 37, 38, 39 |
| 12 | 40 |
| 13 | 41 |

---

## Fase 0 — Base del proyecto

- [x] TICKET-01 — Scaffolding del proyecto TypeScript + Express
  - **Objetivo:** tener un proyecto Node.js/TypeScript compilable con la estructura de carpetas acordada.
  - **Descripción:** `npm init`; instalar `express`, `zod` y dev-deps `typescript`, `tsx`, `@types/node`, `@types/express`. `tsconfig.json` con `strict: true`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes` (si no complica), `outDir: dist`, incluyendo `src/` y `data/`. `tsconfig.build.json` que excluya tests. Scripts `build`, `dev` (tsx watch), `start`. `.gitignore` (node_modules, dist, coverage, .env). `src/config/env.ts` que lee `PORT` (default 3000), `EXCHANGE_API_BASE_URL` (default `https://api.exchangerate-api.com/v4/latest`) y `LOG_LEVEL`. `.env.example`. Carpetas vacías con `.gitkeep`: `src/{config,domain,pipeline,filters,repositories,services/exchange,http/{routes,controllers,schemas,middleware},shared}`, `data/`, `tests/{unit,integration,helpers}`, `postman/`.
  - **Archivos:** `package.json`, `tsconfig.json`, `tsconfig.build.json`, `.gitignore`, `.env.example`, `src/config/env.ts`.
  - **Dependencias:** —
  - **Criterios de aceptación:**
    - `npm install` y `npm run build` terminan sin errores.
    - La estructura de carpetas coincide con la acordada.
    - `env.ts` exporta un objeto tipado con defaults.
  - **Notas de implementación:** Proyecto inicializado con `express` y `zod` como dependencias, y `typescript`/`tsx`/`@types/node`/`@types/express` como dev-deps. `tsconfig.json` con `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride` y `exactOptionalPropertyTypes` habilitados (no generó conflictos). `tsconfig.build.json` extiende el base excluyendo `tests/**` y archivos `*.test.ts`/`*.spec.ts`. `env.ts` exporta `Env` tipado (`PORT: number`, `EXCHANGE_API_BASE_URL: string`, `LOG_LEVEL: string`) con parseo seguro de `PORT` (fallback a 3000 si no es un número finito positivo) y defaults acordados. Se creó la estructura completa de carpetas con `.gitkeep`. `npm install` y `npm run build` corren sin errores; `dist/` se genera correctamente. Aún no se agregó `jest`/`eslint` (corresponde a TICKET-02), por lo que `npm test`/`npm run lint` no se ejecutan todavía en este ticket.

- [ ] TICKET-02 — Configuración de testing y linting
  - **Objetivo:** poder escribir y correr tests unitarios y de integración y mantener calidad de código.
  - **Descripción:** instalar `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest`, `eslint`, `typescript-eslint`. `jest.config.ts` (preset ts-jest, `roots: ['<rootDir>/tests']`, cobertura sobre `src/` y `data/`). `eslint.config.mjs` con reglas recomendadas + `@typescript-eslint/no-explicit-any: error`. Scripts `test`, `test:watch`, `test:coverage`, `lint`. Un smoke test trivial para validar la configuración (se borra o reemplaza luego).
  - **Archivos:** `jest.config.ts`, `eslint.config.mjs`, `package.json`, `tests/smoke.test.ts`.
  - **Dependencias:** TICKET-01
  - **Criterios de aceptación:**
    - `npm test`, `npm run test:coverage` y `npm run lint` funcionan.
    - Un `any` explícito en `src/` hace fallar el lint.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-03 — `DESIGN_DECISIONS.md` inicial
  - **Objetivo:** documentar desde el inicio las decisiones del plan aprobado.
  - **Descripción:** crear el archivo con una plantilla por decisión (decisión · problema · alternativas · opción elegida · motivo · consecuencias/trade-offs). Registrar: estructura del pipeline (Pipes & Filters, runner, fuente/loader, filtros por reserva), contrato `Filter`, estructura del `ReservationContext`, manejo de errores/warnings (D5, D7), configuración (D11, config por request), API elegida (ExchangeRate-API v4), retry/timeout (D10), cache 1 h + single-flight, fallback (D2), invalidación (D12), organización de mocks con fechas relativas, cálculo y orden de precios (D1, D3, D4), tipo de pasajero (D6), carga de entidades (D8), asientos (D9), endpoint de status (D13), redondeo, procesamiento paralelo del lote, stack (Jest, Zod, logger propio), idioma (código en inglés, docs en español) y estrategia de testing.
  - **Archivos:** `DESIGN_DECISIONS.md`.
  - **Dependencias:** —
  - **Criterios de aceptación:**
    - Están D1–D13 y las decisiones menores, cada una con todos los campos de la plantilla.
    - Hay una sección "Interpretaciones de la letra" que diferencia qué pidió la letra y qué se interpretó.
  - **Notas de implementación:** _(completar al cerrar)_

## Fase 1 — Utilidades, dominio y datos

- [ ] TICKET-04 — Utilidades compartidas (Logger, Clock, dinero, fechas)
  - **Objetivo:** abstracciones transversales inyectables que hacen testeable el resto del sistema.
  - **Descripción:** `Logger` (interfaz `debug/info/warn/error` con contexto opcional) + `ConsoleLogger` (respeta `LOG_LEVEL`) + `SilentLogger` para tests. `Clock` (interfaz `now(): Date`) + `SystemClock`. `round2(n)` para redondeo monetario. Helpers de fechas `daysFromNow(n, clock?)` y `yearsAgo(n, clock?)` para mocks relativos a hoy.
  - **Archivos:** `src/shared/logger.ts`, `src/shared/clock.ts`, `src/shared/money.ts`, `src/shared/dates.ts`, `tests/unit/shared/*.test.ts`, `tests/helpers/FakeClock.ts`.
  - **Dependencias:** TICKET-02
  - **Criterios de aceptación:**
    - `round2` redondea correctamente casos como 159.375 → 159.38 y 2.675 (tener en cuenta la imprecisión de punto flotante; documentar el enfoque).
    - `FakeClock` permite fijar y avanzar el tiempo.
    - Tests unitarios en verde.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-05 — Tipos de dominio
  - **Objetivo:** modelo tipado compartido por todos los módulos.
  - **Descripción:** tipos/uniones: `SeatClass` (`economy|business|first`), `LoyaltyTier` (`none|bronze|silver|gold`), `PassengerType` (`child|adult|senior`), `Passenger`, `Flight`, `ReservationRequest` (`id, passengerId, flightCode, origin, destination, seatClass`), `Issue` (`severity: error|warning, code, message, filter?`), `ReservationStatus` (`PROCESSING|COMPLETED|COMPLETED_WITH_WARNINGS|REJECTED|FAILED`), `PricingBreakdown`, `ExchangeMetadata`. Funciones puras de dominio: `calculateAge(dateOfBirth, now)` y `passengerTypeForAge(age)` (child < 12, adult 12–65, senior > 65).
  - **Archivos:** `src/domain/passenger.ts`, `flight.ts`, `reservation.ts`, `pricing.ts`, `issue.ts`, `tests/unit/domain/passenger.test.ts`.
  - **Dependencias:** TICKET-02
  - **Criterios de aceptación:**
    - Tipos exportados sin `any`.
    - Tests de `calculateAge` (cumpleaños hoy / mañana) y `passengerTypeForAge` en los bordes 11, 12, 65, 66.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-06 — Mapeo país → moneda
  - **Objetivo:** detectar la moneda local del país de destino (letra: "Detección de Moneda por País").
  - **Descripción:** `currencyForCountry(countryCode): string | null` con al menos AR→ARS, BR→BRL, US→USD, EU→EUR (ejemplos de la letra), más CL→CLP, UY→UYU, MX→MXN, CO→COP, PE→PEN, GB→GBP, JP→JPY y países de la eurozona (ES, FR, DE, IT, PT, NL…) → EUR. Insensible a mayúsculas.
  - **Archivos:** `src/domain/currencyByCountry.ts`, `tests/unit/domain/currencyByCountry.test.ts`.
  - **Dependencias:** TICKET-05
  - **Criterios de aceptación:**
    - Los 4 ejemplos de la letra están testeados.
    - Un país desconocido devuelve `null`.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-07 — Datos mock de pasajeros
  - **Objetivo:** base de datos simulada de pasajeros (letra: `/data/mockPassengers.ts`).
  - **Descripción:** array tipado `mockPassengers` con fechas de nacimiento relativas (`yearsAgo`), cubriendo: activos de todos los tiers, inactivos, niños/adultos/seniors y distintos países. Fixtures mínimos, referenciados por los tests:
    - `PAX-001` adulto (35), tier `none`, AR, activo → P1
    - `PAX-002` adulto (40), `gold`, BR, activo → P2
    - `PAX-003` niño (8), `gold`, AR, activo → P3
    - `PAX-004` senior (70), `silver`, ES, activo → P4
    - `PAX-005` adulto, `bronze`, US, **inactivo**
    - `PAX-006` adulto, email inválido, CL
    - `PAX-007` nombre vacío, UY
    - `PAX-008` `passengerType: child` con 30 años (**desajuste edad/tipo**)
    - `PAX-009` adulto, `bronze`, US, activo
    - `PAX-010` adulto, `silver`, MX, activo
  - **Archivos:** `data/mockPassengers.ts`.
  - **Dependencias:** TICKET-04, TICKET-05
  - **Criterios de aceptación:**
    - Compila y se cubren todas las categorías pedidas por la letra.
    - Hay un comentario por fixture que indica el escenario de test que habilita.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-08 — Datos mock de vuelos
  - **Objetivo:** base de datos simulada de vuelos (letra: `/data/mockFlights.ts`).
  - **Descripción:** array tipado `mockFlights` con códigos realistas, rutas, precios, asientos y duraciones variadas y `departureAt` relativa (`daysFromNow`). Fixtures mínimos:
    - `AA001` MIA→JFK, US, base 200, 50 asientos, 180 min, +30 días → P1/P2 (USD, sin conversión)
    - `LA4567` SCL→EZE, AR, base 150, 20 asientos, 130 min, +15 días → C1 (ARS)
    - `AR1300` EZE→GRU, BR, base 100, 10 asientos, 170 min, +20 días → P3 (BRL)
    - `IB6844` EZE→MAD, ES, base 800, **2 asientos**, 780 min, +45 días → P4 (EUR)
    - `LA8070` GRU→SCL, CL, base 300, **0 asientos**, 240 min, +10 días → B3
    - `AA900` JFK→EZE, AR, base 700, 30 asientos, 660 min, **−2 días** → vuelo en el pasado
    - `JL005` JFK→HND, JP, base 1000, 15 asientos, 840 min, +60 días → fallback a USD (JPY fuera de la tabla por defecto)
  - **Archivos:** `data/mockFlights.ts`.
  - **Dependencias:** TICKET-04, TICKET-05
  - **Criterios de aceptación:**
    - Compila y cubre todas las categorías pedidas por la letra (rutas, precios, asientos limitados, duraciones, códigos realistas).
    - Hay un comentario por fixture con el escenario asociado.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-09 — Repositorios de pasajeros y vuelos
  - **Objetivo:** acceso a datos abstraído mediante interfaces (DI y testing).
  - **Descripción:** interfaces `PassengerRepository.findById(id)` y `FlightRepository.findByCode(code)` (async, devuelven entidad o `null`). Implementaciones `InMemoryPassengerRepository` / `InMemoryFlightRepository` que reciben el array por constructor (mocks al iniciar la app o datos custom en tests). Búsqueda de código de vuelo insensible a mayúsculas.
  - **Archivos:** `src/repositories/*.ts`, `tests/unit/repositories/*.test.ts`.
  - **Dependencias:** TICKET-07, TICKET-08
  - **Criterios de aceptación:**
    - Tests de encontrado / no encontrado.
    - Los repositorios no exponen el array interno para mutarlo.
  - **Notas de implementación:** _(completar al cerrar)_

## Fase 2 — Núcleo Pipes & Filters

- [ ] TICKET-10 — Contrato `Filter` y `ReservationContext`
  - **Objetivo:** definir la interfaz común de los filtros y el dato que circula por los pipes.
  - **Descripción:** `interface Filter { readonly name: FilterName; process(ctx): Promise<ReservationContext> }`. `FilterName` como unión de los 7 filtros. `ReservationContext` (reservation, passenger, flight, pricing, metadata.exchange, issues, trace, halted). Helpers inmutables: `createContext(reservation, passenger, flight)`, `withError(ctx, filter, code, message)` (agrega error y marca `halted`), `withWarning(...)`, `withPricing(ctx, partial)`, `withExchangeMetadata(...)`. `CorruptContextError` y guardas de precondición (`requireFlight`, `requirePassenger`, `requireFiniteNonNegative(value, field)`).
  - **Archivos:** `src/pipeline/Filter.ts`, `src/pipeline/ReservationContext.ts`, `src/pipeline/errors.ts`, `tests/unit/pipeline/ReservationContext.test.ts`, `tests/helpers/builders.ts` (builders de passenger/flight/reservation/context).
  - **Dependencias:** TICKET-05
  - **Criterios de aceptación:**
    - Los helpers no mutan el contexto original (testeado).
    - Las guardas lanzan `CorruptContextError` ante `null`, `NaN`, `Infinity` o negativos.
    - Los builders de test quedan disponibles para los tickets de filtros.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-11 — Runner del pipeline (`Pipeline`)
  - **Objetivo:** componente que orquesta los filtros: los "pipes".
  - **Descripción:** `Pipeline` recibe una lista ordenada de `{ filter, enabled }`, un `Clock` y un `Logger`. `run(ctx)` hace fluir el contexto filtro a filtro respetando el orden. Filtro deshabilitado → traza `disabled`. Si `ctx.halted` → los siguientes quedan `skipped`. Captura cualquier excepción: `CorruptContextError` → issue `CORRUPT_CONTEXT`; otra → `FILTER_EXCEPTION`; en ambos casos marca `halted` y el filtro queda `failed` (D5). Registra `durationMs` por filtro. Nunca propaga excepciones.
  - **Archivos:** `src/pipeline/Pipeline.ts`, `tests/unit/pipeline/Pipeline.test.ts`.
  - **Dependencias:** TICKET-04, TICKET-10
  - **Criterios de aceptación (tests con filtros fake):**
    - Los filtros se ejecutan en el orden recibido y cada uno recibe la salida del anterior.
    - Un filtro deshabilitado no se ejecuta y queda `disabled` en la traza.
    - Un error de validación (`halted`) deja los siguientes como `skipped`.
    - **R2:** un filtro que lanza `Error` → issue `FILTER_EXCEPTION`, resto `skipped`, sin excepción hacia afuera.
    - **R4:** un filtro que recibe contexto corrupto → `CORRUPT_CONTEXT`.
    - Hay duraciones en la traza (con `FakeClock`).
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-12 — Configuración del pipeline (tipos, defaults, esquema, merge)
  - **Objetivo:** configuración separada de la lógica, validable y mergeable.
  - **Descripción:** tipo `PipelineConfig` (por filtro: `enabled` + parámetros). Defaults con los valores exactos de la letra: multiplicadores 1/2.5/4; descuentos bronze .05, silver .10, gold .15; child .25, senior .15, adult 0; `taxRate` .12, `airportFeeUSD` 25, `fuelSurchargeRate` .08; exchange `timeoutMs` 5000, `maxAttempts` 3, `retryDelayMs` corto, `cacheTtlMs` 3 600 000, `fallbackRates` (ARS, BRL, EUR, CLP, UYU, MXN; **sin JPY**). Esquema Zod de config **parcial** (rechaza `timeoutMs > 5000`, `maxAttempts` fuera de 1–3, porcentajes fuera de [0,1], montos negativos, claves desconocidas). `mergePipelineConfig(base, partial)` con merge profundo e inmutable.
  - **Archivos:** `src/config/pipelineConfig.ts`, `src/config/defaultPipelineConfig.ts`, `src/http/schemas/pipelineConfig.schema.ts`, `tests/unit/config/*.test.ts`.
  - **Dependencias:** TICKET-05
  - **Criterios de aceptación:**
    - Hay un test que verifica los defaults contra los valores de la letra.
    - El esquema rechaza cada caso inválido listado.
    - El merge no muta la base y permite actualizar un solo campo anidado.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-13 — `ReservationContextLoader` (fuente del pipeline)
  - **Objetivo:** cargar pasajero y vuelo en el contexto inicial (D8).
  - **Descripción:** clase que recibe `PassengerRepository` y `FlightRepository` y expone `load(reservation): Promise<ReservationContext>`: busca ambas entidades y crea el contexto con `passenger`/`flight` en `null` si no existen. No valida ni agrega issues.
  - **Archivos:** `src/pipeline/ReservationContextLoader.ts`, `tests/unit/pipeline/ReservationContextLoader.test.ts`.
  - **Dependencias:** TICKET-09, TICKET-10
  - **Criterios de aceptación:**
    - Con entidades existentes quedan adjuntadas.
    - Con entidades inexistentes quedan en `null` y no hay issues.
  - **Notas de implementación:** _(completar al cerrar)_

## Fase 3 — Filtros de validación

- [ ] TICKET-14 — Filtro 1: Validación de Pasajero
  - **Objetivo:** implementar el filtro 1 de la letra.
  - **Descripción:** `PassengerValidationFilter` (recibe `Clock`). En orden, verifica: pasajero existe (`PASSENGER_NOT_FOUND`), `isActive` (`PASSENGER_INACTIVE`), nombre no vacío (`INVALID_PASSENGER_NAME`), email válido (`INVALID_EMAIL`), edad coherente con `passengerType` (`PASSENGER_TYPE_AGE_MISMATCH`). Los errores de contacto se acumulan (todos los que apliquen) y luego se marca `halted`.
  - **Archivos:** `src/filters/PassengerValidationFilter.ts`, `tests/unit/filters/PassengerValidationFilter.test.ts`.
  - **Dependencias:** TICKET-04, TICKET-10
  - **Criterios de aceptación:**
    - Un pasajero válido pasa sin issues.
    - **B2:** pasajero inexistente → error + `halted`.
    - Pasajero inactivo → error.
    - Email inválido y nombre vacío/solo espacios → error.
    - Hay tests de desajuste: child con 30 años, senior con 50, adult con 8; bordes 12 y 65 como adult válidos.
    - El filtro no muta el contexto de entrada.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-15 — Filtro 2: Validación de Vuelo
  - **Objetivo:** implementar el filtro 2 de la letra.
  - **Descripción:** `FlightValidationFilter` (recibe `Clock`). Verifica: vuelo existe (`FLIGHT_NOT_FOUND`), `availableSeats > 0` (`NO_SEATS_AVAILABLE`), origen de la reserva = origen del vuelo (`ORIGIN_MISMATCH`), destino = destino del vuelo (`DESTINATION_MISMATCH`), `departureAt` futura (`FLIGHT_DEPARTED`). Comparación de códigos IATA insensible a mayúsculas.
  - **Archivos:** `src/filters/FlightValidationFilter.ts`, `tests/unit/filters/FlightValidationFilter.test.ts`.
  - **Dependencias:** TICKET-04, TICKET-10
  - **Criterios de aceptación:**
    - Un vuelo válido pasa sin issues.
    - Vuelo inexistente → error.
    - **B3:** vuelo con 0 asientos → error.
    - Un vuelo con 1 asiento es válido.
    - Hay tests de origen y destino distintos.
    - Salida en el pasado o igual a "ahora" → error.
  - **Notas de implementación:** _(completar al cerrar)_

## Fase 4 — Filtros de precio (paralelizables)

- [ ] TICKET-16 — Filtro 4: Cálculo de Precio Base
  - **Objetivo:** precio según clase de asiento.
  - **Descripción:** `BasePriceFilter(classMultipliers)`. Precondición: `flight` presente y `basePriceUSD` finito ≥ 0. Setea `flightBasePriceUSD`, `classBasePriceUSD` y `currentPriceUSD`.
  - **Archivos:** `src/filters/BasePriceFilter.ts`, `tests/unit/filters/BasePriceFilter.test.ts`.
  - **Dependencias:** TICKET-10, TICKET-12
  - **Criterios de aceptación:**
    - Con base 100: economy 100, business 250, first 400.
    - Toma multiplicadores inyectados por config.
    - **R4:** `basePriceUSD` NaN o negativo, o `flight` null → `CorruptContextError`.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-17 — Filtro 5: Descuentos por Lealtad
  - **Objetivo:** aplicar el descuento por tier.
  - **Descripción:** `LoyaltyDiscountFilter(tierDiscounts)`. Precondiciones: `passenger` presente y `currentPriceUSD` válido. Aplica sobre el precio corriente (D4) y registra `loyaltyDiscountUSD`. Tier `none` → 0.
  - **Archivos:** `src/filters/LoyaltyDiscountFilter.ts`, `tests/unit/filters/LoyaltyDiscountFilter.test.ts`.
  - **Dependencias:** TICKET-10, TICKET-12
  - **Criterios de aceptación:**
    - Sobre 200: bronze 190, silver 180, gold 170, none 200.
    - Falta precio previo → `CorruptContextError`.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-18 — Filtro 6: Ajustes por Tipo de Pasajero
  - **Objetivo:** aplicar el descuento por tipo de pasajero.
  - **Descripción:** `PassengerTypeAdjustmentFilter(discounts)`. Usa `passenger.passengerType` (validado por F1, D6). Aplica sobre el precio corriente; registra `passengerTypeDiscountUSD` y `subtotalUSD`.
  - **Archivos:** `src/filters/PassengerTypeAdjustmentFilter.ts`, `tests/unit/filters/PassengerTypeAdjustmentFilter.test.ts`.
  - **Dependencias:** TICKET-10, TICKET-12
  - **Criterios de aceptación:**
    - Sobre 200: child 150, senior 170, adult 200.
    - Falta precio o pasajero → `CorruptContextError`.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-19 — Filtro 7: Cálculo de Impuestos y Tasas
  - **Objetivo:** calcular impuestos, tasas y total (D3).
  - **Descripción:** `TaxesAndFeesFilter(taxRate, airportFeeUSD, fuelSurchargeRate)`. Precondiciones: `classBasePriceUSD` y precio corriente válidos. Si `subtotalUSD` no existe (F5/F6 deshabilitados), usa el precio corriente. Calcula `taxesUSD`, `fuelSurchargeUSD`, `airportFeeUSD` y `totalUSD`.
  - **Archivos:** `src/filters/TaxesAndFeesFilter.ts`, `tests/unit/filters/TaxesAndFeesFilter.test.ts`.
  - **Dependencias:** TICKET-10, TICKET-12
  - **Criterios de aceptación:**
    - Con subtotal 170 y classBase 200 → taxes 20.40, fuel 16, fee 25, total 231.40.
    - Con subtotal 159.375 y classBase 250 → total 223.50.
    - Falta `classBasePriceUSD` → `CorruptContextError`.
  - **Notas de implementación:** _(completar al cerrar)_

## Fase 5 — Integración con API de tipo de cambio

- [ ] TICKET-20 — Cache de tasas con TTL (`RateCache`)
  - **Objetivo:** cache en memoria de 1 hora con invalidación manual.
  - **Descripción:** `RateCache(ttlMs, clock)` con `get(base)` (devuelve `{rates, fetchedAt}` o `null` si venció), `set(base, rates)` e `invalidate()`.
  - **Archivos:** `src/services/exchange/RateCache.ts`, `tests/unit/exchange/RateCache.test.ts`.
  - **Dependencias:** TICKET-04
  - **Criterios de aceptación (con `FakeClock`):**
    - Hit antes de 1 h; miss al llegar a 1 h o más.
    - `invalidate()` vacía el cache.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-21 — Utilidad de retry (`withRetry`)
  - **Objetivo:** reintentos automáticos genéricos.
  - **Descripción:** `withRetry(fn, { maxAttempts, delayMs, onAttemptFailed })`. Reintenta hasta `maxAttempts` intentos totales (D10) con backoff (`delayMs × intento`) y relanza el último error. `delayMs = 0` en tests.
  - **Archivos:** `src/services/exchange/retry.ts`, `tests/unit/exchange/retry.test.ts`.
  - **Dependencias:** TICKET-02
  - **Criterios de aceptación:**
    - Éxito al primer intento → 1 llamada.
    - Falla, falla y éxito → 3 llamadas.
    - 3 fallas → 3 llamadas y relanza el último error.
    - `onAttemptFailed` se invoca por cada falla.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-22 — Proveedor HTTP de tasas (`ExchangeRateApiProvider`)
  - **Objetivo:** abstraer la API externa detrás de una interfaz.
  - **Descripción:** interfaz `ExchangeRateProvider.fetchRates(base, { timeoutMs }): Promise<Record<string, number>>`. Implementación con `fetch` nativo (inyectable para tests) a `GET {EXCHANGE_API_BASE_URL}/{base}` con `AbortSignal.timeout(timeoutMs)`. Valida el payload con Zod (`rates` numéricos). Errores tipados: `ExchangeApiTimeoutError`, `ExchangeApiNetworkError`, `ExchangeApiHttpError` (status ≠ 2xx), `ExchangeApiInvalidResponseError`.
  - **Archivos:** `src/services/exchange/ExchangeRateProvider.ts`, `src/services/exchange/ExchangeRateApiProvider.ts`, `src/services/exchange/errors.ts`, `tests/unit/exchange/ExchangeRateApiProvider.test.ts`, `tests/helpers/FakeExchangeRateProvider.ts`.
  - **Dependencias:** TICKET-04, TICKET-05
  - **Criterios de aceptación (con `fetch` stub, sin Internet):**
    - Una respuesta válida devuelve las tasas.
    - **R1:** una respuesta más lenta que el timeout → `ExchangeApiTimeoutError`.
    - **R3:** `TypeError('fetch failed')` → `ExchangeApiNetworkError`.
    - HTTP 500 → `ExchangeApiHttpError`.
    - Un JSON inválido → `ExchangeApiInvalidResponseError`.
    - `FakeExchangeRateProvider` es programable (éxito, error, demora, contador de llamadas).
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-23 — Servicio de tipo de cambio (`ExchangeRateService`)
  - **Objetivo:** combinar cache, retry, timeout, fallback y logging (sección "Funcionalidades del Filtro de Tipo de Cambio").
  - **Descripción:** interfaz `ExchangeRateService.getRate(target): Promise<RateResult>` con `RateResult = { rate, source: 'api'|'cache'|'fallback-default'|'fallback-usd', retrievedAt, failureReason? }` e `invalidateCache()`. Flujo: target USD → tasa 1; cache vigente → `cache`; si no, `withRetry(provider.fetchRates('USD'))` con timeout por intento (≤ 5000 ms) → guarda en cache → `api`; si se agotan los intentos → `fallbackRates[target]` (`fallback-default`) o tasa 1 (`fallback-usd`). Llamadas concurrentes comparten la promesa en curso (single-flight). Loguea cada intento fallido (`warn`) y el agotamiento (`error`). Nunca lanza por fallos de la API. Parámetros tomados de la config.
  - **Archivos:** `src/services/exchange/ExchangeRateService.ts`, `tests/unit/exchange/ExchangeRateService.test.ts`.
  - **Dependencias:** TICKET-06, TICKET-12, TICKET-20, TICKET-21, TICKET-22
  - **Criterios de aceptación:**
    - Primera llamada → `api`, 1 llamada al provider.
    - **C4:** segunda llamada dentro de 1 h → `cache`, sin nueva llamada; después de 1 h → nueva llamada.
    - `invalidateCache()` fuerza una nueva llamada.
    - **C3/R1/R3:** el provider falla 3 veces → 3 intentos, `fallback-default` con tasa de la tabla, logs `warn` ×3 y `error` ×1 (logger espía).
    - La moneda JPY fuera de la tabla → `fallback-usd` con tasa 1.
    - 10 `getRate` concurrentes → 1 llamada al provider.
    - Un éxito en el 2.º intento → `api`.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-24 — Filtro 3: Enriquecimiento con Tipo de Cambio
  - **Objetivo:** implementar el filtro 3 de la letra (D1, D2).
  - **Descripción:** `ExchangeRateFilter(exchangeRateService)`. Precondición: `flight` con `basePriceUSD` válido. Detecta la moneda con `currencyForCountry(flight.destinationCountry)`; si no hay mapeo → warning `UNKNOWN_DESTINATION_CURRENCY` y USD. Obtiene la tasa y guarda `metadata.exchange = { baseCurrency: 'USD', targetCurrency, rate, source, retrievedAt, originalPrice, convertedPrice }`. Si la fuente es fallback → warning `EXCHANGE_RATE_FALLBACK` (indica tasa por defecto o USD). Nunca marca `halted` por fallos de la API.
  - **Archivos:** `src/filters/ExchangeRateFilter.ts`, `tests/unit/filters/ExchangeRateFilter.test.ts`.
  - **Dependencias:** TICKET-06, TICKET-10, TICKET-23
  - **Criterios de aceptación (con servicio fake):**
    - **C1:** destino AR con tasa 1000 → base 150 convertido a 150 000 ARS y metadata completa.
    - **C2:** destino BR y ES → BRL y EUR con sus tasas.
    - Destino US → USD con tasa 1, sin warning.
    - **C3:** fuente fallback → warning y la reserva no queda `halted`.
    - País sin mapeo → warning y USD.
  - **Notas de implementación:** _(completar al cerrar)_

## Fase 6 — Ensamblado y servicios de aplicación

- [ ] TICKET-25 — `PipelineFactory`
  - **Objetivo:** único lugar que define el orden fijo de los filtros y los construye desde la config (D11).
  - **Descripción:** `PipelineFactory(deps: { clock, logger, exchangeRateService })` con `create(config): Pipeline`. Instancia los 7 filtros con sus parámetros y los marca `enabled` según la config, en el orden 1 Pasajero → 2 Vuelo → 3 Tipo de cambio → 4 Precio base → 5 Lealtad → 6 Tipo pasajero → 7 Impuestos.
  - **Archivos:** `src/pipeline/PipelineFactory.ts`, `tests/unit/pipeline/PipelineFactory.test.ts`.
  - **Dependencias:** TICKET-11, TICKET-12, TICKET-14, TICKET-15, TICKET-16, TICKET-17, TICKET-18, TICKET-19, TICKET-24
  - **Criterios de aceptación:**
    - El orden de nombres es exactamente el de la letra.
    - Deshabilitar un filtro en la config lo refleja en la traza.
    - Cambiar un parámetro (p. ej. `taxRate`) cambia el resultado.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-26 — Esquema Zod de la reserva y del body de procesamiento
  - **Objetivo:** detectar datos malformados (D7).
  - **Descripción:** `reservationRequestSchema` (`id`, `passengerId` y `flightCode` strings no vacíos; `origin`/`destination` IATA de 3 letras; `seatClass` en el enum). `processRequestBodySchema` = `{ reservations: unknown[] (mín. 1), config?: PartialPipelineConfig }`, validando cada ítem por separado. Función `parseReservationItem(raw)` → `{ ok, value } | { ok: false, issues }` con mensajes legibles.
  - **Archivos:** `src/http/schemas/reservationRequest.schema.ts`, `tests/unit/schemas/reservationRequest.schema.test.ts`.
  - **Dependencias:** TICKET-05
  - **Criterios de aceptación:**
    - **B4:** faltan campos, tipos incorrectos, `seatClass` inválido o ítem no-objeto → `ok: false` con detalle.
    - Una reserva correcta → `ok: true`.
    - Un body sin `reservations` array → inválido.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-27 — `ReservationResultMapper`
  - **Objetivo:** transformar el contexto final en la respuesta pública.
  - **Descripción:** `toReservationResult(ctx)`: deriva el `status` (hay `CORRUPT_CONTEXT`/`FILTER_EXCEPTION` → `FAILED`; otro error → `REJECTED`; warnings → `COMPLETED_WITH_WARNINGS`; si no → `COMPLETED`), separa `errors`/`warnings`, redondea el pricing a 2 decimales, calcula `totalLocal = { currency, amount: totalUSD × rate }` si hay metadata y total (D1), e incluye `trace`. `toRejectedMalformedResult(rawId, issues)` para ítems malformados.
  - **Archivos:** `src/pipeline/ReservationResultMapper.ts`, `tests/unit/pipeline/ReservationResultMapper.test.ts`.
  - **Dependencias:** TICKET-04, TICKET-10
  - **Criterios de aceptación:**
    - Hay un test por cada status.
    - El redondeo es correcto.
    - `totalLocal` aparece con metadata y no aparece si F3 estaba deshabilitado.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-28 — `ReservationStatusStore`
  - **Objetivo:** guardar el estado del procesamiento por id (D13).
  - **Descripción:** interfaz + `InMemoryReservationStatusStore` con `markProcessing(id)`, `save(result)` y `get(id)`; guarda `updatedAt`. Si el id se repite, gana el último.
  - **Archivos:** `src/services/ReservationStatusStore.ts`, `tests/unit/services/ReservationStatusStore.test.ts`.
  - **Dependencias:** TICKET-05
  - **Criterios de aceptación:**
    - Hay tests de guardar/obtener, id inexistente → `null`, sobrescritura y estado `PROCESSING`.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-29 — `PipelineConfigService`
  - **Objetivo:** gestionar la configuración global en memoria.
  - **Descripción:** `getConfig()`, `updateConfig(partial)` (valida con el esquema de TICKET-12, mergea y reemplaza; lanza `ValidationError` si es inválida) y `resolveEffectiveConfig(override?)` (global + override por request, sin persistir).
  - **Archivos:** `src/services/PipelineConfigService.ts`, `tests/unit/services/PipelineConfigService.test.ts`.
  - **Dependencias:** TICKET-12
  - **Criterios de aceptación:**
    - La config inicial es igual a los defaults.
    - Un update parcial persiste.
    - Un update inválido no modifica nada.
    - El override por request no altera la global.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-30 — `ReservationProcessingService`
  - **Objetivo:** caso de uso "procesar lote de reservas" (IO1–IO5).
  - **Descripción:** `process({ reservations, config? })`: mide el tiempo total con `Clock`; resuelve la config efectiva; crea el pipeline con `PipelineFactory`; por cada ítem (en paralelo con `Promise.all`): lo valida (TICKET-26) → si es malformado, `REJECTED`; si no, `markProcessing` → `loader.load` → `pipeline.run` → mapper → `store.save`. Devuelve `{ results, summary: { total, completed, completedWithWarnings, rejected, failed }, totalProcessingTimeMs }`. Ítems malformados sin `id` usable → se reportan con índice y no se guardan en el store.
  - **Archivos:** `src/services/ReservationProcessingService.ts`, `tests/unit/services/ReservationProcessingService.test.ts`.
  - **Dependencias:** TICKET-13, TICKET-25, TICKET-26, TICKET-27, TICKET-28, TICKET-29
  - **Criterios de aceptación (con repos de test y servicio de cambio fake):**
    - Un lote mixto (válida, pasajero inexistente, malformada) devuelve 3 resultados con status correctos y resumen coherente.
    - El tiempo total está presente.
    - El store queda actualizado.
    - Un override de config deshabilita un filtro solo en ese llamado.
  - **Notas de implementación:** _(completar al cerrar)_

## Fase 7 — Capa HTTP

- [ ] TICKET-31 — Esqueleto Express y manejo centralizado de errores
  - **Objetivo:** app testeable con formato de error uniforme.
  - **Descripción:** `createApp(deps)` en `app.ts` (JSON body parser con límite, routers inyectados, sin `listen`); `server.ts` con `listen`. `AppError` (+ `ValidationError` 400, `NotFoundError` 404). Middleware `errorHandler` → `{ error: { code, message, details? } }`, incluido el JSON inválido en el body (400) y los errores inesperados (500, logueados). Middleware `notFound` (404).
  - **Archivos:** `src/app.ts`, `src/server.ts`, `src/shared/errors.ts`, `src/http/middleware/errorHandler.ts`, `src/http/middleware/notFound.ts`, `tests/integration/app.test.ts`.
  - **Dependencias:** TICKET-02
  - **Criterios de aceptación (supertest):**
    - Una ruta inexistente → 404 JSON.
    - Un body JSON mal formado → 400 JSON.
    - Un error lanzado en una ruta de prueba → 500 JSON sin stack.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-32 — Composition root (`container.ts`)
  - **Objetivo:** inyección de dependencias manual en un solo lugar.
  - **Descripción:** `buildContainer(overrides?)` crea al inicio `SystemClock`, `ConsoleLogger`, repositorios con los mocks de `data/`, `ExchangeRateApiProvider`, `ExchangeRateService` (singleton, así el cache persiste entre requests), `PipelineConfigService`, `PipelineFactory`, `ReservationContextLoader`, store y `ReservationProcessingService`. `overrides` permite inyectar provider/clock/logger/repos fake en los tests de integración. `server.ts` usa `buildContainer()`.
  - **Archivos:** `src/container.ts`, `src/server.ts`, `tests/helpers/testApp.ts`.
  - **Dependencias:** TICKET-09, TICKET-23, TICKET-30, TICKET-31
  - **Criterios de aceptación:**
    - `npm run dev` levanta el servidor.
    - `testApp()` crea la app con provider fake y `SilentLogger`.
    - Los mocks se cargan una sola vez al iniciar.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-33 — Endpoints de reservas
  - **Objetivo:** `POST /reservations/process` y `GET /reservations/:id/status` (E1, E2).
  - **Descripción:** `ReservationsController` (sin lógica de negocio) + `reservations.routes.ts`. El POST valida el body con `processRequestBodySchema` → 400 si no hay array; si hay, 200 con el resultado del servicio. El GET devuelve `{ id, status, updatedAt, result }` o 404.
  - **Archivos:** `src/http/controllers/ReservationsController.ts`, `src/http/routes/reservations.routes.ts`, `tests/integration/reservations.routes.test.ts`.
  - **Dependencias:** TICKET-32
  - **Criterios de aceptación:**
    - Un POST válido → 200 con `results`, `summary` y `totalProcessingTimeMs`.
    - Un body sin `reservations` → 400.
    - GET del status de una reserva procesada → 200; id inexistente → 404.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-34 — Endpoints de configuración del pipeline
  - **Objetivo:** `GET /pipeline/config` y `PUT /pipeline/config` (E3, E4).
  - **Descripción:** `PipelineController` + `pipeline.routes.ts`. El GET devuelve la config actual con el orden fijo de filtros (solo lectura). El PUT acepta config parcial → 200 con la config resultante, o 400 con detalle.
  - **Archivos:** `src/http/controllers/PipelineController.ts`, `src/http/routes/pipeline.routes.ts`, `tests/integration/pipeline.routes.test.ts`.
  - **Dependencias:** TICKET-32
  - **Criterios de aceptación:**
    - El GET devuelve los defaults.
    - Un PUT que deshabilita `loyaltyDiscount` impacta en el POST siguiente (sin descuento, traza `disabled`).
    - Un PUT con `timeoutMs: 10000` → 400 y la config no cambia.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-35 — Endpoint de invalidación manual de cache
  - **Objetivo:** "Invalidación manual de cache si es necesario" (X8, D12).
  - **Descripción:** `DELETE /exchange-rates/cache` → llama a `exchangeRateService.invalidateCache()` → 204. Se documenta como endpoint adicional a los 4 pedidos por la letra.
  - **Archivos:** `src/http/controllers/ExchangeRatesController.ts`, `src/http/routes/exchangeRates.routes.ts`, `tests/integration/exchangeRates.routes.test.ts`.
  - **Dependencias:** TICKET-32
  - **Criterios de aceptación:**
    - Después del DELETE, el siguiente POST vuelve a llamar al provider (contador del fake).
  - **Notas de implementación:** _(completar al cerrar)_

## Fase 8 — Tests de integración de los casos de la letra

- [ ] TICKET-36 — Integración: flujo básico y cálculo de precios
  - **Objetivo:** cubrir end-to-end (HTTP → pipeline → respuesta) los casos B1–B4 y P1–P4 con los mocks reales y el provider fake.
  - **Descripción:** suite con supertest y `FakeClock` fijo. Los valores esperados salen de la fórmula y los fixtures de TICKET-07/08.
  - **Archivos:** `tests/integration/letter.basic-and-pricing.test.ts`.
  - **Dependencias:** TICKET-33
  - **Criterios de aceptación:**
    - **B1** `PAX-001` + `AA001` economy → `COMPLETED`, sin errores.
    - **B2** `PAX-999` → `REJECTED` con `PASSENGER_NOT_FOUND` y el resto de los filtros `skipped`.
    - **B3** `LA8070` → `REJECTED` con `NO_SEATS_AVAILABLE`.
    - **B4** lote con un ítem malformado y uno válido → malformado `REJECTED` con detalle y válido procesado (200).
    - **P1** `PAX-001`/`AA001` economy → total **265.00** USD.
    - **P2** `PAX-002` Gold/`AA001` economy → descuento 30 y total **231.40**.
    - **P3** `PAX-003` niño Gold/`AR1300` business → subtotal 159.38 y total **223.50**.
    - **P4** `PAX-004` senior Silver/`IB6844` first → subtotal 2448 y total **3022.76**.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-37 — Integración: tipo de cambio y casos de error
  - **Objetivo:** cubrir end-to-end C1–C4 y R1–R4.
  - **Descripción:** suite con provider fake programable y `FakeClock`.
  - **Archivos:** `tests/integration/letter.exchange-and-errors.test.ts`.
  - **Dependencias:** TICKET-33, TICKET-34, TICKET-35
  - **Criterios de aceptación:**
    - **C1** `LA4567` (AR) → metadata con ARS, original y convertido, `source: api` y `totalLocal` en ARS.
    - **C2** `AR1300` (BR) y `IB6844` (ES) en el mismo lote → BRL y EUR.
    - **C3** provider siempre falla → `COMPLETED_WITH_WARNINGS`, warning `EXCHANGE_RATE_FALLBACK`, precios USD correctos y tasa por defecto; `JL005` → USD tasa 1.
    - **C4** dos POST seguidos → el provider se llama 1 vez y el segundo tiene `source: cache`; con el clock avanzado 1 h → nueva llamada.
    - **R1** provider con demora mayor al timeout (timeout bajado vía config/override para no esperar 5 s) → 3 intentos, fallback y warning.
    - **R3** provider con error de red → mismo comportamiento y el pipeline sigue.
    - **R2** servicio de cambio que lanza un error inesperado (override en container) → `FAILED` con `FILTER_EXCEPTION`; las otras reservas del lote no se ven afectadas.
    - **R4** repositorio de vuelos con `basePriceUSD: NaN` → `FAILED` con `CORRUPT_CONTEXT`.
  - **Notas de implementación:** _(completar al cerrar)_

## Fase 9 — Entregables y cierre

- [ ] TICKET-38 — Colección de Postman
  - **Objetivo:** entregable 3: requests **y responses** de ejemplo.
  - **Descripción:** colección v2.1 con variable `baseUrl`. Carpetas: *Reservas* (válida, pasajero inexistente, sin asientos, malformada, P1–P4, lote mixto, conversión de moneda, override de config), *Estado* (existente, 404), *Configuración* (GET, PUT válido, PUT inválido), *Cache* (DELETE). Cada request con al menos un *saved example* con la response real obtenida del servidor local y tests básicos de Postman (status code).
  - **Archivos:** `postman/MTA-Grupo1-Ejercicio1.postman_collection.json`.
  - **Dependencias:** TICKET-33, TICKET-34, TICKET-35
  - **Criterios de aceptación:**
    - La colección importa sin errores en Postman.
    - Todos los endpoints están cubiertos y cada request tiene un ejemplo de response.
    - Corre completa con el Collection Runner contra `localhost:3000`.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-39 — README
  - **Objetivo:** entregable 4: documentación, instalación y ejecución.
  - **Descripción:** descripción del sistema; diagrama del pipeline (Mermaid); requisitos (Node ≥ 18, probado con 24); instalación; variables de entorno; scripts (`dev`, `build`, `start`, `test`, `test:coverage`, `lint`); endpoints con ejemplos de request/response; formato de la respuesta y statuses; configuración de filtros; comportamiento de la API de cambio (timeout, retry, cache, fallback); datos mock disponibles (tabla de fixtures); tabla "caso de la letra → test"; cómo usar la colección Postman; estructura del proyecto; link a `DESIGN_DECISIONS.md` e `IMPLEMENTATION_PLAN.md`.
  - **Archivos:** `README.md`.
  - **Dependencias:** TICKET-33, TICKET-34, TICKET-35
  - **Criterios de aceptación:**
    - Una persona sin contexto puede clonar, instalar, correr tests y levantar el servidor siguiendo el README.
    - Los ejemplos coinciden con las respuestas reales.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-40 — Revisión final de `DESIGN_DECISIONS.md`
  - **Objetivo:** que el documento refleje lo que realmente se implementó.
  - **Descripción:** recorrer las notas de implementación de todos los tickets, incorporar las decisiones surgidas durante el desarrollo y verificar la coherencia con el código.
  - **Archivos:** `DESIGN_DECISIONS.md`.
  - **Dependencias:** TICKET-36, TICKET-37
  - **Criterios de aceptación:**
    - Ninguna decisión documentada contradice el código.
    - Todas las decisiones de las notas de tickets están registradas.
  - **Notas de implementación:** _(completar al cerrar)_

- [ ] TICKET-41 — Control final contra la letra
  - **Objetivo:** verificar que no falte ningún requerimiento ni entregable.
  - **Descripción:** releer la letra completa desde el principio. Agregar al final de este archivo la tabla `Requerimiento | Implementado | Archivo(s) | Test relacionado` con todos los requerimientos (técnicos, input/output, 7 filtros, integración de cambio, mocks, 4 endpoints, 16 casos de prueba, aclaraciones, entregables). Si falta algo, crear tickets nuevos y resolverlos antes de cerrar. Correr `npm run build`, `npm run lint` y `npm run test:coverage` y registrar los resultados.
  - **Archivos:** `IMPLEMENTATION_PLAN.md` (sección "Control final"), otros según hallazgos.
  - **Dependencias:** TICKET-36, TICKET-37, TICKET-38, TICKET-39, TICKET-40
  - **Criterios de aceptación:**
    - Todas las filas de la tabla dicen "Sí" con archivo y test (o justificación explícita si un requerimiento no es testeable).
    - Están los 5 entregables: código TS, tests, Postman, README y `DESIGN_DECISIONS.md`.
    - Build, lint y tests en verde.
  - **Notas de implementación:** _(completar al cerrar)_

---

## Tickets agregados durante la implementación

_(Ninguno por ahora. Formato: mismo que el resto + "Motivo de incorporación".)_

## Control final

_(Se completa en TICKET-41.)_
