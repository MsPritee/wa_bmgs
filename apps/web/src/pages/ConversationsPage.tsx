import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { endpoints } from '../api/client';
import type { ConversationItem } from '../types';

function StatusChip({ status }: { status: string }) {
  const color = status === 'OPEN' ? 'success' : status === 'PENDING' ? 'warning' : 'default';
  return <Chip size="small" label={status} color={color} variant="outlined" />;
}

export default function ConversationsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<ConversationItem[]>({ queryKey: ['conversations'], queryFn: () => endpoints.conversations() });

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
        Conversations
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Mode</TableCell>
              <TableCell>Agent</TableCell>
              <TableCell>Messages</TableCell>
              <TableCell>Last activity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data ?? []).map((c) => (
              <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/conversations/${c.id}`)}>
                <TableCell>{c.customer?.name ?? 'Unnamed'}</TableCell>
                <TableCell>{c.customer?.phone}</TableCell>
                <TableCell>
                  <StatusChip status={c.status} />
                </TableCell>
                <TableCell>{c.mode}</TableCell>
                <TableCell>{c.agent?.name ?? '—'}</TableCell>
                <TableCell>{c._count?.messages ?? 0}</TableCell>
                <TableCell>{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}