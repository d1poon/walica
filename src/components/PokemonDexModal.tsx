"use client";
import { useEffect, useState } from "react";
import { getPokemonSprite } from "@/lib/pokemon";

const TYPE_JA: Record<string, string> = {
  normal: "ノーマル",
  fire: "ほのお",
  water: "みず",
  grass: "くさ",
  electric: "でんき",
  ice: "こおり",
  fighting: "かくとう",
  poison: "どく",
  ground: "じめん",
  flying: "ひこう",
  psychic: "エスパー",
  bug: "むし",
  rock: "いわ",
  ghost: "ゴースト",
  dragon: "ドラゴン",
  dark: "あく",
  steel: "はがね",
  fairy: "フェアリー",
};

const TYPE_COLOR: Record<string, string> = {
  normal: "bg-gray-400",
  fire: "bg-orange-500",
  water: "bg-blue-500",
  grass: "bg-green-500",
  electric: "bg-yellow-400",
  ice: "bg-cyan-400",
  fighting: "bg-red-700",
  poison: "bg-purple-500",
  ground: "bg-amber-700",
  flying: "bg-indigo-400",
  psychic: "bg-pink-500",
  bug: "bg-lime-500",
  rock: "bg-amber-800",
  ghost: "bg-purple-800",
  dragon: "bg-indigo-700",
  dark: "bg-gray-700",
  steel: "bg-gray-400",
  fairy: "bg-pink-400",
};

const STAT_JA: Record<string, string> = {
  hp: "HP",
  attack: "こうげき",
  defense: "ぼうぎょ",
  "special-attack": "とくこう",
  "special-defense": "とくぼう",
  speed: "すばやさ",
};

// ステータスバーの色（値に応じて変化）
function statBarColor(value: number): string {
  if (value >= 100) return "bg-emerald-500";
  if (value >= 70) return "bg-yellow-400";
  return "bg-red-400";
}

type PokemonData = {
  id: number;
  nameJa: string;
  nameEn: string;
  types: string[];
  height: number;
  weight: number;
  stats: { name: string; value: number }[];
  abilities: string[];
  sprite: string;
};

type Props = {
  pokemonId: number;
  onClose: () => void;
};

export function PokemonDexModal({ pokemonId, onClose }: Props) {
  const [data, setData] = useState<PokemonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setData(null);
    setError(false);

    async function fetchData() {
      try {
        const [pokemonRes, speciesRes] = await Promise.all([
          fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`),
          fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`),
        ]);
        if (!pokemonRes.ok || !speciesRes.ok) throw new Error("fetch failed");
        const pokemon = await pokemonRes.json();
        const species = await speciesRes.json();

        const nameJa =
          species.names.find(
            (n: { language: { name: string }; name: string }) =>
              n.language.name === "ja"
          )?.name ?? pokemon.name;

        setData({
          id: pokemon.id,
          nameJa,
          nameEn: pokemon.name,
          types: pokemon.types.map(
            (t: { type: { name: string } }) => t.type.name
          ),
          height: pokemon.height / 10,
          weight: pokemon.weight / 10,
          stats: pokemon.stats.map(
            (s: { stat: { name: string }; base_stat: number }) => ({
              name: s.stat.name,
              value: s.base_stat,
            })
          ),
          abilities: pokemon.abilities.map(
            (a: { ability: { name: string } }) => a.ability.name
          ),
          sprite: getPokemonSprite(pokemon.id),
        });
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [pokemonId]);

  return (
    // オーバーレイ：タップで閉じる
    <div
      className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 px-4 pb-4"
      onClick={onClose}
    >
      {/* モーダル本体：タップ伝播を止める */}
      <div
        className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white rounded-t-2xl flex items-center justify-between px-5 py-4 border-b border-gray-100 z-10">
          <p className="font-bold text-gray-700">ポケモン図鑑</p>
          {/* 閉じるボタン：スマホで押しやすいよう十分な大きさに */}
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 text-gray-500 font-bold text-base"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className="py-20 text-center text-gray-400 text-sm animate-pulse">
            読み込み中...
          </div>
        )}

        {error && (
          <div className="py-20 text-center text-gray-400 text-sm">
            データを取得できませんでした
          </div>
        )}

        {data && (
          <div className="px-5 pb-6">
            {/* ポケモン画像・No・名前 */}
            <div className="flex flex-col items-center py-5">
              <p className="text-xs text-gray-400 mb-1">
                No.{String(data.id).padStart(3, "0")}
              </p>
              <img
                src={data.sprite}
                alt={data.nameJa}
                className="w-28 h-28"
                style={{ imageRendering: "pixelated" }}
              />
              <p className="text-2xl font-bold text-gray-800 mt-2">
                {data.nameJa}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">
                {data.nameEn}
              </p>
            </div>

            {/* タイプ */}
            <div className="flex justify-center gap-2 mb-5">
              {data.types.map((type) => (
                <span
                  key={type}
                  className={`${TYPE_COLOR[type] ?? "bg-gray-400"} text-white text-xs font-bold px-4 py-1.5 rounded-full`}
                >
                  {TYPE_JA[type] ?? type}
                </span>
              ))}
            </div>

            {/* 身長・体重 */}
            <div className="flex gap-3 mb-5">
              <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">たかさ</p>
                <p className="text-lg font-bold text-gray-800">
                  {data.height.toFixed(1)}
                  <span className="text-sm font-normal text-gray-500 ml-0.5">m</span>
                </p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">おもさ</p>
                <p className="text-lg font-bold text-gray-800">
                  {data.weight.toFixed(1)}
                  <span className="text-sm font-normal text-gray-500 ml-0.5">kg</span>
                </p>
              </div>
            </div>

            {/* 特性 */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                とくせい
              </p>
              <div className="flex flex-wrap gap-2">
                {data.abilities.map((ab) => (
                  <span
                    key={ab}
                    className="text-xs bg-emerald-100 text-emerald-700 font-medium px-3 py-1 rounded-full capitalize"
                  >
                    {ab}
                  </span>
                ))}
              </div>
            </div>

            {/* ステータス */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                きほんステータス
              </p>
              <div className="space-y-2.5">
                {data.stats.map((stat) => (
                  <div key={stat.name} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-16 shrink-0 text-right">
                      {STAT_JA[stat.name] ?? stat.name}
                    </span>
                    <span className="text-xs font-bold text-gray-700 w-8 text-right shrink-0">
                      {stat.value}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`${statBarColor(stat.value)} h-2 rounded-full`}
                        style={{
                          width: `${Math.min((stat.value / 255) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
