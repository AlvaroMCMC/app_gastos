# Plan de Implementación: App de Control de Gastos

## Análisis del Codebase Actual

**Tecnologías detectadas:**
- React Native 0.81.5
- Expo ~54.0.22
- Expo Router ~6.0.14 (navegación file-based)
- TypeScript ~5.9.2
- React 19.1.0

**Estructura actual:**
- `app/_layout.tsx`: Layout principal con navegación Stack
- `app/(tabs)/_layout.tsx`: Layout de tabs (Home, Explore)
- `app/(tabs)/index.tsx`: Pantalla Home
- Componentes temáticos (ThemedView, ThemedText)
- Sistema de temas claro/oscuro

---

## Objetivos de la Aplicación

1. **Persistencia de datos local** usando AsyncStorage o similar
2. **Gestión de períodos**: Crear items como "noviembre 2025", "octubre 2025"
3. **Lista de gastos por período**: Cada período contiene múltiples gastos
4. **CRUD de gastos**: Crear, visualizar y eliminar gastos
5. **Suma automática**: Calcular total de gastos por período
6. **Selector de moneda**: Sol (default), Real, Dólar
7. **Interfaz intuitiva**: Fácil de usar y visualmente clara

---

## Fase 1: Configuración y Estructura Base

### 1.1 Instalar dependencias necesarias
**Archivo afectado:** `package.json`

**Acciones:**
- Instalar `@react-native-async-storage/async-storage` para persistencia
- Instalar `uuid` para generar IDs únicos
- Instalar `@types/uuid` como devDependency

**Comandos:**
```bash
npm install @react-native-async-storage/async-storage uuid
npm install --save-dev @types/uuid
```

**Test:**
- Verificar que las dependencias se instalen correctamente
- Ejecutar `npx expo start` para verificar que no haya errores de dependencias

---

### 1.2 Definir tipos y modelos de datos
**Archivo nuevo:** `types/expenses.ts`

**Contenido:**
```typescript
// Tipos para la moneda
export type Currency = 'SOL' | 'USD' | 'BRL';

// Información de monedas
export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
}

// Gasto individual
export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: Date;
  currency: Currency;
}

// Período de gastos (ej: "noviembre 2025")
export interface ExpensePeriod {
  id: string;
  name: string;
  createdAt: Date;
  expenses: Expense[];
  defaultCurrency: Currency;
}
```

**Test:**
- Crear tipos básicos y verificar que TypeScript no muestre errores
- Importar en otro archivo para verificar que funcionen correctamente

---

### 1.3 Crear servicio de almacenamiento
**Archivo nuevo:** `services/storage.ts`

**Contenido:**
- Funciones para guardar/cargar períodos desde AsyncStorage
- Key constante: `@expense_app:periods`
- Funciones:
  - `loadPeriods()`: Carga todos los períodos
  - `savePeriods(periods)`: Guarda todos los períodos
  - `clearStorage()`: Limpia el storage (útil para testing)

**Código base:**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExpensePeriod } from '@/types/expenses';

const STORAGE_KEY = '@expense_app:periods';

export const loadPeriods = async (): Promise<ExpensePeriod[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const periods = JSON.parse(data);
    // Convertir strings de fecha a objetos Date
    return periods.map((period: any) => ({
      ...period,
      createdAt: new Date(period.createdAt),
      expenses: period.expenses.map((expense: any) => ({
        ...expense,
        date: new Date(expense.date),
      })),
    }));
  } catch (error) {
    console.error('Error loading periods:', error);
    return [];
  }
};

export const savePeriods = async (periods: ExpensePeriod[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(periods));
  } catch (error) {
    console.error('Error saving periods:', error);
    throw error;
  }
};

