import express from 'express';
import { db } from '../db/index.js';
import { eq, ilike, or, and, desc, getTableColumns } from 'drizzle-orm';
import { classes, subjects, user, enrollments } from '../db/schema.js';
import { generateUniqueClassCode } from '../utils/generateClassCode.js';

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
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
        },
        teacher: {
          id: user.id,
          name: user.name,
        },
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

// Get subject by ID
router.get('/:id', async (req, res) => {


  try {
    const { id } = req.params;
    const classData = await db
      .select()
      .from(classes)
      .where(eq(classes.id, parseInt(id)));

    if (!classData || classData.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

      console.log("Fetching class data:", classData);

    res.json(classData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new class with auto-generated code
router.post('/', async (req, res) => {
  try {
    const { name, subjectId, teacherId, description, capacity, schedules } = req.body;

    // Validate required fields
    if (!name || !subjectId || !teacherId) {
      return res.status(400).json({ error: 'Name, subjectId, and teacherId are required' });
    }

    // Generate unique class invite code
    const inviteCode = await generateUniqueClassCode();

    const newClass = await db
      .insert(classes)
      .values({
        name,
        inviteCode,
        subjectId,
        teacherId,
        description: description || null,
        capacity: capacity || 50,
        schedules: schedules || [],
      })
      .returning();

    res.status(201).json(newClass[0]);
  } catch (err: any) {
    console.error(err);

    // Handle unique constraint violation (duplicate code)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Class code already exists' });
    }

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

    // Handle unique constraint violation (duplicate code)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Subject code already exists' });
    }

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

// Regenerate class code
router.post('/:id/regenerate-code', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if class exists
    const existingClass = await db
      .select()
      .from(classes)
      .where(eq(classes.id, parseInt(id)));

    if (!existingClass || existingClass.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Generate new unique code
    const newCode = await generateUniqueClassCode();

    // Update class with new invite code
    const updatedClass = await db
      .update(classes)
      .set({ inviteCode: newCode })
      .where(eq(classes.id, parseInt(id)))
      .returning();

    res.json({
      message: 'Class invite code regenerated successfully',
      inviteCode: updatedClass[0]?.inviteCode,
      class: updatedClass[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join class by invite code
router.post('/join', async (req, res) => {
  try {
    const { inviteCode, studentId } = req.body;

    // Validate required fields
    if (!inviteCode || !studentId) {
      return res.status(400).json({ error: 'inviteCode and studentId are required' });
    }

    // Find class by invite code
    const classToJoin = await db
      .select()
      .from(classes)
      .where(eq(classes.inviteCode, inviteCode.toUpperCase()));

    if (!classToJoin || classToJoin.length === 0) {
      return res.status(404).json({ error: 'Invalid class code' });
    }

    const classData = classToJoin[0];

    if (!classData) {
      return res.status(404).json({ error: 'Invalid class code' });
    }

    // Check if class is active
    if (classData.status !== 'active') {
      return res.status(400).json({ error: 'This class is not accepting new students' });
    }

    // Check if student is already enrolled
    const existingEnrollment = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.classId, classData.id),
          eq(enrollments.studentId, studentId)
        )
      );

    if (existingEnrollment && existingEnrollment.length > 0) {
      return res.status(409).json({ error: 'You are already enrolled in this class' });
    }

    // Check class capacity
    const currentEnrollments = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.classId, classData.id));

    if (currentEnrollments.length >= (classData.capacity || 50)) {
      return res.status(400).json({ error: 'This class is full' });
    }

    // Enroll student
    const newEnrollment = await db
      .insert(enrollments)
      .values({
        studentId,
        classId: classData.id,
      })
      .returning();

    res.status(201).json({
      message: 'Successfully joined class',
      enrollment: newEnrollment[0],
      class: classData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
