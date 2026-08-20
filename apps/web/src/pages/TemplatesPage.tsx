import { useQuery } from '@tanstack/react-query';
import { Box, Card, Chip, CircularProgress, Grid, Typography } from '@mui/material';
import { endpoints } from '../api/client';

type Template = { id: string; name: string; body: string; language: string; status: string };

export default function TemplatesPage() {
  const { data, isLoading } = useQuery<Template[]>({ queryKey: ['templates'], queryFn: () => endpoints.templates() });

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Templates
      </Typography>
      <Grid container spacing={2}>
        {(data ?? []).map((t) => (
          <Grid xs={12} md={6} lg={4} key={t.id}>
            <Card sx={{ p: 2.5, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">{t.name}</Typography>
                <Chip size="small" label={t.status} color={t.status === 'APPROVED' ? 'success' : 'warning'} variant="outlined" />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {t.language}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                {t.body}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}