import { prisma } from "@/lib/prisma";
import { commandExpiresAt } from "@/lib/mt5/command-ttl";

export async function queueCloseAll(connectionId: string): Promise<void> {
  await prisma.mt5Command.create({
    data: {
      connectionId,
      type: "CLOSE_ALL",
      expiresAt: commandExpiresAt("CLOSE_ALL"),
    },
  });
}
