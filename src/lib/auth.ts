import { api } from "./api";

export type Role = "admin" | "user";

export interface AuthUser {
  email: string;
  name: string;
  role: Role;
}

const KEY = "wf.auth";

export async function signIn(email: string, password: string): Promise<AuthUser | null> {
  try {
    const result = await api.auth.login({ email, password });
    if (result && result.accessToken) {
      if (typeof window !== "undefined") {
        localStorage.setItem("wf.token", result.accessToken);
        localStorage.setItem("wf.refresh_token", result.refreshToken);
      }
      persist(result.user);
      return result.user;
    }
  } catch (err) {
    console.error("Sign in failed:", err);
  }
  return null;
}

export async function signUp(name: string, email: string, password: string): Promise<AuthUser | null> {
  try {
    const result = await api.auth.register({ name, email, password });
    if (result && result.accessToken) {
      if (typeof window !== "undefined") {
        localStorage.setItem("wf.token", result.accessToken);
        localStorage.setItem("wf.refresh_token", result.refreshToken);
      }
      persist(result.user);
      return result.user;
    }
  } catch (err) {
    console.error("Sign up failed:", err);
    throw err;
  }
  return null;
}

export function signOut() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEY);
    localStorage.removeItem("wf.token");
    localStorage.removeItem("wf.refresh_token");
    localStorage.removeItem("active_project_id");
  }
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function persist(u: AuthUser) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(u));
}
