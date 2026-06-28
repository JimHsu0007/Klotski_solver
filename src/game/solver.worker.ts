import { BoardState } from "./board";
import { solveBfs } from "./solver";

self.onmessage = (event: MessageEvent<BoardState>) => {
  const startedAt = performance.now();
  const result = solveBfs(event.data);
  self.postMessage({
    result,
    elapsedMs: Math.round(performance.now() - startedAt),
  });
};
