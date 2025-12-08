import express from 'express';
import { db } from '../db/index.js';
import { eq, ilike, or, and, desc, getTableColumns } from 'drizzle-orm';
import { classes, subjects, user, enrollments } from '../db/schema.js';

const router = express.Router();

// Get all classes with subject and teacher info, optional search, filter, and pagination
router.get('/', async (req, res) => {
  try {
    const { searchQuery, subjectId, teacherId, page, limit } = req.query;
    const conditions: any[] = [];

    // Pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const offset = (pageNum - 1) * limitNum;

    // Subject filter
    if (subjectId && typeof subjectId === 'string') {
      conditions.push(eq(classes.subjectId, parseInt(subjectId)));
    }

    // Teacher filter
    if (teacherId && typeof teacherId === 'string') {
      conditions.push(eq(classes.teacherId, teacherId));
    }

    // Search filter
    if (searchQuery && typeof searchQuery === 'string') {
      conditions.push(
        or(
          ilike(classes.name, `%${searchQuery}%`),
        )
      );
    }

    // Build base query with joins
    let query = db
      .select({
        ...getTableColumns(classes),
        subject: subjects,
        teacher: user,
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .$dynamic();

    // Apply conditions if any
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Get total count
    const totalResult = await query;
    const total = totalResult.length;

    // Get paginated results
    const classesList = await query.orderBy(desc(classes.createdAt)).limit(limitNum).offset(offset);
    

    res.json({
      data: classesList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get class by ID with enrolled students
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const classId = parseInt(id);

    // Get class data with subject and teacher
    const classData = await db
     .select({
        ...getTableColumns(classes),
        subject: subjects,
        teacher: user,
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(eq(classes.id, classId));

    if (!classData || classData.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get enrolled students
    const students = await db
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


    res.json([{
      ...classData[0],
      students: students || [],
    }]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new class with auto-generated code
router.post('/', async (req, res) => {
  try {
    const { name, subjectId, teacherId } = req.body;

    // Validate required fields
    if (!name || !subjectId || !teacherId) {
      return res.status(400).json({ error: 'Name, subjectId, and teacherId are required' });
    }

    const newClass = await db
      .insert(classes)
      .values({...req.body})
      .returning();

    res.status(201).json(newClass[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update subject
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, department } = req.body;

    const updatedClass = await db
      .update(classes)
      .set({
        ...req.body
      })
      .where(eq(classes.id, parseInt(id)))
      .returning();

    if (!updatedClass || updatedClass.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json(updatedClass[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete class
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedClass = await db
      .delete(classes)
      .where(eq(classes.id, parseInt(id)))
      .returning();

    if (!deletedClass || deletedClass.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ message: 'Class deleted successfully', class: deletedClass[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
