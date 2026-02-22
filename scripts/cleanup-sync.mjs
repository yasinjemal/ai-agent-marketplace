import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg({ pool });
const db = new PrismaClient({ adapter });

// Clean up any tenant/user created by the __sync__ auto-sync bug
const badTenants = await db.tenant.findMany({
  where: { name: "__sync__" },
  include: { users: true },
});

if (badTenants.length > 0) {
  console.log(`Found ${badTenants.length} bad tenant(s) to clean up:`);
  for (const t of badTenants) {
    console.log(`  - Tenant: ${t.id} (${t.name}), Users: ${t.users.length}`);
    // Delete users first, then tenant
    await db.user.deleteMany({ where: { tenantId: t.id } });
    await db.tenant.delete({ where: { id: t.id } });
    console.log(`    Deleted.`);
  }
} else {
  console.log("No __sync__ tenants found. DB is clean.");
}

// Show remaining users
const users = await db.user.findMany({
  select: { id: true, clerkId: true, email: true, role: true, firstName: true },
});
console.log(`\n=== ${users.length} user(s) in DB ===`);
for (const u of users) {
  console.log(`  ${u.firstName ?? "?"} | ${u.email} | ${u.role} | clerkId: ${u.clerkId.slice(0, 15)}...`);
}

await db.$disconnect();
await pool.end();
