/**
 * Hook useColorScheme - Retorna el esquema de color actual
 * Fase 6.4: Usa ThemeContext en lugar del sistema directamente
 */

import { useTheme } from '@/contexts/ThemeContext';

export function useColorScheme() {
  const { colorScheme } = useTheme();
  return colorScheme;
}
