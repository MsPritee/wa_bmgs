import { useQuery } from '@tanstack/react-query';
import { Box, Card, Chip, CircularProgress, Grid, List, ListItem, ListItemText, Typography } from '@mui/material';
import { endpoints } from '../api/client';

type Field = { id: string; key: string; label: string; fieldType: string; required: boolean };
type Entity = { id: string; name: string; slug: string; fields: Field[]; _count?: { records: number } };

export default function EntitiesPage() {
  const { data, isLoading } = useQuery<Entity[]>({ queryKey: ['entities'], queryFn: () => endpoints.entities() });

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
        Business Data (Entities)
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Generic entity/record layer — a bakery enables Product + Order, a bank enables Account + Card + Loan. No core-code changes.
      </Typography>
      <Grid container spacing={2}>
        {(data ?? []).map((entity) => (
          <Grid xs={12} md={6} lg={4} key={entity.id}>
            <Card sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6">{entity.name}</Typography>
                <Chip size="small" label={`${entity._count?.records ?? 0} records`} variant="outlined" />
              </Box>
              <Typography variant="caption" color="text.secondary">
                slug: {entity.slug}
              </Typography>
              <List dense>
                {entity.fields.map((f) => (
                  <ListItem key={f.id} disableGutters>
                    <ListItemText primary={f.label} secondary={`${f.key} · ${f.fieldType}${f.required ? ' · required' : ''}`} />
                  </ListItem>
                ))}
              </List>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}