/**
 * Tests de Verificación: Fase 5.3
 * Validación de formateo de números con separador de miles
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { formatCurrency, formatNumber, formatCompactNumber } from '@/utils/formatters';

type TestStatus = 'pending' | 'running' | 'passed' | 'failed';

interface TestResult {
  name: string;
  status: TestStatus;
  message?: string;
}

export default function Phase53Verification() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const updateTestResult = (name: string, status: TestStatus, message?: string) => {
    setTestResults((prev) => {
      const existing = prev.find((t) => t.name === name);
      if (existing) {
        return prev.map((t) => (t.name === name ? { name, status, message } : t));
      }
      return [...prev, { name, status, message }];
    });
  };

  const runTests = () => {
    setRunning(true);
    setTestResults([]);

    try {
      // Test 1: Formateo con separador de miles
      updateTestResult('Test 1: Verificar separador de miles', 'running');

      const formatted1234 = formatCurrency(1234.56, 'SOL');
      if (formatted1234.includes(',')) {
        updateTestResult(
          'Test 1: Verificar separador de miles',
          'passed',
          `Formato correcto: ${formatted1234}`
        );
      } else {
        updateTestResult(
          'Test 1: Verificar separador de miles',
          'failed',
          `Falta separador de miles: ${formatted1234}`
        );
      }

      // Test 2: Formateo con decimales
      updateTestResult('Test 2: Verificar dos decimales', 'running');

      const formatted0 = formatCurrency(0, 'USD');
      if (formatted0.includes('.00')) {
        updateTestResult(
          'Test 2: Verificar dos decimales',
          'passed',
          `Formato correcto: ${formatted0}`
        );
      } else {
        updateTestResult(
          'Test 2: Verificar dos decimales',
          'failed',
          `Falta formato de decimales: ${formatted0}`
        );
      }

      // Test 3: Formateo de números grandes
      updateTestResult('Test 3: Verificar números grandes', 'running');

      const formattedBig = formatCurrency(1234567.89, 'BRL');
      const expectedPattern = /R\$ 1,234,567\.89/;
      if (expectedPattern.test(formattedBig)) {
        updateTestResult(
          'Test 3: Verificar números grandes',
          'passed',
          `Formato correcto: ${formattedBig}`
        );
      } else {
        updateTestResult(
          'Test 3: Verificar números grandes',
          'failed',
          `Formato incorrecto: ${formattedBig} (esperado: R$ 1,234,567.89)`
        );
      }

      // Test 4: Formateo de números pequeños
      updateTestResult('Test 4: Verificar números pequeños', 'running');

      const formattedSmall = formatCurrency(0.5, 'SOL');
      if (formattedSmall.includes('0.50')) {
        updateTestResult(
          'Test 4: Verificar números pequeños',
          'passed',
          `Formato correcto: ${formattedSmall}`
        );
      } else {
        updateTestResult(
          'Test 4: Verificar números pequeños',
          'failed',
          `Formato incorrecto: ${formattedSmall}`
        );
      }

      // Test 5: Formateo sin símbolo (formatNumber)
      updateTestResult('Test 5: Verificar formatNumber', 'running');

      const numberOnly = formatNumber(1234.56);
      if (numberOnly === '1,234.56') {
        updateTestResult(
          'Test 5: Verificar formatNumber',
          'passed',
          `Formato correcto: ${numberOnly}`
        );
      } else {
        updateTestResult(
          'Test 5: Verificar formatNumber',
          'failed',
          `Formato incorrecto: ${numberOnly} (esperado: 1,234.56)`
        );
      }

      // Test 6: Formateo compacto (formatCompactNumber)
      updateTestResult('Test 6: Verificar formatCompactNumber', 'running');

      const compact1K = formatCompactNumber(1234);
      const compact1M = formatCompactNumber(1234567);
      const compactSmall = formatCompactNumber(123);

      if (compact1K === '1.2K' && compact1M === '1.2M' && compactSmall === '123.00') {
        updateTestResult(
          'Test 6: Verificar formatCompactNumber',
          'passed',
          `1234→${compact1K}, 1234567→${compact1M}, 123→${compactSmall}`
        );
      } else {
        updateTestResult(
          'Test 6: Verificar formatCompactNumber',
          'failed',
          `Formato incorrecto: ${compact1K}, ${compact1M}, ${compactSmall}`
        );
      }

      // Test 7: Verificar símbolos de moneda correctos
      updateTestResult('Test 7: Verificar símbolos de moneda', 'running');

      const sol = formatCurrency(100, 'SOL');
      const usd = formatCurrency(100, 'USD');
      const brl = formatCurrency(100, 'BRL');

      if (sol.startsWith('S/') && usd.startsWith('$') && brl.startsWith('R$')) {
        updateTestResult(
          'Test 7: Verificar símbolos de moneda',
          'passed',
          `SOL: ${sol}, USD: ${usd}, BRL: ${brl}`
        );
      } else {
        updateTestResult(
          'Test 7: Verificar símbolos de moneda',
          'failed',
          `Símbolos incorrectos: ${sol}, ${usd}, ${brl}`
        );
      }

    } catch (error) {
      console.error('Error en tests:', error);
      updateTestResult(
        'Error general',
        'failed',
        error instanceof Error ? error.message : 'Error desconocido'
      );
    }

    setRunning(false);
  };

  const getStatusColor = (status: TestStatus) => {
    switch (status) {
      case 'passed':
        return '#34C759';
      case 'failed':
        return '#FF3B30';
      case 'running':
        return '#007AFF';
      default:
        return colors.tabIconDefault;
    }
  };

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'passed':
        return '✓';
      case 'failed':
        return '✗';
      case 'running':
        return '⟳';
      default:
        return '○';
    }
  };

  const passedCount = testResults.filter((t) => t.status === 'passed').length;
  const failedCount = testResults.filter((t) => t.status === 'failed').length;
  const totalCount = testResults.length;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.runButton, { backgroundColor: colors.tint }]}
        onPress={runTests}
        disabled={running}>
        <Text style={styles.runButtonText}>{running ? 'Ejecutando...' : 'Ejecutar Tests'}</Text>
      </TouchableOpacity>

      {testResults.length > 0 && (
        <View style={styles.summary}>
          <Text style={[styles.summaryText, { color: colors.text }]}>
            {passedCount}/{totalCount} tests pasados
            {failedCount > 0 && ` • ${failedCount} fallidos`}
          </Text>
        </View>
      )}

      <ScrollView style={styles.resultsContainer} nestedScrollEnabled>
        {testResults.map((result, index) => (
          <View
            key={index}
            style={[
              styles.testItem,
              {
                backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5',
                borderLeftColor: getStatusColor(result.status),
              },
            ]}>
            <View style={styles.testHeader}>
              <Text style={[styles.statusIcon, { color: getStatusColor(result.status) }]}>
                {getStatusIcon(result.status)}
              </Text>
              <Text style={[styles.testName, { color: colors.text }]}>{result.name}</Text>
            </View>
            {result.message && (
              <Text style={[styles.testMessage, { color: colors.tabIconDefault }]}>
                {result.message}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.infoBox}>
        <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
          Nota: Estos tests verifican que la función formatCurrency formatee correctamente los números con separador de miles.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  runButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  runButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  summary: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultsContainer: {
    flex: 1,
  },
  testItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  testName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  testMessage: {
    fontSize: 12,
    marginLeft: 24,
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
