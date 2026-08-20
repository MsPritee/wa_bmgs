import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import { endpoints } from '../api/client';
import type { ConversationDetail, Message } from '../types';

export default function ConversationDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: convo, isLoading } = useQuery<ConversationDetail>({
    queryKey: ['conversation', id],
    queryFn: () => endpoints.conversation(id),
  });

  const sendMut = useMutation({
    mutationFn: (content: string) => endpoints.sendMessage({ conversationId: id, content }),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['conversation', id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Send failed'),
  });
  const takeoverMut = useMutation({
    mutationFn: () => endpoints.takeover(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversation', id] }),
  });
  const resumeMut = useMutation({
    mutationFn: () => endpoints.resume(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversation', id] }),
  });
  const resolveMut = useMutation({
    mutationFn: () => endpoints.resolve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversation', id] }),
  });

  if (isLoading || !convo) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMut.mutate(draft);
  };

  const messages = convo.messages;
  const vars = (convo.variables ?? {}) as Record<string, unknown>;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/conversations')} sx={{ mb: 2 }}>
        Back to conversations
      </Button>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
        {/* Thread */}
        <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              {convo.customer?.name ?? 'Unnamed customer'}
            </Typography>
            <Chip size="small" label={convo.status} color={convo.status === 'OPEN' ? 'success' : 'default'} />
            <Chip size="small" label={convo.mode} color={convo.mode === 'HUMAN' ? 'warning' : 'primary'} variant="outlined" />
          </Box>

          <Box sx={{ p: 2, flexGrow: 1, maxHeight: 480, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {messages.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                No messages yet.
              </Typography>
            )}
            {messages.map((m: Message) => (
              <Bubble key={m.id} message={m} />
            ))}
          </Box>

          <Divider />
          <Box component="form" onSubmit={send} sx={{ p: 2, display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type a reply…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sendMut.isPending}
            />
            <IconButton type="submit" color="primary" disabled={sendMut.isPending || !draft.trim()}>
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>

        {/* Side panel */}
        <Card sx={{ width: 300, p: 2, alignSelf: 'flex-start' }}>
          <Typography variant="subtitle2" color="text.secondary">
            CUSTOMER
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {convo.customer?.name ?? '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {convo.customer?.phone}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {convo.customer?.email}
          </Typography>

          <Box sx={{ mt: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {(convo.customer?.tags as string[] | undefined)?.map((t) => (
              <Chip key={t} size="small" label={t} color="secondary" />
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" color="text.secondary">
            WORKFLOW STATE
          </Typography>
          <Typography variant="body2">Workflow: {convo.currentWorkflowId ?? '—'}</Typography>
          <Typography variant="body2">Assigned: {convo.agent?.name ?? '—'}</Typography>
          <Typography variant="caption" component="div" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(vars, null, 2)}
          </Typography>

          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {convo.mode !== 'HUMAN' ? (
              <Button variant="contained" onClick={() => takeoverMut.mutate()} disabled={takeoverMut.isPending}>
                Take over
              </Button>
            ) : (
              <Button variant="outlined" onClick={() => resumeMut.mutate()} disabled={resumeMut.isPending}>
                Resume automation
              </Button>
            )}
            <Button variant="text" color="secondary" onClick={() => resolveMut.mutate()} disabled={resolveMut.isPending || convo.status === 'RESOLVED'}>
              Mark resolved
            </Button>
          </Box>
        </Card>
      </Box>
      {error && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>{error}</Alert>}
    </Box>
  );
}

function Bubble({ message }: { message: Message }) {
  const isInbound = message.direction === 'INBOUND';
  return (
    <Box
      sx={{
        alignSelf: isInbound ? 'flex-start' : 'flex-end',
        bgcolor: isInbound ? 'grey.200' : 'primary.main',
        color: isInbound ? 'text.primary' : 'white',
        px: 1.5,
        py: 1,
        borderRadius: 2,
        maxWidth: '70%',
      }}
    >
      <Typography variant="body2">{message.content}</Typography>
    </Box>
  );
}