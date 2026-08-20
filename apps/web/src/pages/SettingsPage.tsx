import { useQuery } from '@tanstack/react-query';
import { Box, Card, Chip, CircularProgress, Grid, Typography } from '@mui/material';
import { endpoints } from '../api/client';

type Business = {
  id: string;
  name: string;
  slug: string;
  businessType?: string | null;
  whatsappPhone?: string | null;
  whatsappAccountId?: string | null;
  settings?: Record<string, unknown> | null;
};

export default function SettingsPage() {
  const { data, isLoading } = useQuery<Business>({ queryKey: ['business'], queryFn: () => endpoints.business() });

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const rows: { label: string; value: string }[] = [
    { label: 'Business', value: data?.name ?? '—' },
    { label: 'Slug', value: data?.slug ?? '—' },
    { label: 'Type', value: data?.businessType ?? '—' },
    { label: 'WhatsApp number', value: data?.whatsappPhone ?? '—' },
    { label: 'WhatsApp account', value: data?.whatsappAccountId ?? '—' },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Settings
      </Typography>
      <Grid container spacing={2}>
        <Grid xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>
              Business profile
            </Typography>
            {rows.map((r) => (
              <Box key={r.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                  {r.label}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {r.value}
                </Typography>
              </Box>
            ))}
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
        <Grid xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" mb={1}>
              WhatsApp integration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The WhatsApp Cloud API connection is configured per business. In this scaffold the provider adapter runs
              in mock mode (no live Meta calls) until a production number and token are set.
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}