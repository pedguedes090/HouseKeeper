import { Platform } from 'react-native';

export const colors = {
  primary: '#0058BE',
  primaryBright: '#2170E4',
  primarySoft: '#DCE9FF',
  primarySurface: '#EFF4FF',
  canvas: '#F8F9FF',
  surface: '#FFFFFF',
  ink: '#0B1C30',
  inkMuted: '#424754',
  placeholder: '#5F6470',
  border: '#C2C6D6',
  borderSoft: '#E2E8F0',
  success: '#006C49',
  successSoft: '#D1FAE5',
  warning: '#825100',
  warningSoft: '#FEF3C7',
  danger: '#BA1A1A',
  dangerSoft: '#FEE2E2',
  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  page: 20,
  xl: 24,
  section: 32,
  screenBottom: 112,
} as const;

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontFamily: 'BeVietnamPro_700Bold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.64,
  },
  headline: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.24,
  },
  title: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
  },
  body: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: 'BeVietnamPro_500Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  supporting: {
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  supportingStrong: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontFamily: 'BeVietnamPro_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.24,
  },
  labelStrong: {
    fontFamily: 'BeVietnamPro_700Bold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.24,
  },
} as const;

export const shadows = {
  low: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: { elevation: 1 },
    default: {},
  }),
  action: Platform.select({
    ios: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
    },
    android: { elevation: 5 },
    default: {},
  }),
  sheet: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
    },
    android: { elevation: 12 },
    default: {},
  }),
} as const;

export const layout = {
  referenceWidth: 390,
  maxContentWidth: 620,
  minTouchTarget: 44,
  headerHeight: 64,
  tabBarHeight: 72,
} as const;
