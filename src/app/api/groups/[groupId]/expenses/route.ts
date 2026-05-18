import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
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

  const expense = await prisma.expense.create({
    data: {
      description,
      amount: Number(amount),
      groupId,
      payerId,
      splits: { create: splits },
    },
    include: { payer: true, splits: true },
  });

  return NextResponse.json(expense);
}
