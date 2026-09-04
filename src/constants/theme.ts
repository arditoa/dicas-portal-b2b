export const COLORS = {
  background: '#15111C',
  surface: '#1D1726',
  accent: '#FF6FA0',
  sponsor: '#E0B064',
  critical: '#FF9080',
  positive: '#92C09B',
  textPrimary: '#FFFFFF',
  textSecondary: '#B6A6BE',
  whatsapp: '#25D366',
} as const;

export const RADIUS = {
  card: 14,
  pill: 20,
} as const;

export const LAYOUT = {
  minTouchTarget: 48,
} as const;

export const TYPOGRAPHY = {
  screenTitle: { fontSize: 24, fontWeight: '600' as const, color: COLORS.textPrimary },
  venueName: { fontSize: 16, fontWeight: '600' as const, color: COLORS.textPrimary },
  bodyMetadata: { fontSize: 13, fontWeight: '400' as const, color: COLORS.textSecondary },
  captionTag: { fontSize: 11, fontWeight: '500' as const },
} as const;

// Aliases em letras minúsculas
export const colors = COLORS;
export const radius = RADIUS;
export const layout = LAYOUT;
export const typography = TYPOGRAPHY;

// Objeto de tema unificado
export const theme = {
  COLORS,
  colors: COLORS,
  RADIUS,
  radius: RADIUS,
  LAYOUT,
  layout: LAYOUT,
  TYPOGRAPHY,
  typography: TYPOGRAPHY,
  ...COLORS,
};

export default theme;