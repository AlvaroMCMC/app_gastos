/**
 * Tests de Verificación: Fase 6.1
 * Validación de estilos y diseño consistente
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows } from '@/constants/theme';

type TestStatus = 'pending' | 'running' | 'passed' | 'failed';

interface TestResult {
  name: string;
  status: TestStatus;
  message?: string;
}

export default function Phase61Verification() {
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
      // Test 1: Verificar que las constantes de Spacing existen
      updateTestResult('Test 1: Verificar constantes de Spacing', 'running');

      const spacingKeys = ['xs', 'sm', 'md', 'base', 'lg', 'xl', 'xxl'];
      const hasAllSpacing = spacingKeys.every((key) => key in Spacing);

      if (hasAllSpacing) {
        updateTestResult(
          'Test 1: Verificar constantes de Spacing',
          'passed',
          `Todas las constantes existen: ${spacingKeys.join(', ')}`
        );
      } else {
        updateTestResult(
          'Test 1: Verificar constantes de Spacing',
          'failed',
          'Faltan constantes de Spacing'
        );
      }

      // Test 2: Verificar que las constantes de BorderRadius existen
      updateTestResult('Test 2: Verificar constantes de BorderRadius', 'running');

      const borderRadiusKeys = ['sm', 'base', 'lg', 'xl', 'full'];
      const hasAllBorderRadius = borderRadiusKeys.every((key) => key in BorderRadius);

      if (hasAllBorderRadius) {
        updateTestResult(
          'Test 2: Verificar constantes de BorderRadius',
          'passed',
          `Todas las constantes existen: ${borderRadiusKeys.join(', ')}`
        );
      } else {
        updateTestResult(
          'Test 2: Verificar constantes de BorderRadius',
          'failed',
          'Faltan constantes de BorderRadius'
        );
      }

      // Test 3: Verificar que las constantes de FontSizes existen
      updateTestResult('Test 3: Verificar constantes de FontSizes', 'running');

      const fontSizesKeys = ['xs', 'sm', 'base', 'md', 'lg', 'xl', 'xxl', 'title'];
      const hasAllFontSizes = fontSizesKeys.every((key) => key in FontSizes);

      if (hasAllFontSizes) {
        updateTestResult(
          'Test 3: Verificar constantes de FontSizes',
          'passed',
          `Todas las constantes existen: ${fontSizesKeys.join(', ')}`
        );
      } else {
        updateTestResult(
          'Test 3: Verificar constantes de FontSizes',
          'failed',
          'Faltan constantes de FontSizes'
        );
      }

      // Test 4: Verificar que las constantes de Shadows existen
      updateTestResult('Test 4: Verificar constantes de Shadows', 'running');

      const shadowsKeys = ['sm', 'base', 'lg', 'xl'];
      const hasAllShadows = shadowsKeys.every((key) => key in Shadows);

      if (hasAllShadows) {
        updateTestResult(
          'Test 4: Verificar constantes de Shadows',
          'passed',
          `Todas las constantes existen: ${shadowsKeys.join(', ')}`
        );
      } else {
        updateTestResult(
          'Test 4: Verificar constantes de Shadows',
          'failed',
          'Faltan constantes de Shadows'
        );
      }

      // Test 5: Verificar valores de Spacing son números válidos
      updateTestResult('Test 5: Verificar valores de Spacing', 'running');

      const spacingValues = Object.values(Spacing);
      const allNumbers = spacingValues.every((val) => typeof val === 'number' && val > 0);

      if (allNumbers) {
        updateTestResult(
          'Test 5: Verificar valores de Spacing',
          'passed',
          `Valores: ${spacingValues.join(', ')} px`
        );
      } else {
        updateTestResult(
          'Test 5: Verificar valores de Spacing',
          'failed',
          'Valores de Spacing inválidos'
        );
      }

      // Test 6: Verificar colores en modo claro
      updateTestResult('Test 6: Verificar colores modo claro', 'running');

      const lightColors = Colors.light;
      const hasLightColors =
        lightColors.text &&
        lightColors.background &&
        lightColors.tint &&
        lightColors.tabIconDefault;

      if (hasLightColors) {
        updateTestResult(
          'Test 6: Verificar colores modo claro',
          'passed',
          `text: ${lightColors.text}, bg: ${lightColors.background}, tint: ${lightColors.tint}`
        );
      } else {
        updateTestResult(
          'Test 6: Verificar colores modo claro',
          'failed',
          'Faltan colores en modo claro'
        );
      }

      // Test 7: Verificar colores en modo oscuro
      updateTestResult('Test 7: Verificar colores modo oscuro', 'running');

      const darkColors = Colors.dark;
      const hasDarkColors =
        darkColors.text &&
        darkColors.background &&
        darkColors.tint &&
        darkColors.tabIconDefault;

      if (hasDarkColors) {
        updateTestResult(
          'Test 7: Verificar colores modo oscuro',
          'passed',
          `text: ${darkColors.text}, bg: ${darkColors.background}, tint: ${darkColors.tint}`
        );
      } else {
        updateTestResult(
          'Test 7: Verificar colores modo oscuro',
          'failed',
          'Faltan colores en modo oscuro'
        );
      }

      // Test 8: Verificar modo actual
      updateTestResult('Test 8: Verificar modo de color actual', 'running');

      if (colorScheme) {
        updateTestResult(
          'Test 8: Verificar modo de color actual',
          'passed',
          `Modo actual: ${colorScheme}`
        );
      } else {
        updateTestResult(
          'Test 8: Verificar modo de color actual',
          'failed',
          'No se pudo detectar el modo de color'
        );
      }

      // Test 9: Verificar estructura de Shadows
      updateTestResult('Test 9: Verificar estructura de Shadows', 'running');

      const shadowKeys = ['shadowColor', 'shadowOffset', 'shadowOpacity', 'shadowRadius', 'elevation'];
      const baseShadow = Shadows.base;
      const hasAllShadowKeys = shadowKeys.every((key) => key in baseShadow);

      if (hasAllShadowKeys) {
        updateTestResult(
          'Test 9: Verificar estructura de Shadows',
          'passed',
          `Shadow tiene: ${shadowKeys.join(', ')}`
        );
      } else {
        updateTestResult(
          'Test 9: Verificar estructura de Shadows',
          'failed',
          'Falta alguna propiedad en Shadows'
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
          Nota: Estos tests verifican que las constantes de diseño (Spacing, BorderRadius, FontSizes, Shadows) estén correctamente definidas.
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
