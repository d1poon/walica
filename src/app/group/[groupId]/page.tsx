"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { calcSettlement } from "@/lib/settlement";

type Member = { id: string; name: string };
type ExpenseSplit = { memberId: string; amount: number };
type Expense = {
  id: string;
  description: string;
  amount: number;
  payer: Member;
  splits: ExpenseSplit[];
  createdAt: string;
};
type GroupData = {
  id: string;
  name: string;
  members: Member[];
  expenses: Expense[];
};

export default function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<GroupData | null>(null);
  const [myName, setMyName] = useState("");
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [tab, setTab] = useState<"expenses" | "settlement">("expenses");
  const [copied, setCopied] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Add expense form
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expPayerId, setExpPayerId] = useState("");
  const [expSplitIds, setExpSplitIds] = useState<string[]>([]);
  const [addingExp, setAddingExp] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);

  const storageKey = `warikan-member-${groupId}`;

  const fetchGroup = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}`);
    if (res.status === 404) { setNotFound(true); return; }
    const data = await res.json();
    setGroup(data);
  }, [groupId]);

  useEffect(() => {
    fetchGroup();
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const { id, name } = JSON.parse(saved);
      setMyMemberId(id);
      setMyName(name);
    }
  }, [fetchGroup, storageKey]);

  // Auto-select all members for split when members change
  useEffect(() => {
    if (group) setExpSplitIds(group.members.map((m) => m.id));
  }, [group?.members.length]);

  async function joinGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput.trim() }),
    });
    const member = await res.json();
    localStorage.setItem(storageKey, JSON.stringify({ id: member.id, name: member.name }));
    setMyMemberId(member.id);
    setMyName(member.name);
    fetchGroup();
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expDesc || !expAmount || !expPayerId || expSplitIds.length === 0) return;
    setAddingExp(true);
    await fetch(`/api/groups/${groupId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: expDesc,
        amount: Number(expAmount),
        payerId: expPayerId,
        splitMemberIds: expSplitIds,
      }),
    });
    setExpDesc("");
    setExpAmount("");
    setExpPayerId("");
    setShowExpForm(false);
    setAddingExp(false);
    fetchGroup();
  }

  async function deleteExpense(expenseId: string) {
    await fetch(`/api/groups/${groupId}/expenses/${expenseId}`, { method: "DELETE" });
    fetchGroup();
  }

  function copyUrl() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleSplit(memberId: string) {
    setExpSplitIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">🤔</div>
          <p>グループが見つかりませんでした</p>
          <a href="/" className="text-emerald-500 underline mt-4 block">トップへ戻る</a>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">読み込み中...</div>
      </div>
    );
  }

  // Calculate balances for settlement
  const balances = group.members.map((m) => {
    const paid = group.expenses
      .filter((e) => e.payer.id === m.id)
      .reduce((s, e) => s + e.amount, 0);
    const owed = group.expenses
      .flatMap((e) => e.splits)
      .filter((s) => s.memberId === m.id)
      .reduce((s, sp) => s + sp.amount, 0);
    return { memberId: m.id, name: m.name, amount: paid - owed };
  });
  const transfers = calcSettlement(balances);

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto px-4 pb-8">
      {/* Header */}
      <div className="pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-800">{group.name}</h1>
          <button
            onClick={copyUrl}
            className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-medium"
          >
            {copied ? "コピーした!" : "URLをコピー"}
          </button>
        </div>
        <p className="text-xs text-gray-400">このURLを友達にLINEで送ろう</p>
      </div>

      {/* Join section */}
      {!myMemberId ? (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <p className="font-medium text-gray-700 mb-3">あなたの名前を入力して参加</p>
          <form onSubmit={joinGroup} className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="名前"
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              maxLength={20}
              required
            />
            <button
              type="submit"
              className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold"
            >
              参加
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-emerald-50 rounded-2xl px-4 py-2 mb-4 text-sm text-emerald-700 font-medium">
          ✓ {myName} として参加中
        </div>
      )}

      {/* Members */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">メンバー</p>
        <div className="flex flex-wrap gap-2">
          {group.members.map((m) => (
            <span
              key={m.id}
              className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full"
            >
              {m.name}
            </span>
          ))}
          {group.members.length === 0 && (
            <span className="text-gray-400 text-sm">まだ誰もいません</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-200 rounded-xl p-1 mb-4">
        <button
          onClick={() => setTab("expenses")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === "expenses" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
          }`}
        >
          支払い一覧
        </button>
        <button
          onClick={() => setTab("settlement")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === "settlement" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
          }`}
        >
          精算
        </button>
      </div>

      {/* Expenses tab */}
      {tab === "expenses" && (
        <div className="space-y-3">
          {myMemberId && (
            <button
              onClick={() => setShowExpForm(!showExpForm)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              {showExpForm ? "キャンセル" : "+ 支払いを追加"}
            </button>
          )}

          {/* Add expense form */}
          {showExpForm && myMemberId && (
            <form
              onSubmit={addExpense}
              className="bg-white rounded-2xl shadow-sm p-5 space-y-4"
            >
              <p className="font-semibold text-gray-700">支払いを追加</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">内容</label>
                <input
                  type="text"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="例：居酒屋、ランチ"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">金額（円）</label>
                <input
                  type="number"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="0"
                  min="1"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">支払った人</label>
                <select
                  value={expPayerId}
                  onChange={(e) => setExpPayerId(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
                >
                  <option value="">選んでください</option>
                  {group.members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">割り勘メンバー</label>
                <div className="flex flex-wrap gap-2">
                  {group.members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleSplit(m.id)}
                      className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                        expSplitIds.includes(m.id)
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-white text-gray-600 border-gray-300"
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
                {expSplitIds.length > 0 && expAmount && (
                  <p className="text-xs text-gray-400 mt-1">
                    1人あたり ¥{Math.ceil(Number(expAmount) / expSplitIds.length).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={addingExp}
                className="w-full bg-emerald-500 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl text-sm"
              >
                {addingExp ? "追加中..." : "追加する"}
              </button>
            </form>
          )}

          {/* Expense list */}
          {group.expenses.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">
              まだ支払いがありません
            </div>
          ) : (
            group.expenses.map((exp) => (
              <div key={exp.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">{exp.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {exp.payer.name}が支払い・{exp.splits.length}人で割り勘
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">¥{exp.amount.toLocaleString()}</p>
                    {exp.payer.id === myMemberId && (
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="text-xs text-red-400 hover:text-red-600 mt-1"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Settlement tab */}
      {tab === "settlement" && (
        <div className="space-y-3">
          {/* Balance summary */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">残高</p>
            {balances.map((b) => (
              <div key={b.memberId} className="flex justify-between items-center py-1.5 border-b last:border-0">
                <span className="text-sm text-gray-700">{b.name}</span>
                <span
                  className={`text-sm font-bold ${
                    b.amount > 0 ? "text-emerald-600" : b.amount < 0 ? "text-red-500" : "text-gray-400"
                  }`}
                >
                  {b.amount > 0 ? "+" : ""}
                  ¥{Math.round(b.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Transfers */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">精算方法</p>
            {transfers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">精算は不要です ✓</p>
            ) : (
              transfers.map((t, i) => (
                <div key={i} className="flex items-center gap-2 py-2 border-b last:border-0">
                  <span className="text-sm font-medium text-red-500">{t.from}</span>
                  <span className="text-gray-400 text-sm">→</span>
                  <span className="text-sm font-medium text-emerald-600">{t.to}</span>
                  <span className="ml-auto text-sm font-bold text-gray-800">
                    ¥{t.amount.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
