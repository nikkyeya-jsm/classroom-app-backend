import express from "express";
import { db } from "../db/index.js";
import { eq, and, desc } from "drizzle-orm";
import { classes, enrollments } from "../db/schemas/app.js";
import { user } from "../db/schemas/auth.js";

const router = express.Router();

// Get enrollments with filters
router.get("/", async (req, res) => {
  try {
    const { student_id, class_id } = req.query;

    const conditions = [];

    // Student filter
    if (typeof student_id === "string" && student_id.trim() !== "") {
      conditions.push(eq(enrollments.studentId, student_id));
    }
    // Class filter
    if (typeof class_id === "string" && class_id.trim() !== "") {
      const parsedClassId = Number(class_id);
      if (isNaN(parsedClassId)) {
        return res
          .status(400)
          .json({ error: "Invalid class_id", message: "Invalid class_id" });
      }
      conditions.push(eq(enrollments.classId, parsedClassId));
    }

    // Build the SELECT query
    const enrollmentsList = await db
      .select({
        id: enrollments.id,
        enrolledAt: enrollments.enrolledAt,
        updatedAt: enrollments.updatedAt,

        class: {
          id: classes.id,
          name: classes.name,
          inviteCode: classes.inviteCode,
          status: classes.status,
          subjectId: classes.subjectId,
          teacherId: classes.teacherId,
        },

        student: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      })
      .from(enrollments)
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .leftJoin(user, eq(enrollments.studentId, user.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(enrollments.enrolledAt));

    res.json({
      data: enrollmentsList,
      message: "Enrollments retrieved successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch enrollments",
    });
  }
});

// Create enrollment
router.post("/", async (req, res) => {
  try {
    const { student_id, class_id } = req.body;

    // Validate required fields
    if (!student_id || !class_id) {
      return res.status(400).json({
        error: "student_id and class_id are required",
        message: "Missing required enrollment fields",
      });
    }

    const newEnrollment = await db
      .insert(enrollments)
      .values({
        studentId: student_id,
        classId: class_id,
      })
      .returning();

    res.status(201).json({
      data: newEnrollment[0],
      message: "Enrollment created successfully",
    });
  } catch (err) {
    console.error("ERROR in POST /enrollments:", err);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to create enrollment",
    });
  }
});

// Delete enrollment (unenroll/leave class)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedEnrollment = await db
      .delete(enrollments)
      .where(eq(enrollments.id, parseInt(id)))
      .returning();

    if (!deletedEnrollment || deletedEnrollment.length === 0) {
      return res
        .status(404)
        .json({ error: "Enrollment not found", message: "Enrollment not found" });
    }

    res.json({
      data: deletedEnrollment[0],
      message: "Successfully left class",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to delete enrollment",
    });
  }
});

export default router;
