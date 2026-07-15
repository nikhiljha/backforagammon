import { useEffect, useMemo, useState } from 'react';
import type { Move, Player, RoomView } from '../shared/types';

const FRAME = 26;
const POINT_W = 72;
const BAR_W = 60;
const TRAY_W = 70;
const POINT_H = 272;
const W = FRAME * 2 + POINT_W * 12 + BAR_W + TRAY_W;
const H = 724;
const INNER_H = H - FRAME * 2;
const R = 27;

const FELT = 'var(--felt, #2c5240)';
const FELT_DARK = 'var(--felt-dark, #24463a)';

interface BoardProps {
  view: RoomView;
  onMove: (from: number | 'bar', die: number) => void;
  onRoll: () => void;
}

/** x of the left edge of a column (0..11, left to right). */
function colX(col: number): number {
  return FRAME + col * POINT_W + (col >= 6 ? BAR_W : 0);
}

export default function Board({ view, onMove, onRoll }: BoardProps) {
  const { game, you, legalMoves } = view;
  const perspective: Player = you ?? 'white';
  const [selected, setSelected] = useState<number | 'bar' | null>(null);

  const myTurn = you !== null && game.turn === you && game.phase === 'moving';

  useEffect(() => {
    if (!myTurn) setSelected(null);
  }, [myTurn, game.remaining.length]);

  const sources = useMemo(() => {
    const set = new Set<number | 'bar'>();
    for (const m of legalMoves) set.add(m.from);
    return set;
  }, [legalMoves]);

  // Auto-select when there is only one possible source (e.g. on the bar).
  useEffect(() => {
    if (myTurn && sources.size === 1) {
      setSelected([...sources][0]);
    }
  }, [myTurn, sources]);

  const destinations = useMemo(() => {
    if (selected === null) return new Map<number | 'off', Move>();
    const map = new Map<number | 'off', Move>();
    for (const m of legalMoves) {
      if (m.from !== selected) continue;
      const prev = map.get(m.to);
      if (!prev || m.die < prev.die) map.set(m.to, m);
    }
    return map;
  }, [legalMoves, selected]);

  /** Map a real point index to a display column/row for the perspective. */
  const layout = (i: number) => {
    const p = perspective === 'white' ? i : 23 - i;
    const bottom = p < 12;
    const col = bottom ? 11 - p : p - 12;
    return { col, bottom };
  };

  const pointTip = (col: number, bottom: boolean) => {
    const x = colX(col) + POINT_W / 2;
    return bottom ? { x, base: H - FRAME, dir: -1 } : { x, base: FRAME, dir: 1 };
  };

  const clickPoint = (i: number) => {
    if (!myTurn) return;
    if (destinations.has(i)) {
      const m = destinations.get(i)!;
      onMove(m.from, m.die);
      setSelected(null);
      return;
    }
    if (sources.has(i)) setSelected(selected === i ? null : i);
  };

  const checkers: React.ReactNode[] = [];
  const triangles: React.ReactNode[] = [];
  const hits: React.ReactNode[] = [];

  for (let i = 0; i < 24; i++) {
    const { col, bottom } = layout(i);
    const { x, base, dir } = pointTip(col, bottom);
    const tipY = base + dir * POINT_H;
    const even = (col + (bottom ? 0 : 1)) % 2 === 0;
    const isDest = destinations.has(i);
    const isSrc = sources.has(i) && myTurn;
    const isSel = selected === i;

    triangles.push(
      <polygon
        key={`pt-${i}`}
        points={`${x - POINT_W / 2 + 4},${base} ${x + POINT_W / 2 - 4},${base} ${x},${tipY}`}
        fill={even ? 'var(--oxblood-deep, #5c221c)' : 'var(--bone-shade, #cdbfa0)'}
        opacity={even ? 0.9 : 0.55}
        stroke={isDest ? 'var(--brass, #c9a86a)' : 'none'}
        strokeWidth={isDest ? 3 : 0}
      />,
    );

    const pt = game.points[i];
    const shown = Math.min(pt.count, 5);
    for (let c = 0; c < shown; c++) {
      const cy = base + dir * (R + 4 + c * (R * 2 - 4));
      const topOfStack = c === shown - 1;
      checkers.push(
        <Checker
          key={`ch-${i}-${c}`}
          x={x}
          y={cy}
          owner={pt.owner!}
          label={topOfStack && pt.count > 5 ? pt.count : undefined}
          glow={topOfStack && (isSrc || isSel)}
          selected={topOfStack && isSel}
        />,
      );
    }

    hits.push(
      <rect
        key={`hit-${i}`}
        x={x - POINT_W / 2}
        y={bottom ? H - FRAME - POINT_H - 40 : FRAME}
        width={POINT_W}
        height={POINT_H + 40}
        fill="transparent"
        style={{ cursor: isDest || isSrc ? 'pointer' : 'default' }}
        onClick={() => clickPoint(i)}
        role={isDest || isSrc ? 'button' : undefined}
        aria-label={`Point ${i + 1}`}
      />,
    );
  }

  // Bar checkers.
  const barX = FRAME + POINT_W * 6 + BAR_W / 2;
  const barGroups: React.ReactNode[] = [];
  (['white', 'black'] as Player[]).forEach((p) => {
    const count = game.bar[p];
    if (count === 0) return;
    const mine = p === perspective;
    // Your bar checkers sit on the near half of the bar.
    const startY = mine ? H / 2 + 60 : H / 2 - 60;
    const dir = mine ? 1 : -1;
    const shown = Math.min(count, 3);
    for (let c = 0; c < shown; c++) {
      const isSrc = p === you && sources.has('bar') && myTurn;
      barGroups.push(
        <Checker
          key={`bar-${p}-${c}`}
          x={barX}
          y={startY + dir * c * (R * 2 - 6)}
          owner={p}
          label={c === shown - 1 && count > 3 ? count : undefined}
          glow={c === shown - 1 && isSrc}
          selected={c === shown - 1 && selected === 'bar' && p === you}
        />,
      );
    }
  });

  // Off trays.
  const trayX = FRAME + POINT_W * 12 + BAR_W;
  const trays: React.ReactNode[] = [];
  (['white', 'black'] as Player[]).forEach((p) => {
    const count = game.off[p];
    const mine = p === perspective;
    const y0 = mine ? H - FRAME - 12 : FRAME + 12;
    const dir = mine ? -1 : 1;
    for (let c = 0; c < count; c++) {
      trays.push(
        <rect
          key={`off-${p}-${c}`}
          x={trayX + 10}
          y={y0 + dir * (c * 17 + (mine ? 14 : 0)) - (mine ? 0 : 0)}
          width={TRAY_W - 20}
          height={12}
          rx={4}
          fill={p === 'white' ? 'var(--bone, #e8dcc3)' : 'var(--ebony, #322a24)'}
          stroke={p === 'white' ? 'oklch(0.68 0.04 80)' : 'oklch(0.5 0.02 45)'}
        />,
      );
    }
  });
  const offDest = destinations.has('off');

  // Dice, drawn on the roller's right half of the felt.
  const dice: React.ReactNode[] = [];
  if (game.phase === 'moving' && game.dice.length > 0) {
    const used = [...game.dice];
    for (const r of game.remaining) {
      const idx = used.indexOf(r);
      if (idx !== -1) used.splice(idx, 1);
    }
    const cx0 = FRAME + POINT_W * 6 + BAR_W + POINT_W * 3 - ((game.dice.length - 1) * 66) / 2;
    game.dice.forEach((d, i) => {
      const usedIdx = used.indexOf(d);
      const isUsed = usedIdx !== -1;
      if (isUsed) used.splice(usedIdx, 1);
      dice.push(<Die key={`die-${i}`} x={cx0 + i * 66} y={H / 2} value={d} dim={isUsed} />);
    });
  }

  const canRoll =
    you !== null &&
    ((game.phase === 'to-roll' && game.turn === you) ||
      (game.phase === 'opening-roll' && game.openingRolls[you] === null));

  return (
    <svg
      className="board-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Backgammon board"
    >
      <defs>
        <linearGradient id="walnut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--walnut, #55402e)" />
          <stop offset="1" stopColor="var(--walnut-dark, #3a2c20)" />
        </linearGradient>
        <radialGradient id="feltGlow" cx="0.5" cy="0.35" r="0.9">
          <stop offset="0" stopColor={FELT} />
          <stop offset="1" stopColor={FELT_DARK} />
        </radialGradient>
      </defs>

      {/* Frame */}
      <rect x="0" y="0" width={W} height={H} rx="14" fill="url(#walnut)" />
      {/* Felt field */}
      <rect
        x={FRAME}
        y={FRAME}
        width={POINT_W * 12 + BAR_W}
        height={INNER_H}
        fill="url(#feltGlow)"
      />
      {/* Bar */}
      <rect
        x={FRAME + POINT_W * 6}
        y={FRAME}
        width={BAR_W}
        height={INNER_H}
        fill="url(#walnut)"
      />
      {/* Off tray */}
      <rect
        x={trayX}
        y={FRAME}
        width={TRAY_W}
        height={INNER_H}
        fill="var(--walnut-dark, #3a2c20)"
        stroke={offDest ? 'var(--brass, #c9a86a)' : 'none'}
        strokeWidth={offDest ? 3 : 0}
        style={{ cursor: offDest ? 'pointer' : 'default' }}
        onClick={() => {
          if (offDest) {
            const m = destinations.get('off')!;
            onMove(m.from, m.die);
            setSelected(null);
          }
        }}
      />
      <rect
        x={trayX}
        y={H / 2 - 5}
        width={TRAY_W}
        height={10}
        fill="url(#walnut)"
      />

      {triangles}
      {trays}
      {checkers}
      {barGroups}
      {dice}
      {hits}

      {/* Bar hit area for entering from the bar */}
      {sources.has('bar') && myTurn && (
        <rect
          x={FRAME + POINT_W * 6}
          y={FRAME}
          width={BAR_W}
          height={INNER_H}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onClick={() => setSelected(selected === 'bar' ? null : 'bar')}
        />
      )}

      {/* Roll affordance drawn into the felt */}
      {canRoll && (
        <g style={{ cursor: 'pointer' }} onClick={onRoll} role="button" aria-label="Roll dice">
          <rect
            x={FRAME + POINT_W * 6 + BAR_W + POINT_W * 3 - 86}
            y={H / 2 - 30}
            width={172}
            height={60}
            rx={12}
            fill="var(--oxblood, #7c2d24)"
            stroke="var(--oxblood-bright, #9c3a2d)"
          />
          <text
            x={FRAME + POINT_W * 6 + BAR_W + POINT_W * 3}
            y={H / 2 + 7}
            textAnchor="middle"
            fontFamily="var(--font-ui, sans-serif)"
            fontWeight="700"
            fontSize="21"
            fill="oklch(0.97 0.01 85)"
          >
            {game.phase === 'opening-roll' ? 'Roll for first' : 'Roll dice'}
          </text>
        </g>
      )}

      {/* Opening rolls shown on each half */}
      {game.phase === 'opening-roll' && (
        <>
          {game.openingRolls[perspective] !== null && (
            <Die x={FRAME + POINT_W * 3} y={H / 2 + 90} value={game.openingRolls[perspective]!} />
          )}
          {game.openingRolls[perspective === 'white' ? 'black' : 'white'] !== null && (
            <Die
              x={FRAME + POINT_W * 3}
              y={H / 2 - 90}
              value={game.openingRolls[perspective === 'white' ? 'black' : 'white']!}
            />
          )}
        </>
      )}

      {/* Doubling cube */}
      <Cube view={view} perspective={perspective} />
    </svg>
  );
}

