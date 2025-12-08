import { db } from '../db/index.js';
import { classes } from '../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Generate a random 6-character alphanumeric code (uppercase)
 */
function generateRandomCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

/**
 * Check if an invite code already exists in the database
 */
async function codeExists(code: string): Promise<boolean> {
  const result = await db.select().from(classes).where(eq(classes.inviteCode, code));
  return result.length > 0;
}

/**
 * Generate a unique 6-character class code
 * Retries if code already exists (very unlikely)
 */
export async function generateUniqueClassCode(): Promise<string> {
  let code: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    code = generateRandomCode();
    attempts++;

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique class code after multiple attempts');
    }
  } while (await codeExists(code));

  return code;
}
