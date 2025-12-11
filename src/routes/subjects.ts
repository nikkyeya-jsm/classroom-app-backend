import express from "express";
import { eq, ilike, or, and, desc, sql } from "drizzle-orm";

import { db } from "#db/index";
import { subjects } from "#db/schemas";

const router = express.Router();

// Get all subjects with optional search, department filter, and pagination
router.get("/", async (req, res) => {
  try {
    const { search, department, page = 1, limit = 10 } = req.query;

    // Pagination (validated)
    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    // Build conditions (typed)
    const filterConditions: (ReturnType<typeof eq> | ReturnType<typeof or>)[] =
      [];

    if (department) {
      filterConditions.push(eq(subjects.department, department.toString()));
    }

    if (search) {
      filterConditions.push(
        or(
          ilike(subjects.name, `%${search}%`),
          ilike(subjects.code, `%${search}%`)
        )
      );
    }

    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    // Count total (fast!)
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    // Fetch paginated results
    const subjectsList = await db
      .select()
      .from(subjects)
      .where(whereClause)
      .orderBy(desc(subjects.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: subjectsList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
      message: "Subjects retrieved successfully",
    });
  } catch (error) {
    console.error("GET /subjects error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch subjects",
    });
  }
});

// Get subject by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const subjectRecords = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, +id));

    if (!subjectRecords || subjectRecords.length === 0) {
      return res
        .status(404)
        .json({ error: "Subject not found", message: "Subject not found" });
    }

    res.status(200).json({
      data: subjectRecords,
      message: "Subject retrieved successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch subject",
    });
  }
});

// Create new subject
router.post("/", async (req, res) => {
  try {
    const { name, code, description, department } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({
        error: "Name and code are required",
        message: "Missing required subject fields",
      });
    }

    const newSubject = await db
      .insert(subjects)
      .values({
        name,
        code,
        description,
        department,
      })
      .returning();

    res.status(201).json({
      data: newSubject[0],
      message: "Subject created successfully",
    });
  } catch (error: any) {
    console.error(error);

    // Handle unique constraint violation (duplicate code)
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Subject code already exists",
        message: "Subject code already exists",
      });
    }

    res.status(500).json({
      error: "Internal server error",
      message: "Failed to create subject",
    });
  }
});

// Update subject
router.put("/:id", async (req, res) => {
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
      .where(eq(subjects.id, +id))
      .returning();

    if (!updatedSubject || updatedSubject.length === 0) {
      return res
        .status(404)
        .json({ error: "Subject not found", message: "Subject not found" });
    }

    res.status(200).json({
      data: updatedSubject[0],
      message: "Subject updated successfully",
    });
  } catch (error: any) {
    console.error(error);

    // Handle unique constraint violation (duplicate code)
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Subject code already exists",
        message: "Subject code already exists",
      });
    }

    res.status(500).json({
      error: "Internal server error",
      message: "Failed to update subject",
    });
  }
});

// Delete subject
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSubject = await db
      .delete(subjects)
      .where(eq(subjects.id, +id))
      .returning();

    if (!deletedSubject || deletedSubject.length === 0) {
      return res
        .status(404)
        .json({ error: "Subject not found", message: "Subject not found" });
    }

    res.status(200).json({
      data: deletedSubject[0],
      message: "Subject deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to delete subject",
    });
  }
});

export default router;
