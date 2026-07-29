import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import { X, Link2 } from 'lucide-react';
import type { RelationEdge as RelationEdgeType, RelationType } from '@/types';
import { useDiagramStore, useUIStore } from '@/store';
import { cn } from '@/lib/utils';

function RelationEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<RelationEdgeType>) {
  const deleteEdge = useDiagramStore((s) => s.deleteEdge);
  const selectEdge = useUIStore((s) => s.selectEdge);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  });

  const cardinality = getCardinalityNotation(data?.type ?? 'one-to-many');
  const label = data?.label || data?.foreignKeyName || cardinality.label;

  // Edges that span 2+ columns pass behind intermediate nodes (SVG renders below HTML nodes).
  // For those, duplicate the path inside EdgeLabelRenderer which renders above nodes.
  const isLongEdge = targetX - sourceX > 640;

  const dimmed = data?.dimmed ?? false;
  const highlighted = data?.highlighted ?? false;
  // "Active" = selected, or connected to the table currently hovered/selected elsewhere on the canvas.
  const isActive = selected || highlighted;

  const edgeStroke = isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';
  const edgeStrokeWidth = selected ? 2.25 : highlighted ? 2 : 1.5;
  const edgeDash = data?.isIdentifying ? undefined : '6 4';
  const edgeOpacity = dimmed ? 0.12 : 1;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: edgeStroke,
          strokeWidth: edgeStrokeWidth,
          strokeDasharray: edgeDash,
          opacity: edgeOpacity,
          transition: 'opacity 150ms ease, stroke 150ms ease',
        }}
      />

      <EdgeLabelRenderer>
        {isLongEdge && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 1,
              height: 1,
              overflow: 'visible',
              pointerEvents: 'none',
              opacity: edgeOpacity,
            }}
          >
            <path
              d={edgePath}
              fill="none"
              stroke={edgeStroke}
              strokeWidth={edgeStrokeWidth}
              strokeDasharray={edgeDash}
            />
          </svg>
        )}

        {/* Cardinality markers rendered above HTML nodes to avoid z-order clipping */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1,
            height: 1,
            overflow: 'visible',
            pointerEvents: 'none',
            opacity: edgeOpacity,
          }}
        >
          <CardinalityMarker
            x={sourceX}
            y={sourceY}
            position={sourcePosition}
            notation={cardinality.source}
            selected={selected ?? false}
          />
          <CardinalityMarker
            x={targetX}
            y={targetY}
            position={targetPosition}
            notation={cardinality.target}
            selected={selected ?? false}
          />
        </svg>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            opacity: edgeOpacity,
            transition: 'opacity 150ms ease',
          }}
          className="absolute pointer-events-auto flex items-center gap-1 group/label"
          onClick={(e) => {
            e.stopPropagation();
            selectEdge(id);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            selectEdge(id);
          }}
        >
          <button
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-mono tracking-tight border transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap',
              selected
                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
            )}
            title={label}
          >
            <Link2 className="w-3 h-3 flex-shrink-0" />
            <span className="font-semibold">{cardinality.label}</span>
            {/* FK name hides until the relation is active — keeps the canvas from turning into
                a wall of overlapping labels when many relations are visible at once. */}
            {data?.showLabel !== false && (
              <span className={cn(isActive ? 'inline' : 'hidden', 'group-hover/label:inline')}>· {label}</span>
            )}
          </button>
          {selected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteEdge(id);
                selectEdge(null);
              }}
              className="ml-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
              title="Delete relation"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

interface CardinalityMarkerProps {
  x: number;
  y: number;
  position: string;
  notation: 'one' | 'many';
  selected: boolean;
}

function CardinalityMarker({ x, y, position, notation, selected }: CardinalityMarkerProps) {
  const stroke = selected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';
  const horizontal = position === 'left' || position === 'right';
  const dir = position === 'left' || position === 'top' ? -1 : 1;
  // gap: distance from node border before the marker starts
  const gap = 6;
  const offset = 16;

  if (notation === 'one') {
    return horizontal ? (
      <g stroke={stroke} strokeWidth={1.7} fill="none">
        <line x1={x + dir * (gap + offset)} y1={y - 7} x2={x + dir * (gap + offset)} y2={y + 7} />
      </g>
    ) : (
      <g stroke={stroke} strokeWidth={1.7} fill="none">
        <line x1={x - 7} y1={y + dir * (gap + offset)} x2={x + 7} y2={y + dir * (gap + offset)} />
      </g>
    );
  }

  // many — crow's foot: vertex at gap from node border, fan opens over offset
  if (horizontal) {
    return (
      <g stroke={stroke} strokeWidth={1.7} fill="none">
        <line x1={x + dir * gap} y1={y} x2={x + dir * (gap + offset)} y2={y - 7} />
        <line x1={x + dir * gap} y1={y} x2={x + dir * (gap + offset)} y2={y} />
        <line x1={x + dir * gap} y1={y} x2={x + dir * (gap + offset)} y2={y + 7} />
      </g>
    );
  }

  return (
    <g stroke={stroke} strokeWidth={1.7} fill="none">
      <line x1={x} y1={y + dir * gap} x2={x - 7} y2={y + dir * (gap + offset)} />
      <line x1={x} y1={y + dir * gap} x2={x} y2={y + dir * (gap + offset)} />
      <line x1={x} y1={y + dir * gap} x2={x + 7} y2={y + dir * (gap + offset)} />
    </g>
  );
}

function getCardinalityNotation(type: RelationType): { source: 'one' | 'many'; target: 'one' | 'many'; label: string } {
  switch (type) {
    case 'one-to-one':
      return { source: 'one', target: 'one', label: '1:1' };
    case 'one-to-many':
      return { source: 'one', target: 'many', label: '1:N' };
    case 'many-to-many':
      return { source: 'many', target: 'many', label: 'N:M' };
  }
}

export const RelationEdge = memo(RelationEdgeComponent);
