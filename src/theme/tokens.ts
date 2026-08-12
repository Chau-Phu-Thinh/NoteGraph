export const Colors = {
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryUltralight: '#EDE9FE',
  background: '#F8F7FC',
  surface: '#FFFFFF',
  textPrimary: '#1E1B2E',
  textSecondary: '#6B7280',
  textAccent: '#7C3AED',
  border: '#E5E7EB',
  chipDefaultBg: '#F3F4F6',
  chipDefaultText: '#6B7280',
  tagUrgent: '#F59E0B',
  tagPersonal: '#EC4899',
  iconInactive: '#9CA3AF',
  error: '#EF4444',
  success: '#10B981',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  screenPadding: 20,
  sectionGap: 24,
  cardPadding: 16,
  chipGap: 8,
  chipPaddingV: 6,
  chipPaddingH: 16,
  topSafeArea: 16,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  chip: 20,
  pill: 24,
  full: 9999,
} as const;

export const Typography = {
  screenTitle: { fontSize: 24, fontWeight: '700' as const },
  sectionHeading: { fontSize: 16, fontWeight: '600' as const },
  cardTitle: { fontSize: 15, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  searchPlaceholder: { fontSize: 14, fontWeight: '400' as const },
  chipLabel: { fontSize: 12, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  metadata: { fontSize: 11, fontWeight: '400' as const },
} as const;

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  fab: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

export const Sizes = {
  headerHeight: 56,
  searchBarHeight: 44,
  fabSize: 56,
  checkboxSize: 24,
  iconSize: 24,
  avatarSize: 40,
  minTouchTarget: 48,
} as const;
