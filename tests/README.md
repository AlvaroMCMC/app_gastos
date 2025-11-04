# Tests - App de Control de Gastos

## Fase 1.1: Verificación de Dependencias

### Objetivo
Verificar que las dependencias instaladas funcionen correctamente:
- `@react-native-async-storage/async-storage` - Para persistencia local
- `uuid` - Para generar IDs únicos
- `@types/uuid` - Tipos TypeScript para uuid
- `react-native-get-random-values` - Polyfill para crypto.getRandomValues()

### Archivos

#### `phase1.1-verification.ts`
Contiene las funciones de prueba:
- `testAsyncStorageAvailable()` - Verifica que AsyncStorage esté disponible
- `testUuidGeneration()` - Verifica generación de UUIDs únicos y con formato válido
- `testAsyncStorageOperations()` - Prueba operaciones de lectura/escritura
- `runAllPhase11Tests()` - Ejecuta todos los tests

#### `TestRunner.tsx`
Componente React Native para ejecutar los tests desde la aplicación.

### Cómo ejecutar las pruebas

#### Opción 1: Desde la app (Recomendado)
1. Inicia la app con `npx expo start`
2. Ve a la pestaña "Explore"
3. Presiona el botón "Ejecutar Tests de Fase 1.1"
4. Observa los resultados en la consola dentro de la app

#### Opción 2: Importar en cualquier componente
```typescript
import { runAllPhase11Tests } from '@/tests/phase1.1-verification';

// En un useEffect o handler
useEffect(() => {
  runAllPhase11Tests();
}, []);
```

### Resultados esperados

Todos los tests deben pasar (PASS ✓):

```
=== FASE 1.1: Verificación de Dependencias ===

Test 1: AsyncStorage disponible
✓ AsyncStorage importado correctamente
  Métodos disponibles: { setItem: 'function', getItem: 'function', ... }
Resultado: PASS ✓

Test 2: Generación de UUID
✓ UUID generado correctamente
  Ejemplo ID 1: xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx
  Ejemplo ID 2: xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx
  Los IDs son únicos: true
  Formato válido UUID v4: true
Resultado: PASS ✓

Test 3: Operaciones AsyncStorage
✓ Guardado en AsyncStorage exitoso
✓ Lectura de AsyncStorage exitosa
✓ Limpieza de AsyncStorage exitosa
Resultado: PASS ✓

=== Resumen: TODOS LOS TESTS PASARON ✓ ===
```

### Troubleshooting

**Si AsyncStorage falla:**
- Asegúrate de estar ejecutando en un dispositivo real o simulador (no web)
- Verifica que la dependencia esté instalada: `npm list @react-native-async-storage/async-storage`

**Si UUID falla con error "crypto.getRandomValues() not supported":**
- Asegúrate de que `react-native-get-random-values` esté instalado
- Verifica que se importe ANTES de uuid: `import 'react-native-get-random-values';`
- Reinstala si es necesario: `npm install react-native-get-random-values`

**Si UUID falla por otros motivos:**
- Verifica instalación: `npm list uuid`
- Verifica tipos: `npm list @types/uuid`

**Para reinstalar todas las dependencias:**
```bash
npm install @react-native-async-storage/async-storage uuid react-native-get-random-values
npm install --save-dev @types/uuid
```

---

## Fase 1.2: Verificación de Tipos y Modelos

### Objetivo
Verificar que los tipos y modelos de datos estén correctamente definidos:
- Tipos: `Currency`, `CurrencyInfo`, `Expense`, `ExpensePeriod`
- Constantes: `CURRENCIES`, `AVAILABLE_CURRENCIES`, `DEFAULT_CURRENCY`
- Tipos auxiliares: `CreatePeriodOptions`, `CreateExpenseOptions`, `PeriodStats`

### Archivos

