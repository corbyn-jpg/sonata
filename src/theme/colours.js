module.exports = {
  canvas: "#060011",
  surface: "#15052A",
  surfaceRaised: "#2A1642",
  border: "#493461",
  // Text-box outlines: 3:1 against every surface (WCAG 1.4.11), where the hairline border is only 1.8:1
  field: "#76628F",
  textPrimary: "#f3ebfa",
  textSecondary: "#c2bfd6",
  textMuted: "#9f9ead",
  violet: { 200: "#C9BFFB", 500: "#8B5CF6", 700: "#5B34B8" },
  teal: { 300: "#7EE4CE", 700: "#0A766A" }, // 700: white text on it passes 4.5:1
  // Muted red text for Delete all data (never a solid red button)
  danger: "#EF8A8A",

  // Orb gradients, core to edge
  orb: {
    C: {
      major: { core: "#A3FBC3", edge: "#60A5FA" },
      minor: { core: "#1B2F5E", edge: "#6F86A6" },
    },
    D: {
      major: { core: "#A7F3D0", edge: "#FDE047" },
      minor: { core: "#7D7330", edge: "#5E7F5A" },
    },
    E: {
      major: { core: "#FF5FA2", edge: "#FFBC05" },
      minor: { core: "#6B5E3E", edge: "#9C948A" },
    },
    F: {
      major: { core: "#FD7FC1", edge: "#FDBA74" },
      minor: { core: "#5E3F82", edge: "#C06C8A" },
    },
    G: {
      major: { core: "#06D48C", edge: "#A3E635" },
      minor: { core: "#3E5B5A", edge: "#A3B1B5" },
    },
    A: {
      major: { core: "#F97316", edge: "#EF4444" },
      minor: { core: "#991B1B", edge: "#E95E08" },
    },
    B: {
      major: { core: "#D19855", edge: "#9828FA" },
      minor: { core: "#3A0F24", edge: "#B8202F" },
    },
  },
};
