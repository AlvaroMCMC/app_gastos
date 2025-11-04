# Tests - App de Control de Gastos

## Fase 1.1: Verificación de Dependencias

### Objetivo
Verificar que las dependencias instaladas funcionen correctamente:
- `@react-native-async-storage/async-storage` - Para persistencia local
- `uuid` - Para generar IDs únicos
- `@types/uuid` - Tipos TypeScript para uuid

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

**Si UUID falla:**
- Verifica instalación: `npm list uuid`
- Verifica tipos: `npm list @types/uuid`

**Para reinstalar dependencias:**
```bash
npm install @react-native-async-storage/async-storage uuid
npm install --save-dev @types/uuid
```

### Siguiente paso

Una vez que todos los tests pasen, puedes proceder con:
- **Fase 1.2**: Definir tipos y modelos de datos (`types/expenses.ts`)
