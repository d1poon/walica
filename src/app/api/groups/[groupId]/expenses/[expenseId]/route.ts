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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string; expenseId: string }> }
) {
  const { expenseId } = await params;
  const { description, amount, payerId, splitMemberIds, splitAmounts } = await request.json();

  if (!description || !amount || !payerId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  let splits: { memberId: string; amount: number }[];
  if (splitAmounts && Object.keys(splitAmounts).length > 0) {
    splits = Object.entries(splitAmounts).map(([memberId, amt]) => ({
      memberId,
      amount: Number(amt),
    }));
  } else if (splitMemberIds?.length) {
    const splitAmount = Number(amount) / splitMemberIds.length;
    splits = splitMemberIds.map((memberId: string) => ({ memberId, amount: splitAmount }));
  } else {
    return NextResponse.json({ error: "missing split info" }, { status: 400 });
  }

  // splitを削除してからupdateするため、存在チェックを先に行う
  const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await prisma.expenseSplit.deleteMany({ where: { expenseId } });
  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      description,
      amount: Number(amount),
      payerId,
      splits: { create: splits },
    },
    include: { payer: true, splits: true },
  });

  return NextResponse.json(expense);
}
