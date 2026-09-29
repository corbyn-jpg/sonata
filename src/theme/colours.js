module.exports = {
  canvas: '#060011',
  surface: '#15052A',
  surfaceRaised: '#2A1642',
  border: '#493461',
  textPrimary: '#f3ebfa',
  textSecondary: '#c2bfd6',
  textMuted: '#9f9ead',
  violet: { 200: '#C9BFFB', 500: '#8B5CF6', 700: '#5B34B8' },
  teal: { 300: '#7EE4CE', 700: '#0B7A6E' },

  // Orb gradients, core → edge (CLAUDE.md §4). Two colours only — three goes muddy.
  orb: {
    C: { major: { core: '#A3FBC3', edge: '#60A5FA' }, minor: { core: '#013E88', edge: '#04C349' } },
    D: { major: { core: '#A7F3D0', edge: '#FDE047' }, minor: { core: '#BEA51C', edge: '#01894A' } },
    E: { major: { core: '#F9DBAA', edge: '#FFBC05' }, minor: { core: '#916A00', edge: '#D98D12' } },
    F: { major: { core: '#FD7FC1', edge: '#FDBA74' }, minor: { core: '#D36C00', edge: '#C6086B' } },
    G: { major: { core: '#06D48C', edge: '#A3E635' }, minor: { core: '#65A30D', edge: '#009F92' } },
    A: { major: { core: '#F97316', edge: '#EF4444' }, minor: { core: '#991B1B', edge: '#E95E08' } },
    B: { major: { core: '#D19855', edge: '#9828FA' }, minor: { core: '#7F1D5E', edge: '#DC2626' } },
  },
};