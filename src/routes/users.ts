import express from 'express';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { user } from '../db/schema'; // Adjust the path if your users table is defined elsewhere

const router = express.Router();

// GET /users → fetch all users
// router.get('/', async (req, res) => {
//   try {
//     const allUsers = await db.select().from(user);
//     res.json(allUsers);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// GET /users/:id → fetch one user
// router.get('/:id', async (req, res) => {
//   const { id } = req.params;
//   try {
//     const userData = await db.select().from(user).where(eq(user.id, id));
//     if (!userData) return res.status(404).json({ error: 'User not found' });
//     res.json(userData[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });


export default router;
