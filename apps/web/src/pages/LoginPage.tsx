import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { endpoints } from '../api/client';
import { useAuthStore } from '../stores/auth';
import type { SessionUser } from '../stores/auth';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('admin@platform.test');
  const [password, setPassword] = useState('Admin@1234');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await endpoints.login(email, password);
      const data = res as unknown as LoginResponse;
      setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default', p: 2 }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, color: 'primary.main' }}>
          <WhatsAppIcon />
          <Typography variant="h5" fontWeight={700}>
            WhatsApp Business Platform
          </Typography>
        </Box>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={submit}>
          <TextField label="Email" type="email" fullWidth required value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} />
          <TextField label="Password" type="password" fullWidth required value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mb: 2 }} />
          <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Demo: admin@platform.test / Admin@1234 · baker@bakery.test / Baker@1234
        </Typography>
      </Paper>
    </Box>
  );
}