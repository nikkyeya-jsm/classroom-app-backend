import express from "express";
import { eq, ilike, and, desc, sql } from "drizzle-orm";

import { db } from "#db/index";
import { user } from "#db/schemas";
import type { UserRoles } from "#types";

const router = express.Router();

// Get all users with optional role filter, search by name, and pagination
router.get("/", async (req, res) => {
  try {
    const { role, search, page = 1, limit = 10 } = req.query;

    const filterConditions: any[] = [];

    // Pagination
    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    // Role filter
    if (role) {
      filterConditions.push(eq(user.role, role as UserRoles));
    }

    // Name search
    if (search) {
      filterConditions.push(ilike(user.name, `%${search}%`));
    }

    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    // Count total
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    const usersList = await db
      .select()
      .from(user)
      .where(whereClause)
      .orderBy(desc(user.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: usersList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
      message: "Users retrieved successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch users",
    });
  }
});

// Get user by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const userRecords = await db.select().from(user).where(eq(user.id, id));

    if (!userRecords || userRecords.length === 0) {
      return res
        .status(404)
        .json({ error: "User not found", message: "User not found" });
    }

    res.status(200).json({
      data: userRecords,
      message: "User retrieved successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch user",
    });
  }
});

// Update user
router.put("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const updatedUsers = await db
      .update(user)
      .set({ ...req.body })
      .where(eq(user.id, id))
      .returning();

    if (!updatedUsers || updatedUsers.length === 0) {
      return res
        .status(404)
        .json({ error: "User not found", message: "User not found" });
    }

    res.status(200).json({
      data: updatedUsers,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to update user",
    });
  }
});

// Delete subject
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedUsers = await db
      .delete(user)
      .where(eq(user.id, id))
      .returning();

    if (!deletedUsers || deletedUsers.length === 0) {
      return res
        .status(404)
        .json({ error: "User not found", message: "User not found" });
    }

    res.status(200).json({
      data: deletedUsers[0],
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to delete user",
    });
  }
});

export default router;
