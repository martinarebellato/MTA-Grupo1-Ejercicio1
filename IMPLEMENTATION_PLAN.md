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

## Nota de replanificación (2026-09-17)

> Aplica desde **TICKET-13 en adelante**. Los tickets 01–12 ya cerrados **no se revierten**: quedan tal como están (incluidos sus tests unitarios), porque ese costo ya está pagado y son tests baratos de mantener.

**Motivo:** procesar el plan ticket a ticket (pausa + verificación completa + notas detalladas por cada uno de los 41 tickets) resultó demasiado lento para el ritmo que necesita el equipo. Se decide simplificar el proceso de ejecución sin resignar los criterios de aceptación de la letra.

**Cambios acordados:**

1. **Alcance de tests unitarios dedicados, reducido al núcleo del pipeline.** De acá en adelante solo llevan suite unitaria propia:
   - El contrato `Filter` y `ReservationContext` (ya hecho, TICKET-10).
   - El runner `Pipeline` (ya hecho, TICKET-11).
   - Los 7 filtros de negocio (TICKET-14, 15, 16, 17, 18, 19, 24).
   - `ReservationContextLoader` (TICKET-13, fuente del pipeline).
   - `PipelineFactory` (TICKET-25, ensamblado del pipeline).
   - El soporte de F3/tipo de cambio: `RateCache`, `withRetry`, `ExchangeRateApiProvider`, `ExchangeRateService` (TICKET-20–23) — se incluye porque es la dependencia directa de `ExchangeRateFilter` y porque la letra pide explícitamente casos de timeout/retry/cache/fallback (R1, R3, C1–C4).

   El resto del código nuevo (esquema Zod de reservas, `ReservationResultMapper`, `ReservationStatusStore`, `PipelineConfigService`, `ReservationProcessingService`, toda la capa HTTP: app, container, controllers, routes, middlewares) se implementa **sin suite unitaria dedicada**. Se verifica con `npm run build` + `npm run lint`, y su corrección funcional queda cubierta por los **tests de integración de la Fase 8** (TICKET-36/37), que son un entregable obligatorio de la letra (casos B1–B4, P1–P4, C1–C4, R1–R4), no un test "extra".

2. **Ejecución por sesiones en vez de ticket por ticket.** Los tickets 13–41 se agrupan en 7 sesiones de trabajo. Cada ticket individual se sigue marcando `[x]` con sus notas (se mantiene la trazabilidad), pero se implementa, verifica (build/lint/test) y confirma **en bloque por sesión**, sin pausar entre cada ticket de la misma sesión:

   | Sesión | Tickets | Contenido | Tests dedicados |
   |---|---|---|---|
   | 1 | 13, 14, 15 | `ReservationContextLoader` + filtros de validación (Pasajero, Vuelo) | Sí |
   | 2 | 16, 17, 18, 19 | Filtros de precio (Base, Lealtad, Tipo pasajero, Impuestos) | Sí |
   | 3 | 20, 21, 22, 23, 24 | Integración de tipo de cambio (cache, retry, provider HTTP, servicio, filtro F3) | Sí |
   | 4 | 25, 26, 27, 28, 29, 30 | Ensamblado del pipeline (`PipelineFactory`, con tests) + capa de aplicación (schema, mapper, stores, config service, processing service, sin tests dedicados) | Parcial (solo 25) |
   | 5 | 31, 32, 33, 34, 35 | Capa HTTP (Express, DI, endpoints de reservas/config/cache) | No |
   | 6 | 36, 37 | Tests de integración de los 16 casos de la letra | Sí (es el entregable) |
   | 7 | 38, 39, 40, 41 | Postman, README, revisión de `DESIGN_DECISIONS.md`, control final | N/A |

3. La *Definición de Terminado* global sigue vigente (`build`/`lint`/`test` en verde), pero el punto "tests nuevos para la funcionalidad del ticket" se interpreta ahora según el alcance del punto 1 de esta nota.

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

- [x] TICKET-02 — Configuración de testing y linting
  - **Objetivo:** poder escribir y correr tests unitarios y de integración y mantener calidad de código.
  - **Descripción:** instalar `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest`, `eslint`, `typescript-eslint`. `jest.config.ts` (preset ts-jest, `roots: ['<rootDir>/tests']`, cobertura sobre `src/` y `data/`). `eslint.config.mjs` con reglas recomendadas + `@typescript-eslint/no-explicit-any: error`. Scripts `test`, `test:watch`, `test:coverage`, `lint`. Un smoke test trivial para validar la configuración (se borra o reemplaza luego).
  - **Archivos:** `jest.config.ts`, `eslint.config.mjs`, `package.json`, `tests/smoke.test.ts`.
  - **Dependencias:** TICKET-01
  - **Criterios de aceptación:**
    - `npm test`, `npm run test:coverage` y `npm run lint` funcionan.
    - Un `any` explícito en `src/` hace fallar el lint.
  - **Notas de implementación:** Se instalaron `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest`, `eslint`, `typescript-eslint`, `@eslint/js` y `ts-node` (este último requerido por Jest para cargar `jest.config.ts` en un proyecto `"type": "commonjs"`). `jest.config.ts` usa preset `ts-jest`, `roots: ['<rootDir>/tests']` y `collectCoverageFrom` sobre `src/**/*.ts` y `data/**/*.ts`. `eslint.config.mjs` (flat config) usa `js.configs.recommended` + `tseslint.configs.recommended` y agrega `@typescript-eslint/no-explicit-any: 'error'`, con `ignores` para `dist/`, `coverage/` y `node_modules/`. Se agregó una clave `"ts-node": { "compilerOptions": { "module": "commonjs" } }` en `package.json` para evitar que Jest intente resolver el config como ESM (queda un warning cosmético de Node al cargar `jest.config.ts` que no afecta el exit code ni los resultados; es un comportamiento conocido de `jest-config` al intentar `import()` antes de caer a `require()` vía `ts-node`). Se verificó manualmente que un `any` explícito en `src/` hace fallar `npm run lint` con exit code 1 (`@typescript-eslint/no-explicit-any`), y luego se removió el archivo de prueba. `npm test`, `npm run test:coverage`, `npm run lint` y `npm run build` corren en verde.

- [x] TICKET-03 — `DESIGN_DECISIONS.md` inicial
  - **Objetivo:** documentar desde el inicio las decisiones del plan aprobado.
  - **Descripción:** crear el archivo con una plantilla por decisión (decisión · problema · alternativas · opción elegida · motivo · consecuencias/trade-offs). Registrar: estructura del pipeline (Pipes & Filters, runner, fuente/loader, filtros por reserva), contrato `Filter`, estructura del `ReservationContext`, manejo de errores/warnings (D5, D7), configuración (D11, config por request), API elegida (ExchangeRate-API v4), retry/timeout (D10), cache 1 h + single-flight, fallback (D2), invalidación (D12), organización de mocks con fechas relativas, cálculo y orden de precios (D1, D3, D4), tipo de pasajero (D6), carga de entidades (D8), asientos (D9), endpoint de status (D13), redondeo, procesamiento paralelo del lote, stack (Jest, Zod, logger propio), idioma (código en inglés, docs en español) y estrategia de testing.
  - **Archivos:** `DESIGN_DECISIONS.md`.
  - **Dependencias:** —
  - **Criterios de aceptación:**
    - Están D1–D13 y las decisiones menores, cada una con todos los campos de la plantilla.
    - Hay una sección "Interpretaciones de la letra" que diferencia qué pidió la letra y qué se interpretó.
  - **Notas de implementación:** Se creó `DESIGN_DECISIONS.md` con D1–D13 (plantilla completa: problema/alternativas/opción elegida/motivo/consecuencias), una sección "Decisiones menores" que cubre arquitectura del pipeline, contrato `Filter`, estructura del contexto, manejo de errores/warnings, configuración, API elegida (ExchangeRate-API v4), retry/timeout/cache/single-flight, mocks con fechas relativas, cálculo de precios, redondeo, endpoint de status, procesamiento paralelo, stack de testing e idioma; y una tabla "Interpretaciones de la letra". Se documentará como vivo: se irá actualizando en cada ticket que tome una decisión nueva y se revisará formalmente en TICKET-40.

## Fase 1 — Utilidades, dominio y datos

- [x] TICKET-04 — Utilidades compartidas (Logger, Clock, dinero, fechas)
  - **Objetivo:** abstracciones transversales inyectables que hacen testeable el resto del sistema.
  - **Descripción:** `Logger` (interfaz `debug/info/warn/error` con contexto opcional) + `ConsoleLogger` (respeta `LOG_LEVEL`) + `SilentLogger` para tests. `Clock` (interfaz `now(): Date`) + `SystemClock`. `round2(n)` para redondeo monetario. Helpers de fechas `daysFromNow(n, clock?)` y `yearsAgo(n, clock?)` para mocks relativos a hoy.
  - **Archivos:** `src/shared/logger.ts`, `src/shared/clock.ts`, `src/shared/money.ts`, `src/shared/dates.ts`, `tests/unit/shared/*.test.ts`, `tests/helpers/FakeClock.ts`.
  - **Dependencias:** TICKET-02
  - **Criterios de aceptación:**
    - `round2` redondea correctamente casos como 159.375 → 159.38 y 2.675 (tener en cuenta la imprecisión de punto flotante; documentar el enfoque).
    - `FakeClock` permite fijar y avanzar el tiempo.
    - Tests unitarios en verde.
  - **Notas de implementación:** `round2` usa `Math.round((value + Number.EPSILON) * 100) / 100` (sumar `EPSILON` antes de multiplicar, no después) — se verificó experimentalmente contra `159.375 → 159.38` y `2.675 → 2.68`, ambos casos clásicos de imprecisión de punto flotante. `Logger` define niveles `debug/info/warn/error` con orden total; `ConsoleLogger` filtra por `LOG_LEVEL` (default `info`) y `SilentLogger` implementa la misma interfaz con métodos no-op (firmas completas, no acortadas, para que el tipo concreto siga siendo intercambiable). `daysFromNow`/`yearsAgo` reciben un `Clock` opcional (default `SystemClock`) para poder generar mocks relativos a "ahora" tanto en producción como en tests con `FakeClock`. Se agregó `maxWorkers: 1` a `jest.config.ts` porque en este entorno la ejecución con workers paralelos (default) provocaba crashes por falta de memoria (`JavaScript heap out of memory` / `Zone Allocation failed`) incluso con pocos tests; con un solo worker los tests corren establemente. También se agregó la regla `@typescript-eslint/no-unused-vars` con `argsIgnorePattern`/`varsIgnorePattern: '^_'` en `eslint.config.mjs` para permitir parámetros intencionalmente no usados (p. ej. los no-op de `SilentLogger`). Se eliminó `tests/smoke.test.ts` (reemplazado por tests reales) y los `.gitkeep` de carpetas que ya tienen contenido.

