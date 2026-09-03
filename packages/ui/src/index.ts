export const designTokens = {
  colors: {
    primary: '#1B2A7A',
    accent: '#FF6B00',
    base: '#FFFFFF',
    offWhite: '#F7F7F5',
    text: '#111111',
    muted: '#6B6B6B',
    border: '#E8E8E5',
  },
  typography: {
    sans: 'Inter, Arial, sans-serif',
    editorial: 'Georgia, Times New Roman, serif',
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '4rem',
  },
  containers: {
    sm: '40rem',
    md: '60rem',
    lg: '76rem',
  },
  radii: {
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
  },
  borders: {
    subtle: '1px solid #E8E8E5',
  },
  shadows: {
    soft: '0 10px 30px rgba(17, 17, 17, 0.04)',
  },
  breakpoints: {
    sm: '40rem',
    md: '48rem',
    lg: '64rem',
    xl: '80rem',
  },
  transitions: {
    standard: '180ms ease',
  },
} as const;

export type DesignToken = typeof designTokens;
