import {
  BoardState,
  boardToCompactState,
  compactStateKey,
  compactStateToBoard,
  isCompactSolved,
} from "./board";
import { CompactMove, Move, applyCompactMove, generateCompactMoves } from "./moves";

export type SolutionStep = {
  board: BoardState;
  move?: Move;
};

type SearchNode = {
  state: Uint8Array;
  parentKey: string | null;
  move?: CompactMove;
};

export type SolverResult = {
  steps: SolutionStep[];
  visitedCount: number;
};

export function solveBfs(start: BoardState): SolverResult | null {
  const startState = boardToCompactState(start);
  const startKey = compactStateKey(startState);
  const queue: string[] = [startKey];
  let queueIndex = 0;
  const nodes = new Map<string, SearchNode>();
  const visited = new Set<string>([startKey]);

  nodes.set(startKey, { state: startState, parentKey: null });

  while (queueIndex < queue.length) {
    const key = queue[queueIndex];
    queueIndex += 1;
    const node = nodes.get(key);
    if (!node) {
      continue;
    }

    if (isCompactSolved(node.state)) {
      return {
        steps: rebuildPath(nodes, key),
        visitedCount: visited.size,
      };
    }

    for (const move of generateCompactMoves(node.state)) {
      const nextState = applyCompactMove(node.state, move);
      const nextKey = compactStateKey(nextState);

      if (visited.has(nextKey)) {
        continue;
      }

      visited.add(nextKey);
      nodes.set(nextKey, { state: nextState, parentKey: key, move });
      queue.push(nextKey);
    }
  }

  return null;
}

function rebuildPath(nodes: Map<string, SearchNode>, goalKey: string): SolutionStep[] {
  const reversed: SolutionStep[] = [];
  let currentKey: string | null = goalKey;

  while (currentKey) {
    const node = nodes.get(currentKey);
    if (!node) {
      break;
    }
    reversed.push({ board: compactStateToBoard(node.state), move: toUiMove(node.move) });
    currentKey = node.parentKey;
  }

  return reversed.reverse();
}

function toUiMove(move?: CompactMove): Move | undefined {
  if (!move) {
    return undefined;
  }
  return {
    pieceId: move.pieceId,
    direction: move.direction,
    dx: move.dx,
    dy: move.dy,
  };
}
