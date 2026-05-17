import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const { description, amount, payerId, splitMemberIds } = await request.json();

  if (!description || !amount || !payerId || !splitMemberIds?.length) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const splitAmount = amount / splitMemberIds.length;

  const expense = await prisma.expense.create({
    data: {
      description,
      amount: Number(amount),
      groupId,
      payerId,
      splits: {
        create: splitMemberIds.map((memberId: string) => ({
          memberId,
          amount: splitAmount,
        })),
      },
    },
    include: { payer: true, splits: true },
  });

  return NextResponse.json(expense);
}
