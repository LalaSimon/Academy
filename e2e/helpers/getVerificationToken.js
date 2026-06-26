/**
 * Returns the emailVerificationToken for the given email from the test DB.
 * Run from the apps/api directory so Prisma client is available.
 * Usage: node helpers/getVerificationToken.js <email>
 */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node getVerificationToken.js <email>');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailVerificationToken: true },
    });
    if (!user) {
      console.error('USER_NOT_FOUND');
      process.exit(1);
    }
    process.stdout.write(user.emailVerificationToken ?? '');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