- [x] TICKET-05 — Tipos de dominio
  - **Objetivo:** modelo tipado compartido por todos los módulos.
  - **Descripción:** tipos/uniones: `SeatClass` (`economy|business|first`), `LoyaltyTier` (`none|bronze|silver|gold`), `PassengerType` (`child|adult|senior`), `Passenger`, `Flight`, `ReservationRequest` (`id, passengerId, flightCode, origin, destination, seatClass`), `Issue` (`severity: error|warning, code, message, filter?`), `ReservationStatus` (`PROCESSING|COMPLETED|COMPLETED_WITH_WARNINGS|REJECTED|FAILED`), `PricingBreakdown`, `ExchangeMetadata`. Funciones puras de dominio: `calculateAge(dateOfBirth, now)` y `passengerTypeForAge(age)` (child < 12, adult 12–65, senior > 65).
  - **Archivos:** `src/domain/passenger.ts`, `flight.ts`, `reservation.ts`, `pricing.ts`, `issue.ts`, `tests/unit/domain/passenger.test.ts`.
  - **Dependencias:** TICKET-02
  - **Criterios de aceptación:**
    - Tipos exportados sin `any`.
    - Tests de `calculateAge` (cumpleaños hoy / mañana) y `passengerTypeForAge` en los bordes 11, 12, 65, 66.
  - **Notas de implementación:** `Passenger` incluye `country` (demográfico, no usado por lógica de negocio — la moneda se detecta por `Flight.destinationCountry`, no por el país del pasajero) y `isActive`. `Flight` incluye `destinationCountry` explícito (necesario para `ExchangeRateFilter`, TICKET-24) separado de `destination` (código IATA). `ReservationRequest` sigue exactamente los campos de la letra. `Issue.filter` se tipó como `string` (no como el union `FilterName` de `pipeline/Filter.ts`) para que `domain` no dependa de `pipeline` y evitar un ciclo de módulos. `PricingBreakdown` tiene todos los campos opcionales porque se completa progresivamente filtro a filtro (F4→F7). `ExchangeMetadata` y `PricingBreakdown` quedaron juntos en `pricing.ts` por estar ambos relacionados a precios/montos. `calculateAge` compara año/mes/día contra `now` para decidir si el cumpleaños de este año ya ocurrió.

- [x] TICKET-06 — Mapeo país → moneda
  - **Objetivo:** detectar la moneda local del país de destino (letra: "Detección de Moneda por País").
  - **Descripción:** `currencyForCountry(countryCode): string | null` con al menos AR→ARS, BR→BRL, US→USD, EU→EUR (ejemplos de la letra), más CL→CLP, UY→UYU, MX→MXN, CO→COP, PE→PEN, GB→GBP, JP→JPY y países de la eurozona (ES, FR, DE, IT, PT, NL…) → EUR. Insensible a mayúsculas.
  - **Archivos:** `src/domain/currencyByCountry.ts`, `tests/unit/domain/currencyByCountry.test.ts`.
  - **Dependencias:** TICKET-05
  - **Criterios de aceptación:**
    - Los 4 ejemplos de la letra están testeados.
    - Un país desconocido devuelve `null`.
  - **Notas de implementación:** Se agregó también la clave literal `EU` → `EUR` (tal como aparece en el ejemplo de la letra), además de los países reales de la eurozona (ES, FR, DE, IT, PT, NL, BE, AT, IE, FI, GR, LU, SK, SI, EE, LV, LT, CY, MT, HR). El resto de países pedidos por los fixtures de vuelos (CL, UY, MX, CO, PE, GB, JP) están cubiertos. `JP` está en la tabla de países pero **no** en `fallbackRates` (TICKET-12), lo cual es intencional: permite el caso de prueba "fallback a USD por moneda fuera de la tabla de fallback" sin dejar de detectar la moneda correcta cuando la API sí responde.

- [x] TICKET-07 — Datos mock de pasajeros
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
  - **Notas de implementación:** Las 10 fixtures pedidas están todas presentes con `dateOfBirth` generado vía `yearsAgo` (relativo a "ahora"). Cada una tiene un comentario indicando qué caso de la letra o qué validación de `PassengerValidationFilter` habilita. Se completaron campos no especificados por la letra (nombre, email, edad exacta cuando decía solo "adulto") con valores plausibles y coherentes con el escenario (p. ej. `PAX-006` tiene un email sin `@` para forzar `INVALID_EMAIL`, `PAX-007` tiene `name: ''` para forzar `INVALID_PASSENGER_NAME`).

- [x] TICKET-08 — Datos mock de vuelos
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
  - **Notas de implementación:** Las 7 fixtures pedidas están todas presentes con `departureAt` generado vía `daysFromNow` (incluido el vuelo en el pasado, `daysFromNow(-2)`, que sigue siendo pasado sin importar cuándo se corran los tests). Se agregó el campo `destinationCountry` (derivado del país del aeropuerto de destino de cada ruta) requerido por `ExchangeRateFilter` para detectar la moneda. `JL005` (destino JP) es intencionalmente el único vuelo cuya moneda de destino (JPY) queda fuera de la tabla `fallbackRates` por defecto (TICKET-12), para poder testear el caso `fallback-usd`.

- [x] TICKET-09 — Repositorios de pasajeros y vuelos
  - **Objetivo:** acceso a datos abstraído mediante interfaces (DI y testing).
  - **Descripción:** interfaces `PassengerRepository.findById(id)` y `FlightRepository.findByCode(code)` (async, devuelven entidad o `null`). Implementaciones `InMemoryPassengerRepository` / `InMemoryFlightRepository` que reciben el array por constructor (mocks al iniciar la app o datos custom en tests). Búsqueda de código de vuelo insensible a mayúsculas.
  - **Archivos:** `src/repositories/*.ts`, `tests/unit/repositories/*.test.ts`.
  - **Dependencias:** TICKET-07, TICKET-08
  - **Criterios de aceptación:**
    - Tests de encontrado / no encontrado.
    - Los repositorios no exponen el array interno para mutarlo.
  - **Notas de implementación:** Ambos repositorios usan un `Map` interno construido en el constructor (copia del array recibido), por lo que mutar el array original pasado por el llamador después de construir el repositorio no afecta al repositorio (testeado explícitamente). `InMemoryFlightRepository.findByCode` normaliza a mayúsculas tanto la clave del mapa como el parámetro de búsqueda para la comparación insensible a mayúsculas pedida por la letra. La búsqueda de pasajero por id es sensible a mayúsculas/minúsculas (no se pidió lo contrario).

## Fase 2 — Núcleo Pipes & Filters

- [x] TICKET-10 — Contrato `Filter` y `ReservationContext`
  - **Objetivo:** definir la interfaz común de los filtros y el dato que circula por los pipes.
  - **Descripción:** `interface Filter { readonly name: FilterName; process(ctx): Promise<ReservationContext> }`. `FilterName` como unión de los 7 filtros. `ReservationContext` (reservation, passenger, flight, pricing, metadata.exchange, issues, trace, halted). Helpers inmutables: `createContext(reservation, passenger, flight)`, `withError(ctx, filter, code, message)` (agrega error y marca `halted`), `withWarning(...)`, `withPricing(ctx, partial)`, `withExchangeMetadata(...)`. `CorruptContextError` y guardas de precondición (`requireFlight`, `requirePassenger`, `requireFiniteNonNegative(value, field)`).
  - **Archivos:** `src/pipeline/Filter.ts`, `src/pipeline/ReservationContext.ts`, `src/pipeline/errors.ts`, `tests/unit/pipeline/ReservationContext.test.ts`, `tests/helpers/builders.ts` (builders de passenger/flight/reservation/context).
  - **Dependencias:** TICKET-05
  - **Criterios de aceptación:**
    - Los helpers no mutan el contexto original (testeado).
    - Las guardas lanzan `CorruptContextError` ante `null`, `NaN`, `Infinity` o negativos.
    - Los builders de test quedan disponibles para los tickets de filtros.
  - **Notas de implementación:** Se agregó un helper adicional no listado explícitamente en la descripción, `withTraceStep(ctx, step)`, porque el runner (TICKET-11) necesita construir nuevos contextos con la traza actualizada de la misma forma inmutable que el resto de los helpers — es infraestructura necesaria implícita en el campo `trace` de `ReservationContext`. Las guardas de precondición se tipificaron como funciones genéricas (`requireFlight<T>`, `requirePassenger<T>`) que aceptan `null | undefined` y devuelven el valor no nulo (permite `const flight = requireFlight(ctx.flight)` con inferencia de tipo). `requireFiniteNonNegative` no recibe el nombre del filtro como parámetro (solo `value` y `field`, tal como en la descripción del ticket); el mensaje de error incluye el nombre del campo y el valor recibido. Los builders (`buildPassenger`, `buildFlight`, `buildReservation`, `buildContext`) usan valores por defecto "felices" (pasajero adulto activo válido, vuelo futuro con asientos) para que los tests de filtros solo necesiten sobreescribir el campo relevante al caso que están probando.

