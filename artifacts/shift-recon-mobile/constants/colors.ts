/**
 * Shell Shift Recon — dark brand palette.
 * Both light and dark use the same dark theme (this is an always-dark utility app).
 */
const palette = {
  text: '#F2F0EB',
  tint: '#ED1C24',

  background: '#12151D',
  foreground: '#F2F0EB',

  card: '#1B1F29',
  cardForeground: '#F2F0EB',

  primary: '#ED1C24',       // Shell red
  primaryForeground: '#FFFFFF',

  secondary: '#2A2F3C',
  secondaryForeground: '#F2F0EB',

  muted: '#1B1F29',
  mutedForeground: '#8B92A0',

  accent: '#FDCC00',        // Shell yellow
  accentForeground: '#12151D',

  destructive: '#ED1C24',
  destructiveForeground: '#FFFFFF',

  border: '#2A2F3C',
  input: '#333A48',

  // App-specific extras
  inputBg: '#1C2028',
  cyan: '#4FB0C6',          // balanced state
  green: '#4FBE71',         // over state
  dimText: '#6B7280',
};

const colors = {
  light: palette,
  dark: palette,
  radius: 10,
};

export default colors;
