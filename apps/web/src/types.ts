export type Customer = {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  tags?: string[];
  lastActivityAt?: string | null;
  createdAt: string;
};

export type ConversationItem = {
  id: string;
  status: string;
  mode: string;
  lastMessageAt?: string | null;
  customer: { id: string; name?: string | null; phone?: string | null } | null;
  agent?: { id: string; name: string } | null;
  _count?: { messages: number };
};

export type Message = {
  id: string;
  direction: string;
  senderType: string;
  content?: string | null;
  messageType: string;
  status: string;
  timestamp: string;
};

export type ConversationDetail = {
  id: string;
  status: string;
  mode: string;
  currentWorkflowId?: string | null;
  variables?: Record<string, unknown>;
  customer: Customer | null;
  agent?: { id: string; name: string } | null;
  messages: Message[];
};

export type Overview = {
  customers: number;
  newCustomers: number;
  conversations: number;
  openConversations: number;
  automatedConversations: number;
  humanConversations: number;
  messagesToday: number;
  sentToday: number;
  resolutionRate: number;
};

export type TrendPoint = { date: string; count: number };