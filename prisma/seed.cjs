const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.role.upsert({
    where: { code: "admin" },
    update: {
      name: "Administrator",
      description: "Full system access"
    },
    create: {
      code: "admin",
      name: "Administrator",
      description: "Full system access"
    }
  });

  await prisma.role.upsert({
    where: { code: "user" },
    update: {
      name: "User",
      description: "Default application user role"
    },
    create: {
      code: "user",
      name: "User",
      description: "Default application user role"
    }
  });

  console.log("Seed completed: roles admin/user are up to date");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
