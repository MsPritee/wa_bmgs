import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { endpoints } from '../api/client';
import type { Business } from '../types';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<Business>({ queryKey: ['business'], queryFn: () => endpoints.business() });

  const [form, setForm] = useState({ name: '', businessType: '', whatsappPhone: '', whatsappAccountId: '' });
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name ?? '',
        businessType: data.businessType ?? '',
        whatsappPhone: data.whatsappPhone ?? '',
        whatsappAccountId: data.whatsappAccountId ?? '',
      });
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () =>
      endpoints.updateBusiness({
        name: form.name.trim(),
        businessType: form.businessType.trim() || undefined,
        whatsappPhone: form.whatsappPhone.replace(/[^\d]/g, '') || undefined,
        whatsappAccountId: form.whatsappAccountId.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
      setFeedback({ severity: 'success', message: 'Business profile saved' });
    },
    onError: (e) => setFeedback({ severity: 'error', message: e instanceof Error ? e.message : 'Save failed' }),
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Settings
      </Typography>

      {feedback && (
        <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid xs={12} md={6}>
          <Card component="form" onSubmit={(e) => { e.preventDefault(); saveMut.mutate(); }} sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>
              Business profile
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField size="small" label="Business name" value={form.name} onChange={set('name')} required />
              <TextField size="small" label="Business type" value={form.businessType} onChange={set('businessType')} />
              <TextField
                size="small"
                label="WhatsApp number"
                value={form.whatsappPhone}
                onChange={set('whatsappPhone')}
                helperText="Digits only, must match the Meta business number exactly (e.g. 15550234876)"
              />
              <TextField size="small" label="WhatsApp account ID" value={form.whatsappAccountId} onChange={set('whatsappAccountId')} />
              <TextField size="small" label="Slug" value={data?.slug ?? ''} disabled helperText="Slug cannot be changed" />
              <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saveMut.isPending} sx={{ alignSelf: 'flex-start' }}>
                {saveMut.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </Box>
          </Card>
        </Grid>

        <Grid xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" mb={1}>
              WhatsApp integration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Inbound messages are routed to this business by matching the webhook's display phone number against the
              WhatsApp number above. Keep it identical to the number configured in your Meta WhatsApp account.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Settings
              </Typography>
              {Object.entries((data?.settings ?? {}) as Record<string, unknown>).map(([k, v]) => (
                <Chip key={k} size="small" label={`${k}: ${String(v)}`} sx={{ mr: 1, mb: 1 }} variant="outlined" />
              ))}
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}