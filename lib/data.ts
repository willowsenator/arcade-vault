export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: string;
  cover: string;
  color: string;
  engine: "asteroids" | "bloque-buster" | "snake" | "tetris";
};

export type ScoreRow = { rank: number; name: string; score: number; date: string };

export const GAMES: Game[] = [
  { id: "bloque-buster", title: "BLOQUE BUSTER", short: "Rebota la pelota y destruye muros de neón.", long: "Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada muro despejado levanta otro, y cada vida perdida te cuesta puntos. ¿Hasta dónde llegará tu racha?", cat: "ARCADE", cover: "cover-bricks", color: "cyan", engine: "bloque-buster" },
  { id: "caida", title: "CAÍDA", short: "Encaja las piezas antes de que el techo te aplaste.", long: "Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.", cat: "PUZZLE", cover: "cover-tetro", color: "magenta", engine: "tetris" },
  { id: "serpentina", title: "SERPENTINA", short: "Crece sin morder tu propia cola.", long: "Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.", cat: "ARCADE", cover: "cover-snake", color: "green", engine: "snake" },
  { id: "rocas", title: "ROCAS", short: "Pulveriza asteroides en gravedad cero.", long: "Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Algunas rocas sueltan potenciadores: el disparo triple abre tres frentes y el escudo pulveriza todo lo que toques.", cat: "SHOOTER", cover: "cover-rocas", color: "yellow", engine: "asteroids" },
];

export const RECENT_TICKER_GAMES = 7;

export const CATS = ["TODOS", ...new Set(GAMES.map((game) => game.cat))];
