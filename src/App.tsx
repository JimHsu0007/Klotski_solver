import { CSSProperties, PointerEvent, useMemo, useRef, useState } from "react";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BoardState,
  Piece,
  initialBoard,
  movePiece,
} from "./game/board";
import { canTranslatePath } from "./game/moves";
import { SolverResult, solveBfs } from "./game/solver";

type DragState = {
  pieceId: string;
  startX: number;
  startY: number;
};

type WorkerMessage = {
  result: SolverResult | null;
  elapsedMs: number;
};

const CELL_SIZE = 92;

function App() {
  const [board, setBoard] = useState<BoardState>(initialBoard);
  const [solution, setSolution] = useState<SolverResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSolving, setIsSolving] = useState(false);
  const [solveTimeMs, setSolveTimeMs] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const activeSolutionBoard = solution?.steps[currentStep]?.board;
  const visibleBoard = activeSolutionBoard ?? board;

  const pieceById = useMemo(
    () => new Map(visibleBoard.map((piece) => [piece.id, piece])),
    [visibleBoard],
  );

  function reset() {
    setBoard(initialBoard);
    setSolution(null);
    setCurrentStep(0);
    setSolveTimeMs(null);
    workerRef.current?.terminate();
    workerRef.current = null;
    setIsSolving(false);
  }

  function solve() {
    workerRef.current?.terminate();
    setIsSolving(true);
    setSolution(null);
    setCurrentStep(0);
    setSolveTimeMs(null);

    const worker = new Worker(new URL("./game/solver.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      setSolution(event.data.result);
      setSolveTimeMs(event.data.elapsedMs);
      setCurrentStep(0);
      setIsSolving(false);
      worker.terminate();
      workerRef.current = null;
    };

    worker.onerror = () => {
      const startedAt = performance.now();
      const result = solveBfs(board);
      setSolution(result);
      setSolveTimeMs(Math.round(performance.now() - startedAt));
      setCurrentStep(0);
      setIsSolving(false);
      worker.terminate();
      workerRef.current = null;
    };

    worker.postMessage(board);
  }

  function showNextStep() {
    if (!solution) {
      return;
    }
    setCurrentStep((step) => Math.min(step + 1, solution.steps.length - 1));
  }

  function showPreviousStep() {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function handlePointerDown(event: PointerEvent, piece: Piece) {
    if (solution) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ pieceId: piece.id, startX: event.clientX, startY: event.clientY });
  }

  function handlePointerUp(event: PointerEvent) {
    if (!drag) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const boardWidth = boardRef.current?.clientWidth ?? CELL_SIZE * BOARD_WIDTH;
    const cellSize = boardWidth / BOARD_WIDTH;
    const gridDx = Math.round(deltaX / cellSize);
    const gridDy = Math.round(deltaY / cellSize);
    const absDx = Math.abs(gridDx);
    const absDy = Math.abs(gridDy);
    const dx = absDx >= absDy ? gridDx : 0;
    const dy = absDy > absDx ? gridDy : 0;

    if ((dx !== 0 || dy !== 0) && canTranslatePath(board, drag.pieceId, dx, dy)) {
      setBoard(movePiece(board, drag.pieceId, dx, dy));
    }

    setDrag(null);
  }

  const totalMoves = solution ? solution.steps.length - 1 : null;
  const lastMove = solution?.steps[currentStep]?.move;
  const lastPiece = lastMove ? pieceById.get(lastMove.pieceId) : null;

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="board-panel">
          <div
            ref={boardRef}
            className="board-frame"
            style={{ "--cell": `${CELL_SIZE}px` } as CSSProperties}
          >
            <div className="exit" />
            {visibleBoard.map((piece) => (
              <button
                className={`piece piece-${piece.kind}`}
                key={piece.id}
                onPointerDown={(event) => handlePointerDown(event, piece)}
                onPointerUp={handlePointerUp}
                style={{
                  left: `calc(var(--cell) * ${piece.x})`,
                  top: `calc(var(--cell) * ${piece.y})`,
                  width: `calc(var(--cell) * ${piece.width})`,
                  height: `calc(var(--cell) * ${piece.height})`,
                }}
                type="button"
              >
                {piece.name}
              </button>
            ))}
          </div>
        </div>

        <aside className="side-panel">
          <div>
            <p className="eyebrow">Klotski / 華容道</p>
            <h1>橫刀立馬求解器</h1>
          </div>

          <div className="stats-grid">
            <Stat label="總步數" value={totalMoves === null ? "-" : String(totalMoves)} />
            <Stat label="目前步" value={solution ? `${currentStep}/${totalMoves}` : "-"} />
            <Stat
              label="搜尋狀態"
              value={
                isSolving
                  ? "搜尋中"
                  : solution
                    ? `${solution.visitedCount} 盤面 / ${solveTimeMs}ms`
                    : "待求解"
              }
            />
          </div>

          <div className="controls">
            <button onClick={solve} disabled={isSolving} type="button">
              {isSolving ? "搜尋中..." : "BFS 最短解"}
            </button>
            <button onClick={showPreviousStep} disabled={!solution || currentStep === 0} type="button">
              上一步
            </button>
            <button
              onClick={showNextStep}
              disabled={!solution || currentStep >= solution.steps.length - 1}
              type="button"
            >
              下一步
            </button>
            <button onClick={reset} type="button">
              重設
            </button>
          </div>

          <div className="move-log">
            <p className="panel-label">目前移動</p>
            <p>
              {lastMove && lastPiece
                ? `${lastPiece.name} ${directionText(lastMove.direction)}`
                : "初始盤面，可拖曳方塊或直接求解。"}
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function directionText(direction: string) {
  switch (direction) {
    case "up":
      return "上移";
    case "down":
      return "下移";
    case "left":
      return "左移";
    case "right":
      return "右移";
    default:
      return "";
  }
}

export default App;
