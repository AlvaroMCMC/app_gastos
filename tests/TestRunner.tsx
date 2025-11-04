/**
 * Componente para ejecutar tests de la Fase 1.1
 *
 * Uso: Importar este componente en cualquier pantalla para ejecutar los tests
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Button } from 'react-native';
import { runAllPhase11Tests } from './phase1.1-verification';

export default function TestRunner() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const runTests = async () => {
    setRunning(true);
    setResults([]);

    // Capturar console.log
    const originalLog = console.log;
    const logs: string[] = [];

    console.log = (...args: any[]) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      logs.push(message);
      originalLog(...args);
    };

    try {
      await runAllPhase11Tests();
    } catch (error) {
      logs.push(`ERROR: ${error}`);
    }

    // Restaurar console.log
    console.log = originalLog;

    setResults(logs);
    setRunning(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phase 1.1 Test Runner</Text>

      <Button
        title={running ? "Ejecutando tests..." : "Ejecutar Tests de Fase 1.1"}
        onPress={runTests}
        disabled={running}
      />

      <ScrollView style={styles.resultsContainer}>
        {results.map((line, index) => (
          <Text key={index} style={styles.resultLine}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </View>
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
  resultsContainer: {
    marginTop: 20,
    backgroundColor: '#1e1e1e',
    padding: 15,
    borderRadius: 8,
    flex: 1,
  },
  resultLine: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#00ff00',
    marginBottom: 4,
  },
});
