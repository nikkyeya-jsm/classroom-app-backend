import express from 'express';
import { db } from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { enrollments, classes, user } from '../db/schema.js';

const router = express.Router();

// Get enrollments with filters
router.get('/', async (req, res) => {
  try {
    const { studentId, classId } = req.query;
    const conditions: any[] = [];

    // Filter by student
    if (studentId && typeof studentId === 'string') {
      conditions.push(eq(enrollments.studentId, studentId));
    }

    // Filter by class
    if (classId && typeof classId === 'string') {
      conditions.push(eq(enrollments.classId, parseInt(classId)));
    }

    // Get enrollments with class and student info
    const enrollmentsList = conditions.length > 0
      ? await db
          .select({
            id: enrollments.id,
            studentId: enrollments.studentId,
            classId: enrollments.classId,
            enrolledAt: enrollments.enrolledAt,
            updatedAt: enrollments.updatedAt,
            class: classes,
            student: user,
          })
          .from(enrollments)
          .leftJoin(classes, eq(enrollments.classId, classes.id))
          .leftJoin(user, eq(enrollments.studentId, user.id))
          .where(and(...conditions))
          .orderBy(desc(enrollments.enrolledAt))
      : await db
          .select({
            id: enrollments.id,
            studentId: enrollments.studentId,
            classId: enrollments.classId,
            enrolledAt: enrollments.enrolledAt,
            updatedAt: enrollments.updatedAt,
            class: classes,
            student: user,
          })
          .from(enrollments)
          .leftJoin(classes, eq(enrollments.classId, classes.id))
          .leftJoin(user, eq(enrollments.studentId, user.id))
          .orderBy(desc(enrollments.enrolledAt));

    res.json(enrollmentsList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create enrollment
router.post('/', async (req, res) => {
  try {
    const { studentId, classId } = req.body;

    // Validate required fields
    if (!studentId || !classId) {
      console.log("Missing required fields - studentId:", studentId, "classId:", classId);
      return res.status(400).json({ error: 'studentId and classId are required' });
    }

    const newEnrollment = await db
      .insert(enrollments)
      .values({
        studentId,
        classId,
      })
      .returning();

    res.status(201).json(newEnrollment[0]);
  } catch (err) {
    console.error("ERROR in POST /enrollments:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete enrollment (unenroll/leave class)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedEnrollment = await db
      .delete(enrollments)
      .where(eq(enrollments.id, parseInt(id)))
      .returning();

    if (!deletedEnrollment || deletedEnrollment.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json({
      message: 'Successfully left class',
      enrollment: deletedEnrollment[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
