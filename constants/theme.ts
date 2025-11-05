/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/**
 * Espaciado consistente usado en toda la app
 * Fase 6.1 - Mejoras de diseño
 */
export const Spacing = {
  /** 4px - Espaciado extra pequeño */
  xs: 4,
  /** 8px - Espaciado pequeño */
  sm: 8,
  /** 12px - Espaciado mediano */
  md: 12,
  /** 16px - Espaciado normal */
  base: 16,
  /** 20px - Espaciado grande */
  lg: 20,
  /** 24px - Espaciado extra grande */
  xl: 24,
  /** 32px - Espaciado doble extra grande */
  xxl: 32,
};

/**
 * Radios de borde consistentes
 * Fase 6.1 - Mejoras de diseño
 */
export const BorderRadius = {
  /** 4px - Esquinas pequeñas */
  sm: 4,
  /** 8px - Esquinas normales */
  base: 8,
  /** 12px - Esquinas grandes */
  lg: 12,
  /** 16px - Esquinas extra grandes */
  xl: 16,
  /** 9999px - Completamente redondeado */
  full: 9999,
};

/**
 * Tamaños de fuente consistentes
 * Fase 6.1 - Mejoras de diseño
 */
export const FontSizes = {
  /** 10px - Extra pequeño */
  xs: 10,
  /** 12px - Pequeño */
  sm: 12,
  /** 14px - Normal */
  base: 14,
  /** 16px - Mediano */
  md: 16,
  /** 18px - Grande */
  lg: 18,
  /** 20px - Extra grande */
  xl: 20,
  /** 24px - Doble extra grande */
  xxl: 24,
  /** 32px - Título */
  title: 32,
};

/**
 * Sombras consistentes
 * Fase 6.1 - Mejoras de diseño
 */
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};
