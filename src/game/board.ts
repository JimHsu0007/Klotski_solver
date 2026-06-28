export const BOARD_WIDTH = 4;
export const BOARD_HEIGHT = 5;

export type PieceKind = "cao" | "general" | "guard" | "soldier";

export type Piece = {
  id: string;
  name: string;
  kind: PieceKind;
  width: number;
  height: number;
  x: number;
  y: number;
};

export type BoardState = Piece[];

export const initialBoard: BoardState = [
  { id: "zhang", name: "張", kind: "general", width: 1, height: 2, x: 0, y: 0 },
  { id: "cao", name: "曹操", kind: "cao", width: 2, height: 2, x: 1, y: 0 },
  { id: "zhao", name: "趙", kind: "general", width: 1, height: 2, x: 3, y: 0 },
  { id: "ma", name: "馬", kind: "general", width: 1, height: 2, x: 0, y: 2 },
  { id: "guan", name: "關羽", kind: "guard", width: 2, height: 1, x: 1, y: 2 },
  { id: "huang", name: "黃", kind: "general", width: 1, height: 2, x: 3, y: 2 },
  { id: "bing1", name: "兵", kind: "soldier", width: 1, height: 1, x: 1, y: 3 },
  { id: "bing2", name: "兵", kind: "soldier", width: 1, height: 1, x: 2, y: 3 },
  { id: "bing3", name: "兵", kind: "soldier", width: 1, height: 1, x: 0, y: 4 },
  { id: "bing4", name: "兵", kind: "soldier", width: 1, height: 1, x: 3, y: 4 },
];

export const PIECE_ORDER = initialBoard.map((piece) => piece.id);
export const PIECE_INDEX_BY_ID = new Map(PIECE_ORDER.map((id, index) => [id, index]));
export const PIECE_SPECS = PIECE_ORDER.map((id) => {
  const piece = initialBoard.find((item) => item.id === id);
  if (!piece) {
    throw new Error(`Missing piece spec ${id}`);
  }
  return {
    id: piece.id,
    name: piece.name,
    kind: piece.kind,
    width: piece.width,
    height: piece.height,
  };
});

export type CompactBoardState = Uint8Array;

export function cloneBoard(board: BoardState): BoardState {
  return board.map((piece) => ({ ...piece }));
}

export function stateKey(board: BoardState): string {
  const byId = new Map(board.map((piece) => [piece.id, piece]));
  return PIECE_ORDER.map((id) => {
    const piece = byId.get(id);
    if (!piece) {
      throw new Error(`Missing piece ${id}`);
    }
    return `${piece.x},${piece.y}`;
  }).join("|");
}

export function compactStateKey(positions: CompactBoardState): string {
  const cao: number[] = [];
  const guards: number[] = [];
  const generals: number[] = [];
  const soldiers: number[] = [];

  for (let index = 0; index < positions.length; index += 1) {
    const spec = PIECE_SPECS[index];
    const position = positions[index];

    if (spec.kind === "cao") {
      cao.push(position);
    } else if (spec.kind === "guard") {
      guards.push(position);
    } else if (spec.kind === "general") {
      generals.push(position);
    } else {
      soldiers.push(position);
    }
  }

  generals.sort((a, b) => a - b);
  soldiers.sort((a, b) => a - b);

  return [
    ...cao,
    ...guards,
    ...generals,
    ...soldiers,
  ].map((position) => position.toString(20)).join("");
}

export function boardToCompactState(board: BoardState): CompactBoardState {
  const positions = new Uint8Array(PIECE_ORDER.length);
  const byId = new Map(board.map((piece) => [piece.id, piece]));

  PIECE_ORDER.forEach((id, index) => {
    const piece = byId.get(id);
    if (!piece) {
      throw new Error(`Missing piece ${id}`);
    }
    positions[index] = piece.y * BOARD_WIDTH + piece.x;
  });

  return positions;
}

export function compactStateToBoard(positions: CompactBoardState): BoardState {
  return PIECE_SPECS.map((spec, index) => ({
    ...spec,
    x: positions[index] % BOARD_WIDTH,
    y: Math.floor(positions[index] / BOARD_WIDTH),
  }));
}

export function findPiece(board: BoardState, id: string): Piece | undefined {
  return board.find((piece) => piece.id === id);
}

export function isSolved(board: BoardState): boolean {
  const cao = findPiece(board, "cao");
  return cao?.x === 1 && cao.y === 3;
}

export function isCompactSolved(positions: CompactBoardState): boolean {
  const caoIndex = PIECE_INDEX_BY_ID.get("cao");
  return caoIndex !== undefined && positions[caoIndex] === 3 * BOARD_WIDTH + 1;
}

export function movePiece(board: BoardState, pieceId: string, dx: number, dy: number): BoardState {
  return board.map((piece) =>
    piece.id === pieceId ? { ...piece, x: piece.x + dx, y: piece.y + dy } : piece,
  );
}

export function createOccupancy(board: BoardState, ignorePieceId?: string): (string | null)[][] {
  const cells = Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from<string | null>({ length: BOARD_WIDTH }).fill(null),
  );

  for (const piece of board) {
    if (piece.id === ignorePieceId) {
      continue;
    }
    for (let y = piece.y; y < piece.y + piece.height; y += 1) {
      for (let x = piece.x; x < piece.x + piece.width; x += 1) {
        cells[y][x] = piece.id;
      }
    }
  }

  return cells;
}
