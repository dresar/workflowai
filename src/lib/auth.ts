// Simple dummy auth store using localStorage.
// Designed so it can be swapped for a real backend later.

export type Role = "admin" | "user";

export interface AuthUser {
  email: string;
  name: string;
  role: Role;
}

const KEY = "wf.auth";

const DUMMY_USERS: Array<AuthUser & { password: string }> = [
  { email: "admin@app.com", password: "admin123", name: "Admin Utama", role: "admin" },
  { email: "user@app.com", password: "user123", name: "Rafi Pratama", role: "user" },
];

export function signIn(email: string, password: string): AuthUser | null {
  const found = DUMMY_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
  if (!found) {
    // Fallback: any email containing "admin" becomes admin, else user.
    if (email && password) {
      const role: Role = email.toLowerCase().includes("admin") ? "admin" : "user";
      const user: AuthUser = { email, name: email.split("@")[0] ?? "Pengguna", role };
      persist(user);
      return user;
    }
    return null;
  }
  const { password: _p, ...user } = found;
  persist(user);
  return user;
}

export function signOut() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
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
