import { env } from "cloudflare:workers";

const COOKIE_NAME = "pagos_admin";
const COOKIE_MAX_AGE = 60 * 60 * 8;

function adminPassword() {
  return (env as unknown as { ADMIN_PASSWORD?: string }).ADMIN_PASSWORD ?? "";
}

async function sessionToken() {
  const bytes = new TextEncoder().encode(`portal-pagos:${adminPassword()}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function isAdmin(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const value = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  return Boolean(adminPassword()) && value === await sessionToken();
}

export async function requireAdmin(request: Request) {
  if (await isAdmin(request)) return null;
  return Response.json({ error: "Debes ingresar como administrador." }, { status: 401 });
}

export async function createAdminCookie() {
  return `${COOKIE_NAME}=${await sessionToken()}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`;
}

export function clearAdminCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function passwordMatches(value: string) {
  const expected = adminPassword();
  if (!expected || value.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index++) difference |= value.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}
