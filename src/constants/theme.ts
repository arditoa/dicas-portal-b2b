export const THEME = {
  bg: '#0F0F12',
  surface: '#1A1A22',
  surface2: '#262632',
  card: '#1A1A22',
  border: '#2E2E3D',
  text: '#FFFFFF',
  textDim: '#A0A0B0',
  textFaint: '#606070',
  pink: '#E1306C',
  pinkSoft: '#FF5A8D',
  green: '#3FA772',
  gold: '#C8853C',
  teal: '#3FA0A7',
  violet: '#8A2BE2',
  blue: '#007AFF',
  terracotta: '#E07A5F',
  pill: '#262632',
};

export const COLORS = {
  ...THEME,
  primary: THEME.pink,
  secondary: THEME.pinkSoft,
  background: THEME.bg,
};

export const SPACING = {
  minTouchTarget: 44,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 8,
};

export const BADGES = {
  pill: {
    backgroundColor: '#262632',
    color: '#FFFFFF',
  },
};

export default {
  THEME,
  COLORS,
  SPACING,
  BADGES,
};
