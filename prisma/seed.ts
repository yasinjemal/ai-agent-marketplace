// =============================================================
// Database Seed Script
// Creates test tenant, users (admin, developer, business),
// and sample agents for Phase 2 development.
// =============================================================

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...\n");

  // -------------------------------------------------------
  // 1. Create test tenant
  // -------------------------------------------------------
  const tenant = await prisma.tenant.upsert({
    where: { slug: "acme-sa" },
    update: {},
    create: {
      name: "Acme South Africa",
      slug: "acme-sa",
      industry: "retail",
      plan: "growth",
      isActive: true,
    },
  });
  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

  // -------------------------------------------------------
  // 2. Create test users
  // -------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { clerkId: "clerk_admin_test_001" },
    update: {},
    create: {
      clerkId: "clerk_admin_test_001",
      email: "admin@aimarketplace.co.za",
      firstName: "Yasin",
      lastName: "Admin",
      role: "ADMIN",
      tenantId: tenant.id,
      popiaConsent: true,
      consentDate: new Date(),
    },
  });
  console.log(`✅ Admin: ${admin.email} (${admin.id})`);

  const developer = await prisma.user.upsert({
    where: { clerkId: "clerk_dev_test_001" },
    update: {},
    create: {
      clerkId: "clerk_dev_test_001",
      email: "dev@aimarketplace.co.za",
      firstName: "Thabo",
      lastName: "Developer",
      role: "DEVELOPER",
      tenantId: tenant.id,
      popiaConsent: true,
      consentDate: new Date(),
    },
  });
  console.log(`✅ Developer: ${developer.email} (${developer.id})`);

  const businessUser = await prisma.user.upsert({
    where: { clerkId: "clerk_biz_test_001" },
    update: {},
    create: {
      clerkId: "clerk_biz_test_001",
      email: "shop@acme.co.za",
      firstName: "Naledi",
      lastName: "Business",
      role: "BUSINESS_USER",
      tenantId: tenant.id,
      popiaConsent: true,
      consentDate: new Date(),
    },
  });
  console.log(`✅ Business User: ${businessUser.email} (${businessUser.id})`);

  // -------------------------------------------------------
  // 3. Create sample agents
  // -------------------------------------------------------
  const agents = [
    {
      name: "Customer Support Bot",
      slug: "customer-support-bot",
      description: "AI-powered customer support agent that handles FAQs, order inquiries, and complaint resolution for SA retail businesses.",
      longDescription: "This agent connects to your existing customer database and provides instant responses to customer queries. It handles product questions, order tracking, returns processing, and escalation to human agents when needed. Trained on South African retail scenarios including load shedding notifications and delivery delays.",
      category: "customer-support",
      tags: ["support", "retail", "chatbot", "customer-service"],
      inputSchema: { message: "string", customerId: "string", language: "string" },
      outputSchema: { response: "string", confidence: "number", escalate: "boolean" },
      executionEndpoint: "https://api.example.com/agents/customer-support",
      pricingModel: "MONTHLY_FLAT" as const,
      priceInCents: 14900,
      status: "APPROVED" as const,
      isPublished: true,
      averageRating: 4.5,
      totalExecutions: 1250,
    },
    {
      name: "Invoice Generator",
      slug: "invoice-generator",
      description: "Automatically generate SARS-compliant invoices with VAT calculations for South African businesses.",
      longDescription: "Generate professional invoices in seconds. Supports ZAR currency, automatic 15% VAT calculation, and SARS-compliant formatting. Integrates with your customer database to auto-fill details. Supports multiple output formats: PDF, email, and WhatsApp.",
      category: "finance",
      tags: ["invoicing", "finance", "vat", "sars"],
      inputSchema: { customerId: "string", items: "array", dueDate: "string" },
      outputSchema: { invoiceUrl: "string", invoiceNumber: "string", totalWithVat: "number" },
      executionEndpoint: "https://api.example.com/agents/invoice-gen",
      pricingModel: "PER_EXECUTION" as const,
      priceInCents: 500,
      status: "APPROVED" as const,
      isPublished: true,
      averageRating: 4.8,
      totalExecutions: 3400,
    },
    {
      name: "Social Media Manager",
      slug: "social-media-manager",
      description: "AI agent that creates, schedules, and optimizes social media posts for SA small businesses.",
      category: "marketing",
      tags: ["social-media", "marketing", "content", "automation"],
      inputSchema: { businessType: "string", topic: "string", platforms: "array" },
      outputSchema: { posts: "array", suggestedSchedule: "object" },
      executionEndpoint: "https://api.example.com/agents/social-media",
      pricingModel: "MONTHLY_FLAT" as const,
      priceInCents: 29900,
      status: "APPROVED" as const,
      isPublished: true,
      averageRating: 4.2,
      totalExecutions: 890,
    },
    {
      name: "Inventory Forecaster",
      slug: "inventory-forecaster",
      description: "Predict stock levels and reorder points using AI. Built for SA retail and restaurant supply chains.",
      category: "inventory",
      tags: ["inventory", "forecasting", "retail", "supply-chain"],
      inputSchema: { productId: "string", historicalData: "array", seasonality: "boolean" },
      outputSchema: { forecast: "array", reorderPoint: "number", confidence: "number" },
      executionEndpoint: "https://api.example.com/agents/inventory",
      pricingModel: "TIERED" as const,
      priceInCents: 19900,
      status: "APPROVED" as const,
      isPublished: true,
      averageRating: 4.6,
      totalExecutions: 670,
    },
    {
      name: "WhatsApp Order Bot",
      slug: "whatsapp-order-bot",
      description: "Take orders via WhatsApp automatically. Perfect for restaurants and food delivery in SA.",
      category: "sales",
      tags: ["whatsapp", "orders", "restaurant", "food"],
      inputSchema: { phoneNumber: "string", message: "string", menuId: "string" },
      outputSchema: { orderId: "string", orderSummary: "object", estimatedTime: "number" },
      executionEndpoint: "https://api.example.com/agents/whatsapp-order",
      pricingModel: "MONTHLY_FLAT" as const,
      priceInCents: 24900,
      status: "APPROVED" as const,
      isPublished: true,
      averageRating: 4.7,
      totalExecutions: 2100,
    },
    {
      name: "Scheduling Assistant",
      slug: "scheduling-assistant",
      description: "Smart booking and appointment scheduling for service businesses. Integrates with Google Calendar.",
      category: "scheduling",
      tags: ["scheduling", "bookings", "calendar", "appointments"],
      inputSchema: { serviceType: "string", preferredDate: "string", clientInfo: "object" },
      outputSchema: { bookingId: "string", confirmedSlot: "string", reminderSet: "boolean" },
      executionEndpoint: "https://api.example.com/agents/scheduler",
      pricingModel: "FREE" as const,
      priceInCents: 0,
      status: "APPROVED" as const,
      isPublished: true,
      averageRating: 4.0,
      totalExecutions: 450,
    },
    {
      name: "Load Shedding Optimizer",
      slug: "load-shedding-optimizer",
      description: "Optimize your business operations around Eskom load shedding schedules. SA-specific agent.",
      category: "operations",
      tags: ["loadshedding", "eskom", "operations", "south-africa"],
      inputSchema: { area: "string", businessHours: "object", criticalSystems: "array" },
      outputSchema: { schedule: "array", recommendations: "array", nextOutage: "string" },
      executionEndpoint: "https://api.example.com/agents/loadshedding",
      pricingModel: "FREE" as const,
      priceInCents: 0,
      status: "PENDING_REVIEW" as const,
      isPublished: false,
      averageRating: 0,
      totalExecutions: 0,
    },
    {
      name: "Product Description Writer",
      slug: "product-description-writer",
      description: "Generate compelling product descriptions for online shops. Supports English, Afrikaans, and Zulu.",
      category: "content",
      tags: ["content", "ecommerce", "copywriting", "multilingual"],
      inputSchema: { productName: "string", features: "array", targetAudience: "string", language: "string" },
      outputSchema: { title: "string", description: "string", seoKeywords: "array" },
      executionEndpoint: "https://api.example.com/agents/product-writer",
      pricingModel: "PER_EXECUTION" as const,
      priceInCents: 200,
      status: "DRAFT" as const,
      isPublished: false,
      averageRating: 0,
      totalExecutions: 0,
    },
  ];

  for (const agentData of agents) {
    const agent = await prisma.agent.upsert({
      where: { slug: agentData.slug },
      update: {},
      create: {
        ...agentData,
        developerId: developer.id,
      },
    });
    const statusIcon = agent.status === "APPROVED" ? "🟢" : agent.status === "PENDING_REVIEW" ? "🟡" : "⚪";
    console.log(`${statusIcon} Agent: ${agent.name} [${agent.status}]`);
  }

  console.log("\n✅ Seed complete!");
  console.log("\n📋 Test User IDs (use as x-user-id header):");
  console.log(`   Admin:    ${admin.id}`);
  console.log(`   Developer: ${developer.id}`);
  console.log(`   Business:  ${businessUser.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
