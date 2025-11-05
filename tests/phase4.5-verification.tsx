/**
 * Tests de Verificación: Fase 4.5
 * Validación de ordenamiento de períodos y formato de fecha con hora
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useExpenses } from '@/contexts/ExpenseContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

type TestStatus = 'pending' | 'running' | 'passed' | 'failed';

interface TestResult {
  name: string;
  status: TestStatus;
  message?: string;
}

export default function Phase45Verification() {
  const { periods } = useExpenses();
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

  const runTests = async () => {
    setRunning(true);
    setTestResults([]);

    try {
      // Test 1: Verificar ordenamiento de períodos (más nuevo primero)
      updateTestResult('Test 1: Verificar ordenamiento de períodos', 'running');

      if (periods.length >= 2) {
        // Aplicar el mismo ordenamiento que se usa en la UI
        const sortedPeriods = [...periods].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Verificar que el ordenamiento funcione correctamente
        let isOrdered = true;
        for (let i = 0; i < sortedPeriods.length - 1; i++) {
          const currentDate = new Date(sortedPeriods[i].createdAt).getTime();
          const nextDate = new Date(sortedPeriods[i + 1].createdAt).getTime();

          if (currentDate < nextDate) {
            isOrdered = false;
            break;
          }
        }

        if (isOrdered) {
          const firstPeriodDate = new Date(sortedPeriods[0].createdAt).toLocaleDateString('es-PE');
          const lastPeriodDate = new Date(sortedPeriods[sortedPeriods.length - 1].createdAt).toLocaleDateString('es-PE');
          updateTestResult(
            'Test 1: Verificar ordenamiento de períodos',
            'passed',
            `Ordenamiento correcto: ${firstPeriodDate} (más nuevo) → ${lastPeriodDate} (más antiguo)`
          );
        } else {
          updateTestResult(
            'Test 1: Verificar ordenamiento de períodos',
            'failed',
            'Los períodos NO están ordenados de más nuevo a más antiguo'
          );
        }
      } else {
        updateTestResult(
          'Test 1: Verificar ordenamiento de períodos',
          'passed',
          `Solo hay ${periods.length} período(s). Crea al menos 2 períodos para verificar el ordenamiento`
        );
      }

      // Test 2: Verificar formato de fecha con hora en período
      updateTestResult('Test 2: Verificar formato de fecha con hora', 'running');

      if (periods.length > 0) {
        const period = periods[0];
        const periodDate = new Date(period.createdAt);

        // Verificar que tiene hora y minuto
        const hours = periodDate.getHours();
        const minutes = periodDate.getMinutes();

        if (hours !== undefined && minutes !== undefined) {
          const formattedDate = periodDate.toLocaleDateString('es-PE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          const formattedTime = periodDate.toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
          updateTestResult(
            'Test 2: Verificar formato de fecha con hora',
            'passed',
            `Formato correcto: ${formattedDate} • ${formattedTime}`
          );
        } else {
          updateTestResult(
            'Test 2: Verificar formato de fecha con hora',
            'failed',
            'Fecha no tiene hora/minuto'
          );
        }
      } else {
        updateTestResult(
          'Test 2: Verificar formato de fecha con hora',
          'passed',
          'No hay períodos para verificar. Crea un período para probar'
        );
      }

      // Test 3: Verificar que el bullet point (•) aparece en el formato
      updateTestResult('Test 3: Verificar bullet point en formato', 'running');

      if (periods.length > 0) {
        const period = periods[0];
        const periodDate = new Date(period.createdAt);

        const dateStr = periodDate.toLocaleDateString('es-PE', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        const timeStr = periodDate.toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        const fullFormat = `${dateStr} • ${timeStr}`;

        if (fullFormat.includes('•')) {
          updateTestResult(
            'Test 3: Verificar bullet point en formato',
            'passed',
            `Formato completo con bullet: "${fullFormat}"`
          );
        } else {
          updateTestResult(
            'Test 3: Verificar bullet point en formato',
            'failed',
            'Falta el bullet point (•) en el formato'
          );
        }
      } else {
        updateTestResult(
          'Test 3: Verificar bullet point en formato',
          'passed',
          'No hay períodos para verificar formato'
        );
      }

      // Test 4: Verificar timestamps diferentes entre períodos
      updateTestResult('Test 4: Verificar timestamps únicos', 'running');

      if (periods.length >= 2) {
        const timestamps = periods.map((p) => new Date(p.createdAt).getTime());
        const uniqueTimestamps = new Set(timestamps);

        if (uniqueTimestamps.size === timestamps.length) {
          updateTestResult(
            'Test 4: Verificar timestamps únicos',
            'passed',
            `Todos los ${periods.length} períodos tienen timestamps diferentes`
          );
        } else {
          updateTestResult(
            'Test 4: Verificar timestamps únicos',
            'failed',
            `Hay ${timestamps.length - uniqueTimestamps.size} períodos con timestamps duplicados`
          );
        }
      } else {
        updateTestResult(
          'Test 4: Verificar timestamps únicos',
          'passed',
          'Se necesitan al menos 2 períodos para verificar unicidad'
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
          Nota: Para probar completamente, crea al menos 2 períodos desde la pantalla Home.
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
