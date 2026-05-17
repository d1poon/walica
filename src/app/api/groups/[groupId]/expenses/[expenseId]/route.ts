import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ groupId: string; expenseId: string }> }
) {
  const { expenseId } = await params;
  await prisma.expenseSplit.deleteMany({ where: { expenseId } });
  await prisma.expense.delete({ where: { id: expenseId } });
  return NextResponse.json({ ok: true });
}
