import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';
import { Role, MenuItemAction, EntityFieldType, WorkflowNodeType, ConversationStatus, ConversationMode } from '@wa/shared';

async function upsertUser(data: {
  tenantId?: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  agentStatus?: string;
}) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.upsert({
    where: { email: data.email },
    update: { passwordHash, tenantId: data.tenantId, role: data.role },
    create: {
      tenantId: data.tenantId,
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role,
      agentStatus: data.agentStatus ?? 'OFFLINE',
    },
  });
}

async function seedBakery() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'abc-bakery' },
    update: {},
    create: {
      name: 'ABC Bakery',
      slug: 'abc-bakery',
      businessType: 'Bakery',
      whatsappPhone: '919876543210',
      whatsappAccountId: 'WA-ABC-BAKERY',
      settings: { currency: 'INR', timezone: 'Asia/Kolkata' },
    },
  });

  await upsertUser({ tenantId: tenant.id, email: 'baker@bakery.test', password: 'Baker@1234', name: 'Bakery Admin', role: Role.BUSINESS_ADMIN });
  await upsertUser({ tenantId: tenant.id, email: 'agent@bakery.test', password: 'Agent@1234', name: 'Neha Pandey', role: Role.AGENT, agentStatus: 'ONLINE' });

  // Entities (generic business data)
  const product = await prisma.entity.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'product' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Product',
      slug: 'product',
      fields: {
        create: [
          { key: 'name', label: 'Name', fieldType: EntityFieldType.TEXT, required: true, sortOrder: 0 },
          { key: 'price', label: 'Price', fieldType: EntityFieldType.NUMBER, required: true, sortOrder: 1 },
          { key: 'category', label: 'Category', fieldType: EntityFieldType.TEXT, sortOrder: 2 },
          { key: 'availability', label: 'Available', fieldType: EntityFieldType.BOOLEAN, sortOrder: 3 },
        ],
      },
    },
  });
  await prisma.entity.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'order' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Order',
      slug: 'order',
      fields: {
        create: [
          { key: 'items', label: 'Items', fieldType: EntityFieldType.TEXT, required: true, sortOrder: 0 },
          { key: 'total', label: 'Total', fieldType: EntityFieldType.NUMBER, sortOrder: 1 },
          { key: 'status', label: 'Status', fieldType: EntityFieldType.ENUM, options: ['PLACED', 'PREPARING', 'READY', 'DELIVERED'], sortOrder: 2 },
          { key: 'deliveryDate', label: 'Delivery Date', fieldType: EntityFieldType.DATE, sortOrder: 3 },
        ],
      },
    },
  });

  // Sample product records
  const products: Record<string, unknown>[] = [
    { name: 'Chocolate Cake', price: 599, category: 'Cakes', availability: true },
    { name: 'Black Forest', price: 649, category: 'Cakes', availability: true },
    { name: 'Butter Croissant', price: 89, category: 'Pastries', availability: true },
    { name: 'Chocolate Chip Cookies', price: 149, category: 'Cookies', availability: true },
  ];
  for (const p of products) {
    const exists = await prisma.record.findFirst({ where: { tenantId: tenant.id, entityId: product.id } });
    if (!exists) {
      await prisma.record.create({ data: { tenantId: tenant.id, entityId: product.id, data: JSON.parse(JSON.stringify(p)) } });
    }
  }

  // Data-driven menus (§5)
  const welcome = await prisma.menu.create({
    data: {
      tenantId: tenant.id,
      name: 'Welcome Menu',
      trigger: 'hi',
      isActive: true,
    },
  });
  await prisma.menuItem.createMany({
    data: [
      { menuId: welcome.id, label: 'View Menu', action: MenuItemAction.SHOW_MENU, sortOrder: 0 },
      { menuId: welcome.id, label: 'Place Order', action: MenuItemAction.TRIGGER_WORKFLOW, actionConfig: { workflow: 'order' }, sortOrder: 1 },
      { menuId: welcome.id, label: 'Track Order', action: MenuItemAction.TRIGGER_WORKFLOW, actionConfig: { workflow: 'track' }, sortOrder: 2 },
      { menuId: welcome.id, label: 'Talk to Staff', action: MenuItemAction.TALK_TO_AGENT, sortOrder: 3 },
    ],
  });

  // Basic workflow with generic nodes
  const existingFlow = await prisma.workflow.findFirst({ where: { tenantId: tenant.id, name: 'Welcome Flow' } });
  if (!existingFlow) {
    const welcomeFlow = await prisma.workflow.create({
      data: {
        tenantId: tenant.id,
        name: 'Welcome Flow',
        description: 'Greet new customers and show the main menu',
        triggerType: 'MESSAGE_RECEIVED',
        isActive: true,
      },
    });
  await prisma.workflowNode.createMany({
    data: [
      { workflowId: welcomeFlow.id, name: 'Start', nodeType: WorkflowNodeType.TRIGGER, position: { x: 0, y: 0 } },
      { workflowId: welcomeFlow.id, name: 'Welcome Message', nodeType: WorkflowNodeType.MESSAGE, config: { text: 'Welcome to ABC Bakery 👋' }, position: { x: 0, y: 100 } },
      { workflowId: welcomeFlow.id, name: 'Main Menu', nodeType: WorkflowNodeType.MENU, position: { x: 0, y: 200 } },
{ workflowId: welcomeFlow.id, name: 'Human Handoff', nodeType: WorkflowNodeType.HUMAN_HANDOFF, position: { x: 300, y: 200 } },
    ],
  });
  }

  // Templates
  await prisma.template.createMany({
    data: [
      { tenantId: tenant.id, name: 'Order_Confirmation', body: 'Hi {{1}}, thank you for your order! Your total is {{2}}.', language: 'en', category: 'TRANSACTIONAL', status: 'APPROVED' },
      { tenantId: tenant.id, name: 'Order_Ready', body: 'Hi {{1}}, your order is ready for pickup 🎉', language: 'en', category: 'TRANSACTIONAL', status: 'APPROVED' },
    ],
  });

  // Sample customer + conversation + message history
  const customer = await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: '919876543211' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Rahul Sharma',
      phone: '919876543211',
      email: 'rahul@example.com',
      tags: ['VIP', 'Returning Customer'],
      lastActivityAt: new Date(),
    },
  });

  const agent = await prisma.user.findUniqueOrThrow({ where: { email: 'agent@bakery.test' } });
  const existingConvo = await prisma.conversation.findFirst({ where: { tenantId: tenant.id, customerId: customer.id } });
  if (!existingConvo) {
    const convo = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        channel: 'WHATSAPP',
        status: ConversationStatus.OPEN,
        mode: ConversationMode.AUTOMATED,
        assignedAgentId: agent.id,
        variables: { intent: 'product', category: 'cakes' },
        lastMessageAt: new Date(),
      },
    });
    await prisma.message.createMany({
      data: [
        { tenantId: tenant.id, conversationId: convo.id, direction: 'INBOUND', senderType: 'CUSTOMER', senderId: customer.id, messageType: 'TEXT', content: 'Hi', providerMessageId: 'mock-in-1', status: 'DELIVERED' },
        { tenantId: tenant.id, conversationId: convo.id, direction: 'OUTBOUND', senderType: 'AGENT', senderId: agent.id, messageType: 'TEXT', content: 'Welcome to ABC Bakery 👋 How can we help today?', providerMessageId: 'mock-out-1', status: 'READ' },
        { tenantId: tenant.id, conversationId: convo.id, direction: 'INBOUND', senderType: 'CUSTOMER', senderId: customer.id, messageType: 'TEXT', content: 'I want to check cake prices', providerMessageId: 'mock-in-2', status: 'DELIVERED' },
      ],
    });
  }

  return tenant;
}

