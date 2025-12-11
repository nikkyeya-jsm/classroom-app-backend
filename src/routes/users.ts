import express from "express";
import { db } from "../db/index.js";
import { eq, inArray, ilike, and, desc } from "drizzle-orm";
import { user } from "../db/schemas/auth.js";
import type { UserRoles } from "@/types.js";

const router = express.Router();

// Get all users with optional role filter, search by name, and pagination
router.get("/", async (req, res) => {
  try {
    const { roles, query, page, limit } = req.query;
    const conditions: any[] = [];

    // Pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const offset = (pageNum - 1) * limitNum;

    // Role filter
    if (roles && typeof roles === "string") {
      const roleArray = roles
        .split(",")
        .map((role) => role.trim()) as UserRoles[];
      conditions.push(inArray(user.role, roleArray));
    }

    // Name search
    if (query && typeof query === "string") {
      conditions.push(ilike(user.name, `%${query}%`));
    }

    // Get total count
    const totalResult = await db
      .select()
      .from(user)
      .where(and(...conditions));
    const total = totalResult.length;

    // Get paginated results
    const users = await db
      .select()
      .from(user)
      .where(and(...conditions))
      .orderBy(desc(user.createdAt))
      .limit(limitNum)
      .offset(offset);

    res.json({
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const userData = await db.select().from(user).where(eq(user.id, id));
    if (!userData) return res.status(404).json({ error: "User not found" });

    res.json(userData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user
router.put("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const updatedUser = await db
      .update(user)
      .set({ ...req.body })
      .where(eq(user.id, id))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Updated user:", updatedUser);

    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete subject
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedUser = await db
      .delete(user)
      .where(eq(user.id, id))
      .returning();

    if (!deletedUser || deletedUser.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully", user: deletedUser[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
