export type Balance = { memberId: string; name: string; amount: number };
export type Transfer = { from: string; to: string; amount: number };

export function calcSettlement(balances: Balance[]): Transfer[] {
  const creditors = balances
    .filter((b) => b.amount > 0.01)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = balances
    .filter((b) => b.amount < -0.01)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.amount - b.amount);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const amount = Math.min(credit.amount, -debt.amount);
    transfers.push({
      from: debt.name,
      to: credit.name,
      amount: Math.round(amount),
    });
    credit.amount -= amount;
    debt.amount += amount;
    if (credit.amount < 0.01) ci++;
    if (debt.amount > -0.01) di++;
  }

  return transfers;
}
