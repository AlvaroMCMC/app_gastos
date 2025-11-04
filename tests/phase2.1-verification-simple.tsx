/**
 * Fase 2.1 - Verificación Simple del Context de Gastos
 *
 * Tests simplificados que funcionan directamente en la app sin librerías de testing
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { ExpenseProvider, useExpenses } from '@/contexts/ExpenseContext';
import { clearStorage } from '@/services/storage';

/**
 * Componente de tests que usa el Context directamente
 */
function ContextTester() {
  const context = useExpenses();
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
      // Limpiar storage y recargar
      log('🧹 Limpiando storage...');
      await clearStorage();
      await context.reloadPeriods();
      await delay(500);
      log('✓ Storage limpiado y recargado\n');

      // Test 1: Estado inicial
      log('📋 Test 1: Estado inicial');
      log(`  Períodos: ${context.periods.length}`);
      log(`  Loading: ${context.loading}`);
      const test1 = context.periods.length === 0;
      log(`  Resultado: ${test1 ? 'PASS ✓' : 'FAIL ✗'}\n`);

      // Test 2: Crear primer período
      log('📋 Test 2: Crear período');
      await context.createPeriod('Test Período', 'SOL');
      await delay(500);

      // Re-leer el contexto
      const periodsAfterCreate = context.periods;
      log(`  Períodos después: ${periodsAfterCreate.length}`);

      if (periodsAfterCreate.length > 0) {
        log(`  Nombre: ${periodsAfterCreate[0].name}`);
        log(`  Moneda: ${periodsAfterCreate[0].defaultCurrency}`);
        const test2 = periodsAfterCreate.length === 1;
        log(`  Resultado: ${test2 ? 'PASS ✓' : 'FAIL ✗'}\n`);

        // Test 3: Añadir gasto
        const period = periodsAfterCreate[0];
        log('📋 Test 3: Añadir gasto');
        await context.addExpense(period.id, 'Supermercado', 150.50);
        await delay(500);

        const periodsAfterExpense = context.periods;
        const periodWithExpense = periodsAfterExpense.find(p => p.id === period.id);

        if (periodWithExpense) {
          log(`  Gastos: ${periodWithExpense.expenses.length}`);
          if (periodWithExpense.expenses.length > 0) {
            log(`  Descripción: ${periodWithExpense.expenses[0].description}`);
            log(`  Monto: ${periodWithExpense.expenses[0].amount}`);
          }
          const test3 = periodWithExpense.expenses.length === 1;
          log(`  Resultado: ${test3 ? 'PASS ✓' : 'FAIL ✗'}\n`);

          // Test 4: Añadir más gastos
          log('📋 Test 4: Añadir múltiples gastos');
          await context.addExpense(period.id, 'Transporte', 50);
          await delay(300);
          await context.addExpense(period.id, 'Restaurante', 85.75);
          await delay(500);

          const periodsAfterMultiple = context.periods;
          const periodWithMultiple = periodsAfterMultiple.find(p => p.id === period.id);

          if (periodWithMultiple) {
            log(`  Total gastos: ${periodWithMultiple.expenses.length}`);
            const total = periodWithMultiple.expenses.reduce((sum, e) => sum + e.amount, 0);
            log(`  Suma total: S/ ${total.toFixed(2)}`);
            const test4 = periodWithMultiple.expenses.length === 3;
            log(`  Resultado: ${test4 ? 'PASS ✓' : 'FAIL ✗'}\n`);

            // Test 5: Eliminar gasto
            log('📋 Test 5: Eliminar gasto');
            const expenseToDelete = periodWithMultiple.expenses[0];
            await context.deleteExpense(period.id, expenseToDelete.id);
            await delay(500);

            const periodsAfterDelete = context.periods;
            const periodAfterDelete = periodsAfterDelete.find(p => p.id === period.id);

            if (periodAfterDelete) {
              log(`  Gastos después: ${periodAfterDelete.expenses.length}`);
              const test5 = periodAfterDelete.expenses.length === 2;
              log(`  Resultado: ${test5 ? 'PASS ✓' : 'FAIL ✗'}\n`);
            }

            // Test 6: Cambiar moneda
            log('📋 Test 6: Cambiar moneda');
            const currentCurrency = context.periods.find(p => p.id === period.id)?.defaultCurrency;
            log(`  Moneda antes: ${currentCurrency}`);
            await context.updatePeriodCurrency(period.id, 'USD');
            await delay(500);

            const periodsAfterCurrency = context.periods;
            const periodWithNewCurrency = periodsAfterCurrency.find(p => p.id === period.id);

            if (periodWithNewCurrency) {
              log(`  Moneda después: ${periodWithNewCurrency.defaultCurrency}`);
              const test6 = periodWithNewCurrency.defaultCurrency === 'USD';
              log(`  Resultado: ${test6 ? 'PASS ✓' : 'FAIL ✗'}\n`);
            }
          }
        }

        // Test 7: Crear múltiples períodos
        log('📋 Test 7: Crear múltiples períodos');
        const periodsBeforeMultiple = context.periods.length;
        await context.createPeriod('Diciembre 2025', 'BRL');
        await delay(300);
        await context.createPeriod('Enero 2026', 'SOL');
        await delay(500);

        const periodsAfterMultiple = context.periods;
        log(`  Períodos antes: ${periodsBeforeMultiple}`);
        log(`  Períodos después: ${periodsAfterMultiple.length}`);
        const test7 = periodsAfterMultiple.length === 3;
        log(`  Resultado: ${test7 ? 'PASS ✓' : 'FAIL ✗'}\n`);

        // Test 8: Eliminar período
        log('📋 Test 8: Eliminar período');
        const currentPeriods = context.periods;

        if (currentPeriods.length >= 2) {
          const periodToDeleteId = currentPeriods[1].id;
          const periodsBeforeDelete = currentPeriods.length;

          await context.deletePeriod(periodToDeleteId);
          await delay(500);

          const periodsAfterDeletePeriod = context.periods;
          log(`  Períodos antes: ${periodsBeforeDelete}`);
          log(`  Períodos después: ${periodsAfterDeletePeriod.length}`);

          const test8 = periodsAfterDeletePeriod.length === 2;
          log(`  Resultado: ${test8 ? 'PASS ✓' : 'FAIL ✗'}\n`);
        } else {
          log(`  ⚠️  No hay suficientes períodos (actual: ${currentPeriods.length})\n`);
        }
      } else {
        log('  ❌ No se pudo crear el período inicial\n');
      }

      log('=== TESTS COMPLETADOS ===');
      const finalPeriods = context.periods;
      log(`Total períodos: ${finalPeriods.length}`);
      const totalExpenses = finalPeriods.reduce((sum, p) => sum + p.expenses.length, 0);
      log(`Total gastos: ${totalExpenses}`);

    } catch (err) {
      log(`\n❌ ERROR: ${err}`);
      console.error('Error completo:', err);
    }

    setRunning(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Context Tests - Phase 2.1</Text>

      <View style={styles.status}>
        <Text style={styles.statusText}>Períodos: {context.periods.length}</Text>
        <Text style={styles.statusText}>
          Loading: {context.loading ? 'Sí' : 'No'}
        </Text>
        {context.error && <Text style={styles.errorText}>Error: {context.error}</Text>}
      </View>

      <Button
        title={running ? 'Ejecutando...' : 'Ejecutar Tests Context'}
        onPress={runTests}
        disabled={running || context.loading}
      />

      {running && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Ejecutando tests...</Text>
        </View>
      )}

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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  loadingText: {
    marginLeft: 10,
    color: '#007AFF',
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
