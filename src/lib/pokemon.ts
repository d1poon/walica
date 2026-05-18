export function getPokemonId(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return (hash % 151) + 1;
}

export function getPokemonSprite(_id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png`;
}
