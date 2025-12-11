import express from "express";
import { db } from "../db/index.js";
import { eq, ilike, or, and, desc, getTableColumns } from "drizzle-orm";
import { classes, subjects, enrollments } from "../db/schemas/app.js";
import { user } from "../db/schemas/auth.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { search, subject_id, teacher_id, page, limit } = req.query;

    const queryConditions: any[] = [];

    const currentPage = parseInt(page as string) || 1;
    const limitPerPage = parseInt(limit as string) || 10;
    const offset = (currentPage - 1) * limitPerPage;

    if (subject_id) {
      queryConditions.push(eq(classes.subjectId, +subject_id));
    }

    if (teacher_id) {
      queryConditions.push(eq(classes.teacherId, teacher_id.toString()));
    }

    if (search) {
      queryConditions.push(or(ilike(classes.name, `%${search}%`)));
    }

    let baseQuery = db
      .select({
        ...getTableColumns(classes),
        subject: subjects,
        teacher: user,
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .$dynamic();

    if (queryConditions.length > 0) {
      baseQuery = baseQuery.where(and(...queryConditions));
    }

    const allMatchedRecords = await baseQuery;
    const totalRecords = allMatchedRecords.length;

    const paginatedClasses = await baseQuery
      .orderBy(desc(classes.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    return res.json({
      data: {
        items: paginatedClasses,
        pagination: {
          page: currentPage,
          limit: limitPerPage,
          total: totalRecords,
          totalPages: Math.ceil(totalRecords / limitPerPage),
        },
      },
      message: "Classes retrieved successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch classes",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const classId = parseInt(req.params.id);

    const classRecord = await db
      .select({
        ...getTableColumns(classes),
        subject: subjects,
        teacher: user,
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(eq(classes.id, classId));

    if (!classRecord?.length) {
      return res
        .status(404)
        .json({ error: "Class not found", message: "Class not found" });
    }

    const enrolledStudents = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        enrollmentId: enrollments.id,
        enrolledAt: enrollments.enrolledAt,
      })
      .from(enrollments)
      .innerJoin(user, eq(enrollments.studentId, user.id))
      .where(eq(enrollments.classId, classId))
      .orderBy(desc(enrollments.enrolledAt));

    return res.json({
      data: {
        ...classRecord[0],
        students: enrolledStudents || [],
      },
      message: "Class details retrieved successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch class details",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, subject_id, teacher_id } = req.body;

    if (!name || !subject_id || !teacher_id) {
      return res.status(400).json({
        error: "name, subject_id, and teacher_id are required",
        message: "Missing required class fields",
      });
    }

    const createdClass = await db
      .insert(classes)
      .values({
        name,
        subjectId: +subject_id,
        teacherId: teacher_id.toString(),
        inviteCode: crypto.randomUUID().substring(0, 6),
      })
      .returning();

    return res.status(201).json({
      data: createdClass[0],
      message: "Class created successfully",
    });
  } catch (error) {
    console.error("ERROR in POST /classes:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to create class",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const updatedClass = await db
      .update(classes)
      .set(req.body)
      .where(eq(classes.id, parseInt(req.params.id)))
      .returning();

    if (!updatedClass?.length) {
      return res
        .status(404)
        .json({ error: "Class not found", message: "Class not found" });
    }

    return res.json({
      data: updatedClass[0],
      message: "Class updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to update class",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deletedClass = await db
      .delete(classes)
      .where(eq(classes.id, parseInt(req.params.id)))
      .returning();

    if (!deletedClass?.length) {
      return res
        .status(404)
        .json({ error: "Class not found", message: "Class not found" });
    }

    return res.json({
      data: deletedClass[0],
      message: "Class deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to delete class",
    });
  }
});

export default router;