#### `types/expenses.ts`
Define todos los tipos y modelos de datos de la aplicación:
- **Currency**: Tipo para las monedas ('SOL' | 'USD' | 'BRL')
- **CurrencyInfo**: Información de cada moneda (código, símbolo, nombre)
- **Expense**: Modelo de un gasto individual
- **ExpensePeriod**: Modelo de un período de gastos
- **CURRENCIES**: Objeto con información de todas las monedas
- Tipos auxiliares para crear períodos y gastos

#### `phase1.2-verification.ts`
Contiene las funciones de prueba:
- `testCurrencyTypes()` - Verifica tipos Currency y constantes
- `testExpenseType()` - Verifica creación de gastos
- `testExpensePeriodType()` - Verifica creación de períodos
- `testCurrenciesConstant()` - Verifica constante CURRENCIES
- `testAuxiliaryTypes()` - Verifica tipos auxiliares
- `testCompleteScenario()` - Escenario completo con estadísticas
- `runAllPhase12Tests()` - Ejecuta todos los tests

### Cómo ejecutar las pruebas

#### Opción 1: Desde la app (Recomendado)
1. Inicia la app con `npx expo start`
2. Ve a la pestaña "Explore"
3. Presiona el botón "Fase 1.2" o "Todas las Fases"
4. Observa los resultados en la consola dentro de la app

#### Opción 2: Importar en cualquier componente
```typescript
import { runAllPhase12Tests } from '@/tests/phase1.2-verification';

// En un useEffect o handler
useEffect(() => {
  runAllPhase12Tests();
}, []);
```

### Resultados esperados

Todos los tests deben pasar (PASS ✓):

```
=== FASE 1.2: Verificación de Tipos y Modelos ===

✓ Test 1: Tipos Currency
  Monedas soportadas: [ 'SOL', 'USD', 'BRL' ]
  SOL: { code: 'SOL', symbol: 'S/', name: 'Sol Peruano' }
  USD: { code: 'USD', symbol: '$', name: 'Dólar Americano' }
  BRL: { code: 'BRL', symbol: 'R$', name: 'Real Brasileño' }
Resultado Test 1: PASS ✓

✓ Test 2: Tipo Expense
  Gasto creado: { id: '...', description: 'Supermercado Wong', amount: 125.5, ... }
Resultado Test 2: PASS ✓

✓ Test 3: Tipo ExpensePeriod
  Período creado: { id: '...', name: 'Noviembre 2025', expenseCount: 2, ... }
  Total de gastos: S/ 40.00
Resultado Test 3: PASS ✓

✓ Test 4: Constante CURRENCIES
  SOL: VÁLIDO ✓
  USD: VÁLIDO ✓
  BRL: VÁLIDO ✓
Resultado Test 4: PASS ✓

✓ Test 5: Tipos auxiliares
  CreatePeriodOptions: { name: 'Diciembre 2025', defaultCurrency: 'USD' }
  CreateExpenseOptions: { description: 'Gasolina', amount: 50, currency: 'SOL' }
  PeriodStats: { totalExpenses: 500, expenseCount: 10, ... }
Resultado Test 5: PASS ✓

✓ Test 6: Escenario completo
  Período: Octubre 2025
  Gastos registrados: 5
  Estadísticas calculadas:
    Total: S/ 505.50
    Promedio: S/ 101.10
    Máximo: S/ 200.00
    Mínimo: S/ 25.00
Resultado Test 6: PASS ✓

=== Resumen: TODOS LOS TESTS PASARON ✓ ===
```

### Troubleshooting

**Si hay errores de TypeScript:**
- Verifica que el archivo `types/expenses.ts` exista
- Verifica que los tipos estén correctamente exportados
- Ejecuta `npx tsc --noEmit` para verificar errores de compilación

**Si los tests fallan:**
- Verifica que las constantes CURRENCIES estén correctamente definidas
- Verifica que DEFAULT_CURRENCY sea 'SOL'
- Verifica que AVAILABLE_CURRENCIES contenga las 3 monedas

### Siguiente paso

Una vez que todos los tests pasen, puedes proceder con:
- **Fase 1.3**: Crear servicio de almacenamiento (`services/storage.ts`)
