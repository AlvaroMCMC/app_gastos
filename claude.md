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
- ~~Selector de moneda (default: SOL)~~ **ELIMINADO en Fase 4.3** - La moneda se elige al crear gastos
- Nota informativa: "La moneda se seleccionará al crear cada gasto"
- Botones: Cancelar / Crear
- Validación: nombre no vacío
- Siempre crea períodos con DEFAULT_CURRENCY (SOL) por compatibilidad

**Test:**
- Abrir/cerrar modal
- Crear período con datos válidos
- Verificar validación de campos vacíos
- Verificar que aparezca en la lista
- Verificar que NO pida seleccionar moneda

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

### 4.3 Selector de moneda por gasto y totales multi-moneda
**Archivos afectados:**
- `components/CreateExpenseModal.tsx` (agregar selector de moneda)
- `contexts/ExpenseContext.tsx` (modificar addExpense para aceptar currency)
- `app/period/[id].tsx` (mostrar totales por moneda)
- `components/PeriodCard.tsx` (mostrar totales por moneda en lista)

**Problema a resolver:**
Actualmente, todos los gastos de un período usan la misma moneda (defaultCurrency del período).
Sin embargo, en la realidad un período puede tener gastos en múltiples monedas (ej: viaje internacional, compras en diferentes países).

**Cambios necesarios:**

1. **Modal Crear Gasto - Selector de moneda**:
   - Agregar selector de moneda en `CreateExpenseModal.tsx`
   - Por defecto: SOL (siempre, independiente del período)
   - Usuario puede seleccionar: SOL, USD, o BRL
   - La moneda seleccionada se guarda con el gasto individual

**Implementación en CreateExpenseModal.tsx:**
```typescript
export function CreateExpenseModal({ visible, onClose, onCreateExpense }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('SOL'); // Siempre SOL por defecto
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    // ... validaciones existentes ...

    try {
      setCreating(true);
      await onCreateExpense(trimmedDescription, parsedAmount, selectedCurrency);
      // ... resto del código ...
    }
  };

  const handleClose = () => {
    setDescription('');
    setAmount('');
    setSelectedCurrency('SOL'); // Reset a SOL
    onClose();
  };

  return (
    <Modal visible={visible}>
      {/* ... inputs existentes ... */}

      {/* Selector de moneda - Similar a CreatePeriodModal */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Moneda</Text>
        <View style={styles.currencySelector}>
          {AVAILABLE_CURRENCIES.map((currency) => (
            <TouchableOpacity
              key={currency}
              style={[
                styles.currencyButton,
                selectedCurrency === currency && {
                  backgroundColor: '#007AFF'
                },
              ]}
              onPress={() => setSelectedCurrency(currency)}>
              <Text style={[
                styles.currencySymbol,
                {
                  color: selectedCurrency === currency
                    ? '#ffffff'
                    : (colorScheme === 'dark' ? '#ffffff' : '#000000')
                }
              ]}>
                {CURRENCIES[currency].symbol}
              </Text>
              <Text style={[
                styles.currencyName,
                {
                  color: selectedCurrency === currency
                    ? '#ffffff'
                    : colors.tabIconDefault
                }
              ]}>
                {CURRENCIES[currency].name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ... botones existentes ... */}
    </Modal>
  );
}
```

2. **Context - Modificar addExpense**:
```typescript
// En ExpenseContext.tsx
const addExpense = async (
  periodId: string,
  description: string,
  amount: number,
  currency: Currency = 'SOL' // Parámetro opcional con default SOL
): Promise<void> => {
  try {
    const period = periods.find((p) => p.id === periodId);
    if (!period) {
      throw new Error(`Período no encontrado: ${periodId}`);
    }

    const newExpense: Expense = {
      id: uuidv4(),
      description,
      amount,
      date: new Date(),
      currency, // Usar la moneda recibida, no period.defaultCurrency
    };

    // ... resto del código existente ...
  }
};
```

3. **Pantalla de detalles - Totales por moneda**:

