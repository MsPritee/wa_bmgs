export const Role = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  BUSINESS_ADMIN: 'BUSINESS_ADMIN',
  AGENT: 'AGENT',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ConversationStatus = {
  OPEN: 'OPEN',
  PENDING: 'PENDING',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;
export type ConversationStatus = (typeof ConversationStatus)[keyof typeof ConversationStatus];

export const ConversationMode = {
  AUTOMATED: 'AUTOMATED',
  HUMAN: 'HUMAN',
} as const;
export type ConversationMode = (typeof ConversationMode)[keyof typeof ConversationMode];

export const Channel = {
  WHATSAPP: 'WHATSAPP',
} as const;
export type Channel = (typeof Channel)[keyof typeof Channel];

export const MessageDirection = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND',
} as const;
export type MessageDirection = (typeof MessageDirection)[keyof typeof MessageDirection];

export const SenderType = {
  CUSTOMER: 'CUSTOMER',
  AGENT: 'AGENT',
  SYSTEM: 'SYSTEM',
} as const;
export type SenderType = (typeof SenderType)[keyof typeof SenderType];

export const MessageType = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  DOCUMENT: 'DOCUMENT',
  BUTTON: 'BUTTON',
  LIST: 'LIST',
  TEMPLATE: 'TEMPLATE',
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const MessageStatus = {
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED',
} as const;
export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];

export const WorkflowNodeType = {
  TRIGGER: 'TRIGGER',
  MESSAGE: 'MESSAGE',
  CONDITION: 'CONDITION',
  ACTION: 'ACTION',
  INPUT: 'INPUT',
  MENU: 'MENU',
  BRANCH: 'BRANCH',
  DELAY: 'DELAY',
  API_CALL: 'API_CALL',
  HUMAN_HANDOFF: 'HUMAN_HANDOFF',
  END: 'END',
} as const;
export type WorkflowNodeType = (typeof WorkflowNodeType)[keyof typeof WorkflowNodeType];

export const ActionType = {
  CREATE_RECORD: 'CREATE_RECORD',
  UPDATE_RECORD: 'UPDATE_RECORD',
  GET_RECORD: 'GET_RECORD',
  SEARCH_RECORD: 'SEARCH_RECORD',
  SEND_MESSAGE: 'SEND_MESSAGE',
  ASSIGN_AGENT: 'ASSIGN_AGENT',
  CALL_API: 'CALL_API',
  WAIT: 'WAIT',
  REDIRECT: 'REDIRECT',
} as const;
export type ActionType = (typeof ActionType)[keyof typeof ActionType];

export const EntityFieldType = {
  TEXT: 'TEXT',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  DATE: 'DATE',
  ENUM: 'ENUM',
  RELATION: 'RELATION',
} as const;
export type EntityFieldType = (typeof EntityFieldType)[keyof typeof EntityFieldType];

export const MenuItemAction = {
  SHOW_MENU: 'SHOW_MENU',
  SEND_MESSAGE: 'SEND_MESSAGE',
  TRIGGER_WORKFLOW: 'TRIGGER_WORKFLOW',
  TALK_TO_AGENT: 'TALK_TO_AGENT',
  GO_BACK: 'GO_BACK',
  END: 'END',
} as const;
export type MenuItemAction = (typeof MenuItemAction)[keyof typeof MenuItemAction];

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  TAKEOVER: 'TAKEOVER',
  RESUME: 'RESUME',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const TenantStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;
export type TenantStatus = (typeof TenantStatus)[keyof typeof TenantStatus];

export type JwtPayload = {
  userId: string;
  email: string;
  role: Role;
  tenantId: string | null;
};