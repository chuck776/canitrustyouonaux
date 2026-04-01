// prismaTest.ts
import { PrismaClient } from "../lib/generated/prisma"; // matches your generator output

const prisma = new PrismaClient();

async function main() {
  // Test fetching all users
  const users = await prisma.spotifyUser.findMany();
  console.log("Users:", users);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });