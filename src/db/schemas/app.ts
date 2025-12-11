import { relations } from "drizzle-orm";
import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { user } from "./auth.js";

export const classStatusEnum = pgEnum("class_status", ["active", "inactive", "full"]);

export type ClassSchedule = {
  day: string;
  startTime: string;
  endTime: string;
};

export const subjects = pgTable("subjects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  description: text("description"),
  department: varchar("department", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const classes = pgTable(
  "classes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 255 }).notNull(),
    inviteCode: varchar("invite_code", { length: 20 }).unique().notNull(),
    subjectId: integer("subject_id")
      .references(() => subjects.id, { onDelete: "cascade" })
      .notNull(),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    description: text("description"),
    bannerUrl: text("banner_url"),
    bannerCldPubId: text("imageCldPubId"),
    capacity: integer("capacity").default(50),
    status: classStatusEnum("status").notNull().default("active"),
    schedules: jsonb("schedules").$type<ClassSchedule[]>().default([]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("classes_subject_id_idx").on(table.subjectId),
    index("classes_teacher_id_idx").on(table.teacherId),
  ],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    classId: integer("class_id")
      .references(() => classes.id, { onDelete: "cascade" })
      .notNull(),
    enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("enrollments_class_id_idx").on(table.classId),
    index("enrollments_student_id_idx").on(table.studentId),
    uniqueIndex("enrollments_student_class_unq").on(table.studentId, table.classId),
  ],
);

export const subjectsRelations = relations(subjects, ({ many }) => ({
  classes: many(classes),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  subject: one(subjects, { fields: [classes.subjectId], references: [subjects.id] }),
  teacher: one(user, { fields: [classes.teacherId], references: [user.id] }),
  enrollments: many(enrollments),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  class: one(classes, { fields: [enrollments.classId], references: [classes.id] }),
  student: one(user, { fields: [enrollments.studentId], references: [user.id] }),
}));
