import express from "express";
import { db } from "../db/index.js";
import { eq, ilike, or, and, desc, sql } from "drizzle-orm";
import { subjects } from "../db/schemas/app.js";

const router = express.Router();

// Get all subjects with optional search, department filter, and pagination
router.get("/", async (req, res) => {
  try {
    const { query, department, page = "1", limit = "10" } = req.query;

    // Pagination (validated)
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const offset = (pageNum - 1) * limitNum;

    // Build conditions (typed)
    const conditions: (ReturnType<typeof eq> | ReturnType<typeof or>)[] = [];

    if (typeof department === "string" && department.trim() !== "") {
      conditions.push(eq(subjects.department, department));
    }

    if (typeof query === "string" && query.trim() !== "") {
      conditions.push(
        or(
          ilike(subjects.name, `%${query}%`),
          ilike(subjects.code, `%${query}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total (fast!)
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .where(whereClause);

    const count = result[0]?.count ?? 0;

    // Fetch paginated results
    const subjectsList = await db
      .select()
      .from(subjects)
      .where(whereClause)
      .orderBy(desc(subjects.createdAt))
      .limit(limitNum)
      .offset(offset);

    res.json({
      data: subjectsList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limitNum),
      },
    });
  } catch (err) {
    console.error("GET /subjects error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get subject by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, parseInt(id)));

    if (!subject || subject.length === 0) {
      return res.status(404).json({ error: "Subject not found" });
    }

    res.json(subject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new subject
router.post("/", async (req, res) => {
  try {
    const { name, code, description, department } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({ error: "Name and code are required" });
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
    if (err.code === "23505") {
      return res.status(409).json({ error: "Subject code already exists" });
    }

    res.status(500).json({ error: "Internal server error" });
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
      .where(eq(subjects.id, parseInt(id)))
      .returning();

    if (!updatedSubject || updatedSubject.length === 0) {
      return res.status(404).json({ error: "Subject not found" });
    }

    res.json(updatedSubject[0]);
  } catch (err: any) {
    console.error(err);

    // Handle unique constraint violation (duplicate code)
    if (err.code === "23505") {
      return res.status(409).json({ error: "Subject code already exists" });
    }

    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete subject
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSubject = await db
      .delete(subjects)
      .where(eq(subjects.id, parseInt(id)))
      .returning();

    if (!deletedSubject || deletedSubject.length === 0) {
      return res.status(404).json({ error: "Subject not found" });
    }

    res.json({
      message: "Subject deleted successfully",
      subject: deletedSubject[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
