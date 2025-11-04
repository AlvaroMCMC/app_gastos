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
  const { periods, loading, createPeriod, addExpense, deleteExpense, deletePeriod, updatePeriodCurrency, reloadPeriods } = useExpenses();
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
      await reloadPeriods();
      await delay(1500); // Esperar a que el Context se actualice

      log('✓ Storage limpiado y recargado\n');
      await delay(500);

      // Test 1: Estado inicial
      log('📋 Test 1: Estado inicial');
      await delay(300);
      // Releer períodos después del delay
      const currentPeriods1 = periods;
      log(`  Períodos: ${currentPeriods1.length}`);
      log(`  Loading: ${loading}`);
      const test1 = currentPeriods1.length === 0;
      log(`  Resultado: ${test1 ? 'PASS ✓' : 'FAIL ✗'}\n`);

      // Test 2: Crear primer período
      log('📋 Test 2: Crear período');
      await createPeriod('Test Período', 'SOL');
      await delay(1000); // Esperar a que se guarde y actualice

      const currentPeriods2 = periods;
      log(`  Períodos después: ${currentPeriods2.length}`);

      if (currentPeriods2.length > 0) {
        const createdPeriod = currentPeriods2[0];
        log(`  Nombre: ${createdPeriod.name}`);
        log(`  Moneda: ${createdPeriod.defaultCurrency}`);
        const test2 = currentPeriods2.length === 1;
        log(`  Resultado: ${test2 ? 'PASS ✓' : 'FAIL ✗'}\n`);

        // Test 3: Añadir gasto
        log('📋 Test 3: Añadir gasto');
        await addExpense(createdPeriod.id, 'Supermercado', 150.50);
        await delay(1000);

        const currentPeriods3 = periods;
        const period3 = currentPeriods3.find(p => p.id === createdPeriod.id);

        if (period3) {
          log(`  Gastos: ${period3.expenses.length}`);
          if (period3.expenses.length > 0) {
            log(`  Descripción: ${period3.expenses[0].description}`);
            log(`  Monto: ${period3.expenses[0].amount}`);
          }
          const test3 = period3.expenses.length === 1;
          log(`  Resultado: ${test3 ? 'PASS ✓' : 'FAIL ✗'}\n`);

          // Test 4: Añadir más gastos
          log('📋 Test 4: Añadir múltiples gastos');
          await addExpense(createdPeriod.id, 'Transporte', 50);
          await delay(800);
          await addExpense(createdPeriod.id, 'Restaurante', 85.75);
          await delay(1000);

          const currentPeriods4 = periods;
          const period4 = currentPeriods4.find(p => p.id === createdPeriod.id);

          if (period4) {
            log(`  Total gastos: ${period4.expenses.length}`);
            const total = period4.expenses.reduce((sum, e) => sum + e.amount, 0);
            log(`  Suma total: S/ ${total.toFixed(2)}`);
            const test4 = period4.expenses.length === 3;
            log(`  Resultado: ${test4 ? 'PASS ✓' : 'FAIL ✗'}\n`);

            // Test 5: Eliminar gasto
            log('📋 Test 5: Eliminar gasto');
            const expenseToDelete = period4.expenses[0];
            await deleteExpense(createdPeriod.id, expenseToDelete.id);
            await delay(1000);

            const currentPeriods5 = periods;
            const period5 = currentPeriods5.find(p => p.id === createdPeriod.id);

            if (period5) {
              log(`  Gastos después: ${period5.expenses.length}`);
              const test5 = period5.expenses.length === 2;
              log(`  Resultado: ${test5 ? 'PASS ✓' : 'FAIL ✗'}\n`);
            }

            // Test 6: Cambiar moneda
            log('📋 Test 6: Cambiar moneda');
            const currentPeriods6a = periods;
            const currentCurrency = currentPeriods6a.find(p => p.id === createdPeriod.id)?.defaultCurrency;
            log(`  Moneda antes: ${currentCurrency}`);
            await updatePeriodCurrency(createdPeriod.id, 'USD');
            await delay(1000);

            const currentPeriods6b = periods;
            const period6 = currentPeriods6b.find(p => p.id === createdPeriod.id);

            if (period6) {
              log(`  Moneda después: ${period6.defaultCurrency}`);
              const test6 = period6.defaultCurrency === 'USD';
              log(`  Resultado: ${test6 ? 'PASS ✓' : 'FAIL ✗'}\n`);
            }
          }
        }

        // Test 7: Crear múltiples períodos
        log('📋 Test 7: Crear múltiples períodos');
        const currentPeriods7a = periods;
        const periodsBeforeMultiple = currentPeriods7a.length;
        await createPeriod('Diciembre 2025', 'BRL');
        await delay(800);
        await createPeriod('Enero 2026', 'SOL');
        await delay(1000);

        const currentPeriods7b = periods;
        log(`  Períodos antes: ${periodsBeforeMultiple}`);
        log(`  Períodos después: ${currentPeriods7b.length}`);
        const test7 = currentPeriods7b.length === 3;
        log(`  Resultado: ${test7 ? 'PASS ✓' : 'FAIL ✗'}\n`);

        // Test 8: Eliminar período
        log('📋 Test 8: Eliminar período');
        const currentPeriods8a = periods;

        if (currentPeriods8a.length >= 2) {
          const periodToDeleteId = currentPeriods8a[1].id;
          const periodsBeforeDelete = currentPeriods8a.length;

          await deletePeriod(periodToDeleteId);
          await delay(1000);

          const currentPeriods8b = periods;
          log(`  Períodos antes: ${periodsBeforeDelete}`);
          log(`  Períodos después: ${currentPeriods8b.length}`);

          const test8 = currentPeriods8b.length === 2;
          log(`  Resultado: ${test8 ? 'PASS ✓' : 'FAIL ✗'}\n`);
        } else {
          log(`  ⚠️  No hay suficientes períodos (actual: ${currentPeriods8a.length})\\n`);
        }
      } else {
        log('  ❌ No se pudo crear el período inicial\n');
      }

      log('=== TESTS COMPLETADOS ===');
      const finalPeriods = periods;
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
        <Text style={styles.statusText}>Períodos: {periods.length}</Text>
        <Text style={styles.statusText}>
          Loading: {loading ? 'Sí' : 'No'}
        </Text>
      </View>

      <Button
        title={running ? 'Ejecutando...' : 'Ejecutar Tests Context'}
        onPress={runTests}
        disabled={running || loading}
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