export const clearStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing storage:', error);
    throw error;
  }
};
```

**Test:**
- Crear un script de prueba o componente temporal
- Guardar datos de prueba
- Cargar datos y verificar que sean correctos
- Verificar que las fechas se conviertan correctamente

---

## Fase 2: Context y Gestión de Estado

### 2.1 Crear Context para gestión de gastos
**Archivo nuevo:** `contexts/ExpenseContext.tsx`

**Contenido:**
- Context con estado global de períodos
- Funciones para:
  - `createPeriod(name, currency)`: Crear nuevo período
  - `deletePeriod(periodId)`: Eliminar período
  - `addExpense(periodId, expense)`: Añadir gasto a período
  - `deleteExpense(periodId, expenseId)`: Eliminar gasto
  - `updatePeriodCurrency(periodId, currency)`: Cambiar moneda del período
- Hook personalizado: `useExpenses()`

**Estructura:**
```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ExpensePeriod, Expense, Currency } from '@/types/expenses';
import { loadPeriods, savePeriods } from '@/services/storage';
import { v4 as uuidv4 } from 'uuid';

interface ExpenseContextType {
  periods: ExpensePeriod[];
  loading: boolean;
  createPeriod: (name: string, currency?: Currency) => Promise<void>;
  deletePeriod: (periodId: string) => Promise<void>;
  addExpense: (periodId: string, description: string, amount: number) => Promise<void>;
  deleteExpense: (periodId: string, expenseId: string) => Promise<void>;
  updatePeriodCurrency: (periodId: string, currency: Currency) => Promise<void>;
}

// Implementación del Context...
```

**Test:**
- Envolver app en Provider
- Verificar que el estado se cargue al iniciar
- Probar cada función CRUD desde un componente de prueba
- Verificar persistencia: cerrar y reabrir app

---

### 2.2 Integrar Context en la app
**Archivo afectado:** `app/_layout.tsx`

**Cambios:**
- Importar `ExpenseProvider`
- Envolver el contenido en `<ExpenseProvider>`

**Test:**
- Verificar que la app cargue sin errores
- Usar React DevTools para inspeccionar el Context

---

## Fase 3: Interfaz de Usuario - Lista de Períodos

### 3.1 Rediseñar pantalla principal (Home)
**Archivo afectado:** `app/(tabs)/index.tsx`

**Cambios:**
- Eliminar contenido de ejemplo
- Mostrar lista de períodos usando FlatList
- Botón flotante (+) para crear nuevo período
- Cada item muestra:
  - Nombre del período
  - Total de gastos
  - Símbolo de moneda
  - Número de gastos
- Al tocar un período, navegar a pantalla de detalles

**Componentes a crear:**
- `PeriodCard`: Tarjeta para cada período
- Botón FAB (Floating Action Button)

**Test:**
- Verificar que la lista se muestre correctamente
- Verificar que la lista esté vacía cuando no hay períodos
- Probar scroll si hay muchos períodos
- Verificar navegación al tocar un período

---

### 3.2 Modal para crear período
**Archivo nuevo:** `components/CreatePeriodModal.tsx`

**Contenido:**
- Modal con formulario
- Input para nombre del período
- Selector de moneda (default: SOL)
- Botones: Cancelar / Crear
- Validación: nombre no vacío

**Test:**
- Abrir/cerrar modal
- Crear período con datos válidos
- Verificar validación de campos vacíos
- Verificar que aparezca en la lista

---

### 3.3 Corrección de colores y contraste
**Archivos afectados:**
- `app/(tabs)/index.tsx` (FAB button)
- `components/CreatePeriodModal.tsx` (botones y moneda seleccionada)
- `components/CreateExpenseModal.tsx` (botones)

**Problema identificado:**
- El botón FAB (+) aparece completamente blanco sin ícono visible
- En el modal de crear período, la moneda seleccionada (SOL) y el botón "Crear" tienen texto blanco sobre fondo blanco
- Falta contraste adecuado entre texto y fondo en elementos interactivos

**Cambios necesarios:**

1. **FAB Button (index.tsx)**:
   - El ícono "plus" debe ser visible con color contrastante
   - Verificar que el color del ícono sea diferente al backgroundColor del botón

2. **Modal Crear Período (CreatePeriodModal.tsx)**:
   - Botón "Crear": Asegurar que el texto sea visible sobre el fondo del botón
   - Moneda seleccionada: Cambiar el color de texto para que contraste con el fondo del botón activo
   - Los botones de moneda activos deben tener texto oscuro o un fondo diferente

3. **Principios de diseño**:
   - Texto blanco sobre fondo claro → cambiar a texto oscuro
   - Texto blanco sobre fondo oscuro → mantener blanco
   - Usar colors.tint como fondo para botones primarios
   - Texto en botones primarios: siempre '#ffffff' si el fondo es oscuro, '#000000' si es claro

**Implementación:**

En `app/(tabs)/index.tsx`:
```typescript
// FAB - asegurar contraste del ícono
<TouchableOpacity
  style={[styles.fab, { backgroundColor: colors.tint }]}
  onPress={() => setModalVisible(true)}
  activeOpacity={0.8}>
  <IconSymbol name="plus" size={28} color="#ffffff" /> {/* Siempre blanco sobre tint */}
