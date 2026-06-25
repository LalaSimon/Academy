/**
 * Seeds the test database with fixtures needed for e2e tests.
 * Run from apps/api directory so Prisma client and node_modules are available.
 * Idempotent — safe to run multiple times.
 */
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const FIXTURES = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL ?? 'admin@test.academy',
    password: process.env.TEST_ADMIN_PASSWORD ?? 'Admin1234!',
    firstName: 'Admin',
    lastName: 'Testowy',
    role: 'ADMIN',
  },
  teacher: {
    email: 'teacher@test.academy',
    password: 'Teacher1234!',
    firstName: 'Anna',
    lastName: 'Kowalska',
    role: 'TEACHER',
  },
  student: {
    email: 'student@test.academy',
    password: 'Student1234!',
    firstName: 'Jan',
    lastName: 'Nowak',
    role: 'STUDENT',
  },
};

async function seed() {
  const prisma = new PrismaClient();
  try {
    const users = {};
    for (const [key, fixture] of Object.entries(FIXTURES)) {
      const hash = await argon2.hash(fixture.password);
      users[key] = await prisma.user.upsert({
        where: { email: fixture.email },
        create: {
          email: fixture.email,
          passwordHash: hash,
          firstName: fixture.firstName,
          lastName: fixture.lastName,
          role: fixture.role,
          isActive: true,
        },
        update: { passwordHash: hash, isActive: true },
      });
    }

    // Test group assigned to teacher
    const group = await prisma.group.upsert({
      where: { id: 'e2e-group-1' },
      create: {
        id: 'e2e-group-1',
        name: 'E2E Angielski A1',
        language: 'EN',
        level: 'A1',
        teacherId: users.teacher.id,
      },
      update: { teacherId: users.teacher.id },
    });

    // Enroll student in the group
    await prisma.groupStudent.upsert({
      where: { groupId_studentId: { groupId: group.id, studentId: users.student.id } },
      create: { groupId: group.id, studentId: users.student.id, isActive: true },
      update: { isActive: true },
    });

    // One SCHEDULED class for status transition + attendance tests
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 1);
    scheduledAt.setHours(10, 0, 0, 0);

    await prisma.class.upsert({
      where: { id: 'e2e-class-1' },
      create: {
        id: 'e2e-class-1',
        title: 'E2E Scheduled Class',
        groupId: group.id,
        teacherId: users.teacher.id,
        scheduledAt,
        durationMin: 60,
        status: 'SCHEDULED',
      },
      update: { status: 'SCHEDULED', scheduledAt },
    });

    console.log('[e2e seed] OK');
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((e) => {
  console.error('[e2e seed] FAILED:', e.message);
  process.exit(1);
});
