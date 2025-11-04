/**
 * Componente para ejecutar tests de las Fases 1.1 y 1.2
 *
 * Uso: Importar este componente en cualquier pantalla para ejecutar los tests
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Button } from 'react-native';
import { runAllPhase11Tests } from './phase1.1-verification';
import { runAllPhase12Tests } from './phase1.2-verification';

type TestPhase = '1.1' | '1.2' | 'all';

export default function TestRunner() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const runTests = async (phase: TestPhase) => {
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
      if (phase === '1.1' || phase === 'all') {
        await runAllPhase11Tests();
      }
      if (phase === '1.2' || phase === 'all') {
        runAllPhase12Tests();
      }
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
      <Text style={styles.title}>Test Runner</Text>

      <View style={styles.buttonContainer}>
        <Button
          title={running ? "Ejecutando..." : "Fase 1.1"}
          onPress={() => runTests('1.1')}
          disabled={running}
        />
        <Button
          title={running ? "Ejecutando..." : "Fase 1.2"}
          onPress={() => runTests('1.2')}
          disabled={running}
        />
        <Button
          title={running ? "Ejecutando..." : "Todas las Fases"}
          onPress={() => runTests('all')}
          disabled={running}
        />
      </View>

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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
    marginBottom: 10,
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
