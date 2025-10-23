import { checkDatabaseHealth } from "@/lib/init-db";

export async function GET() {
  const health = await checkDatabaseHealth();

  if (!health.healthy) {
    return Response.json(health, { status: 503 });
  }

  return Response.json(health, { status: 200 });
}