function Checker({
  x,
  y,
  owner,
  label,
  glow,
  selected,
}: {
  x: number;
  y: number;
  owner: Player;
  label?: number;
  glow?: boolean;
  selected?: boolean;
}) {
  const white = owner === 'white';
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={R}
        fill={white ? 'var(--bone, #e8dcc3)' : 'var(--ebony, #322a24)'}
        stroke={
          selected
            ? 'var(--brass, #c9a86a)'
            : glow
              ? 'var(--brass, #c9a86a)'
              : white
                ? 'oklch(0.68 0.04 80)'
                : 'oklch(0.48 0.02 45)'
        }
        strokeWidth={selected ? 4 : glow ? 2.5 : 1.5}
      />
      {/* Ownership is also encoded by ring style, not color alone. */}
      <circle
        cx={x}
        cy={y}
        r={R - 8}
        fill="none"
        stroke={white ? 'oklch(0.74 0.05 80)' : 'oklch(0.42 0.03 45)'}
        strokeWidth={white ? 1.5 : 3}
        strokeDasharray={white ? 'none' : '4 5'}
      />
      {label !== undefined && (
        <text
          x={x}
          y={y + 6}
          textAnchor="middle"
          fontFamily="var(--font-ui, sans-serif)"
          fontWeight="700"
          fontSize="19"
          fill={white ? 'oklch(0.32 0.03 50)' : 'oklch(0.9 0.03 85)'}
        >
          {label}
        </text>
      )}
    </g>
  );
}

