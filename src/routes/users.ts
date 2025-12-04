import express from 'express';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { user } from '../db/schema';


const router = express.Router();

// Get user
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
