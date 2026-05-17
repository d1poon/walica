import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return NextResponse.json({ error: "not found" }, { status: 404 });

  const pokemonId = Math.floor(Math.random() * 151) + 1;
  const member = await prisma.member.create({
    data: { name: name.trim(), groupId, pokemonId },
  });
  return NextResponse.json(member);
}
