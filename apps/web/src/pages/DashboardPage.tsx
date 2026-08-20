import { useQuery } from '@tanstack/react-query';
import { Box, Card, CircularProgress, Grid, Paper, Typography } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import SupportIcon from '@mui/icons-material/Support';
import { endpoints } from '../api/client';
import type { Overview, TrendPoint } from '../types';

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <Card sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}.main`, color: 'white', display: 'grid', placeItems: 'center' }}>{icon}</Box>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: overview } = useQuery<Overview>({ queryKey: ['overview'], queryFn: () => endpoints.overview() });
  const { data: trend } = useQuery<TrendPoint[]>({ queryKey: ['trend'], queryFn: () => endpoints.trend() });

  if (!overview) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const max = Math.max(1, ...(trend ?? []).map((t) => t.count));

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Dashboard
      </Typography>

      <Grid container spacing={2} mb={3}>
        <Grid xs={12} sm={6} md={3}>
          <StatCard label="Total Customers" value={overview.customers} icon={<PeopleIcon />} color="primary" />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard label="Open Conversations" value={overview.openConversations} icon={<ChatIcon />} color="secondary" />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard label="Messages Today" value={overview.messagesToday} icon={<SendIcon />} color="info" />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <StatCard label="Human Handoffs" value={overview.humanConversations} icon={<SupportIcon />} color="warning" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" mb={2}>
              Message trend (14 days)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.75, height: 160 }}>
              {(trend ?? []).map((point) => (
                <Box key={point.date} sx={{ flex: 1, bgcolor: 'primary.main', borderRadius: 1, minWidth: 4 }} height={`${Math.max(4, (point.count / max) * 100)}%`} />
              ))}
            </Box>
          </Paper>
        </Grid>
        <Grid xs={12} md={6}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" mb={2}>
              Automation mix
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Suspension of deterministic execution vs human support
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Automated</span>
                <span>{overview.automatedConversations}</span>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Human</span>
                <span>{overview.humanConversations}</span>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Resolution rate</span>
                <span>{Math.round(overview.resolutionRate * 100)}%</span>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}