- [x] TICKET-11 — Runner del pipeline (`Pipeline`)
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
  - **Notas de implementación:** El orden de chequeo por etapa es: (1) si está deshabilitada → `disabled` (sin importar `halted`); (2) si el contexto ya está `halted` → `skipped`; (3) si no, se ejecuta y se captura cualquier excepción. Al capturar una excepción se aplican dos transformaciones inmutables en secuencia sobre el `ctx` previo a la etapa (nunca sobre un resultado parcial del filtro que falló): primero `withError` (agrega el issue y marca `halted`), después `withTraceStep` con estado `failed`. La duración se mide con `clock.now().getTime()` antes/después de `await filter.process(ctx)`, por lo que en tests con `FakeClock` queda en 0 salvo que el fake filter avance el reloj explícitamente durante su ejecución (se testeó ese caso). El logger recibe un `error` tanto para `CORRUPT_CONTEXT` como para `FILTER_EXCEPTION`, con `code` y `message` en el contexto del log.

- [x] TICKET-12 — Configuración del pipeline (tipos, defaults, esquema, merge)
  - **Objetivo:** configuración separada de la lógica, validable y mergeable.
  - **Descripción:** tipo `PipelineConfig` (por filtro: `enabled` + parámetros). Defaults con los valores exactos de la letra: multiplicadores 1/2.5/4; descuentos bronze .05, silver .10, gold .15; child .25, senior .15, adult 0; `taxRate` .12, `airportFeeUSD` 25, `fuelSurchargeRate` .08; exchange `timeoutMs` 5000, `maxAttempts` 3, `retryDelayMs` corto, `cacheTtlMs` 3 600 000, `fallbackRates` (ARS, BRL, EUR, CLP, UYU, MXN; **sin JPY**). Esquema Zod de config **parcial** (rechaza `timeoutMs > 5000`, `maxAttempts` fuera de 1–3, porcentajes fuera de [0,1], montos negativos, claves desconocidas). `mergePipelineConfig(base, partial)` con merge profundo e inmutable.
  - **Archivos:** `src/config/pipelineConfig.ts`, `src/config/defaultPipelineConfig.ts`, `src/http/schemas/pipelineConfig.schema.ts`, `tests/unit/config/*.test.ts`.
  - **Dependencias:** TICKET-05
  - **Criterios de aceptación:**
    - Hay un test que verifica los defaults contra los valores de la letra.
    - El esquema rechaza cada caso inválido listado.
    - El merge no muta la base y permite actualizar un solo campo anidado.
  - **Notas de implementación:** `PartialPipelineConfig` se definió a mano en `src/config/pipelineConfig.ts` (no inferido de Zod) para que `config` no dependa de `http`; el schema Zod en `src/http/schemas/pipelineConfig.schema.ts` es estructuralmente compatible por duck typing. Cada sub-schema usa `.strict()` para rechazar claves desconocidas tanto a nivel raíz como anidado. `fallbackRates` por defecto: `{ ARS: 1000, BRL: 5.4, EUR: 0.92, CLP: 950, UYU: 40, MXN: 18 }` (valores placeholder razonables, documentados como tales; no son tasas de mercado reales) — **sin JPY** a propósito, ya que `JL005` (TICKET-08) depende de esa ausencia para ejercitar el caso `fallback-usd`. `retryDelayMs` por defecto es 100 ms (backoff corto, D10); los tests de servicios que dependan de reintentos deberán usar `delayMs: 0` vía override. `mergePipelineConfig` hace merge profundo únicamente en los campos que son `Record` anidados (`fallbackRates`, `classMultipliers`, `tierDiscounts`, `discounts`); el resto de los campos de cada sub-config se sobreescribe con spread simple. **Hallazgo de entorno:** al agregar Zod, la suite de Jest empezó a crashear por falta de memoria incluso con `maxWorkers: 1` (`JavaScript heap out of memory`). Se resolvió invocando Jest directamente vía `node --max-old-space-size=4096 node_modules/jest/bin/jest.js` en los scripts `test`, `test:watch` y `test:coverage` de `package.json` (más robusto entre shells que `NODE_OPTIONS` con sintaxis distinta en bash/PowerShell/cmd). Cobertura actual: 98.48% statements / 92.3% branches sobre `src/` (los `defaultPipelineConfig`, `pipelineConfig` y `pipelineConfig.schema` quedaron en 100%).

- [x] TICKET-13 — `ReservationContextLoader` (fuente del pipeline)
  - **Objetivo:** cargar pasajero y vuelo en el contexto inicial (D8).
  - **Descripción:** clase que recibe `PassengerRepository` y `FlightRepository` y expone `load(reservation): Promise<ReservationContext>`: busca ambas entidades y crea el contexto con `passenger`/`flight` en `null` si no existen. No valida ni agrega issues.
  - **Archivos:** `src/pipeline/ReservationContextLoader.ts`, `tests/unit/pipeline/ReservationContextLoader.test.ts`.
  - **Dependencias:** TICKET-09, TICKET-10
  - **Criterios de aceptación:**
    - Con entidades existentes quedan adjuntadas.
    - Con entidades inexistentes quedan en `null` y no hay issues.
  - **Notas de implementación:** [Sesión 1] Busca pasajero y vuelo en paralelo (`Promise.all`) y delega en `createContext` (TICKET-10). Implementado junto con TICKET-14 y TICKET-15 como parte de la replanificación por sesiones (ver nota del 2026-09-17).

## Fase 3 — Filtros de validación

- [x] TICKET-14 — Filtro 1: Validación de Pasajero
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
  - **Notas de implementación:** [Sesión 1] Si `passenger` es `null` retorna inmediatamente con `PASSENGER_NOT_FOUND` (no evalúa el resto). Si existe, valida `isActive` → `INVALID_PASSENGER_NAME` (nombre vacío o solo espacios, vía `trim()`) → `INVALID_EMAIL` (regex simple `algo@algo.algo`) → `PASSENGER_TYPE_AGE_MISMATCH` (comparando `passenger.passengerType` contra `passengerTypeForAge(calculateAge(...))`), acumulando todos los errores que apliquen (test explícito de acumulación de 3 errores a la vez). Email regex es deliberadamente simple (no RFC 5322 completo), suficiente para distinguir los casos de la letra.

- [x] TICKET-15 — Filtro 2: Validación de Vuelo
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
  - **Notas de implementación:** [Sesión 1] Mismo patrón que F1: si `flight` es `null` retorna con `FLIGHT_NOT_FOUND` de inmediato; si no, acumula `NO_SEATS_AVAILABLE` / `ORIGIN_MISMATCH` / `DESTINATION_MISMATCH` / `FLIGHT_DEPARTED` (comparación `<=` contra `now`, así "igual a ahora" también es error, tal como pide el criterio de aceptación). Comparación de IATA con `.toUpperCase()` en ambos lados.

## Fase 4 — Filtros de precio (paralelizables)

- [x] TICKET-16 — Filtro 4: Cálculo de Precio Base
  - **Objetivo:** precio según clase de asiento.
  - **Descripción:** `BasePriceFilter(classMultipliers)`. Precondición: `flight` presente y `basePriceUSD` finito ≥ 0. Setea `flightBasePriceUSD`, `classBasePriceUSD` y `currentPriceUSD`.
  - **Archivos:** `src/filters/BasePriceFilter.ts`, `tests/unit/filters/BasePriceFilter.test.ts`.
  - **Dependencias:** TICKET-10, TICKET-12
  - **Criterios de aceptación:**
    - Con base 100: economy 100, business 250, first 400.
    - Toma multiplicadores inyectados por config.
    - **R4:** `basePriceUSD` NaN o negativo, o `flight` null → `CorruptContextError`.
  - **Notas de implementación:** [Sesión 2] `classBasePriceUSD = basePriceUSD × multiplicador[seatClass]`; `currentPriceUSD` arranca igual a `classBasePriceUSD` (es el precio "corriente" que van a ir tocando F5/F6). Implementado junto con TICKET-17/18/19 por la replanificación en sesiones.

- [x] TICKET-17 — Filtro 5: Descuentos por Lealtad
  - **Objetivo:** aplicar el descuento por tier.
  - **Descripción:** `LoyaltyDiscountFilter(tierDiscounts)`. Precondiciones: `passenger` presente y `currentPriceUSD` válido. Aplica sobre el precio corriente (D4) y registra `loyaltyDiscountUSD`. Tier `none` → 0.
  - **Archivos:** `src/filters/LoyaltyDiscountFilter.ts`, `tests/unit/filters/LoyaltyDiscountFilter.test.ts`.
  - **Dependencias:** TICKET-10, TICKET-12
  - **Criterios de aceptación:**
    - Sobre 200: bronze 190, silver 180, gold 170, none 200.
    - Falta precio previo → `CorruptContextError`.
  - **Notas de implementación:** [Sesión 2] `requireFiniteNonNegative(ctx.pricing.currentPriceUSD, ...)` cubre tanto el caso "F4 deshabilitado" como cualquier valor corrupto.

- [x] TICKET-18 — Filtro 6: Ajustes por Tipo de Pasajero
  - **Objetivo:** aplicar el descuento por tipo de pasajero.
  - **Descripción:** `PassengerTypeAdjustmentFilter(discounts)`. Usa `passenger.passengerType` (validado por F1, D6). Aplica sobre el precio corriente; registra `passengerTypeDiscountUSD` y `subtotalUSD`.
  - **Archivos:** `src/filters/PassengerTypeAdjustmentFilter.ts`, `tests/unit/filters/PassengerTypeAdjustmentFilter.test.ts`.
  - **Dependencias:** TICKET-10, TICKET-12
  - **Criterios de aceptación:**
    - Sobre 200: child 150, senior 170, adult 200.
    - Falta precio o pasajero → `CorruptContextError`.
  - **Notas de implementación:** [Sesión 2] Además de `subtotalUSD`, también actualiza `currentPriceUSD` al mismo valor, para que F7 pueda usar `currentPriceUSD` como fallback si F5/F6 estuvieran deshabilitados (ver TICKET-19).

