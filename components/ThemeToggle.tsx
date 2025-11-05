/**
 * ThemeToggle - Switch para cambiar entre tema claro y oscuro
 * Fase 6.4: Control de tema en la app
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
  const { themeMode, colorScheme, setThemeMode } = useTheme();

  const handlePress = () => {
    // Ciclo: system → light → dark → system
    if (themeMode === 'system') {
      setThemeMode('light');
    } else if (themeMode === 'light') {
      setThemeMode('dark');
    } else {
      setThemeMode('system');
    }
  };

  // Determinar qué ícono mostrar
  const getIcon = () => {
    if (themeMode === 'system') {
      return 'gear'; // Ícono de sistema/auto
    } else if (colorScheme === 'light') {
      return 'sun.max'; // Ícono de sol para modo claro
    } else {
      return 'moon'; // Ícono de luna para modo oscuro
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel="Cambiar tema"
      accessibilityHint={`Tema actual: ${themeMode}. Toca para cambiar.`}>
      <IconSymbol
        name={getIcon()}
        size={24}
        color={colorScheme === 'dark' ? '#ffffff' : '#000000'}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
