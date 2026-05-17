import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;

  const hasExpenses = await prisma.expense.findFirst({
    where: { payerId: memberId },
  });
  const hasSplits = await prisma.expenseSplit.findFirst({
    where: { memberId },
  });

  if (hasExpenses || hasSplits) {
    return NextResponse.json(
      { error: "支払いがあるメンバーは削除できません" },
      { status: 400 }
    );
  }

  await prisma.member.delete({ where: { id: memberId } });
  return NextResponse.json({ ok: true });
}