const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-1, -1],
    [1, 1],
  ],
  3: [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  4: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  6: [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
};

function Die({ x, y, value, dim }: { x: number; y: number; value: number; dim?: boolean }) {
  const s = 52;
  return (
    <g opacity={dim ? 0.35 : 1} aria-label={`Die showing ${value}`}>
      <rect
        x={x - s / 2}
        y={y - s / 2}
        width={s}
        height={s}
        rx={11}
        fill="var(--bone, #e8dcc3)"
        stroke="oklch(0.68 0.04 80)"
        strokeWidth="1.5"
      />
      {PIPS[value]?.map(([px, py], i) => (
        <circle
          key={i}
          cx={x + px * 12}
          cy={y + py * 12}
          r={4.6}
          fill="var(--oxblood, #7c2d24)"
        />
      ))}
    </g>
  );
}

function Cube({ view, perspective }: { view: RoomView; perspective: Player }) {
  const { game } = view;
  const x = FRAME + POINT_W * 3;
  let y = H / 2;
  if (game.cube.owner) {
    y = game.cube.owner === perspective ? H - FRAME - 46 : FRAME + 46;
    return <CubeFace x={FRAME - 13 + 6} y={y} value={game.cube.value} edge />;
  }
  return <CubeFace x={x} y={y} value={game.cube.value === 1 ? 64 : game.cube.value} />;
}

function CubeFace({
  x,
  y,
  value,
  edge,
}: {
  x: number;
  y: number;
  value: number;
  edge?: boolean;
}) {
  const s = 56;
  const cx = edge ? s / 2 + 8 : x;
  return (
    <g aria-label={`Doubling cube at ${value}`}>
      <rect
        x={cx - s / 2}
        y={y - s / 2}
        width={s}
        height={s}
        rx={10}
        fill="var(--ebony, #322a24)"
        stroke="var(--brass, #c9a86a)"
        strokeWidth="1.5"
      />
      <text
        x={cx}
        y={y + 8}
        textAnchor="middle"
        fontFamily="var(--font-display, serif)"
        fontSize="24"
        fill="var(--brass, #c9a86a)"
      >
        {value}
      </text>
    </g>
  );
}
