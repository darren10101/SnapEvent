import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

export const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    // Provided palette
    primary: '#FF3838',
    secondary: '#FF8B8B',
    tertiary: '#32363E',
    // Surfaces & text
    background: '#FFFFFF',
    onBackground: '#32363E',
    surface: '#FFFFFF',
    onSurface: '#32363E',
    // Containers
    primaryContainer: '#FFE0E0',
    onPrimaryContainer: '#320000',
    secondaryContainer: '#FFE9E9',
    onSecondaryContainer: '#2A0C0C',
    // Status & outlines
    error: '#FF3838',
    onError: '#FFFFFF',
    outline: '#CFCFD6',
    surfaceVariant: '#F2F4F7',
    onSurfaceVariant: '#575C66',
  },
};

// Complementary colors for custom usage in components (non-typed by Paper)
export const palette = {
  dark: '#32363E',
  light: '#FFFFFF',
  primary: '#FF3838',
  secondary: '#FF8B8B',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#3B82F6',
  muted: '#94A3B8',
};


