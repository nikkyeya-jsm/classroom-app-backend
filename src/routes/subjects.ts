import express from 'express';
import { db } from '../db/index.js';
import { eq, ilike, or, and } from 'drizzle-orm';
import { subjects } from '../db/schema.js';

const router = express.Router();

// Get all subjects with optional search and department filter
router.get('/', async (req, res) => {
  try {
    const { searchQuery, department } = req.query;
    const conditions: any[] = [];

    // Department filter
    if (department && typeof department === 'string') {
      conditions.push(eq(subjects.department, department));
    }

    // Search filter
    if (searchQuery && typeof searchQuery === 'string') {
      conditions.push(
        or(
          ilike(subjects.name, `%${searchQuery}%`),
          ilike(subjects.code, `%${searchQuery}%`),
        )
      );
    }

    const subjectsList = conditions.length > 0
      ? await db.select().from(subjects).where(and(...conditions))
      : await db.select().from(subjects);

    res.json(subjectsList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get subject by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, parseInt(id)));

    if (!subject || subject.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(subject[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new subject
router.post('/', async (req, res) => {
  try {
    const { name, code, description, department } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    const newSubject = await db
      .insert(subjects)
      .values({
        name,
        code,
        description: description || null,
        department: department || null,
      })
      .returning();

    res.status(201).json(newSubject[0]);
  } catch (err: any) {
    console.error(err);

    // Handle unique constraint violation (duplicate code)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Subject code already exists' });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update subject
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, department } = req.body;

    const updatedSubject = await db
      .update(subjects)
      .set({
        name,
        code,
        description,
        department,
      })
      .where(eq(subjects.id, parseInt(id)))
      .returning();

    if (!updatedSubject || updatedSubject.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(updatedSubject[0]);
  } catch (err: any) {
    console.error(err);

    // Handle unique constraint violation (duplicate code)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Subject code already exists' });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete subject
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSubject = await db
      .delete(subjects)
      .where(eq(subjects.id, parseInt(id)))
      .returning();

    if (!deletedSubject || deletedSubject.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({ message: 'Subject deleted successfully', subject: deletedSubject[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
