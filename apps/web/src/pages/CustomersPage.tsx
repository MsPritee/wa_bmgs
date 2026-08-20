import { useQuery } from '@tanstack/react-query';
import { Box, Chip, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { endpoints } from '../api/client';
import type { Customer } from '../types';

export default function CustomersPage() {
  const { data, isLoading } = useQuery<Customer[]>({ queryKey: ['customers'], queryFn: () => endpoints.customers() });

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
        Customers
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell>Last activity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data ?? []).map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name ?? '—'}</TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell>{c.email ?? '—'}</TableCell>
                <TableCell>
                  {(c.tags ?? []).map((t) => (
                    <Chip key={t} size="small" label={t} sx={{ mr: 0.5 }} color="secondary" variant="outlined" />
                  ))}
                </TableCell>
                <TableCell>{c.lastActivityAt ? new Date(c.lastActivityAt).toLocaleString() : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}