</TouchableOpacity>
```

En `components/CreatePeriodModal.tsx`:
```typescript
// Botón de moneda seleccionada - texto debe contrastar
<TouchableOpacity
  style={[
    styles.currencyButton,
    selectedCurrency === currency && [
      styles.currencyButtonActive,
      { backgroundColor: colors.tint }
    ],
  ]}
  onPress={() => setSelectedCurrency(currency)}>
  <Text style={[
    styles.currencySymbol,
    {
      color: selectedCurrency === currency
        ? '#ffffff'  // Blanco cuando está seleccionado sobre tint
        : (colorScheme === 'dark' ? '#ffffff' : '#000000')
    }
  ]}>
    {CURRENCIES[currency].symbol}
  </Text>
  <Text style={[
    styles.currencyName,
    {
      color: selectedCurrency === currency
        ? '#ffffff'  // Blanco cuando está seleccionado sobre tint
        : (colorScheme === 'dark' ? '#cccccc' : '#666666')
    }
  ]}>
    {CURRENCIES[currency].name}
  </Text>
</TouchableOpacity>

// Botón Crear - texto blanco sobre tint
<TouchableOpacity
  style={[styles.button, styles.buttonCreate, { backgroundColor: colors.tint }]}
  onPress={handleCreate}
  disabled={creating}
  activeOpacity={0.7}>
  {creating ? (
    <ActivityIndicator size="small" color="#ffffff" />
  ) : (
    <Text style={styles.buttonCreateText}>Crear</Text>  // Debe ser blanco
  )}
</TouchableOpacity>

