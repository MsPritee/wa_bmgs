import { useQuery } from '@tanstack/react-query';
import { Box, Card, Chip, CircularProgress, Grid, Typography } from '@mui/material';
import { endpoints } from '../api/client';

type Agent = { id: string; name: string; email: string; agentStatus: string | null; isActive: boolean; _count: { conversations: number } };

export default function AgentsPage() {
  const { data, isLoading } = useQuery<Agent[]>({ queryKey: ['agents'], queryFn: () => endpoints.agents() });

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
        Agents
      </Typography>
      <Grid container spacing={2}>
        {(data ?? []).map((a) => (
          <Grid xs={12} sm={6} md={4} key={a.id}>
            <Card sx={{ p: 2.5 }}>
              <Typography variant="h6">{a.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {a.email}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Chip size="small" label={a.agentStatus ?? 'OFFLINE'} color={a.agentStatus === 'ONLINE' ? 'success' : 'default'} />
                <Chip size="small" label={`${a._count.conversations} conversations`} variant="outlined" />
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}