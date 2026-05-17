import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (group.closedAt) return NextResponse.json({ error: "already closed" }, { status: 400 });

  const updated = await prisma.group.update({
    where: { id: groupId },
    data: { closedAt: new Date() },
  });
  return NextResponse.json(updated);
}
