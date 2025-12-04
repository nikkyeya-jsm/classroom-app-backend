import express from 'express';
import { db } from '../db/index.js';
import { eq, ne, inArray, ilike, and } from 'drizzle-orm';
import { user } from '../db/schema.js';
import type { UserRoles } from '@/types.js';


const router = express.Router();

// Get all users with optional role filter and search by name
router.get('/', async (req, res) => {
  try {
    const { roles, searchQuery } = req.query;
    const conditions: any[] = [];

    // Role filter
    if (roles && typeof roles === 'string') {
      const roleArray = roles.split(',').map(role => role.trim()) as UserRoles[];
      conditions.push(inArray(user.role, roleArray));
    } 

    // Name search
    if (searchQuery && typeof searchQuery === 'string') {
      conditions.push(ilike(user.name, `%${searchQuery}%`));
    }

    const users = await db.select().from(user).where(and(...conditions));
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const userData = await db.select().from(user).where(eq(user.id, id));
    if (!userData) return res.status(404).json({ error: 'User not found' });
    res.json(userData[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const updatedUser = await db
      .update(user)
      .set({ ...req.body })
      .where(eq(user.id, id))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
