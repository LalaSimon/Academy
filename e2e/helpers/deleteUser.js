/**
 * Deletes a user (and related data) by email from the test DB.
 * Run from the apps/api directory so Prisma client is available.
 * Usage: node helpers/deleteUser.js <email> [<email2> ...]
 */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const emails = process.argv.slice(2);
  if (!emails.length) {
    console.error('Usage: node deleteUser.js <email> [<email2> ...]');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true },
    });

    if (!users.length) {
      console.log('[e2e cleanup] no users found for:', emails.join(', '));
      return;
    }

    const ids = users.map((u) => u.id);

    await prisma.$transaction([
      // Parent-student links (both sides)
      prisma.parentStudent.deleteMany({
        where: { OR: [{ parentId: { in: ids } }, { studentId: { in: ids } }] },
      }),
      // Active sessions
      prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } }),
      // Attendance records
      prisma.attendance.deleteMany({ where: { studentId: { in: ids } } }),
      // Group memberships
      prisma.groupStudent.deleteMany({ where: { studentId: { in: ids } } }),
      // Payments
      prisma.payment.deleteMany({ where: { studentId: { in: ids } } }),
      // Finally delete users
      prisma.user.deleteMany({ where: { id: { in: ids } } }),
    ]);

    console.log('[e2e cleanup] deleted:', users.map((u) => u.email).join(', '));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('[e2e cleanup] warning:', e.message.split('\n')[0]);
  process.exit(0);
});