**Función helper para calcular totales:**
```typescript
// En app/period/[id].tsx
interface CurrencyTotal {
  currency: Currency;
  total: number;
  count: number;
}

const calculateTotalsByCurrency = (expenses: Expense[]): CurrencyTotal[] => {
  const totalsMap: Record<Currency, { total: number; count: number }> = {
    SOL: { total: 0, count: 0 },
    USD: { total: 0, count: 0 },
    BRL: { total: 0, count: 0 },
  };

  expenses.forEach((expense) => {
    totalsMap[expense.currency].total += expense.amount;
    totalsMap[expense.currency].count += 1;
  });

  // Filtrar solo las monedas que tienen gastos
  return AVAILABLE_CURRENCIES
    .filter((currency) => totalsMap[currency].count > 0)
    .map((currency) => ({
      currency,
      total: totalsMap[currency].total,
      count: totalsMap[currency].count,
    }));
};
```

**Actualizar sección de resumen:**
```typescript
// En app/period/[id].tsx - Reemplazar el total único
const currencyTotals = calculateTotalsByCurrency(period.expenses);

// En el render:
<View style={styles.summary}>
  <View style={styles.summaryHeader}>
    <Text style={styles.summaryTitle}>Resumen</Text>
    <Text style={styles.expenseCount}>
      {period.expenses.length} {period.expenses.length === 1 ? 'gasto' : 'gastos'}
    </Text>
  </View>

  {/* Mostrar totales por moneda */}
  {currencyTotals.length === 0 ? (
    <Text style={styles.noExpensesText}>Sin gastos</Text>
  ) : (
    <View style={styles.totalsContainer}>
      {currencyTotals.map(({ currency, total, count }) => {
        const currencyInfo = CURRENCIES[currency];
        return (
          <View key={currency} style={styles.totalRow}>
            <View style={styles.totalCurrency}>
              <Text style={styles.totalCurrencySymbol}>
                {currencyInfo.symbol}
              </Text>
              <Text style={styles.totalCurrencyName}>
                {currencyInfo.name}
              </Text>
            </View>
            <View style={styles.totalAmount}>
              <Text style={styles.totalValue}>
                {currencyInfo.symbol} {total.toFixed(2)}
              </Text>
              <Text style={styles.totalCount}>
                {count} {count === 1 ? 'gasto' : 'gastos'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  )}

  {/* Selector de moneda del período - ELIMINAR o hacer opcional */}
  {/* Ya no es necesario porque cada gasto tiene su propia moneda */}
</View>
```

4. **Tarjeta de período - Totales por moneda**:

**En PeriodCard.tsx:**
```typescript
export function PeriodCard({ period, onPress }: PeriodCardProps) {
  // Calcular totales por moneda
  const currencyTotals = calculateTotalsByCurrency(period.expenses);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.periodName}>{period.name}</Text>
        <Text style={styles.date}>
          {formatDate(period.createdAt)}
        </Text>
      </View>

      {/* Mostrar totales por moneda */}
      {currencyTotals.length === 0 ? (
        <Text style={styles.noExpenses}>Sin gastos</Text>
      ) : (
        <View style={styles.totalsContainer}>
          {currencyTotals.map(({ currency, total }) => {
            const currencyInfo = CURRENCIES[currency];
            return (
              <Text key={currency} style={styles.totalText}>
                {currencyInfo.symbol} {total.toFixed(2)}
              </Text>
            );
          })}
        </View>
      )}

      <Text style={styles.expenseCount}>
        {period.expenses.length} {period.expenses.length === 1 ? 'gasto' : 'gastos'}
      </Text>
    </TouchableOpacity>
  );
}
```

**Notas importantes:**

1. **Moneda por defecto**: Siempre SOL al abrir el modal (no depende del período)
2. **defaultCurrency del período**:
   - Se mantiene en el modelo por compatibilidad
   - Puede usarse como sugerencia visual (opcional)
   - Ya no se usa para crear gastos automáticamente
3. **Selector de moneda del período**:
   - Puede eliminarse de la pantalla de detalles
   - O mantenerse como referencia/sugerencia
4. **Retrocompatibilidad**:
   - Los gastos existentes ya tienen su currency
   - No requiere migración de datos

**Test:**
- Crear gasto con moneda SOL (por defecto)
- Crear gasto con moneda USD
- Crear gasto con moneda BRL
- Verificar que el gasto se guarde con la moneda correcta
- Verificar totales por moneda en pantalla de detalles
- Verificar totales por moneda en PeriodCard
- Crear múltiples gastos en diferentes monedas
- Verificar que se muestren todos los totales correctamente
- Verificar persistencia al cerrar y reabrir app