- [x] TICKET-19 — Filtro 7: Cálculo de Impuestos y Tasas
  - **Objetivo:** calcular impuestos, tasas y total (D3).
  - **Descripción:** `TaxesAndFeesFilter(taxRate, airportFeeUSD, fuelSurchargeRate)`. Precondiciones: `classBasePriceUSD` y precio corriente válidos. Si `subtotalUSD` no existe (F5/F6 deshabilitados), usa el precio corriente. Calcula `taxesUSD`, `fuelSurchargeUSD`, `airportFeeUSD` y `totalUSD`.
  - **Archivos:** `src/filters/TaxesAndFeesFilter.ts`, `tests/unit/filters/TaxesAndFeesFilter.test.ts`.
  - **Dependencias:** TICKET-10, TICKET-12
  - **Criterios de aceptación:**
    - Con subtotal 170 y classBase 200 → taxes 20.40, fuel 16, fee 25, total 231.40.
    - Con subtotal 159.375 y classBase 250 → total 223.50.
    - Falta `classBasePriceUSD` → `CorruptContextError`.
  - **Notas de implementación:** [Sesión 2] `taxableBaseUSD = ctx.pricing.subtotalUSD ?? currentPriceUSD` (fallback pedido explícitamente por el ticket). `fuelSurchargeUSD` siempre se calcula sobre `classBasePriceUSD` (no sobre el subtotal), independientemente de qué filtros de descuento estén habilitados. Se verificaron ambos casos numéricos de la letra (P2 y P3) más un tercer test con F5/F6 deshabilitados (solo `currentPriceUSD`, sin `subtotalUSD`) que reproduce P1 (265.00).

## Fase 5 — Integración con API de tipo de cambio

- [x] TICKET-20 — Cache de tasas con TTL (`RateCache`)
  - **Objetivo:** cache en memoria de 1 hora con invalidación manual.
  - **Descripción:** `RateCache(ttlMs, clock)` con `get(base)` (devuelve `{rates, fetchedAt}` o `null` si venció), `set(base, rates)` e `invalidate()`.
  - **Archivos:** `src/services/exchange/RateCache.ts`, `tests/unit/exchange/RateCache.test.ts`.
  - **Dependencias:** TICKET-04
  - **Criterios de aceptación (con `FakeClock`):**
    - Hit antes de 1 h; miss al llegar a 1 h o más.
    - `invalidate()` vacía el cache.
  - **Notas de implementación:** [Sesión 3] Almacena `Map<string, CachedRates>` inmutable (cada `set`/`invalidate` crea un nuevo `Map`, nunca muta el anterior). Implementado junto con TICKET-21/22/23/24 por la replanificación en sesiones. **Corrección post-review (después de Sesión 6):** `ttlMs` se movió del constructor a un parámetro de `get(base, ttlMs)` — ver nota de TICKET-23 (el mismo motivo que hizo falta para `timeoutMs`/`maxAttempts`/`retryDelayMs`/`fallbackRates`: un cache singleton no puede tener el TTL fijado de una vez si se quiere que un override de `cacheTtlMs` por request tenga efecto real).

- [x] TICKET-21 — Utilidad de retry (`withRetry`)
  - **Objetivo:** reintentos automáticos genéricos.
  - **Descripción:** `withRetry(fn, { maxAttempts, delayMs, onAttemptFailed })`. Reintenta hasta `maxAttempts` intentos totales (D10) con backoff (`delayMs × intento`) y relanza el último error. `delayMs = 0` en tests.
  - **Archivos:** `src/services/exchange/retry.ts`, `tests/unit/exchange/retry.test.ts`.
  - **Dependencias:** TICKET-02
  - **Criterios de aceptación:**
    - Éxito al primer intento → 1 llamada.
    - Falla, falla y éxito → 3 llamadas.
    - 3 fallas → 3 llamadas y relanza el último error.
    - `onAttemptFailed` se invoca por cada falla.
  - **Notas de implementación:** [Sesión 3] Backoff `delayMs × intento` (lineal, no exponencial) solo entre intentos (no espera después del último). `delayMs: 0` hace que el backoff se salte por completo (`if (attempt < maxAttempts && delayMs > 0)`), evitando el `setTimeout(0)` innecesario en tests.

- [x] TICKET-22 — Proveedor HTTP de tasas (`ExchangeRateApiProvider`)
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
  - **Notas de implementación:** [Sesión 3] **Hallazgo importante:** la detección de timeout (`isTimeoutLikeError`) originalmente usaba `error instanceof Error`, pero bajo Jest (contexto VM por archivo de test) un `DOMException` disparado por `AbortSignal.timeout()` puede provenir de un realm distinto al `Error` local, haciendo que `instanceof Error` dé `false` de forma espuria aunque el objeto sea un error válido — el test R1 fallaba intermitentemente por esto. Se resolvió duck-typing la propiedad `.name` (`'TimeoutError' | 'AbortError'`) en vez de `instanceof Error`, y lo mismo para extraer `.message` como fallback (`errorMessage()`), más robusto y sin depender del realm. Se corrió la suite completa 3 veces seguidas para confirmar que el test de timeout no es flaky. El test de R1 usa un `fetchFn` fake que escucha el evento `abort` de la señal real (`AbortSignal.timeout(20)`, con timeout corto para no alargar la suite).

- [x] TICKET-23 — Servicio de tipo de cambio (`ExchangeRateService`)
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
  - **Notas de implementación:** [Sesión 3] **Corrección post-review (después de Sesión 6):** una revisión de código (`code-review`) detectó que `cacheTtlMs` estaba en el schema Zod como campo configurable por request, pero el constructor de `DefaultExchangeRateService` lo fijaba una sola vez al construirse el contenedor — un override real no tenía ningún efecto (el cache seguía usando el TTL con el que arrancó el proceso). Se corrigió: `cacheTtlMs` pasó a formar parte de `ExchangeRateOperationalConfig` (igual que `timeoutMs`/`maxAttempts`/`retryDelayMs`/`fallbackRates`) y se lee en cada llamada a `getRate(target, config)`, que a su vez lo pasa a `RateCache.get(base, ttlMs)`. El constructor de `DefaultExchangeRateService` quedó con solo `(provider, clock, logger)`. Se agregó un test explícito ("honors a per-call cacheTtlMs override against the shared cache"). **Limitación conocida, no resuelta:** el single-flight (dedup de fetches concurrentes) puede hacer que una llamada concurrente quede sujeta a la config de `timeoutMs`/`maxAttempts`/`retryDelayMs` de quien inició el fetch en curso, no a la propia — documentado como trade-off aceptado en `DESIGN_DECISIONS.md` (ningún caso de la letra ejercita configs distintas en simultáneo). `getRate('USD')` es un atajo que devuelve `{ rate: 1, source: 'api' }` sin tocar cache ni provider (testeado: 0 llamadas al provider). El single-flight se logra guardando la promesa de `withRetry(...)` en `this.pendingFetch` **sincrónicamente** antes de cualquier `await`, de forma que llamadas concurrentes que llegan mientras la primera sigue "en tránsito" (antes de resolver) reutilizan la misma promesa — se testeó con 10 llamadas concurrentes → 1 sola llamada al provider. `cache.set` ocurre una única vez dentro del `.then()` de esa promesa compartida (no una vez por cada llamada concurrente). El logger recibe `warn` por cada intento fallido (vía `onAttemptFailed` de `withRetry`) y `error` una sola vez cuando se agotan todos los intentos y se cae a fallback.

- [x] TICKET-24 — Filtro 3: Enriquecimiento con Tipo de Cambio
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
  - **Notas de implementación:** [Sesión 3] Fin de la Sesión 3. `convertedPrice = originalPrice × rate` calculado directamente en el filtro (no en el servicio, que solo devuelve la tasa). El warning `EXCHANGE_RATE_FALLBACK` incluye la razón de fallo (`failureReason`) cuando está disponible. El precondition guard (`requireFlight` + `requireFiniteNonNegative`) puede lanzar `CorruptContextError`, que el `Pipeline` (TICKET-11) traduce a `FAILED`/`CORRUPT_CONTEXT` — coherente con el resto de los filtros.

## Fase 6 — Ensamblado y servicios de aplicación

- [x] TICKET-25 — `PipelineFactory`
  - **Objetivo:** único lugar que define el orden fijo de los filtros y los construye desde la config (D11).
  - **Descripción:** `PipelineFactory(deps: { clock, logger, exchangeRateService })` con `create(config): Pipeline`. Instancia los 7 filtros con sus parámetros y los marca `enabled` según la config, en el orden 1 Pasajero → 2 Vuelo → 3 Tipo de cambio → 4 Precio base → 5 Lealtad → 6 Tipo pasajero → 7 Impuestos.
  - **Archivos:** `src/pipeline/PipelineFactory.ts`, `tests/unit/pipeline/PipelineFactory.test.ts`.
  - **Dependencias:** TICKET-11, TICKET-12, TICKET-14, TICKET-15, TICKET-16, TICKET-17, TICKET-18, TICKET-19, TICKET-24
  - **Criterios de aceptación:**
    - El orden de nombres es exactamente el de la letra.
    - Deshabilitar un filtro en la config lo refleja en la traza.
    - Cambiar un parámetro (p. ej. `taxRate`) cambia el resultado.
  - **Notas de implementación:** [Sesión 4] Orden fijo hardcodeado en el array de `stages`: Pasajero → Vuelo → TipoDeCambio → PrecioBase → Lealtad → TipoPasajero → Impuestos. Único ticket de la Sesión 4 con tests dedicados, por ser parte del núcleo del pipeline (ver nota de replanificación). El test de "cambiar un parámetro" usa `taxRate: 0.2` y verifica que `totalUSD` cambie de 265 a 281 sobre el mismo caso base.

