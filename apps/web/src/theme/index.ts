import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#0b8a3a' },
    secondary: { main: '#2f4f4f' },
    mode: 'light',
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
});