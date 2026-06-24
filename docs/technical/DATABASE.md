# Schemat Bazy Danych

## Technologia
- **PostgreSQL 16**
- **Prisma ORM** (migracje, type-safety, Prisma Studio do przeglądania danych)

## Encje i relacje

### User
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  firstName     String
  lastName      String
  phone         String?
  role          Role      @default(STUDENT)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relacje
  teacherGroups    Group[]           @relation("GroupTeacher")
  studentGroups    GroupStudent[]
  attendances      Attendance[]
  uploadedMaterials Material[]
  payments         Payment[]
  children         ParentStudent[]   @relation("Parent")
  parents          ParentStudent[]   @relation("Student")
  refreshTokens    RefreshToken[]
  notifications    Notification[]
}

enum Role {
  ADMIN
  TEACHER
  STUDENT
  PARENT
}
```

### Group
```prisma
model Group {
  id          String    @id @default(cuid())
  name        String
  description String?
  level       String?   // np. "A1", "B2"
  language    String?   // np. "English", "German"
  maxStudents Int       @default(10)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())

  teacherId   String
  teacher     User      @relation("GroupTeacher", fields: [teacherId], references: [id])

  students    GroupStudent[]
  classes     Class[]
}
```

### GroupStudent (tabela łącząca)
```prisma
model GroupStudent {
  id          String    @id @default(cuid())
  groupId     String
  studentId   String
  joinedAt    DateTime  @default(now())
  isActive    Boolean   @default(true)

  group       Group     @relation(fields: [groupId], references: [id])
  student     User      @relation(fields: [studentId], references: [id])

  @@unique([groupId, studentId])
}
```

### Class (Zajęcia)
```prisma
model Class {
  id            String        @id @default(cuid())
  groupId       String
  title         String
  description   String?
  scheduledAt   DateTime
  durationMin   Int           @default(60)
  meetLink      String?       // Google Meet URL
  status        ClassStatus   @default(SCHEDULED)
  cancelReason  String?
  createdAt     DateTime      @default(now())

  group         Group         @relation(fields: [groupId], references: [id])
  attendances   Attendance[]
  materials     ClassMaterial[]
}

enum ClassStatus {
  SCHEDULED
  ONGOING
  COMPLETED
  CANCELLED
}
```

### Attendance
```prisma
model Attendance {
  id        String           @id @default(cuid())
  classId   String
  studentId String
  status    AttendanceStatus @default(ABSENT)
  note      String?
  markedAt  DateTime         @default(now())

  class     Class  @relation(fields: [classId], references: [id])
  student   User   @relation(fields: [studentId], references: [id])

  @@unique([classId, studentId])
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  EXCUSED
}
```

### Material
```prisma
model Material {
  id          String        @id @default(cuid())
  title       String
  description String?
  type        MaterialType
  url         String        // MinIO URL lub zewnętrzny link
  fileKey     String?       // klucz w MinIO
  isPublic    Boolean       @default(false)
  uploadedBy  String
  createdAt   DateTime      @default(now())

  uploader    User          @relation(fields: [uploadedBy], references: [id])
  classes     ClassMaterial[]
}

enum MaterialType {
  PDF
  VIDEO
  AUDIO
  IMAGE
  LINK
  OTHER
}
```

### ClassMaterial (tabela łącząca zajęcia ↔ materiały)
```prisma
model ClassMaterial {
  classId     String
  materialId  String
  order       Int     @default(0)

  class       Class    @relation(fields: [classId], references: [id])
  material    Material @relation(fields: [materialId], references: [id])

  @@id([classId, materialId])
}
```

### Payment
```prisma
model Payment {
  id              String        @id @default(cuid())
  studentId       String
  amount          Decimal       @db.Decimal(10, 2)
  currency        String        @default("PLN")
  description     String
  status          PaymentStatus @default(PENDING)
  dueDate         DateTime
  paidAt          DateTime?
  externalId      String?       // ID z bramki płatności
  paymentProvider String?       // "przelewy24" | "stripe"
  providerData    Json?         // surowa odpowiedź od bramki
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  student         User          @relation(fields: [studentId], references: [id])
  periodStart     DateTime?
  periodEnd       DateTime?
}

enum PaymentStatus {
  PENDING
  PAID
  OVERDUE
  REFUNDED
  CANCELLED
}
```

### ParentStudent (rodzic ↔ uczeń)
```prisma
model ParentStudent {
  parentId    String
  studentId   String
  createdAt   DateTime @default(now())

  parent      User @relation("Parent", fields: [parentId], references: [id])
  student     User @relation("Student", fields: [studentId], references: [id])

  @@id([parentId, studentId])
}
```

### RefreshToken
```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Notification
```prisma
model Notification {
  id        String             @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  body      String
  isRead    Boolean            @default(false)
  createdAt DateTime           @default(now())

  user      User               @relation(fields: [userId], references: [id])
}

enum NotificationType {
  CLASS_REMINDER
  PAYMENT_REMINDER
  CLASS_CANCELLED
  ATTENDANCE_ALERT
  GENERAL
}
```

## Diagram relacji (uproszczony)

```
User ─────────────── GroupStudent ─── Group ─── Class ─── ClassMaterial ─── Material
 │                                      │          │
 │ (teacher)                            │       Attendance
 └──────────────────────────────────────┘
 
User (PARENT) ─── ParentStudent ─── User (STUDENT)
                                          │
                                       Payment
```