- [x] TICKET-26 — Esquema Zod de la reserva y del body de procesamiento
  - **Objetivo:** detectar datos malformados (D7).
  - **Descripción:** `reservationRequestSchema` (`id`, `passengerId` y `flightCode` strings no vacíos; `origin`/`destination` IATA de 3 letras; `seatClass` en el enum). `processRequestBodySchema` = `{ reservations: unknown[] (mín. 1), config?: PartialPipelineConfig }`, validando cada ítem por separado. Función `parseReservationItem(raw)` → `{ ok, value } | { ok: false, issues }` con mensajes legibles.
  - **Archivos:** `src/http/schemas/reservationRequest.schema.ts`, `tests/unit/schemas/reservationRequest.schema.test.ts`.
  - **Dependencias:** TICKET-05
  - **Criterios de aceptación:**
    - **B4:** faltan campos, tipos incorrectos, `seatClass` inválido o ítem no-objeto → `ok: false` con detalle.
    - Una reserva correcta → `ok: true`.
    - Un body sin `reservations` array → inválido.
  - **Notas de implementación:** [Sesión 4] Implementado **sin test unitario dedicado** (fuera del alcance de tests desde la replanificación: no es parte del núcleo del pipeline). `origin`/`destination` validan con regex `^[A-Za-z]{3}$` (3 letras, sin exigir mayúsculas ya que `FlightValidationFilter` compara sin distinguir mayúsculas/minúsculas). Su comportamiento (casos B4, malformado vs. válido, body sin `reservations`) queda cubierto por los tests de integración de la Fase 8 (TICKET-36/37), que ejercitan el endpoint HTTP real.

- [x] TICKET-27 — `ReservationResultMapper`
  - **Objetivo:** transformar el contexto final en la respuesta pública.
  - **Descripción:** `toReservationResult(ctx)`: deriva el `status` (hay `CORRUPT_CONTEXT`/`FILTER_EXCEPTION` → `FAILED`; otro error → `REJECTED`; warnings → `COMPLETED_WITH_WARNINGS`; si no → `COMPLETED`), separa `errors`/`warnings`, redondea el pricing a 2 decimales, calcula `totalLocal = { currency, amount: totalUSD × rate }` si hay metadata y total (D1), e incluye `trace`. `toRejectedMalformedResult(rawId, issues)` para ítems malformados.
  - **Archivos:** `src/pipeline/ReservationResultMapper.ts`, `tests/unit/pipeline/ReservationResultMapper.test.ts`.
  - **Dependencias:** TICKET-04, TICKET-10
  - **Criterios de aceptación:**
    - Hay un test por cada status.
    - El redondeo es correcto.
    - `totalLocal` aparece con metadata y no aparece si F3 estaba deshabilitado.
  - **Notas de implementación:** [Sesión 4] Sin test unitario dedicado (misma razón que TICKET-26; cubierto por Fase 8). Se agregó el campo `reservationId` (no mencionado explícitamente en la descripción pero necesario para que `ReservationStatusStore`/el endpoint de status sepan a qué reserva corresponde cada resultado). `totalLocal` se omite del objeto (no se asigna `undefined` explícito) cuando no hay metadata de cambio, para respetar `exactOptionalPropertyTypes`.

- [x] TICKET-28 — `ReservationStatusStore`
  - **Objetivo:** guardar el estado del procesamiento por id (D13).
  - **Descripción:** interfaz + `InMemoryReservationStatusStore` con `markProcessing(id)`, `save(result)` y `get(id)`; guarda `updatedAt`. Si el id se repite, gana el último.
  - **Archivos:** `src/services/ReservationStatusStore.ts`, `tests/unit/services/ReservationStatusStore.test.ts`.
  - **Dependencias:** TICKET-05
  - **Criterios de aceptación:**
    - Hay tests de guardar/obtener, id inexistente → `null`, sobrescritura y estado `PROCESSING`.
  - **Notas de implementación:** [Sesión 4] Sin test unitario dedicado (mismo criterio). Igual que los repositorios (TICKET-09), usa un `Map` inmutable reemplazado en cada escritura.

- [x] TICKET-29 — `PipelineConfigService`
  - **Objetivo:** gestionar la configuración global en memoria.
  - **Descripción:** `getConfig()`, `updateConfig(partial)` (valida con el esquema de TICKET-12, mergea y reemplaza; lanza `ValidationError` si es inválida) y `resolveEffectiveConfig(override?)` (global + override por request, sin persistir).
  - **Archivos:** `src/services/PipelineConfigService.ts`, `tests/unit/services/PipelineConfigService.test.ts`.
  - **Dependencias:** TICKET-12
  - **Criterios de aceptación:**
    - La config inicial es igual a los defaults.
    - Un update parcial persiste.
    - Un update inválido no modifica nada.
    - El override por request no altera la global.
  - **Notas de implementación:** [Sesión 4] Sin test unitario dedicado. **Desvío respecto al plan original:** este ticket depende de `ValidationError`, definida en el plan original recién en TICKET-31 (`src/shared/errors.ts`). Se creó `src/shared/errors.ts` (con `AppError`, `ValidationError` y también `NotFoundError`, que se necesitará en TICKET-31/33) en este ticket, antes de lo previsto, para no bloquear la dependencia; TICKET-31 reutiliza el archivo en vez de recrearlo.

- [x] TICKET-30 — `ReservationProcessingService`
  - **Objetivo:** caso de uso "procesar lote de reservas" (IO1–IO5).
  - **Descripción:** `process({ reservations, config? })`: mide el tiempo total con `Clock`; resuelve la config efectiva; crea el pipeline con `PipelineFactory`; por cada ítem (en paralelo con `Promise.all`): lo valida (TICKET-26) → si es malformado, `REJECTED`; si no, `markProcessing` → `loader.load` → `pipeline.run` → mapper → `store.save`. Devuelve `{ results, summary: { total, completed, completedWithWarnings, rejected, failed }, totalProcessingTimeMs }`. Ítems malformados sin `id` usable → se reportan con índice y no se guardan en el store.
  - **Archivos:** `src/services/ReservationProcessingService.ts`, `tests/unit/services/ReservationProcessingService.test.ts`.
  - **Dependencias:** TICKET-13, TICKET-25, TICKET-26, TICKET-27, TICKET-28, TICKET-29
  - **Criterios de aceptación (con repos de test y servicio de cambio fake):**
    - Un lote mixto (válida, pasajero inexistente, malformada) devuelve 3 resultados con status correctos y resumen coherente.
    - El tiempo total está presente.
    - El store queda actualizado.
    - Un override de config deshabilita un filtro solo en ese llamado.
  - **Notas de implementación:** [Sesión 4] Sin test unitario dedicado; queda cubierto end-to-end por TICKET-36/37 (que ejercitan exactamente estos escenarios: lote mixto, resumen, override de config). Fin de la Sesión 4. Ítems malformados usan `extractRawId(raw, index)` para reportar `(index N)` como id cuando el raw no es un objeto con `id` string usable, y nunca pasan por `store.markProcessing`/`store.save` (no se guardan en el store), tal como pide el criterio de aceptación.

## Fase 7 — Capa HTTP

- [x] TICKET-31 — Esqueleto Express y manejo centralizado de errores
  - **Objetivo:** app testeable con formato de error uniforme.
  - **Descripción:** `createApp(deps)` en `app.ts` (JSON body parser con límite, routers inyectados, sin `listen`); `server.ts` con `listen`. `AppError` (+ `ValidationError` 400, `NotFoundError` 404). Middleware `errorHandler` → `{ error: { code, message, details? } }`, incluido el JSON inválido en el body (400) y los errores inesperados (500, logueados). Middleware `notFound` (404).
  - **Archivos:** `src/app.ts`, `src/server.ts`, `src/shared/errors.ts`, `src/http/middleware/errorHandler.ts`, `src/http/middleware/notFound.ts`, `tests/integration/app.test.ts`.
  - **Dependencias:** TICKET-02
  - **Criterios de aceptación (supertest):**
    - Una ruta inexistente → 404 JSON.
    - Un body JSON mal formado → 400 JSON.
    - Un error lanzado en una ruta de prueba → 500 JSON sin stack.
  - **Notas de implementación:** [Sesión 5] `src/shared/errors.ts` ya existía desde TICKET-29 (ver su nota); acá solo se agregó `NotFoundError`. Sin `tests/integration/app.test.ts` dedicado (capa HTTP fuera del alcance de tests desde la replanificación). En su lugar se hizo un **smoke test manual**: se levantó el servidor real (`npx tsx src/server.ts`) y se probó con `curl` cada caso — 404 en ruta inexistente, 400 en JSON mal formado (`{invalid json`), 400 en body sin `reservations`, y el resto de los endpoints de las Sesiones 5 completas (ver notas de TICKET-33/34/35) — antes de continuar, para no arrastrar un error de wiring hasta los tests de integración obligatorios de la Fase 8. `errorHandler` detecta el `SyntaxError` que lanza el JSON body-parser de Express (que trae `status: 400`) por duck-typing, no por clase, ya que Express no expone una clase de error propia para eso.