async function seedBank() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-bank' },
    update: {},
    create: {
      name: 'Demo Bank',
      slug: 'demo-bank',
      businessType: 'Banking',
      whatsappPhone: '919876543220',
      whatsappAccountId: 'WA-DEMO-BANK',
      settings: { currency: 'INR', timezone: 'Asia/Kolkata' },
    },
  });

  await upsertUser({ tenantId: tenant.id, email: 'bank.admin@bank.test', password: 'Bank@1234', name: 'Bank Admin', role: Role.BUSINESS_ADMIN });
  await upsertUser({ tenantId: tenant.id, email: 'support@bank.test', password: 'Support@1234', name: 'Support Agent', role: Role.AGENT });

  const existingBankEntities = await prisma.entity.count({ where: { tenantId: tenant.id } });
  if (existingBankEntities === 0) {
    await prisma.entity.createMany({
      data: [
        { tenantId: tenant.id, name: 'Account', slug: 'account' },
        { tenantId: tenant.id, name: 'Card', slug: 'card' },
        { tenantId: tenant.id, name: 'Loan', slug: 'loan' },
      ],
    });
  }

  const welcome = await prisma.menu.create({
    data: { tenantId: tenant.id, name: 'Banking Menu', trigger: 'hi', isActive: true },
  });
  await prisma.menuItem.createMany({
    data: [
      { menuId: welcome.id, label: 'Account', action: MenuItemAction.TRIGGER_WORKFLOW, sortOrder: 0 },
      { menuId: welcome.id, label: 'Cards', action: MenuItemAction.TRIGGER_WORKFLOW, sortOrder: 1 },
      { menuId: welcome.id, label: 'Loans', action: MenuItemAction.TRIGGER_WORKFLOW, sortOrder: 2 },
      { menuId: welcome.id, label: 'Talk to Agent', action: MenuItemAction.TALK_TO_AGENT, sortOrder: 3 },
    ],
  });

  return tenant;
}

async function main() {
  await upsertUser({ email: 'admin@platform.test', password: 'Admin@1234', name: 'Platform Admin', role: Role.PLATFORM_ADMIN });
  const bakery = await seedBakery();
  const bank = await seedBank();

   
  console.log('Seed complete.');
   
  console.log('  Platform admin : admin@platform.test / Admin@1234');
   
  console.log(`  Bakery admin    : baker@bakery.test / Baker@1234  (tenant: ${bakery.slug} ${bakery.whatsappPhone})`);
   
  console.log(`  Bank admin      : bank.admin@bank.test / Bank@1234 (tenant: ${bank.slug} ${bank.whatsappPhone})`);
   
  console.log('  Bakery agent    : agent@bakery.test / Agent@1234');
}

main()
  .catch((e) => {
     
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());