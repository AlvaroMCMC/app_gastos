/**
 * Fase 2.1 - Verificación Simple del Context de Gastos
 *
 * Tests simplificados que funcionan directamente en la app sin librerías de testing
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Button } from 'react-native';
import { ExpenseProvider, useExpenses } from '@/contexts/ExpenseContext';
import { clearStorage } from '@/services/storage';

/**
 * Componente de tests que usa el Context directamente
 */
function ContextTester() {
  const {
    periods,
    loading,
    error,
    createPeriod,
    addExpense,
    deleteExpense,
    deletePeriod,
    updatePeriodCurrency,
  } = useExpenses();

  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const log = (message: string) => {
    setLogs(prev => [...prev, message]);
    console.log(message);
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runTests = async () => {
    setRunning(true);
    setLogs([]);

    log('\n=== FASE 2.1: Verificación del Context ===\n');

    try {
      // Limpiar storage y esperar reload
      log('🧹 Limpiando storage...');
      await clearStorage();
      // Esperar a que el Context recargue
      await delay(500);
      log('✓ Storage limpiado\n');

      // Test 1: Estado inicial
      log('📋 Test 1: Estado inicial');
      log(`  Períodos: ${periods.length}`);
      log(`  Loading: ${loading}`);
      log(`  Error: ${error || 'ninguno'}`);
      const test1 = periods.length === 0 && !loading;
      log(`  Resultado: ${test1 ? 'PASS ✓' : 'FAIL ✗'}\n`);

      // Test 2: Crear período
      log('📋 Test 2: Crear período');
      await createPeriod('Test Período', 'SOL');
      await delay(300); // Esperar actualización de estado
      log(`  Períodos después: ${periods.length}`);
      log(`  Nombre: ${periods[0]?.name}`);
      log(`  Moneda: ${periods[0]?.defaultCurrency}`);
      const test2 = periods.length === 1 && periods[0]?.name === 'Test Período';
      log(`  Resultado: ${test2 ? 'PASS ✓' : 'FAIL ✗'}\n`);

      // Test 3: Añadir gasto
      if (periods.length > 0) {
        log('📋 Test 3: Añadir gasto');
        const periodId = periods[0].id;
        await addExpense(periodId, 'Supermercado', 150.50);
        await delay(300);
        log(`  Gastos: ${periods[0].expenses.length}`);
        log(`  Descripción: ${periods[0].expenses[0]?.description}`);
        log(`  Monto: ${periods[0].expenses[0]?.amount}`);
        const test3 = periods[0].expenses.length === 1;
        log(`  Resultado: ${test3 ? 'PASS ✓' : 'FAIL ✗'}\n`);

        // Test 4: Añadir más gastos
        log('📋 Test 4: Añadir múltiples gastos');
        await addExpense(periodId, 'Transporte', 50);
        await delay(200);
        await addExpense(periodId, 'Restaurante', 85.75);
        await delay(300);
        log(`  Total gastos: ${periods[0].expenses.length}`);
        const total = periods[0].expenses.reduce((sum, e) => sum + e.amount, 0);
        log(`  Suma total: S/ ${total.toFixed(2)}`);
        const test4 = periods[0].expenses.length === 3 && total === 286.25;
        log(`  Resultado: ${test4 ? 'PASS ✓' : 'FAIL ✗'}\n`);

        // Test 5: Eliminar gasto
        log('📋 Test 5: Eliminar gasto');
        const expenseId = periods[0].expenses[0].id;
        await deleteExpense(periodId, expenseId);
        await delay(300);
        log(`  Gastos después: ${periods[0].expenses.length}`);
        const test5 = periods[0].expenses.length === 2;
        log(`  Resultado: ${test5 ? 'PASS ✓' : 'FAIL ✗'}\n`);

        // Test 6: Cambiar moneda
        log('📋 Test 6: Cambiar moneda');
        log(`  Moneda antes: ${periods[0].defaultCurrency}`);
        await updatePeriodCurrency(periodId, 'USD');
        await delay(300);
        log(`  Moneda después: ${periods[0].defaultCurrency}`);
        const test6 = periods[0].defaultCurrency === 'USD';
        log(`  Resultado: ${test6 ? 'PASS ✓' : 'FAIL ✗'}\n`);
      }

      // Test 7: Crear múltiples períodos
      log('📋 Test 7: Crear múltiples períodos');
      await createPeriod('Diciembre 2025', 'BRL');
      await delay(200);
      await createPeriod('Enero 2026', 'SOL');
      await delay(300);
      log(`  Total períodos: ${periods.length}`);
      const test7 = periods.length === 3;
      log(`  Resultado: ${test7 ? 'PASS ✓' : 'FAIL ✗'}\n`);

      // Test 8: Eliminar período
      log('📋 Test 8: Eliminar período');
      if (periods.length >= 2) {
        const periodToDelete = periods[1].id;
        await deletePeriod(periodToDelete);
        await delay(300);
        log(`  Períodos después: ${periods.length}`);
        const test8 = periods.length === 2;
        log(`  Resultado: ${test8 ? 'PASS ✓' : 'FAIL ✗'}\n`);
      } else {
        log(`  Error: No hay suficientes períodos para eliminar\n`);
      }

      log('=== TESTS COMPLETADOS ===');
      log(`Total períodos: ${periods.length}`);
      log(`Total gastos: ${periods.reduce((sum, p) => sum + p.expenses.length, 0)}`);

    } catch (err) {
      log(`\n❌ ERROR: ${err}`);
    }

    setRunning(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Context Tests - Phase 2.1</Text>

      <View style={styles.status}>
        <Text style={styles.statusText}>Períodos: {periods.length}</Text>
        <Text style={styles.statusText}>Loading: {loading ? 'Sí' : 'No'}</Text>
        {error && <Text style={styles.errorText}>Error: {error}</Text>}
      </View>

      <Button
        title={running ? 'Ejecutando...' : 'Ejecutar Tests Context'}
        onPress={runTests}
        disabled={running}
      />

      <ScrollView style={styles.logsContainer}>
        {logs.map((line, index) => (
          <Text key={index} style={styles.logLine}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * Componente principal que envuelve el tester con el Provider
 */
export default function Phase21TestRunner() {
  return (
    <ExpenseProvider>
      <ContextTester />
    </ExpenseProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  status: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 5,
  },
  errorText: {
    fontSize: 14,
    color: 'red',
    marginTop: 5,
  },
  logsContainer: {
    marginTop: 20,
    backgroundColor: '#1e1e1e',
    padding: 15,
    borderRadius: 8,
    flex: 1,
  },
  logLine: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#00ff00',
    marginBottom: 4,
  },
});
