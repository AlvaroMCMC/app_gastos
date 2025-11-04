/**
 * Fase 2.1 - Verificación REACTIVA del Context de Gastos
 *
 * Este enfoque usa useEffect para detectar cambios en el Context
 * y ejecutar los tests de forma reactiva
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { ExpenseProvider, useExpenses } from '@/contexts/ExpenseContext';
import { clearStorage } from '@/services/storage';

type TestStep =
  | 'idle'
  | 'clearing'
  | 'test1_initial'
  | 'test2_create_period'
  | 'test2_verify'
  | 'test3_add_expense'
  | 'test3_verify'
  | 'test4_add_multiple'
  | 'test4_verify'
  | 'test5_delete_expense'
  | 'test5_verify'
  | 'test6_change_currency'
  | 'test6_verify'
  | 'test7_create_multiple'
  | 'test7_verify'
  | 'test8_delete_period'
  | 'test8_verify'
  | 'done';

/**
 * Componente de tests que usa useEffect para reaccionar a cambios
 */
function ContextTester() {
  const context = useExpenses();
  const [logs, setLogs] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<TestStep>('idle');
  const periodIdRef = useRef<string>('');
  const expenseIdRef = useRef<string>('');

  const log = (message: string) => {
    setLogs((prev) => [...prev, message]);
    console.log(message);
  };

  // Effect que reacciona a cambios en periods y avanza los tests
  useEffect(() => {
    if (currentStep === 'idle' || context.loading) return;

    const runStep = async () => {
      try {
        switch (currentStep) {
          case 'clearing':
            // Ya se limpió, verificar estado inicial
            setCurrentStep('test1_initial');
            break;

          case 'test1_initial':
            log('📋 Test 1: Estado inicial');
            log(`  Períodos: ${context.periods.length}`);
            log(`  Loading: ${context.loading}`);
            const test1 = context.periods.length === 0;
            log(`  Resultado: ${test1 ? 'PASS ✓' : 'FAIL ✗'}\n`);
            setCurrentStep('test2_create_period');
            break;

          case 'test2_create_period':
            log('📋 Test 2: Crear período');
            await context.createPeriod('Test Período', 'SOL');
            setCurrentStep('test2_verify');
            break;

          case 'test2_verify':
            if (context.periods.length > 0) {
              periodIdRef.current = context.periods[0].id;
              log(`  Períodos después: ${context.periods.length}`);
              log(`  Nombre: ${context.periods[0].name}`);
              log(`  Moneda: ${context.periods[0].defaultCurrency}`);
              const test2 = context.periods.length === 1;
              log(`  Resultado: ${test2 ? 'PASS ✓' : 'FAIL ✗'}\n`);
              setCurrentStep('test3_add_expense');
            }
            break;

          case 'test3_add_expense':
            log('📋 Test 3: Añadir gasto');
            await context.addExpense(periodIdRef.current, 'Supermercado', 150.5);
            setCurrentStep('test3_verify');
            break;

          case 'test3_verify':
            const period3 = context.periods.find((p) => p.id === periodIdRef.current);
            if (period3 && period3.expenses.length > 0) {
              log(`  Gastos: ${period3.expenses.length}`);
              log(`  Descripción: ${period3.expenses[0].description}`);
              log(`  Monto: ${period3.expenses[0].amount}`);
              const test3 = period3.expenses.length === 1;
              log(`  Resultado: ${test3 ? 'PASS ✓' : 'FAIL ✗'}\n`);
              setCurrentStep('test4_add_multiple');
            }
            break;

          case 'test4_add_multiple':
            log('📋 Test 4: Añadir múltiples gastos');
            await context.addExpense(periodIdRef.current, 'Transporte', 50);
            await context.addExpense(periodIdRef.current, 'Restaurante', 85.75);
            setCurrentStep('test4_verify');
            break;

          case 'test4_verify':
            const period4 = context.periods.find((p) => p.id === periodIdRef.current);
            if (period4 && period4.expenses.length === 3) {
              log(`  Total gastos: ${period4.expenses.length}`);
              const total = period4.expenses.reduce((sum, e) => sum + e.amount, 0);
              log(`  Suma total: S/ ${total.toFixed(2)}`);
              const test4 = period4.expenses.length === 3;
              log(`  Resultado: ${test4 ? 'PASS ✓' : 'FAIL ✗'}\n`);
              expenseIdRef.current = period4.expenses[0].id;
              setCurrentStep('test5_delete_expense');
            }
            break;

          case 'test5_delete_expense':
            log('📋 Test 5: Eliminar gasto');
            await context.deleteExpense(periodIdRef.current, expenseIdRef.current);
            setCurrentStep('test5_verify');
            break;

          case 'test5_verify':
            const period5 = context.periods.find((p) => p.id === periodIdRef.current);
            if (period5 && period5.expenses.length === 2) {
              log(`  Gastos después: ${period5.expenses.length}`);
              const test5 = period5.expenses.length === 2;
              log(`  Resultado: ${test5 ? 'PASS ✓' : 'FAIL ✗'}\n`);
              setCurrentStep('test6_change_currency');
            }
            break;

          case 'test6_change_currency':
            log('📋 Test 6: Cambiar moneda');
            const currentCurrency = context.periods.find((p) => p.id === periodIdRef.current)
              ?.defaultCurrency;
            log(`  Moneda antes: ${currentCurrency}`);
            await context.updatePeriodCurrency(periodIdRef.current, 'USD');
            setCurrentStep('test6_verify');
            break;

          case 'test6_verify':
            const period6 = context.periods.find((p) => p.id === periodIdRef.current);
            if (period6 && period6.defaultCurrency === 'USD') {
              log(`  Moneda después: ${period6.defaultCurrency}`);
              const test6 = period6.defaultCurrency === 'USD';
              log(`  Resultado: ${test6 ? 'PASS ✓' : 'FAIL ✗'}\n`);
              setCurrentStep('test7_create_multiple');
            }
            break;

          case 'test7_create_multiple':
            log('📋 Test 7: Crear múltiples períodos');
            const before = context.periods.length;
            log(`  Períodos antes: ${before}`);
            await context.createPeriod('Diciembre 2025', 'BRL');
            await context.createPeriod('Enero 2026', 'SOL');
            setCurrentStep('test7_verify');
            break;

          case 'test7_verify':
            if (context.periods.length === 3) {
              log(`  Períodos después: ${context.periods.length}`);
              const test7 = context.periods.length === 3;
              log(`  Resultado: ${test7 ? 'PASS ✓' : 'FAIL ✗'}\n`);
              setCurrentStep('test8_delete_period');
            }
            break;

          case 'test8_delete_period':
            log('📋 Test 8: Eliminar período');
            if (context.periods.length >= 2) {
              const periodToDelete = context.periods[1].id;
              log(`  Períodos antes: ${context.periods.length}`);
              await context.deletePeriod(periodToDelete);
              setCurrentStep('test8_verify');
            } else {
              log(`  ⚠️  No hay suficientes períodos\n`);
              setCurrentStep('done');
            }
            break;

          case 'test8_verify':
            if (context.periods.length === 2) {
              log(`  Períodos después: ${context.periods.length}`);
              const test8 = context.periods.length === 2;
              log(`  Resultado: ${test8 ? 'PASS ✓' : 'FAIL ✗'}\n`);
              setCurrentStep('done');
            }
            break;

          case 'done':
            log('=== TESTS COMPLETADOS ===');
            log(`Total períodos: ${context.periods.length}`);
            const totalExpenses = context.periods.reduce((sum, p) => sum + p.expenses.length, 0);
            log(`Total gastos: ${totalExpenses}`);
            break;
        }
      } catch (err) {
        log(`\n❌ ERROR en ${currentStep}: ${err}`);
        console.error('Error completo:', err);
        setCurrentStep('done');
      }
    };

    // Pequeño delay para asegurar que React haya actualizado
    const timer = setTimeout(runStep, 100);
    return () => clearTimeout(timer);
  }, [currentStep, context.periods, context.loading]);

  const startTests = async () => {
    setLogs([]);
    log('\n=== FASE 2.1: Verificación del Context ===\n');
    log('🧹 Limpiando storage...');
    await clearStorage();
    await context.reloadPeriods();
    log('✓ Storage limpiado y recargado\n');
    setCurrentStep('clearing');
  };

  const resetTests = () => {
    setCurrentStep('idle');
    setLogs([]);
    periodIdRef.current = '';
    expenseIdRef.current = '';
  };

  const isRunning = currentStep !== 'idle' && currentStep !== 'done';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Context Tests - Phase 2.1 (Reactive)</Text>

      <View style={styles.status}>
        <Text style={styles.statusText}>Períodos: {context.periods.length}</Text>
        <Text style={styles.statusText}>Loading: {context.loading ? 'Sí' : 'No'}</Text>
        <Text style={styles.statusText}>Step: {currentStep}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title={isRunning ? 'Ejecutando...' : 'Ejecutar Tests'}
          onPress={startTests}
          disabled={isRunning || context.loading}
        />
        {currentStep === 'done' && (
          <Button title="Reset" onPress={resetTests} color="#666" />
        )}
      </View>

      {isRunning && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Ejecutando: {currentStep}</Text>
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
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
