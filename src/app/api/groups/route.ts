import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const group = await prisma.group.create({
    data: { id: nanoid(12), name: name.trim() },
  });
  return NextResponse.json(group);
}
