import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";

// Mapa de clientes conectados por tenantId
const clients = new Map<string, Set<ReadableStreamDefaultController>>();

export function notifyTenant(tenantId: string, data: unknown) {
  const tenantClients = clients.get(tenantId);
  if (!tenantClients) return;

  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const controller of tenantClients) {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch {
      tenantClients.delete(controller);
    }
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const tenant = await getCurrentTenant();
  if (!tenant) return new Response("Tenant not found", { status: 404 });

  const tenantId = tenant.id;
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(c) {
      controller = c;

      if (!clients.has(tenantId)) clients.set(tenantId, new Set());
      clients.get(tenantId)!.add(controller);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        clients.get(tenantId)?.delete(controller);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
