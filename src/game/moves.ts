import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BoardState,
  CompactBoardState,
  Piece,
  PIECE_SPECS,
  createOccupancy,
  movePiece,
} from "./board";

export type Direction = "up" | "down" | "left" | "right";

export type Move = {
  pieceId: string;
  direction: Direction;
  dx: number;
  dy: number;
};

export type CompactMove = {
  pieceIndex: number;
  pieceId: string;
  direction: Direction;
  dx: number;
  dy: number;
};

const DIRECTIONS: Move[] = [
  { pieceId: "", direction: "up", dx: 0, dy: -1 },
  { pieceId: "", direction: "down", dx: 0, dy: 1 },
  { pieceId: "", direction: "left", dx: -1, dy: 0 },
  { pieceId: "", direction: "right", dx: 1, dy: 0 },
];

export function canMove(board: BoardState, piece: Piece, dx: number, dy: number): boolean {
  const nextX = piece.x + dx;
  const nextY = piece.y + dy;

  if (
    nextX < 0 ||
    nextY < 0 ||
    nextX + piece.width > BOARD_WIDTH ||
    nextY + piece.height > BOARD_HEIGHT
  ) {
    return false;
  }

  const occupied = createOccupancy(board, piece.id);
  for (let y = nextY; y < nextY + piece.height; y += 1) {
    for (let x = nextX; x < nextX + piece.width; x += 1) {
      if (occupied[y][x] !== null) {
        return false;
      }
    }
  }

  return true;
}

export function generateMoves(board: BoardState): Move[] {
  const moves: Move[] = [];

  for (const piece of board) {
    for (const direction of DIRECTIONS) {
      if (canMove(board, piece, direction.dx, direction.dy)) {
        moves.push({ ...direction, pieceId: piece.id });
      }
    }
  }

  return moves;
}

export function applyMove(board: BoardState, move: Move): BoardState {
  return movePiece(board, move.pieceId, move.dx, move.dy);
}

export function generateCompactMoves(positions: CompactBoardState): CompactMove[] {
  const occupancy = createCompactOccupancy(positions);
  const moves: CompactMove[] = [];

  for (let pieceIndex = 0; pieceIndex < PIECE_SPECS.length; pieceIndex += 1) {
    const spec = PIECE_SPECS[pieceIndex];
    const position = positions[pieceIndex];
    const x = position % BOARD_WIDTH;
    const y = Math.floor(position / BOARD_WIDTH);

    for (const direction of DIRECTIONS) {
      if (canCompactMove(occupancy, pieceIndex, x, y, spec.width, spec.height, direction.dx, direction.dy)) {
        moves.push({
          pieceIndex,
          pieceId: spec.id,
          direction: direction.direction,
          dx: direction.dx,
          dy: direction.dy,
        });
      }
    }
  }

  return moves;
}

export function applyCompactMove(
  positions: CompactBoardState,
  move: CompactMove,
): CompactBoardState {
  const next = new Uint8Array(positions);
  next[move.pieceIndex] = positions[move.pieceIndex] + move.dy * BOARD_WIDTH + move.dx;
  return next;
}

function createCompactOccupancy(positions: CompactBoardState): Int8Array {
  const occupancy = new Int8Array(BOARD_WIDTH * BOARD_HEIGHT);
  occupancy.fill(-1);

  for (let pieceIndex = 0; pieceIndex < PIECE_SPECS.length; pieceIndex += 1) {
    const spec = PIECE_SPECS[pieceIndex];
    const position = positions[pieceIndex];
    const startX = position % BOARD_WIDTH;
    const startY = Math.floor(position / BOARD_WIDTH);

    for (let y = startY; y < startY + spec.height; y += 1) {
      for (let x = startX; x < startX + spec.width; x += 1) {
        occupancy[y * BOARD_WIDTH + x] = pieceIndex;
      }
    }
  }

  return occupancy;
}

function canCompactMove(
  occupancy: Int8Array,
  pieceIndex: number,
  x: number,
  y: number,
  width: number,
  height: number,
  dx: number,
  dy: number,
): boolean {
  const nextX = x + dx;
  const nextY = y + dy;

  if (
    nextX < 0 ||
    nextY < 0 ||
    nextX + width > BOARD_WIDTH ||
    nextY + height > BOARD_HEIGHT
  ) {
    return false;
  }

  for (let checkY = nextY; checkY < nextY + height; checkY += 1) {
    for (let checkX = nextX; checkX < nextX + width; checkX += 1) {
      const occupant = occupancy[checkY * BOARD_WIDTH + checkX];
      if (occupant !== -1 && occupant !== pieceIndex) {
        return false;
      }
    }
  }

  return true;
}

export function canTranslatePath(
  board: BoardState,
  pieceId: string,
  dx: number,
  dy: number,
): boolean {
  if (dx !== 0 && dy !== 0) {
    return false;
  }

  let nextBoard = board;
  const steps = Math.abs(dx || dy);
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);

  for (let step = 0; step < steps; step += 1) {
    const piece = nextBoard.find((item) => item.id === pieceId);
    if (!piece || !canMove(nextBoard, piece, stepX, stepY)) {
      return false;
    }
    nextBoard = movePiece(nextBoard, pieceId, stepX, stepY);
  }

  return true;
}