// Asegurar que buttonCreateText tenga color blanco
const styles = StyleSheet.create({
  buttonCreateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',  // Siempre blanco
  },
});
```

**Test:**
- Verificar FAB button en Home muestra ícono + claramente
- Verificar que botón "Crear" en modal tiene texto visible
- Verificar que moneda seleccionada tiene texto visible
- Verificar que monedas no seleccionadas también son legibles
- Probar en modo claro y oscuro
- Verificar contraste adecuado en todos los elementos

---

## Fase 4: Pantalla de Detalles del Período

### 4.1 Crear pantalla de detalles
**Archivo nuevo:** `app/period/[id].tsx`

**Contenido:**
- Header con:
  - Nombre del período
  - Selector de moneda
  - Total de gastos
  - Botón de eliminar período
- Lista de gastos (FlatList)
- Cada gasto muestra:
  - Descripción
  - Monto con símbolo de moneda
  - Fecha
  - Botón de eliminar
- Botón flotante (+) para añadir gasto

**Test:**
- Navegar desde lista de períodos
- Verificar que muestre el período correcto
- Verificar que la suma sea correcta
- Cambiar moneda y verificar que persista

---

### 4.2 Modal para crear gasto
**Archivo nuevo:** `components/CreateExpenseModal.tsx`

**Contenido:**
- Modal con formulario
- Input para descripción
- Input numérico para monto
- Fecha automática (Date.now())
- Botones: Cancelar / Crear
- Validación: descripción y monto válido

**Test:**
- Abrir/cerrar modal
- Crear gasto con datos válidos
- Verificar validación
- Verificar que aparezca en la lista
- Verificar que el total se actualice

---

### 4.3 Implementar eliminación de gastos
**Función:** Deslizar para eliminar o botón de eliminar

**Opciones:**
1. Swipeable con react-native-gesture-handler
2. Botón de eliminar con confirmación

**Implementación recomendada:** Botón con Alert de confirmación

**Test:**
- Eliminar gasto
- Verificar confirmación
- Verificar que se elimine de la lista
- Verificar que el total se actualice
- Verificar persistencia

---

## Fase 5: Funcionalidades Adicionales

### 5.1 Selector de moneda
**Archivo nuevo:** `components/CurrencySelector.tsx`

**Contenido:**
- Componente con 3 opciones: SOL, USD, BRL
- Diseño: Botones o Picker
- Mostrar símbolo y nombre
- Resaltar moneda seleccionada

**Datos de monedas:**
```typescript
export const CURRENCIES: Record<Currency, CurrencyInfo> = {
  SOL: { code: 'SOL', symbol: 'S/', name: 'Sol Peruano' },
  USD: { code: 'USD', symbol: '$', name: 'Dólar' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Real Brasileño' },
};
```

**Test:**
- Cambiar moneda en período
- Verificar que se actualice la visualización
- Verificar persistencia

---

### 5.2 Eliminar período
**Implementación:** Botón en pantalla de detalles

**Función:**
- Alert de confirmación
- Eliminar período y todos sus gastos
- Navegar de vuelta a lista

**Test:**
- Eliminar período con gastos
- Verificar confirmación
- Verificar que se elimine
- Verificar navegación
- Verificar persistencia

---

### 5.3 Formateo de números
**Archivo nuevo:** `utils/formatters.ts`

**Contenido:**
- `formatCurrency(amount, currency)`: Formatea número con 2 decimales
- Usar separador de miles y decimales correcto

**Ejemplo:**
```typescript
export const formatCurrency = (amount: number, currency: Currency): string => {
  const symbol = CURRENCIES[currency].symbol;
  return `${symbol} ${amount.toFixed(2)}`;
};
```

**Test:**
- Probar con diferentes montos
- Verificar formato correcto
- Probar con decimales

---

## Fase 6: Mejoras UI/UX

### 6.1 Estilos y diseño
**Acciones:**
- Usar componentes ThemedView y ThemedText existentes
- Crear estilos consistentes
- Colores para:
  - Botones primarios
  - Tarjetas
  - Bordes
  - Fondos
- Espaciado consistente
- Iconos con @expo/vector-icons

**Test:**
- Verificar en modo claro y oscuro
- Verificar consistencia visual

---

### 6.2 Animaciones sutiles
**Opciones:**
- Animaciones al crear/eliminar items
- Transiciones de navegación
- Feedback visual en botones

**Librería:** react-native-reanimated (ya instalada)

**Test:**
- Verificar fluidez
- Verificar que no afecte rendimiento

---

### 6.3 Mensajes de estado vacío
**Implementación:**
- Cuando no hay períodos: "No hay períodos. Toca + para crear uno"
- Cuando no hay gastos en período: "No hay gastos. Toca + para añadir uno"
- Iconos ilustrativos

**Test:**
- Verificar mensajes en estado vacío
- Verificar desaparición al añadir items

---

## Fase 7: Testing y Validación

### 7.1 Tests de funcionalidades
**Checklist:**
- [ ] Crear período
- [ ] Eliminar período
- [ ] Añadir gasto
- [ ] Eliminar gasto
- [ ] Cambiar moneda
- [ ] Cálculo correcto de totales
- [ ] Persistencia al cerrar app
- [ ] Navegación entre pantallas
- [ ] Validaciones de formularios

---

### 7.2 Tests de UI
**Checklist:**
- [ ] Tema claro funciona
- [ ] Tema oscuro funciona
- [ ] Responsive en diferentes tamaños
- [ ] Scroll funciona correctamente
- [ ] Botones responden al toque
- [ ] Modales se abren/cierran correctamente

---

### 7.3 Tests de edge cases
**Checklist:**
- [ ] Montos con decimales
- [ ] Nombres muy largos
- [ ] Muchos períodos (>50)
- [ ] Muchos gastos en un período (>100)
- [ ] Montos negativos (bloquear)
- [ ] Montos muy grandes
- [ ] Campos vacíos
- [ ] Caracteres especiales en nombres

---

## Fase 8: Optimizaciones

### 8.1 Performance
**Acciones:**
- Usar `React.memo` en componentes de lista
- Optimizar re-renders
- `useMemo` para cálculos costosos
- `useCallback` para funciones

**Test:**
- Medir tiempo de carga
- Verificar fluidez con muchos items

---

### 8.2 Manejo de errores
**Implementación:**
- Try-catch en operaciones async
- Mensajes de error amigables
- Logging para debugging

**Test:**
- Simular errores de storage
- Verificar que la app no crashee

---

## Fase 9: Documentación

### 9.1 Comentarios en código
**Estándar:**
- JSDoc para funciones públicas
- Comentarios explicativos en lógica compleja
- TODOs para mejoras futuras

---

### 9.2 README actualizado
**Contenido:**
- Descripción de la app
- Instalación
- Comandos para correr
- Estructura del proyecto
- Tecnologías usadas

---

## Resumen de Archivos a Crear/Modificar

### Archivos Nuevos:
1. `types/expenses.ts` - Tipos TypeScript
2. `services/storage.ts` - Servicio AsyncStorage
3. `contexts/ExpenseContext.tsx` - Context global
4. `components/CreatePeriodModal.tsx` - Modal crear período
5. `components/CreateExpenseModal.tsx` - Modal crear gasto
6. `components/CurrencySelector.tsx` - Selector de moneda
7. `components/PeriodCard.tsx` - Tarjeta de período
8. `utils/formatters.ts` - Funciones de formateo
9. `app/period/[id].tsx` - Pantalla de detalles
10. `constants/currencies.ts` - Datos de monedas

### Archivos a Modificar:
1. `package.json` - Añadir dependencias
2. `app/_layout.tsx` - Integrar Context Provider
3. `app/(tabs)/index.tsx` - Rediseñar home con lista de períodos

---

## Estimación de Tiempo por Fase

- Fase 1: ~2 horas (setup y estructura)
- Fase 2: ~2 horas (context y estado)
- Fase 3: ~3 horas (UI lista períodos)
- Fase 4: ~4 horas (pantalla detalles)
- Fase 5: ~2 horas (funcionalidades adicionales)
- Fase 6: ~2 horas (UI/UX)
- Fase 7: ~3 horas (testing)
- Fase 8: ~1 hora (optimización)
- Fase 9: ~1 hora (documentación)

**Total estimado: ~20 horas**

---

## Orden de Implementación Recomendado

1. Fase 1.1, 1.2, 1.3 (Base y storage)
2. Fase 2.1, 2.2 (Context)
3. Fase 5.1 (Monedas - necesario para siguiente)
4. Fase 3.1, 3.2 (Lista períodos)
5. Fase 4.1, 4.2, 4.3 (Detalles y gastos)
6. Fase 5.2, 5.3 (Funcionalidades finales)
7. Fase 6 (Mejoras UI)
8. Fase 7 (Testing exhaustivo)
9. Fase 8 (Optimización)
10. Fase 9 (Documentación)

---

## Notas Finales

- Cada paso debe ser probado antes de continuar
- Hacer commits frecuentes en git
- Probar en dispositivo real además del simulador
- Considerar agregar estas funcionalidades en el futuro:
  - Filtros por fecha
  - Gráficos de gastos
  - Export a CSV/PDF
  - Categorías de gastos
  - Búsqueda de gastos
  - Edición de gastos
  - Backup en cloud
