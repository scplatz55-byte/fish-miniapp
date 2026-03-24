export const UI_THEME = {
  brand: {
    primary: "#2B80A4",
    accent: "#D43314",
    ink: "#0A1317",
    card: "#FFFFFF",
  },

  surfaces: {
    soft: "rgba(255,255,255,0.85)",
    raised: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,249,251,0.94) 100%)",
    note: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(247,248,250,0.92) 100%)",
  },

  categoryActive: {
    bg: "linear-gradient(180deg, rgba(43,128,164,0.18) 0%, rgba(43,128,164,0.12) 100%)",
    border: "1px solid rgba(43,128,164,0.32)",
    shadow: "0 6px 14px rgba(43,128,164,0.10)",
  },

  addButton: {
    bg: "linear-gradient(180deg, rgba(43,128,164,0.16) 0%, rgba(43,128,164,0.10) 100%)",
    border: "1px solid rgba(43,128,164,0.25)",
  },

  tabActive: {
    bg: "linear-gradient(180deg, rgba(43,128,164,0.12) 0%, rgba(43,128,164,0.08) 100%)",
    border: "1px solid rgba(43,128,164,0.24)",
    shadow: "0 10px 22px rgba(43,128,164,0.10), inset 0 1px 0 rgba(255,255,255,0.65)",
  },

  nav: {
    activeBg: "rgba(43,128,164,0.18)",
    activeBorder: "1px solid rgba(43,128,164,0.30)",
    activeShadow: "0 12px 28px rgba(43,128,164,0.18)",
  },

  alerts: {
    dangerBg: "linear-gradient(180deg, rgba(255,245,243,0.96) 0%, rgba(255,240,236,0.92) 100%)",
    dangerBorder: "1px solid rgba(212,51,20,0.28)",
    dangerText: "#7A1E0D",
    dangerTitle: "#8E2210",
  },

  effects: {
    raisedShadow: "0 12px 28px rgba(10,19,23,0.05), inset 0 1px 0 rgba(255,255,255,0.8)",
    inputShadow: "0 8px 20px rgba(10,19,23,0.03), inset 0 1px 0 rgba(255,255,255,0.7)",
    focusRing: "0 0 0 4px rgba(212,51,20,0.10), 0 10px 24px rgba(10,19,23,0.05), inset 0 1px 0 rgba(255,255,255,0.78)",
  },
} as const;
