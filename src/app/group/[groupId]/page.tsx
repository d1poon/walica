"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { calcSettlement } from "@/lib/settlement";
import { getPokemonSprite, getPokeballSprite } from "@/lib/pokemon";

type Member = { id: string; name: string; pokemonId: number };
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
  closedAt: string | null;
  members: Member[];
  expenses: Expense[];
};

export default function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<GroupData | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [tab, setTab] = useState<"expenses" | "settlement">("expenses");
  const [copied, setCopied] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expPayerId, setExpPayerId] = useState("");
  const [expSplitIds, setExpSplitIds] = useState<string[]>([]);
  const [customSplitMode, setCustomSplitMode] = useState(false);
  const [customAmounts, setCustomAmounts] = useState<{ [memberId: string]: string }>({});
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [addingExp, setAddingExp] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);
  const [closeStep, setCloseStep] = useState<0 | 1 | 2>(0);
  const [countdown, setCountdown] = useState(3);
  const [countingDown, setCountingDown] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "amount">("newest");
  const [filterPayerId, setFilterPayerId] = useState<string | null>(null);

  const fetchGroup = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}`);
    if (res.status === 404) { setNotFound(true); return; }
    const data = await res.json();
    setGroup(data);
  }, [groupId]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  useEffect(() => {
    if (group) setExpSplitIds(group.members.map((m) => m.id));
  }, [group?.members.length]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!nameInput.trim()) return;
    await fetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput.trim() }),
    });
    setNameInput("");
    fetchGroup();
  }

  async function deleteMember(memberId: string) {
    const res = await fetch(`/api/groups/${groupId}/members/${memberId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error);
      return;
    }
    fetchGroup();
  }

  function cancelExpForm() {
    setShowExpForm(false);
    setEditingExpenseId(null);
    setExpDesc("");
    setExpAmount("");
    setExpPayerId("");
    setExpSplitIds(group?.members.map((m) => m.id) ?? []);
    setCustomSplitMode(false);
    setCustomAmounts({});
  }

  function openEditForm(exp: Expense) {
    setExpDesc(exp.description);
    setExpAmount(String(exp.amount));
    setExpPayerId(exp.payer.id);
    setExpSplitIds(exp.splits.map((s) => s.memberId));

    const equalAmount = exp.amount / exp.splits.length;
    const isEqual = exp.splits.every((s) => Math.abs(s.amount - equalAmount) < 0.01);
    if (!isEqual) {
      setCustomSplitMode(true);
      const amounts: { [id: string]: string } = {};
      exp.splits.forEach((s) => { amounts[s.memberId] = String(Math.round(s.amount)); });
      setCustomAmounts(amounts);
    } else {
      setCustomSplitMode(false);
      setCustomAmounts({});
    }

    setEditingExpenseId(exp.id);
    setShowExpForm(true);
  }

  async function submitExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expDesc || !expAmount || !expPayerId || expSplitIds.length === 0) return;

    if (customSplitMode) {
      const total = expSplitIds.reduce((s, id) => s + Number(customAmounts[id] ?? 0), 0);
      if (Math.abs(total - Number(expAmount)) > 0.5) {
        alert(`金額の合計が一致しません（合計: ¥${total.toLocaleString()} / 請求額: ¥${Number(expAmount).toLocaleString()}）`);
        return;
      }
    }

    setAddingExp(true);

    const body = customSplitMode
      ? {
          description: expDesc,
          amount: Number(expAmount),
          payerId: expPayerId,
          splitAmounts: Object.fromEntries(
            expSplitIds.map((id) => [id, Number(customAmounts[id] ?? 0)])
          ),
        }
      : {
          description: expDesc,
          amount: Number(expAmount),
          payerId: expPayerId,
          splitMemberIds: expSplitIds,
        };

    const url = editingExpenseId
      ? `/api/groups/${groupId}/expenses/${editingExpenseId}`
      : `/api/groups/${groupId}/expenses`;

    await fetch(url, {
      method: editingExpenseId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    cancelExpForm();
    setAddingExp(false);
    fetchGroup();
  }

  function startCountdown() {
    setCountdown(3);
    setCountingDown(true);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCountingDown(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function closeGroup() {
    await fetch(`/api/groups/${groupId}/close`, { method: "POST" });
    setCloseStep(0);
    fetchGroup();
  }

  function copySettlement() {
    const lines = transfers.map((t) => `${t.from} → ${t.to}　¥${t.amount.toLocaleString()}`);
    const text = `【${group!.name}・精算結果】\n${lines.join("\n")}`;
    navigator.clipboard.writeText(text);
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

  const isClosed = !!group.closedAt;
  const balances = group.members.map((m) => {
    const paid = group.expenses.filter((e) => e.payer.id === m.id).reduce((s, e) => s + e.amount, 0);
    const owed = group.expenses.flatMap((e) => e.splits).filter((s) => s.memberId === m.id).reduce((s, sp) => s + sp.amount, 0);
    return { memberId: m.id, name: m.name, pokemonId: m.pokemonId, amount: paid - owed };
  });
  const transfers = calcSettlement(balances);
  const totalExpense = group.expenses.reduce((s, e) => s + e.amount, 0);
  const customTotal = expSplitIds.reduce((s, id) => s + Number(customAmounts[id] ?? 0), 0);
  const displayedExpenses = group.expenses
    .filter((e) => filterPayerId === null || e.payer.id === filterPayerId)
    .sort((a, b) => {
      if (sortOrder === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortOrder === "amount") return b.amount - a.amount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto px-4 pb-8">
      {/* Header */}
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-3">{group.name}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => window.open(`https://line.me/R/msg/text/?${encodeURIComponent(`${group.name}のわりかん！\n${window.location.href}`)}`, "_blank")}
            className="flex-1 text-sm bg-[#06C755] text-white px-3 py-2 rounded-xl font-bold"
          >
            LINEで送る
          </button>
          <button onClick={copyUrl} className="text-sm bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl font-medium whitespace-nowrap">
            {copied ? "コピーした!" : "URLをコピー"}
          </button>
        </div>
      </div>

      {isClosed && (
        <div className="bg-gray-800 text-white rounded-2xl px-4 py-3 mb-4 text-sm font-medium text-center">
          ✓ このグループは精算確定済みです
        </div>
      )}

      {/* Members */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">メンバー</p>
        <div className="flex flex-wrap gap-3 mb-3">
          {group.members.map((m) => (
            <div key={m.id} className="flex flex-col items-center gap-1 relative">
              <div className="relative w-12 h-12">
                <img src={getPokeballSprite()} alt="" className="absolute inset-0 w-full h-full object-contain opacity-40" />
                <img src={getPokemonSprite(m.pokemonId)} alt={m.name} className="relative z-10 w-full h-full pixelated" />
              </div>
              <span className="text-xs text-gray-700 font-medium">{m.name}</span>
              {!isClosed && (
                <button
                  onClick={() => deleteMember(m.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-gray-300 hover:bg-red-400 text-white rounded-full text-xs flex items-center justify-center leading-none"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {group.members.length === 0 && (
            <span className="text-gray-400 text-sm">まだ誰もいません</span>
          )}
        </div>
        {!isClosed && (
          <form onSubmit={addMember} className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="名前を入力してメンバー追加"
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              maxLength={20}
            />
            <button type="submit" className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap">
              追加
            </button>
          </form>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-200 rounded-xl p-1 mb-4">
        <button
          onClick={() => setTab("expenses")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === "expenses" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
        >
          支払い一覧
        </button>
        <button
          onClick={() => setTab("settlement")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === "settlement" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
        >
          精算
        </button>
      </div>

      {/* Expenses tab */}
      {tab === "expenses" && (
        <div className="space-y-3">
          {!isClosed && group.members.length >= 2 && (
            <button
              onClick={() => (showExpForm && !editingExpenseId ? cancelExpForm() : setShowExpForm(true))}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              {showExpForm && !editingExpenseId ? "キャンセル" : "+ 支払いを追加"}
            </button>
          )}

          {!showExpForm && group.expenses.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 whitespace-nowrap">並び替え</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest" | "amount")}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 bg-white"
                >
                  <option value="newest">新しい順</option>
                  <option value="oldest">古い順</option>
                  <option value="amount">金額が高い順</option>
                </select>
              </div>
              <div className="flex gap-1.5 flex-wrap items-center">
                <span className="text-xs text-gray-500 whitespace-nowrap">絞り込み</span>
                <button
                  onClick={() => setFilterPayerId(null)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterPayerId === null ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-gray-600 border-gray-300"}`}
                >
                  全員
                </button>
                {group.members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setFilterPayerId(filterPayerId === m.id ? null : m.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterPayerId === m.id ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-gray-600 border-gray-300"}`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showExpForm && (
            <form onSubmit={submitExpense} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-700">{editingExpenseId ? "支払いを編集" : "支払いを追加"}</p>
                {editingExpenseId && (
                  <button type="button" onClick={cancelExpForm} className="text-xs text-gray-400 hover:text-gray-600">
                    キャンセル
                  </button>
                )}
              </div>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500">割り勘メンバー</label>
                  <button
                    type="button"
                    onClick={() => { setCustomSplitMode(!customSplitMode); setCustomAmounts({}); }}
                    className="text-xs text-emerald-600 underline"
                  >
                    {customSplitMode ? "均等割りに戻す" : "金額を個別指定"}
                  </button>
                </div>
                {!customSplitMode ? (
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
                ) : (
                  <div className="space-y-2">
                    {group.members.map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSplit(m.id)}
                          className={`text-sm px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                            expSplitIds.includes(m.id)
                              ? "bg-emerald-500 text-white border-emerald-500"
                              : "bg-white text-gray-300 border-gray-200"
                          }`}
                        >
                          {m.name}
                        </button>
                        {expSplitIds.includes(m.id) && (
                          <input
                            type="number"
                            value={customAmounts[m.id] ?? ""}
                            onChange={(e) =>
                              setCustomAmounts((prev) => ({ ...prev, [m.id]: e.target.value }))
                            }
                            placeholder="0"
                            min="0"
                            className="flex-1 border border-gray-300 rounded-xl px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!customSplitMode && expSplitIds.length > 0 && expAmount && (
                  <p className="text-xs text-gray-400 mt-1">
                    1人あたり ¥{Math.ceil(Number(expAmount) / expSplitIds.length).toLocaleString()}
                  </p>
                )}
                {customSplitMode && expAmount && (
                  <p className={`text-xs mt-1 ${Math.abs(customTotal - Number(expAmount)) < 0.5 ? "text-emerald-500" : "text-red-400"}`}>
                    合計 ¥{customTotal.toLocaleString()} / ¥{Number(expAmount).toLocaleString()}
                    {Math.abs(customTotal - Number(expAmount)) < 0.5
                      ? " ✓"
                      : `（¥${Math.abs(Number(expAmount) - customTotal).toLocaleString()} 不足）`}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={addingExp}
                className="w-full bg-emerald-500 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl text-sm"
              >
                {addingExp
                  ? (editingExpenseId ? "保存中..." : "追加中...")
                  : (editingExpenseId ? "保存する" : "追加する")}
              </button>
            </form>
          )}

          {group.expenses.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">まだ支払いがありません</div>
          ) : displayedExpenses.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">該当する支払いがありません</div>
          ) : (
            displayedExpenses.map((exp) => (
              <div key={exp.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className="relative w-10 h-10 mt-0.5 shrink-0">
                      <img src={getPokeballSprite()} alt="" className="absolute inset-0 w-full h-full object-contain opacity-40" />
                      <img src={getPokemonSprite(exp.payer.pokemonId)} alt={exp.payer.name} className="relative z-10 w-full h-full pixelated" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{exp.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(exp.createdAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })} · {exp.payer.name}が支払い・
                        {exp.splits.length === group.members.length
                          ? `${exp.splits.length}人で割り勘`
                          : exp.splits.map((s) => group.members.find((m) => m.id === s.memberId)?.name ?? "").join("・") + "で割り勘"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">¥{exp.amount.toLocaleString()}</p>
                    {!isClosed && (
                      <div className="flex gap-2 justify-end mt-1">
                        <button
                          onClick={() => openEditForm(exp)}
                          className="text-xs text-emerald-500 hover:text-emerald-700"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => deleteExpense(exp.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          削除
                        </button>
                      </div>
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
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">合計支出</p>
            <p className="text-2xl font-bold text-gray-800">¥{totalExpense.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">{group.expenses.length}件 · {group.members.length}人</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">残高</p>
            {balances.map((b) => (
              <div key={b.memberId} className="flex justify-between items-center py-1.5 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8">
                    <img src={getPokeballSprite()} alt="" className="absolute inset-0 w-full h-full object-contain opacity-40" />
                    <img src={getPokemonSprite(b.pokemonId)} alt={b.name} className="relative z-10 w-full h-full pixelated" />
                  </div>
                  <span className="text-sm text-gray-700">{b.name}</span>
                </div>
                <span className={`text-sm font-bold ${b.amount > 0 ? "text-emerald-600" : b.amount < 0 ? "text-red-500" : "text-gray-400"}`}>
                  {b.amount > 0 ? "+" : ""}¥{Math.round(b.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

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
                  <span className="ml-auto text-sm font-bold text-gray-800">¥{t.amount.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>

          {isClosed ? (
            <button
              onClick={copySettlement}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              結果をコピー（LINEに貼れる）
            </button>
          ) : (
            <button
              onClick={() => setCloseStep(1)}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              精算を確定する
            </button>
          )}
        </div>
      )}

      {/* Step 1 modal */}
      {closeStep === 1 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <p className="font-bold text-gray-800 text-lg">精算内容の確認</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {transfers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center">精算は不要です ✓</p>
              ) : (
                transfers.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-red-500">{t.from}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium text-emerald-600">{t.to}</span>
                    <span className="ml-auto font-bold">¥{t.amount.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
            <p className="text-sm text-gray-500">この内容で確定しますか？確定後は変更できません。</p>
            <div className="flex gap-2">
              <button
                onClick={() => setCloseStep(0)}
                className="flex-1 border border-gray-300 text-gray-600 font-bold py-3 rounded-xl text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={() => { setCloseStep(2); startCountdown(); }}
                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl text-sm"
              >
                確定へ進む
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 modal */}
      {closeStep === 2 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <p className="font-bold text-gray-800 text-lg">最終確認</p>
            <p className="text-sm text-gray-500">確定すると以降は一切変更できなくなります。本当によろしいですか？</p>
            <div className="flex gap-2">
              <button
                onClick={() => setCloseStep(1)}
                className="flex-1 border border-gray-300 text-gray-600 font-bold py-3 rounded-xl text-sm"
              >
                戻る
              </button>
              <button
                onClick={closeGroup}
                disabled={countingDown}
                className="flex-1 bg-red-500 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl text-sm transition-colors"
              >
                {countingDown ? `${countdown}秒後に確定できます` : "確定する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