---

### 4.4 Validación de nombres únicos y timestamp de gastos
**Archivos afectados:**
- `contexts/ExpenseContext.tsx` (validación de nombre único, timestamp)
- `components/CreatePeriodModal.tsx` (mostrar error de nombre duplicado)
- `app/period/[id].tsx` (mostrar hora en lista de gastos)
- `components/PeriodCard.tsx` (opcional: mostrar último gasto)

**Problema a resolver:**
1. Actualmente se pueden crear múltiples períodos con el mismo nombre
2. Los gastos solo guardan la fecha, no la hora exacta

**Cambios necesarios:**

#### 1. Validación de nombres únicos de períodos

**En ExpenseContext.tsx:**
```typescript
const createPeriod = async (name: string, currency: Currency = 'SOL'): Promise<void> => {
  try {
    // Validar que el nombre no esté vacío
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('El nombre del período no puede estar vacío');
    }

    // Validar que no exista un período con el mismo nombre (case-insensitive)
    const existingPeriod = periods.find(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingPeriod) {
      throw new Error(`Ya existe un período con el nombre "${trimmedName}"`);
    }

    const newPeriod: ExpensePeriod = {
      id: uuidv4(),
      name: trimmedName,
      createdAt: new Date(),
      expenses: [],
      defaultCurrency: currency,
    };

    const updatedPeriods = [...periods, newPeriod];
    setPeriods(updatedPeriods);
    await savePeriodsToStorage(updatedPeriods);

    console.log('✅ Context: Período creado:', trimmedName);
  } catch (err) {
    console.error('❌ Context: Error creando período:', err);
    throw err; // Re-lanzar para que el modal lo capture
  }
};
```

**En CreatePeriodModal.tsx:**
```typescript
const handleCreate = async () => {
  const trimmedName = periodName.trim();
  if (!trimmedName) {
    Alert.alert('Error', 'Por favor ingresa un nombre para el período');
    return;
  }

  try {
    setCreating(true);
    await onCreatePeriod(trimmedName, DEFAULT_CURRENCY);
    Alert.alert('Éxito', `Período "${trimmedName}" creado`);
    handleClose();
  } catch (error) {
    // Capturar error específico de nombre duplicado
    const errorMessage = error instanceof Error ? error.message : 'No se pudo crear el período';
    Alert.alert('Error', errorMessage);
  } finally {
    setCreating(false);
  }
};
```

#### 2. Timestamp completo en gastos (hora y minutos)

**Nota:** El modelo `Expense` ya tiene campo `date: Date` que incluye hora, solo necesitamos asegurarnos de:
1. Usar `new Date()` al crear gastos (ya implementado)
2. Mostrar la hora en la UI

**En app/period/[id].tsx - Formatear fecha con hora:**
```typescript
const formatDateTime = (date: Date) => {
  const dateStr = date.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const timeStr = date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `${dateStr} • ${timeStr}`;
};

// En el renderizado de expense card:
<Text style={[styles.expenseDate, { color: colors.tabIconDefault }]}>
  {formatDateTime(expense.date)}
</Text>
```

**Ejemplo de output:**
- Antes: `5 ene 2025`
- Ahora: `5 ene 2025 • 02:30 PM`

#### 3. Opcional: Mostrar último gasto en PeriodCard

**En PeriodCard.tsx:**
```typescript
export function PeriodCard({ period, onPress }: PeriodCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const currencyTotals = calculateTotalsByCurrency(period.expenses);
  const expenseCount = period.expenses.length;

  // Obtener último gasto
  const lastExpense = period.expenses.length > 0
    ? period.expenses[period.expenses.length - 1]
    : null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <TouchableOpacity ...>
      <View style={styles.header}>
        <Text style={styles.periodName}>{period.name}</Text>
        <Text style={styles.date}>{formattedDate}</Text>
      </View>

      {/* Totales por moneda */}
      {/* ... código existente ... */}

      {/* Contador de gastos y último gasto */}
      <View style={styles.footer}>
        <Text style={[styles.expenseCount, { color: colors.tabIconDefault }]}>
          {expenseCount} {expenseCount === 1 ? 'gasto' : 'gastos'}
        </Text>
        {lastExpense && (
          <Text style={[styles.lastExpense, { color: colors.tabIconDefault }]}>
            Último: {lastExpense.description} • {formatDate(lastExpense.date)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
```

