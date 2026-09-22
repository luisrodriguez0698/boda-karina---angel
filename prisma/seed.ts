import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no está definida. Configura tu .env antes de ejecutar el seed.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Lista de invitados reales de esta boda. Agrégalos aquí (o desde el panel /admin
// una vez desplegada la app) con: nombre, numero (único, sin espacios) y pases.
const INVITADOS: { nombre: string; numero: string; pases: number }[] = [];

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@local").trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123";
  const existing = await prisma.usuario.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await prisma.usuario.create({
      data: { email: adminEmail, passwordHash: hash },
    });
    console.log(`✔ Usuario admin creado: ${adminEmail} (cambia la contraseña en producción).`);
  } else {
    console.log(`✔ Usuario admin ya existe: ${adminEmail}.`);
  }

  console.log("🌱 Insertando invitados...");
  const result = await prisma.invitado.createMany({
    data: INVITADOS.map((inv) => ({
      nombre: inv.nombre,
      numero: inv.numero,
      pases: inv.pases,
      mesa: null,
      confirmado: false,
      pasesConfirmados: 0,
      fechaConfirmacion: null,
    })),
    skipDuplicates: true,
  });
  console.log(`✔ ${result.count} invitados insertados (omitidos duplicados por número).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
