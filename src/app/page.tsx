"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!groupName.trim()) return;
    setLoading(true);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: groupName.trim() }),
    });
    const data = await res.json();
    router.push(`/group/${data.id}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💰</div>
          <h1 className="text-3xl font-bold text-gray-800">ワリカン</h1>
          <p className="text-gray-500 mt-2 text-sm">
            グループを作ってURLを共有するだけ
          </p>
        </div>

        <form
          onSubmit={createGroup}
          className="bg-white rounded-2xl shadow-md p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              グループ名
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="例：沖縄旅行、忘年会"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-400"
              maxLength={50}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !groupName.trim()}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl text-base transition-colors"
          >
            {loading ? "作成中..." : "グループを作る"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          作成後のURLをLINEで友達に送ろう
        </p>
      </div>
    </div>
  );
}
