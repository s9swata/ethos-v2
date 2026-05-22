export const theme = {
  colors: {
    surface: "#000000",
    surface2: "#0d0d0d",
    surface3: "#1a1a1a",
    surfaceHover: "#242424",
    accent: "#ff2a3b",
    accentHover: "#ff4755",
    textPrimary: "#ffffff",
    textSecondary: "#a1a1a1",
    textTertiary: "#6b6b6b",
    border: "#1f1f1f",
    glass: "rgba(255,255,255,0.08)",
  },
  shadows: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4,
    },
  },
  skeleton: {
    base: "#1a1a1a",
    highlight: "#242424",
  },
} as const;

export const layout = {
  px: 16,
  sectionGap: 24,
  cardRadius: 8,
  miniPlayerHeight: 64,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: "700" as const, color: theme.colors.textPrimary, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: "700" as const, color: theme.colors.textPrimary, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: "700" as const, color: theme.colors.textPrimary },
  body: { fontSize: 15, fontWeight: "400" as const, color: theme.colors.textPrimary },
  caption: { fontSize: 13, fontWeight: "400" as const, color: theme.colors.textSecondary },
  small: { fontSize: 11, fontWeight: "400" as const, color: theme.colors.textTertiary },
  label: { fontSize: 11, fontWeight: "600" as const, color: theme.colors.textTertiary, letterSpacing: 0.8 },
};
