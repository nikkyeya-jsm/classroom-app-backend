// Type definitions for Refine Dev compatibility
export type AuthActionResponse = {
  success: boolean;
  redirectTo?: string;
  error?: Error;
  [key: string]: unknown;
};

export type RegisterRequest = {
  email: string;
  password: string;
  fullName: string;
  role: "admin" | "teacher" | "student";
  avatarUrl?: string;
  department?: string;
}