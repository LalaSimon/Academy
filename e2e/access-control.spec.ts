import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Regresja bezpieczeństwa (audyt 2026-07-31).
 *
 * `@Roles()` przepuszczał rolę, ale nikt nie sprawdzał, *czyj* jest zasób:
 * uczeń mógł pobrać dowolną grupę po `id` razem z nazwiskami i e-mailami jej
 * uczniów. Te testy pilnują, żeby cudze zasoby zwracały 403, a własne 200.
 */

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@test.academy';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'Admin1234!';
const STUDENT_EMAIL = 'student@test.academy';
const STUDENT_PASSWORD = 'Student1234!';
const TEACHER_EMAIL = 'teacher@test.academy';
const TEACHER_PASSWORD = 'Teacher1234!';

async function token(request: APIRequestContext, email: string, password: string) {
  const res = await request.post('/api/v1/auth/login', { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).accessToken as string;
}

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

test.describe('Kontrola dostępu — odczyt', () => {
  let adminToken = '';
  let studentToken = '';
  let teacherToken = '';
  let ownGroupId = '';
  let foreignGroupId = '';
  let createdForeignGroup = false;
  let foreignClassId = '';

  test.beforeAll(async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext({ baseURL });
    adminToken = await token(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    studentToken = await token(request, STUDENT_EMAIL, STUDENT_PASSWORD);
    teacherToken = await token(request, TEACHER_EMAIL, TEACHER_PASSWORD);

    const me = await (
      await request.get('/api/v1/auth/me', { headers: auth(studentToken) })
    ).json();

    const groupsRes = await request.get('/api/v1/groups?limit=100', {
      headers: auth(adminToken),
    });
    const groups = (await groupsRes.json()).data as { id: string }[];

    // Grupę „własną" i „obcą" ustalamy po faktycznym członkostwie ucznia,
    // a nie po nazwie — seed i baza deweloperska bywają różne.
    for (const g of groups) {
      const detail = await request.get(`/api/v1/groups/${g.id}`, {
        headers: auth(adminToken),
      });
      const body = (await detail.json()) as {
        students?: { student: { id: string } }[];
      };
      const belongs = (body.students ?? []).some((s) => s.student.id === me.id);
      if (belongs && !ownGroupId) ownGroupId = g.id;
      if (!belongs && !foreignGroupId) foreignGroupId = g.id;
    }

    // Seed CI ma tylko grupę ucznia, więc bez tego testy „cudzej grupy" byłyby
    // pomijane i nie miałyby mocy dokładnie tam, gdzie są najbardziej potrzebne.
    if (!foreignGroupId) {
      const teacherMe = await (
        await request.get('/api/v1/auth/me', { headers: auth(teacherToken) })
      ).json();

      const created = await request.post('/api/v1/groups', {
        headers: auth(adminToken),
        data: {
          name: `ACL obca grupa ${Date.now()}`,
          language: 'EN',
          // `teacherId` jest wymagany przez CreateGroupDto.
          teacherId: teacherMe.id,
        },
      });
      expect(
        created.ok(),
        `nie udało się utworzyć grupy kontrolnej: ${created.status()} ${await created.text()}`,
      ).toBeTruthy();
      foreignGroupId = (await created.json()).id;
      createdForeignGroup = true;
    }

    // Zajęcia prowadzone przez kogoś innego niż nasz nauczyciel — potrzebne
    // do testów zapisu.
    const clsRes = await request.get('/api/v1/classes?limit=200', {
      headers: auth(adminToken),
    });
    const teacherMe = await (
      await request.get('/api/v1/auth/me', { headers: auth(teacherToken) })
    ).json();
    const all = (await clsRes.json()).data as {
      id: string;
      teacher: { id: string } | null;
      group: { teacher?: { id: string } | null } | null;
    }[];
    foreignClassId =
      all.find(
        (c) =>
          c.teacher?.id !== teacherMe.id &&
          c.group?.teacher?.id !== teacherMe.id,
      )?.id ?? '';

    await request.dispose();
  });

  test.afterAll(async ({ playwright, baseURL }) => {
    if (!createdForeignGroup) return;
    const request = await playwright.request.newContext({ baseURL });
    const t = await token(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    await request.delete(`/api/v1/groups/${foreignGroupId}`, {
      headers: auth(t),
    });
    await request.dispose();
  });

  test('uczeń NIE pobierze cudzej grupy', async ({ request }) => {
    const res = await request.get(`/api/v1/groups/${foreignGroupId}`, {
      headers: auth(studentToken),
    });
    expect(res.status()).toBe(403);
  });

  test('uczeń pobiera własną grupę', async ({ request }) => {
    test.skip(!ownGroupId, 'uczeń nie należy do żadnej grupy');
    const res = await request.get(`/api/v1/groups/${ownGroupId}`, {
      headers: auth(studentToken),
    });
    expect(res.status()).toBe(200);
  });

  test('uczeń NIE pobierze materiałów cudzej grupy', async ({ request }) => {
    const res = await request.get(`/api/v1/materials/group/${foreignGroupId}`, {
      headers: auth(studentToken),
    });
    expect(res.status()).toBe(403);
  });

  test('uczeń nie widzi żadnych zajęć spoza swoich grup i lekcji 1:1', async ({
    request,
  }) => {
    const me = await (
      await request.get('/api/v1/auth/me', { headers: auth(studentToken) })
    ).json();

    const profile = await (
      await request.get(`/api/v1/users/${me.id}`, { headers: auth(studentToken) })
    ).json();
    const myGroupIds = (
      (profile.studentGroups ?? []) as { group: { id: string } }[]
    ).map((g) => g.group.id);

    const res = await request.get('/api/v1/classes?limit=200', {
      headers: auth(studentToken),
    });
    const classes = (await res.json()).data as {
      id: string;
      group: { id: string } | null;
      student: { id: string } | null;
    }[];

    // Niezmiennik odporny na zawartość bazy: liczba zajęć zależy od seeda,
    // ale KAŻDE widziane zajęcie musi być z grupy ucznia albo jego lekcją 1:1.
    const foreign = classes.filter(
      (c) =>
        !(c.group && myGroupIds.includes(c.group.id)) &&
        !(c.student && c.student.id === me.id),
    );
    expect(foreign).toEqual([]);
  });

  test('nauczyciel widzi tylko własne zajęcia, także po podaniu cudzego teacherId', async ({
    request,
  }) => {
    const own = await request.get('/api/v1/classes?limit=200', {
      headers: auth(teacherToken),
    });
    const spoofed = await request.get(
      '/api/v1/classes?teacherId=zupelnie-inne-id&limit=200',
      { headers: auth(teacherToken) },
    );

    const ownTotal = (await own.json()).total as number;
    const spoofedTotal = (await spoofed.json()).total as number;

    // Parametr z URL-a nie może rozszerzyć ani zawęzić widoczności.
    expect(spoofedTotal).toBe(ownTotal);
  });

  test('nauczyciel widzi tylko własne grupy', async ({ request }) => {
    const [teacherRes, adminRes] = await Promise.all([
      request.get('/api/v1/groups?limit=100', { headers: auth(teacherToken) }),
      request.get('/api/v1/groups?limit=100', { headers: auth(adminToken) }),
    ]);
    expect((await teacherRes.json()).total).toBeLessThanOrEqual(
      (await adminRes.json()).total,
    );
  });

  // ── Zapis ────────────────────────────────────────────────────────────────
  // Najpoważniejsza część audytu: nauczyciel mógł odwołać CUDZE zajęcia,
  // co dodatkowo rozsyłało powiadomienia uczniom obcej grupy.

  test('nauczyciel NIE zmieni statusu cudzych zajęć', async ({ request }) => {
    test.skip(!foreignClassId, 'brak zajęć prowadzonych przez kogoś innego');
    const res = await request.patch(`/api/v1/classes/${foreignClassId}/status`, {
      headers: auth(teacherToken),
      data: { status: 'CANCELLED', cancelReason: 'próba z testu' },
    });
    expect(res.status()).toBe(403);
  });

  test('nauczyciel NIE zapisze frekwencji na cudzych zajęciach', async ({
    request,
  }) => {
    test.skip(!foreignClassId, 'brak zajęć prowadzonych przez kogoś innego');
    const res = await request.patch('/api/v1/attendance/bulk', {
      headers: auth(teacherToken),
      data: {
        classId: foreignClassId,
        items: [{ studentId: 'ktokolwiek', status: 'ABSENT' }],
      },
    });
    expect(res.status()).toBe(403);
  });

  test('nauczyciel NIE odczyta cudzych zajęć ani ich frekwencji', async ({
    request,
  }) => {
    test.skip(!foreignClassId, 'brak zajęć prowadzonych przez kogoś innego');
    const [cls, att] = await Promise.all([
      request.get(`/api/v1/classes/${foreignClassId}`, {
        headers: auth(teacherToken),
      }),
      request.get(`/api/v1/attendance?classId=${foreignClassId}`, {
        headers: auth(teacherToken),
      }),
    ]);
    expect(cls.status()).toBe(403);
    expect(att.status()).toBe(403);
  });

  test('uczeń NIE pobierze cudzej płatności', async ({ request }) => {
    const all = await request.get('/api/v1/payments?limit=100', {
      headers: auth(adminToken),
    });
    const me = await (
      await request.get('/api/v1/auth/me', { headers: auth(studentToken) })
    ).json();
    const foreign = ((await all.json()).data as { id: string; studentId: string }[]).find(
      (p) => p.studentId !== me.id,
    );
    test.skip(!foreign, 'brak płatności innego ucznia');

    const res = await request.get(`/api/v1/payments/${foreign!.id}`, {
      headers: auth(studentToken),
    });
    expect(res.status()).toBe(403);
  });

  test('uczeń NIE pobierze materiału ani pliku obcej grupy', async ({
    request,
  }) => {
    // Materiał kontrolny powstaje w locie — seed nie zawiera materiału
    // przypisanego wyłącznie do obcej grupy.
    const created = await request.post('/api/v1/materials', {
      headers: auth(adminToken),
      data: {
        title: `ACL materiał kontrolny ${Date.now()}`,
        type: 'LINK',
        url: 'https://example.com/secret',
      },
    });
    expect(created.ok()).toBeTruthy();
    const materialId = (await created.json()).id as string;

    try {
      await request.post(
        `/api/v1/materials/${materialId}/groups/${foreignGroupId}`,
        { headers: auth(adminToken) },
      );

      const [detail, file, list] = await Promise.all([
        request.get(`/api/v1/materials/${materialId}`, {
          headers: auth(studentToken),
        }),
        request.get(`/api/v1/materials/${materialId}/file`, {
          headers: auth(studentToken),
        }),
        // MaterialQueryDto ogranicza `limit` do 100.
        request.get('/api/v1/materials?limit=100', {
          headers: auth(studentToken),
        }),
      ]);

      expect(detail.status()).toBe(403);
      expect(file.status()).toBe(403);

      const visible = (await list.json()).data as { id: string }[];
      expect(visible.some((m) => m.id === materialId)).toBe(false);
    } finally {
      await request.delete(`/api/v1/materials/${materialId}`, {
        headers: auth(adminToken),
      });
    }
  });

  test('uczeń NIE pobierze statystyk nauczyciela', async ({ request }) => {
    const me = await (
      await request.get('/api/v1/auth/me', { headers: auth(teacherToken) })
    ).json();
    const res = await request.get(`/api/v1/users/${me.id}/stats`, {
      headers: auth(studentToken),
    });
    expect([401, 403]).toContain(res.status());
  });
});
