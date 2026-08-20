import { useQuery } from '@tanstack/react-query';
import { Box, Card, Chip, CircularProgress, Grid, List, ListItem, ListItemText, Typography } from '@mui/material';
import { endpoints } from '../api/client';

type MenuItem = { id: string; label: string; action: string; sortOrder: number };
type Menu = { id: string; name: string; trigger?: string | null; isActive: boolean; items: MenuItem[] };

export default function MenusPage() {
  const { data, isLoading } = useQuery<Menu[]>({ queryKey: ['menus'], queryFn: () => endpoints.menus() });

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
        Menus
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Menus are stored as data, not hardcoded — every business configures its own options without touching the engine.
      </Typography>
      <Grid container spacing={2}>
        {(data ?? []).map((menu) => (
          <Grid xs={12} md={6} key={menu.id}>
            <Card sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6">{menu.name}</Typography>
                <Chip size="small" label={menu.isActive ? 'ACTIVE' : 'INACTIVE'} color={menu.isActive ? 'success' : 'default'} variant="outlined" />
              </Box>
              {menu.trigger && (
                <Typography variant="caption" color="text.secondary">
                  Trigger: “{menu.trigger}”
                </Typography>
              )}
              <List dense>
                {menu.items.map((item, idx) => (
                  <ListItem key={item.id} disableGutters>
                    <ListItemText primary={`${idx + 1}. ${item.label}`} secondary={`action → ${item.action}`} />
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