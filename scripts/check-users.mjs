import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg({ pool });
const db = new PrismaClient({ adapter });

const users = await db.user.findMany({
  select: { id: true, clerkId: true, email: true, role: true, tenantId: true, firstName: true },
});
console.log("=== USERS IN DB ===");
console.log(JSON.stringify(users, null, 2));

await db.$disconnect();
await pool.end();
