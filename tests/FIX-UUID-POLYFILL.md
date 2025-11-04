# Fix: Polyfill para crypto.getRandomValues()

## Problema

Al ejecutar los tests en dispositivo móvil (Android/iOS), se produjo el siguiente error:

```
Error: crypto.getRandomValues() not supported.
See https://github.com/uuidjs/uuid#getrandomvalues-not-supported
```

## Causa

React Native no proporciona de forma nativa la API `crypto.getRandomValues()` que necesita la librería `uuid` para generar IDs únicos. Esta API existe en navegadores web, pero no en el entorno de JavaScript de React Native.

## Solución

### 1. Instalar el polyfill

```bash
npm install react-native-get-random-values
```

Este paquete proporciona una implementación de `crypto.getRandomValues()` para React Native.

### 2. Importar el polyfill ANTES de uuid

**MUY IMPORTANTE:** El polyfill debe importarse ANTES de cualquier uso de `uuid`:

```typescript
// ✅ CORRECTO - Polyfill primero
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// ❌ INCORRECTO - uuid antes del polyfill
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
```

### 3. Archivos actualizados

Los siguientes archivos han sido actualizados con el import del polyfill:

- ✅ `tests/phase1.1-verification.ts`
- ✅ `tests/phase1.2-verification.ts`

### 4. Para futuros archivos

Cuando crees nuevos archivos que usen `uuid`, recuerda:

1. Importar el polyfill primero
2. Luego importar uuid
3. No necesitas importarlo en cada archivo, solo en los que usen uuid directamente

**Ejemplo correcto:**

```typescript
// my-new-file.ts
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { ExpensePeriod } from '@/types/expenses';

const createNewPeriod = (): ExpensePeriod => {
  return {
    id: uuidv4(), // ✅ Funciona correctamente
    name: 'Nuevo período',
    createdAt: new Date(),
    expenses: [],
    defaultCurrency: 'SOL',
  };
};
```

## Verificación

### Verificar instalación

```bash
npm list react-native-get-random-values
```

Debería mostrar: `react-native-get-random-values@2.0.0`

### Probar en la app

1. Ejecuta `npx expo start`
2. Abre la app en tu dispositivo
3. Ve a la pestaña "Explore"
4. Presiona "Fase 1.1" o "Todas las Fases"
5. Verifica que los tests de UUID pasen sin errores

## Información adicional

### Documentación oficial

- [uuid en React Native](https://github.com/uuidjs/uuid#getrandomvalues-not-supported)
- [react-native-get-random-values](https://github.com/LinusU/react-native-get-random-values)

### ¿Por qué este orden de imports?

JavaScript ejecuta los imports en el orden en que aparecen. Si importas `uuid` antes del polyfill:

1. `uuid` se carga y busca `crypto.getRandomValues()`
2. No lo encuentra → ERROR
3. El polyfill se carga después (demasiado tarde)

Si importas el polyfill primero:

1. El polyfill se carga y define `crypto.getRandomValues()`
2. `uuid` se carga y encuentra la función → ✅ FUNCIONA

### Alternativas

Si no quisieras usar este polyfill, las alternativas serían:

1. **Usar otra librería de UUID** (menos común, más complicado)
2. **Implementar un generador propio** (no recomendado, difícil garantizar unicidad)
3. **Usar timestamps + random** (no es UUID estándar, menos confiable)

El polyfill es la solución más simple y estándar.

## Commits relacionados

```
920c976 - Fix: Agregar polyfill para crypto.getRandomValues()
```

## Estado

✅ **RESUELTO** - El error ya no debería aparecer en dispositivos móviles.

---

**Fecha:** 2025-11-04
**Afecta a:** Fases 1.1, 1.2 y todas las futuras que usen uuid
