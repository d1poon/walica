import { getPokemonSprite } from "@/lib/pokemon";

type Props = {
  pokemonId: number;
  alt: string;
  size?: 32 | 40 | 48;
  /** タップ時に図鑑を開くコールバック */
  onClick?: () => void;
};

export function PokemonAvatar({ pokemonId, alt, size = 48, onClick }: Props) {
  const sizeClass = size === 48 ? "w-12 h-12" : size === 40 ? "w-10 h-10" : "w-8 h-8";
  const btnClass = size >= 40 ? "w-3 h-3 border-2" : "w-2.5 h-2.5 border-[1.5px]";

  return (
    <div
      className={`relative ${sizeClass} shrink-0 ${onClick ? "cursor-pointer active:opacity-70 transition-opacity" : ""}`}
      onClick={onClick}
    >
      {/* Pokeball background */}
      <div className="absolute inset-0 rounded-full overflow-hidden border-2 border-gray-900">
        <div className="absolute inset-x-0 top-0 h-1/2 bg-red-500" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-white" />
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-gray-900" />
      </div>
      {/* Center button */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${btnClass} rounded-full bg-white border-gray-900 z-10`} />
      {/* Pokemon sprite */}
      <img src={getPokemonSprite(pokemonId)} alt={alt} className="absolute inset-0 w-full h-full pixelated z-20" />
    </div>
  );
}