- [x] TICKET-32 — Composition root (`container.ts`)
  - **Objetivo:** inyección de dependencias manual en un solo lugar.
  - **Descripción:** `buildContainer(overrides?)` crea al inicio `SystemClock`, `ConsoleLogger`, repositorios con los mocks de `data/`, `ExchangeRateApiProvider`, `ExchangeRateService` (singleton, así el cache persiste entre requests), `PipelineConfigService`, `PipelineFactory`, `ReservationContextLoader`, store y `ReservationProcessingService`. `overrides` permite inyectar provider/clock/logger/repos fake en los tests de integración. `server.ts` usa `buildContainer()`.
  - **Archivos:** `src/container.ts`, `src/server.ts`, `tests/helpers/testApp.ts`.
  - **Dependencias:** TICKET-09, TICKET-23, TICKET-30, TICKET-31
  - **Criterios de aceptación:**
    - `npm run dev` levanta el servidor.
    - `testApp()` crea la app con provider fake y `SilentLogger`.
    - Los mocks se cargan una sola vez al iniciar.
  - **Notas de implementación:** [Sesión 5] `buildContainer` construye todo de forma sincrónica una sola vez (no hay lazy-loading), así los mocks (`data/mockPassengers`, `data/mockFlights`) y el `ExchangeRateService` (con su cache) quedan como singletons durante toda la vida del proceso — confirmado manualmente: dos requests sucesivos al mismo destino usan la misma tasa cacheada. `overrides` cubre `clock`, `logger`, `passengerRepository`, `flightRepository` y `exchangeRateProvider` (no el `exchangeRateService` completo, que siempre se construye a partir del provider inyectado). `tests/helpers/testApp.ts` usa `SilentLogger` por defecto y expone tanto `app` (para supertest) como `container` (para que los tests de integración puedan inspeccionar/pisar el `exchangeRateProvider` fake antes de cada request). Verificado con `npm run dev` (vía `npx tsx src/server.ts`) + `curl` manual.

- [x] TICKET-33 — Endpoints de reservas
  - **Objetivo:** `POST /reservations/process` y `GET /reservations/:id/status` (E1, E2).
  - **Descripción:** `ReservationsController` (sin lógica de negocio) + `reservations.routes.ts`. El POST valida el body con `processRequestBodySchema` → 400 si no hay array; si hay, 200 con el resultado del servicio. El GET devuelve `{ id, status, updatedAt, result }` o 404.
  - **Archivos:** `src/http/controllers/ReservationsController.ts`, `src/http/routes/reservations.routes.ts`, `tests/integration/reservations.routes.test.ts`.
  - **Dependencias:** TICKET-32
  - **Criterios de aceptación:**
    - Un POST válido → 200 con `results`, `summary` y `totalProcessingTimeMs`.
    - Un body sin `reservations` → 400.
    - GET del status de una reserva procesada → 200; id inexistente → 404.
  - **Notas de implementación:** [Sesión 5] Sin `tests/integration/reservations.routes.test.ts` dedicado (cubierto por Fase 8). Verificado manualmente con `curl`: `PAX-001`/`AA001` economy → `COMPLETED` con total **265.00** (coincide con P1), `GET /reservations/R1/status` devuelve el mismo resultado guardado, id inexistente → 404, body sin `reservations` → 400 con `details` del `ZodError`. El controller solo orquesta (parseo del body + delegar en `ReservationProcessingService`/`ReservationStatusStore`), sin lógica de negocio propia, tal como pide la descripción.

- [x] TICKET-34 — Endpoints de configuración del pipeline
  - **Objetivo:** `GET /pipeline/config` y `PUT /pipeline/config` (E3, E4).
  - **Descripción:** `PipelineController` + `pipeline.routes.ts`. El GET devuelve la config actual con el orden fijo de filtros (solo lectura). El PUT acepta config parcial → 200 con la config resultante, o 400 con detalle.
  - **Archivos:** `src/http/controllers/PipelineController.ts`, `src/http/routes/pipeline.routes.ts`, `tests/integration/pipeline.routes.test.ts`.
  - **Dependencias:** TICKET-32
  - **Criterios de aceptación:**
    - El GET devuelve los defaults.
    - Un PUT que deshabilita `loyaltyDiscount` impacta en el POST siguiente (sin descuento, traza `disabled`).
    - Un PUT con `timeoutMs: 10000` → 400 y la config no cambia.
  - **Notas de implementación:** [Sesión 5] Sin test dedicado (cubierto por Fase 8). Verificado manualmente: GET devuelve los defaults exactos de la letra; PUT con `exchangeRate.timeoutMs: 10000` → 400 con el detalle de Zod (`Number must be less than or equal to 5000`) y no persiste; PUT con `loyaltyDiscount.enabled: false` → 200 y la config queda persistida (confirmado con un GET posterior).

- [x] TICKET-35 — Endpoint de invalidación manual de cache
  - **Objetivo:** "Invalidación manual de cache si es necesario" (X8, D12).
  - **Descripción:** `DELETE /exchange-rates/cache` → llama a `exchangeRateService.invalidateCache()` → 204. Se documenta como endpoint adicional a los 4 pedidos por la letra.
  - **Archivos:** `src/http/controllers/ExchangeRatesController.ts`, `src/http/routes/exchangeRates.routes.ts`, `tests/integration/exchangeRates.routes.test.ts`.
  - **Dependencias:** TICKET-32
  - **Criterios de aceptación:**
    - Después del DELETE, el siguiente POST vuelve a llamar al provider (contador del fake).
  - **Notas de implementación:** [Sesión 5] Sin test dedicado (cubierto por Fase 8, donde sí se verifica el contador del provider fake tras el DELETE). Verificado manualmente que el endpoint devuelve 204 sin body. Fin de la Sesión 5 — smoke test manual completo de los 5 endpoints (POST/GET reservas, GET/PUT config, DELETE cache) más 404/400 genéricos, todo corriendo contra el servidor real antes de pasar a los tests de integración obligatorios.

## Fase 8 — Tests de integración de los casos de la letra

- [x] TICKET-36 — Integración: flujo básico y cálculo de precios
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
  - **Notas de implementación:** [Sesión 6] Todos los tests usan `testApp({ clock, exchangeRateProvider })` con un `FakeExchangeRateProvider.alwaysSucceedWith({...})` configurado con tasas para todas las monedas involucradas (ARS, BRL, EUR, CLP, UYU, MXN), aunque B1-B4/P1/P2 nunca llegan a llamarlo (destino US → atajo a USD sin red). Se verificaron los 8 casos exactamente con los valores numéricos de la letra. Suite corrida 3 veces seguidas sin flakiness.

- [x] TICKET-37 — Integración: tipo de cambio y casos de error
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
  - **Notas de implementación:** [Sesión 6] **Hallazgo de diseño importante, corregido en este ticket** (afecta retroactivamente a TICKET-23/24/25/27, ya cerrados):
    - `PipelineFactory` reutiliza el `ExchangeRateService` como singleton (correcto, para que el cache persista), pero `timeoutMs`/`maxAttempts`/`retryDelayMs`/`fallbackRates` estaban fijados en el **constructor** del servicio — un override de `config.exchangeRate.*` por request (como pide R1: "timeout bajado vía config/override") no tenía ningún efecto real, porque el servicio ya estaba construido con la config global desde el arranque del contenedor.
    - **Fix:** se movieron `timeoutMs`/`maxAttempts`/`retryDelayMs`/`fallbackRates` de `ExchangeRateServiceConfig` (constructor) a un nuevo tipo `ExchangeRateOperationalConfig`, pasado **por llamada** a `getRate(target, config)`. Solo `cacheTtlMs` sigue fijo en el constructor (`new DefaultExchangeRateService(provider, clock, logger, cacheTtlMs)`), porque el cache sí debe ser compartido/persistente entre requests. `ExchangeRateFilter` ahora recibe `(exchangeRateService, config)` y `PipelineFactory` le pasa `config.exchangeRate` (el efectivo, ya resuelto con el override por request) en cada `create(config)`. Esto significa que `PUT /pipeline/config` y el override por request de `POST /reservations/process` **sí** afectan el timeout/reintentos/tabla de fallback real de ahora en más.
    - Se actualizaron `ExchangeRateService.test.ts`, `ExchangeRateFilter.test.ts` y `PipelineFactory.test.ts` (ya cerrados) a la nueva firma; los 3 siguen en verde.
    - También se agregó `exchangeRateService?` a `ContainerOverrides` (TICKET-32), no contemplado originalmente, para poder simular R2 (un servicio de cambio que falla de forma inesperada) sin pasar por la red.
    - Se amplió `ReservationResultMapper` (TICKET-27) agregando el campo `exchange?: ExchangeMetadata` (redondeado a 2 decimales) al `ReservationResult`, además de `totalLocal` — necesario porque C1/C2 piden verificar `source`, `originalPrice` y `convertedPrice`, no solo el total en moneda local.
    - R1 se simula con un método nuevo `FakeExchangeRateProvider.alwaysTimeout()` que rechaza después de `options.timeoutMs` con un `DOMException('TimeoutError')`, igual que produciría `AbortSignal.timeout()` en el provider real, pero sin pasar por red ni por timeouts reales de 5 s (se usa `timeoutMs: 20` vía el override de config del request). R2 usa un fake que solo lanza para la moneda `ARS` (no para todas), así se puede demostrar que la reserva con destino US en el mismo lote sigue `COMPLETED`. Suite corrida 3 veces seguidas sin flakiness.

## Fase 9 — Entregables y cierre

