import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, pgEnum, integer, varchar, time, uniqueIndex } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "teacher", "student"]);
export const classStatusEnum = pgEnum("class_status", ["active", "inactive", "full"]);

// ============================================================================
// BETTER AUTH TABLES 
// ============================================================================
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  imageCldPubId: text("imageCldPubId"),
  role: roleEnum("role").default("student").notNull(),
  department: varchar("department", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ============================================================================
// APPLICATION-SPECIFIC TABLES
// ============================================================================

// 1. SUBJECTS TABLE
// Purpose: Store academic courses/subjects
export const subjects = pgTable("subjects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  description: text("description"),
  department: varchar("department", { length: 100 }), // e.g., "Computer Science", "Mathematics"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// 2. CLASSES TABLE
// Purpose: Store classroom/course sections with schedules and joining codes
// Note: teacherId references the Better Auth users table
export const classes = pgTable("classes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  subjectId: integer("subject_id")
    .references(() => subjects.id, { onDelete: "cascade" })
    .notNull(),
  teacherId: text("teacher_id").notNull(), // References Better Auth users.id (teacher role)
  code: varchar("code", { length: 20 }).unique().notNull(), // 6-8 character joining code (e.g., "ABC123")
  description: text("description"),
  bannerUrl: text("banner_url"), // URL for class banner image
  capacity: integer("capacity").default(50), // Maximum number of students
  status: classStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// 3. ENROLLMENTS TABLE
// Purpose: Many-to-many relationship between students and classes
// Note: studentId references Better Auth users.id (student role)
export const enrollments = pgTable("enrollments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  studentId: text("student_id").notNull(), // References Better Auth users.id (student role)
  classId: integer("class_id")
    .references(() => classes.id, { onDelete: "cascade" })
    .notNull(),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// 4. CLASS_SCHEDULES TABLE
// Purpose: Store class meeting times and locations (one-to-many with classes)
// Allows querying by day/time and detecting schedule conflicts
export const classSchedules = pgTable("class_schedules", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  classId: integer("class_id")
    .references(() => classes.id, { onDelete: "cascade" })
    .notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday=0, Monday=1, ..., Saturday=6)
  startTime: time("start_time").notNull(), // PostgreSQL time type (e.g., "09:00:00", "14:30:00")
  endTime: time("end_time").notNull(), // PostgreSQL time type (e.g., "10:30:00", "16:00:00")
  room: varchar("room", { length: 100 }), // Room number/location (e.g., "Room 101", "Lab A")
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  // Prevent duplicate schedules for the same class at the same day/time
  uniqueIndex("class_schedules_unique").on(table.classId, table.dayOfWeek, table.startTime),
]);

// ============================================================================
// RELATIONS 
// ============================================================================
// Better Auth Relations
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// Application-specific Relations
export const subjectsRelations = relations(subjects, ({ many }) => ({
  classes: many(classes),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  subject: one(subjects, { fields: [classes.subjectId], references: [subjects.id] }),
  enrollments: many(enrollments),
  schedules: many(classSchedules),
  // Teacher relationship: classes.teacherId → users.id (handled by Better Auth)
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  class: one(classes, { fields: [enrollments.classId], references: [classes.id] }),
  // Student relationship: enrollments.studentId → users.id (handled by Better Auth)
}));

export const classSchedulesRelations = relations(classSchedules, ({ one }) => ({
  class: one(classes, { fields: [classSchedules.classId], references: [classes.id] }),
}));