**Notas importantes:**

1. **Validación de nombre único:**
   - Case-insensitive: "Enero 2025" === "enero 2025"
   - Trim automático para evitar espacios
   - Error descriptivo al usuario

2. **Timestamp de gastos:**
   - Ya se guarda automáticamente con `new Date()`
   - Solo necesitamos mostrar la hora en la UI
   - Formato: "5 ene 2025 • 02:30 PM"

3. **Compatibilidad:**
   - Gastos existentes ya tienen timestamp completo
   - No requiere migración de datos

**Test:**
- Intentar crear período con nombre duplicado
- Verificar que muestre error específico
- Crear período con nombre único
- Crear varios gastos y verificar timestamp
- Verificar que muestre hora exacta en lista
- Verificar formato: "DD MMM YYYY • HH:MM AM/PM"
- Verificar orden cronológico de gastos

---

### 4.5 Implementar eliminación de gastos
**Nota:** Ya implementado en Fase 4.1

**Funcionalidad existente:**
- Botón de eliminar en cada gasto
- Confirmación con Alert
- Actualización automática de totales
- Persistencia

---

## Fase 5: Funcionalidades Adicionales

### 5.1 Selector de moneda
**Nota:** Ya implementado en fases anteriores

**Funcionalidad existente:**
- Selector de moneda en CreatePeriodModal (Fase 3.2)
- Selector de moneda en CreateExpenseModal (Fase 4.3)
- Selector de moneda del período en pantalla de detalles (Fase 4.1)
- Constantes CURRENCIES en types/expenses.ts (Fase 1.2)

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

## Fase 4.5: Ordenamiento y Formato de Fecha con Hora

### Objetivo
Mejorar la visualización de períodos ordenándolos de más nuevo a más antiguo, y mostrar la hora de creación junto con la fecha.

### 4.5.1 Ordenar períodos de más nuevo a más antiguo
**Archivo afectado:** `app/(tabs)/index.tsx`

**Problema identificado:**
- Los períodos se mostraban en el orden en que fueron cargados desde storage
- No había un ordenamiento consistente basado en fecha de creación

**Cambios:**
```typescript
<FlatList
  data={[...periods].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <PeriodCard period={item} onPress={() => handlePeriodPress(item.id)} />
  )}
  contentContainerStyle={styles.listContent}
  showsVerticalScrollIndicator={false}
/>
```

**Detalles técnicos:**
- Se crea una copia del array `periods` con spread operator `[...periods]` para no mutar el estado original
- Se ordena comparando los timestamps de `createdAt` convertidos a milisegundos
- El orden es descendente: `b - a` (más nuevo primero)

**Test:**
- Verificar que el período más reciente aparece primero en la lista
- Crear varios períodos y verificar que el orden se mantiene correcto
- Verificar que el ordenamiento funciona incluso después de cerrar y reabrir la app

---

### 4.5.2 Agregar hora a la fecha de creación del período
**Archivo afectado:** `components/PeriodCard.tsx`

**Problema identificado:**
- Solo se mostraba la fecha de creación (día, mes, año)
- No había información de la hora exacta de creación del período

**Cambios:**
```typescript
// Formatear fecha con hora
const formattedDate = period.createdAt.toLocaleDateString('es-PE', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const formattedTime = period.createdAt.toLocaleTimeString('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

// En el JSX
<Text style={[styles.date, { color: colors.tabIconDefault }]}>
  {formattedDate} • {formattedTime}
</Text>
```

**Formato resultante:**
- **Antes:** `12 nov. 2025`
- **Después:** `12 nov. 2025 • 3:45 PM`

**Detalles técnicos:**
- Se usa `toLocaleTimeString` con locale `es-PE` para formato peruano
- Formato 12 horas (`hour12: true`) con AM/PM
- Separador bullet point (•) entre fecha y hora
- Consistente con el formato usado en gastos (Fase 4.4)

**Test:**
- Verificar que la hora se muestre correctamente
- Verificar formato 12 horas con AM/PM
- Verificar bullet point entre fecha y hora
- Probar en modo claro y oscuro

---

### 4.5.3 Crear tests de verificación para Fase 4.5
**Archivo nuevo:** `tests/phase4.5-verification.tsx`