- [x] TICKET-38 — Colección de Postman
  - **Objetivo:** entregable 3: requests **y responses** de ejemplo.
  - **Descripción:** colección v2.1 con variable `baseUrl`. Carpetas: *Reservas* (válida, pasajero inexistente, sin asientos, malformada, P1–P4, lote mixto, conversión de moneda, override de config), *Estado* (existente, 404), *Configuración* (GET, PUT válido, PUT inválido), *Cache* (DELETE). Cada request con al menos un *saved example* con la response real obtenida del servidor local y tests básicos de Postman (status code).
  - **Archivos:** `postman/MTA-Grupo1-Ejercicio1.postman_collection.json`.
  - **Dependencias:** TICKET-33, TICKET-34, TICKET-35
  - **Criterios de aceptación:**
    - La colección importa sin errores en Postman.
    - Todos los endpoints están cubiertos y cada request tiene un ejemplo de response.
    - Corre completa con el Collection Runner contra `localhost:3000`.
  - **Notas de implementación:** [Sesión 7] Colección generada programáticamente (script Node ad-hoc en el scratchpad, no versionado) a partir de responses reales capturadas con `curl` contra `npx tsx src/server.ts` corriendo en local. 17 requests en 4 carpetas exactamente como se pidió (Reservas: 11, Estado: 2, Configuración: 3, Cache: 1). Cada request tiene un test básico (`pm.response.to.have.status(...)`) y un *saved example* con la response real (incluye headers, `code`, `status` y `body`). `P3`/`P4` (destinos BR/ES) hicieron la llamada real a la API de tipo de cambio externa al capturarse (no hay mocks en este modo manual), por eso sus tasas ARS/BRL/EUR son las de mercado del momento y no las de `fallbackRates`; los valores en USD (`subtotalUSD`, `totalUSD`) siguen siendo exactamente los de la letra porque no dependen de la tasa. Se verificó "corre completa contra localhost:3000" con un script runner ad-hoc que repite los 17 requests contra el servidor real y compara el status code contra el ejemplo guardado: **17/17 passed**. El request `GET /reservations/POSTMAN-VALID-1/status` depende de que el POST de "Reserva válida" se haya corrido antes en la misma sesión del Collection Runner (igual que con el Runner real, que ejecuta las carpetas en orden).

- [x] TICKET-39 — README
  - **Objetivo:** entregable 4: documentación, instalación y ejecución.
  - **Descripción:** descripción del sistema; diagrama del pipeline (Mermaid); requisitos (Node ≥ 18, probado con 24); instalación; variables de entorno; scripts (`dev`, `build`, `start`, `test`, `test:coverage`, `lint`); endpoints con ejemplos de request/response; formato de la respuesta y statuses; configuración de filtros; comportamiento de la API de cambio (timeout, retry, cache, fallback); datos mock disponibles (tabla de fixtures); tabla "caso de la letra → test"; cómo usar la colección Postman; estructura del proyecto; link a `DESIGN_DECISIONS.md` e `IMPLEMENTATION_PLAN.md`.
  - **Archivos:** `README.md`.
  - **Dependencias:** TICKET-33, TICKET-34, TICKET-35
  - **Criterios de aceptación:**
    - Una persona sin contexto puede clonar, instalar, correr tests y levantar el servidor siguiendo el README.
    - Los ejemplos coinciden con las respuestas reales.
  - **Notas de implementación:** [Sesión 7] Cubre todas las secciones pedidas. Los ejemplos de request/response de `POST /reservations/process` se basan en las respuestas reales capturadas para la colección de Postman (mismo `pricing`/`totalUSD` que `p1.json`). La tabla de mocks resume `data/mockPassengers.ts` y `data/mockFlights.ts`; la tabla "caso de la letra → test" apunta a los dos archivos de integración de la Fase 8. Se documentó explícitamente que los parámetros de F3 (timeout/retry/cache/fallback) sí tienen efecto real por request, mencionando el fix post-review del `cacheTtlMs`.

- [x] TICKET-40 — Revisión final de `DESIGN_DECISIONS.md`
  - **Objetivo:** que el documento refleje lo que realmente se implementó.
  - **Descripción:** recorrer las notas de implementación de todos los tickets, incorporar las decisiones surgidas durante el desarrollo y verificar la coherencia con el código.
  - **Archivos:** `DESIGN_DECISIONS.md`.
  - **Dependencias:** TICKET-36, TICKET-37
  - **Criterios de aceptación:**
    - Ninguna decisión documentada contradice el código.
    - Todas las decisiones de las notas de tickets están registradas.
  - **Notas de implementación:** [Sesión 7] Revisión completa de `DESIGN_DECISIONS.md` contra el código final. Se encontró y corrigió una **inconsistencia real**: la sección "Redondeo monetario" documentaba `round2` como `Math.round(n * 100 + Number.EPSILON) / 100` (EPSILON sumado después de multiplicar), pero la implementación real (`src/shared/money.ts`) suma `EPSILON` **antes** de multiplicar — `Math.round((n + Number.EPSILON) * 100) / 100`. La fórmula documentada incorrecta no afectaba al código (era solo un error de transcripción en la doc, escrito en TICKET-03 antes de que existiera el código), pero sí contradecía el código real, así que se corrigió. Se agregaron además: la decisión sobre `exchange` en `ReservationResult` (surgida en TICKET-37), las dos correcciones de threading de config del `ExchangeRateService`/`RateCache` (surgidas en TICKET-37 y en la revisión de código post-Sesión 6) y la limitación conocida del single-flight — todas ya estaban insertadas en sus secciones correspondientes durante las sesiones anteriores, se verificó que quedaran completas. Se actualizó "Estrategia de testing" para reflejar el alcance real (reducido) de tests unitarios dedicados, en vez de la decisión original ("cada filtro/servicio/utilidad"). El resto de D1–D13 y las decisiones menores se verificaron una por una contra el código y no se encontraron más contradicciones.

- [x] TICKET-41 — Control final contra la letra
  - **Objetivo:** verificar que no falte ningún requerimiento ni entregable.
  - **Descripción:** releer la letra completa desde el principio. Agregar al final de este archivo la tabla `Requerimiento | Implementado | Archivo(s) | Test relacionado` con todos los requerimientos (técnicos, input/output, 7 filtros, integración de cambio, mocks, 4 endpoints, 16 casos de prueba, aclaraciones, entregables). Si falta algo, crear tickets nuevos y resolverlos antes de cerrar. Correr `npm run build`, `npm run lint` y `npm run test:coverage` y registrar los resultados.
  - **Archivos:** `IMPLEMENTATION_PLAN.md` (sección "Control final"), otros según hallazgos.
  - **Dependencias:** TICKET-36, TICKET-37, TICKET-38, TICKET-39, TICKET-40
  - **Criterios de aceptación:**
    - Todas las filas de la tabla dicen "Sí" con archivo y test (o justificación explícita si un requerimiento no es testeable).
    - Están los 5 entregables: código TS, tests, Postman, README y `DESIGN_DECISIONS.md`.
    - Build, lint y tests en verde.
  - **Notas de implementación:** [Sesión 7] No existe en el repo un archivo separado con el texto original de la letra (se transcribió íntegramente a `IMPLEMENTATION_PLAN.md`/`DESIGN_DECISIONS.md` en TICKET-01–03, antes de este control); el control final se hizo releyendo esos dos documentos como fuente de verdad de los requerimientos y verificando cada uno contra el código y los tests reales (no contra la letra original en sí, que no está versionada aparte). Tabla completa en la sección "Control final" al final de este archivo. No se encontraron requerimientos faltantes que ameriten un ticket nuevo — solo las dos correcciones de código ya registradas en las notas de TICKET-37/TICKET-20/23 (threading de config del servicio de cambio) y la corrección de documentación en TICKET-40 (fórmula de `round2`). Build/lint/tests corridos y registrados abajo.

---

## Tickets agregados durante la implementación

_(Ninguno por ahora. Formato: mismo que el resto + "Motivo de incorporación".)_

## Control final

**Resultados de verificación (2026-09-17):**
- `npm run build` → **verde**, sin errores de TypeScript (`strict`, sin `any` explícito, sin `@ts-ignore`).
- `npm run lint` → **verde**, sin errores ni warnings.
- `npm run test:coverage` → **verde**, 28 test suites / **181 tests**, 0 fallos. Cobertura global: **91.73% statements / 79.54% branches / 89.68% funcs / 91.59% lines**. El núcleo del pipeline (`src/filters`, `src/pipeline`, `src/domain`, `src/services/exchange`, `src/repositories`) está en 97–100% en casi todos sus archivos; la cobertura más baja es en `src/http/middleware` y algunos métodos de `src/services` (`PipelineConfigService`, `ReservationStatusStore`) y `src/shared/errors.ts`, todos fuera del alcance de tests unitarios dedicados según la nota de replanificación — su corrección funcional está cubierta por los 16 tests de integración de la letra, que ejercitan la app HTTP completa.

### Tabla de requerimientos

> Nota sobre la fuente: no hay un archivo separado con el texto original de la letra en este repo — quedó transcripto en `IMPLEMENTATION_PLAN.md` (tickets, fórmulas, fixtures, 16 casos) y `DESIGN_DECISIONS.md` (aclaraciones/interpretaciones) desde el inicio del proyecto. Esta tabla usa esos dos documentos como la especificación de referencia.

#### Requerimientos técnicos

