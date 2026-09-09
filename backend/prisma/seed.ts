import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.requestType.upsert({
    where: { slug: "advertencia" },
    update: {},
    create: { name: "Advertência", slug: "advertencia", slaBusinessDays: 3 },
  });
  await prisma.requestType.upsert({
    where: { slug: "revisao_contrato" },
    update: {},
    create: { name: "Revisão de Contrato", slug: "revisao_contrato", slaBusinessDays: 5 },
  });

  const passwordHash = await bcrypt.hash("123456", 10);

  await prisma.user.upsert({
    where: { email: "usuario@empresa.com" },
    update: {},
    create: {
      name: "Ana Usuária",
      email: "usuario@empresa.com",
      passwordHash,
      role: Role.USUARIO,
      setor: "Vendas",
      loja: "Loja Centro",
      cidade: "São Paulo",
      estado: "SP",
    },
  });

  await prisma.user.upsert({
    where: { email: "juridico@empresa.com" },
    update: {},
    create: {
      name: "Carlos Jurídico",
      email: "juridico@empresa.com",
      passwordHash,
      role: Role.COLABORADOR,
      setor: "Jurídico",
      loja: "Matriz",
      cidade: "São Paulo",
      estado: "SP",
    },
  });

  await prisma.user.upsert({
    where: { email: "gestor@empresa.com" },
    update: {},
    create: {
      name: "Beatriz Gestora",
      email: "gestor@empresa.com",
      passwordHash,
      role: Role.GESTOR,
      setor: "Jurídico",
      loja: "Matriz",
      cidade: "São Paulo",
      estado: "SP",
    },
  });

  await prisma.licensePool.upsert({
    where: { role: Role.USUARIO },
    update: {},
    create: { role: Role.USUARIO, totalLicenses: 10 },
  });
  await prisma.licensePool.upsert({
    where: { role: Role.COLABORADOR },
    update: {},
    create: { role: Role.COLABORADOR, totalLicenses: 5 },
  });

  const adminEmail = process.env.ADMIN_EMAIL || "admin@admin.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "M45t3r";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.platformAdmin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Administrador da Plataforma",
      email: adminEmail,
      passwordHash: adminPasswordHash,
    },
  });

  console.log("Seed concluído. Senha padrão para todos: 123456");
  console.log(`Login master (/admin): ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
