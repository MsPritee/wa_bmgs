import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CircularProgress,
  Grid,
  Typography,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { endpoints } from '../api/client';

type Node = { id: string; name: string; nodeType: string; position?: { x: number; y: number } };
type Workflow = { id: string; name: string; description?: string | null; triggerType: string; isActive: boolean; nodes: Node[] };

const NODE_COLORS: Record<string, string> = {
  TRIGGER: 'primary.main',
  MESSAGE: 'success.main',
  CONDITION: 'warning.main',
  ACTION: 'error.main',
  MENU: 'info.main',
  HUMAN_HANDOFF: 'secondary.main',
  END: 'grey.500',
};

export default function WorkflowsPage() {
  const { data, isLoading } = useQuery<Workflow[]>({ queryKey: ['workflows'], queryFn: () => endpoints.workflows() });

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
        Workflows
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Generic node pipeline: Trigger → Condition → Action → Message → Next. The same engine powers a bakery, a bank, or a salon.
      </Typography>
      <Grid container spacing={2}>
        {(data ?? []).map((wf) => (
          <Grid xs={12} lg={6} key={wf.id}>
            <Card sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <BoltIcon color={wf.isActive ? 'success' : 'disabled'} />
                <Typography variant="h6">{wf.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {wf.isActive ? 'ACTIVE' : 'INACTIVE'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mb={1}>
                {wf.description ?? 'No description'} · trigger: {wf.triggerType}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {wf.nodes.map((node, idx) => (
                  <Box key={node.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Card
                      sx={{
                        px: 1.5,
                        py: 0.75,
                        bgcolor: NODE_COLORS[node.nodeType] ?? 'grey.500',
                        color: 'white',
                      }}
                    >
                      <Typography variant="caption" fontWeight={600}>
                        {node.nodeType}
                      </Typography>
                    </Card>
                    {idx < wf.nodes.length - 1 && <Typography variant="body2" color="text.secondary">→</Typography>}
                  </Box>
                ))}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}