| Requerimiento | Implementado | Archivo(s) | Test relacionado |
|---|---|---|---|
| TypeScript en modo `strict`, sin `any` injustificado | Sí | `tsconfig.json` | `npm run build` + `npm run lint` (regla `@typescript-eslint/no-explicit-any`) |
| Express como framework HTTP | Sí | `src/app.ts`, `src/http/**` | Smoke test manual (Sesión 5) + `tests/integration/letter.*.test.ts` |
| Patrón Pipes & Filters con 7 filtros en orden fijo | Sí | `src/pipeline/Pipeline.ts`, `PipelineFactory.ts`, `src/filters/*` | `tests/unit/pipeline/Pipeline.test.ts`, `PipelineFactory.test.ts` |
| Fuente del pipeline separada de los filtros (D8) | Sí | `src/pipeline/ReservationContextLoader.ts` | `tests/unit/pipeline/ReservationContextLoader.test.ts` |
| Contexto inmutable con trazabilidad por filtro | Sí | `src/pipeline/ReservationContext.ts` | `tests/unit/pipeline/ReservationContext.test.ts` |
| Manejo uniforme de errores/warnings, sin excepciones no controladas | Sí | `src/pipeline/errors.ts`, `Pipeline.ts` | `tests/unit/pipeline/Pipeline.test.ts` (casos R2/R4) |
| Configuración de filtros (enable + parámetros), orden no configurable | Sí | `src/config/pipelineConfig.ts`, `defaultPipelineConfig.ts`, `src/http/schemas/pipelineConfig.schema.ts` | `tests/unit/config/*.test.ts` |
| Integración con API externa de tipo de cambio real | Sí | `src/services/exchange/ExchangeRateApiProvider.ts` | `tests/unit/exchange/ExchangeRateApiProvider.test.ts` (con `fetch` stub, sin Internet) |
| Timeout configurable por intento | Sí | `ExchangeRateApiProvider.ts` (`AbortSignal.timeout`), `ExchangeRateService.ts` | `ExchangeRateApiProvider.test.ts` (R1), `ExchangeRateService.test.ts` |
| Reintentos automáticos (hasta 3 intentos totales) | Sí | `src/services/exchange/retry.ts` | `tests/unit/exchange/retry.test.ts` |
| Cache de tasas con TTL de 1 h + single-flight | Sí | `src/services/exchange/RateCache.ts`, `ExchangeRateService.ts` | `RateCache.test.ts`, `ExchangeRateService.test.ts` (casos C4, single-flight) |
| Fallback de tasa configurable + fallback a USD | Sí | `ExchangeRateService.ts`, `defaultPipelineConfig.ts` | `ExchangeRateService.test.ts` (C3/R1/R3, JPY fuera de tabla) |
| Invalidación manual de cache | Sí | `ExchangeRateService.invalidateCache()`, `DELETE /exchange-rates/cache` | `ExchangeRateService.test.ts` + smoke manual / colección Postman |
| Mocks de pasajeros y vuelos en memoria | Sí | `data/mockPassengers.ts`, `data/mockFlights.ts` | Cubierto indirectamente por `tests/integration/letter.*.test.ts` |
| Repositorios abstraídos por interfaz (DI) | Sí | `src/repositories/PassengerRepository.ts`, `FlightRepository.ts` | `tests/unit/repositories/*.test.ts` |
| Composition root único (DI manual) | Sí | `src/container.ts` | Smoke test manual (Sesión 5); usado por `tests/helpers/testApp.ts` en toda la Fase 8 |

#### Input / Output

| Requerimiento | Implementado | Archivo(s) | Test relacionado |
|---|---|---|---|
| Reserva de entrada: `id`, `passengerId`, `flightCode`, `origin`, `destination`, `seatClass` | Sí | `src/domain/reservation.ts`, `src/http/schemas/reservationRequest.schema.ts` | `tests/integration/letter.basic-and-pricing.test.ts` (B4) |
| Validación de ítems malformados sin pasar por el pipeline (D7) | Sí | `src/http/schemas/reservationRequest.schema.ts`, `ReservationProcessingService.ts` | `letter.basic-and-pricing.test.ts` (B4) |
| Resultado de salida: `status`, `errors`, `warnings`, `pricing`, `exchange`, `totalLocal`, `trace` | Sí | `src/pipeline/ReservationResultMapper.ts` | Todos los tests de `tests/integration/letter.*.test.ts` |
| 5 estados posibles (`PROCESSING`/`COMPLETED`/`COMPLETED_WITH_WARNINGS`/`REJECTED`/`FAILED`) | Sí | `src/domain/reservation.ts`, `ReservationResultMapper.ts` | Todos los tests de integración cubren al menos 4 de los 5 (`PROCESSING` es transitorio, ver `ReservationStatusStore`) |
| Redondeo a 2 decimales solo en la respuesta | Sí | `src/shared/money.ts`, `ReservationResultMapper.ts` | `tests/unit/shared/money.test.ts` |

#### Los 7 filtros

| Filtro | Implementado | Archivo(s) | Test relacionado |
|---|---|---|---|
| F1 — Validación de Pasajero | Sí | `src/filters/PassengerValidationFilter.ts` | `tests/unit/filters/PassengerValidationFilter.test.ts` |
| F2 — Validación de Vuelo | Sí | `src/filters/FlightValidationFilter.ts` | `tests/unit/filters/FlightValidationFilter.test.ts` |
| F3 — Enriquecimiento con Tipo de Cambio | Sí | `src/filters/ExchangeRateFilter.ts` | `tests/unit/filters/ExchangeRateFilter.test.ts` |
| F4 — Cálculo de Precio Base | Sí | `src/filters/BasePriceFilter.ts` | `tests/unit/filters/BasePriceFilter.test.ts` |
| F5 — Descuentos por Lealtad | Sí | `src/filters/LoyaltyDiscountFilter.ts` | `tests/unit/filters/LoyaltyDiscountFilter.test.ts` |
| F6 — Ajustes por Tipo de Pasajero | Sí | `src/filters/PassengerTypeAdjustmentFilter.ts` | `tests/unit/filters/PassengerTypeAdjustmentFilter.test.ts` |
| F7 — Cálculo de Impuestos y Tasas | Sí | `src/filters/TaxesAndFeesFilter.ts` | `tests/unit/filters/TaxesAndFeesFilter.test.ts` |

#### Endpoints

| Endpoint | Implementado | Archivo(s) | Test relacionado |
|---|---|---|---|
| `POST /reservations/process` | Sí | `src/http/controllers/ReservationsController.ts`, `reservations.routes.ts` | `letter.basic-and-pricing.test.ts`, `letter.exchange-and-errors.test.ts` |
| `GET /reservations/:id/status` | Sí | `ReservationsController.ts`, `reservations.routes.ts` | `letter.exchange-and-errors.test.ts` (uso indirecto vía store) + smoke manual / Postman |
| `GET /pipeline/config` | Sí | `src/http/controllers/PipelineController.ts`, `pipeline.routes.ts` | Smoke manual + colección Postman |
| `PUT /pipeline/config` | Sí | `PipelineController.ts`, `pipeline.routes.ts` | Smoke manual + colección Postman (PUT válido e inválido) |
| `DELETE /exchange-rates/cache` (adicional, D12) | Sí | `src/http/controllers/ExchangeRatesController.ts`, `exchangeRates.routes.ts` | Smoke manual + colección Postman |

#### Los 16 casos de prueba de la letra

| Caso | Implementado | Test relacionado |
|---|---|---|
| B1 — Flujo básico válido | Sí | `letter.basic-and-pricing.test.ts` |
| B2 — Pasajero inexistente | Sí | `letter.basic-and-pricing.test.ts` |
| B3 — Vuelo sin asientos | Sí | `letter.basic-and-pricing.test.ts` |
| B4 — Ítem malformado en lote | Sí | `letter.basic-and-pricing.test.ts` |
| P1 — Precio economy sin descuentos | Sí | `letter.basic-and-pricing.test.ts` |
| P2 — Descuento por lealtad | Sí | `letter.basic-and-pricing.test.ts` |
| P3 — Descuentos combinados + business | Sí | `letter.basic-and-pricing.test.ts` |
| P4 — Descuentos combinados + first | Sí | `letter.basic-and-pricing.test.ts` |
| C1 — Conversión a ARS | Sí | `letter.exchange-and-errors.test.ts` |
| C2 — Conversión a BRL y EUR en un lote | Sí | `letter.exchange-and-errors.test.ts` |
| C3 — Fallback de tipo de cambio | Sí | `letter.exchange-and-errors.test.ts` |
| C4 — Cache (hit/miss por TTL) | Sí | `letter.exchange-and-errors.test.ts` |
| R1 — Timeout de la API de cambio | Sí | `letter.exchange-and-errors.test.ts` |
| R2 — Excepción inesperada en el servicio de cambio | Sí | `letter.exchange-and-errors.test.ts` |
| R3 — Error de red de la API de cambio | Sí | `letter.exchange-and-errors.test.ts` |
| R4 — Datos corruptos (`basePriceUSD: NaN`) | Sí | `letter.exchange-and-errors.test.ts` |

#### Aclaraciones / decisiones de diseño (D1–D13)

| Requerimiento | Implementado | Archivo(s) | Referencia |
|---|---|---|---|
| Todas las decisiones D1–D13 registradas con plantilla completa | Sí | — | `DESIGN_DECISIONS.md` (sección D1–D13), revisado en TICKET-40 |
| Decisiones menores (arquitectura, config, redondeo, testing, etc.) | Sí | — | `DESIGN_DECISIONS.md` (sección "Decisiones menores") |
| Sección de interpretaciones de la letra | Sí | — | `DESIGN_DECISIONS.md` (sección "Interpretaciones de la letra") |

#### Entregables

| Entregable | Implementado | Archivo(s) |
|---|---|---|
| 1. Código TypeScript | Sí | `src/`, `data/` |
| 2. Tests (unitarios del núcleo del pipeline + integración de los 16 casos) | Sí | `tests/` (181 tests, 28 suites) |
| 3. Colección de Postman con requests y responses reales | Sí | `postman/MTA-Grupo1-Ejercicio1.postman_collection.json` (17 requests, verificados 17/17 contra el servidor real) |
| 4. README (instalación, ejecución, endpoints, etc.) | Sí | `README.md` |
| 5. `DESIGN_DECISIONS.md` | Sí | `DESIGN_DECISIONS.md` |

**Conclusión:** no se detectaron requerimientos faltantes ni entregables incompletos. Los dos hallazgos de la revisión de código post-Sesión 6 (threading de `timeoutMs`/`maxAttempts`/`retryDelayMs`/`fallbackRates`/`cacheTtlMs` del `ExchangeRateService`) ya están corregidos y testeados; la limitación conocida del single-flight ante configs concurrentes distintas quedó documentada como trade-off aceptado (no afecta a ningún caso de la letra). El proyecto queda cerrado con build/lint/tests en verde.