**Contenido:**
- Test 1: Verificar ordenamiento de períodos (más nuevo primero)
- Test 2: Verificar formato de fecha con hora
- Test 3: Verificar bullet point en formato
- Test 4: Verificar timestamps únicos entre períodos

**Implementación:**
```typescript
// Test 1: Ordenamiento
if (periods.length >= 2) {
  let isOrdered = true;
  for (let i = 0; i < periods.length - 1; i++) {
    const currentDate = new Date(periods[i].createdAt).getTime();
    const nextDate = new Date(periods[i + 1].createdAt).getTime();
    if (currentDate < nextDate) {
      isOrdered = false;
      break;
    }
  }
  // ... actualizar resultado del test
}
```

**Test:**
- Ejecutar tests desde la pantalla Explore
- Verificar que todos los tests pasen
- Crear períodos manualmente para verificar casos reales

---

### 4.5.4 Sistema de Tests Completos
**Archivo nuevo:** `tests/all-tests-verification.tsx`

**Objetivo:**
Verificar que cambios nuevos no rompan funcionalidades anteriores ejecutando todos los tests de las fases 3.1 a 4.5.

**Fases incluidas:**
- **Fase 3.1**: Interfaz de Lista de Períodos
- **Fase 4.1-4.2**: Gestión de Gastos y Totales por Moneda
- **Fase 4.4**: Validación de Nombres Únicos y Timestamps
- **Fase 4.5**: Ordenamiento y Formato de Fecha con Hora

**Características:**
- Ejecuta todos los tests en una sola sesión
- Agrupa resultados por fase para fácil visualización
- Muestra resumen de tests pasados/fallidos
- Incluye todos los tests críticos de funcionalidades implementadas

**Uso:**
```typescript
// En explore.tsx
<ThemedView style={{ padding: 20, paddingTop: 0, marginBottom: 20 }}>
  <ThemedText style={{ fontWeight: 'bold', marginBottom: 10, fontSize: 16, color: '#007AFF' }}>
    🔄 Tests Completos (Todas las Fases)
  </ThemedText>
  <ThemedText style={{ fontSize: 12, marginBottom: 10, opacity: 0.7 }}>
    Ejecuta todos los tests de las fases 3.1 a 4.5 para verificar que cambios nuevos no rompan funcionalidades anteriores
  </ThemedText>
  <AllTestsVerification />
</ThemedView>
```

**Beneficios:**
- **Regresión:** Detecta si nuevos cambios rompen funcionalidades existentes
- **Confianza:** Asegura que toda la aplicación funciona correctamente
- **Eficiencia:** Un solo botón ejecuta todos los tests
- **Documentación:** Sirve como documentación viva de las funcionalidades

**Test:**
- Ejecutar tests completos desde la pantalla Explore
- Verificar que todos los tests de todas las fases pasen
- Hacer un cambio que rompa algo y verificar que el test lo detecte
- Verificar que el resumen muestra correctamente el total de tests pasados/fallidos

---

### 4.5.5 Integración en navegación
**Archivo afectado:** `app/(tabs)/explore.tsx`

**Cambios:**
- Importar `Phase45Verification` y `AllTestsVerification`
- Agregar sección para Fase 4.5
- Agregar sección destacada para Tests Completos

**Test:**
- Navegar a la pestaña Explore
- Verificar que aparecen las nuevas secciones de tests
- Ejecutar tests individuales de Fase 4.5
- Ejecutar tests completos y verificar que funcionen todos

---

## Resumen de Implementación Fase 4.5

### Archivos Modificados:
1. `app/(tabs)/index.tsx` - Ordenamiento de períodos (línea 119)
2. `components/PeriodCard.tsx` - Formato de fecha con hora (líneas 53-63, 85)
3. `app/(tabs)/explore.tsx` - Integración de tests (líneas 21-22, 107-122)

### Archivos Nuevos:
1. `tests/phase4.5-verification.tsx` - Tests de ordenamiento y formato
2. `tests/all-tests-verification.tsx` - Sistema de tests completos

### Beneficios de la Fase:
- **UX mejorada:** Los períodos más recientes aparecen primero
- **Información completa:** Fecha y hora de creación del período
- **Calidad asegurada:** Sistema de tests completos para prevenir regresiones
- **Mantenibilidad:** Tests independientes permiten verificar cada funcionalidad

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
