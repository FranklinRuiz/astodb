import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Key, Link2, Hash, Wand2, AlertTriangle, CircleAlert } from 'lucide-react';
import type { TableNode as TableNodeType, Column } from '@/types';
import { useDiagramStore, useUIStore } from '@/store';
import { cn } from '@/lib/utils';

function TableNodeComponent({ data, selected, id }: NodeProps<TableNodeType>) {
  const { table, validationLevel = 'ok' } = data;
  const selectTable = useUIStore((s) => s.selectTable);
  const addColumn = useDiagramStore((s) => s.addColumn);

  return (
    // Outer wrapper has no overflow-hidden so protruding handles are visible.
    // All visual card styling (border, bg, rounded) lives on the inner div.
    <div className="group relative min-w-[340px] max-w-[480px]">

      {/* Header-level quick-connect handle.
          right-0 keeps it within the outer wrapper (no overflow issue).
          The outer wrapper has no overflow-hidden so both it and the column handles are visible.
          Uses "header-source" — the store maps this to the table's PK automatically. */}
      <Handle
        type="source"
        position={Position.Right}
        id="header-source"
        title="Drag to create a relation from the primary key"
        className={cn(
          '!absolute !right-0 !top-[28px]',
          '!w-5 !h-5 !rounded-full !border-2 !border-background !bg-primary',
          'opacity-0 group-hover:opacity-100 transition-opacity cursor-grab !z-20',
        )}
        isConnectable
      />

      {/* ── Visual card ── */}
      <div
        onClick={() => selectTable(id)}
        className={cn(
          'rounded-lg overflow-hidden bg-card text-card-foreground shadow-sm border transition-all',
          selected
            ? 'border-primary shadow-lg ring-1 ring-primary/30'
            : 'border-border hover:border-foreground/30 hover:shadow-md',
          validationLevel === 'error' && 'ring-2 ring-destructive/40 border-destructive/70',
          validationLevel === 'warning' && 'ring-2 ring-amber-400/40 border-amber-400/70',
        )}
      >
        {/* ── Table header ── */}
        <div
          className="px-3 py-2.5 border-b border-border flex items-center gap-2 relative"
          style={{ background: `linear-gradient(135deg, ${table.color}1f, transparent 65%)` }}
        >
          <div className="w-1 h-6 rounded-sm flex-shrink-0" style={{ backgroundColor: table.color }} />

          <div className="flex-1 min-w-0">
            <h3 className="font-mono font-semibold text-sm tracking-tight truncate">
              <span className="font-normal text-muted-foreground">{table.schema ?? 'dbo'}.</span>{table.name}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            {validationLevel === 'error' && <CircleAlert className="w-3.5 h-3.5 text-destructive" />}
            {validationLevel === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
            <button
              title="Add column"
              onClick={(e) => { e.stopPropagation(); addColumn(id); }}
              className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded hover:bg-foreground/10 grid place-items-center transition-opacity"
            >
              <Wand2 className="w-3 h-3" />
            </button>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              {table.columns.length}
            </span>
          </div>
        </div>

        {/* ── Column rows ── */}
        <div className="divide-y divide-border/40">
          {table.columns.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground italic text-center">No columns</div>
          ) : (
            table.columns.map((col) => (
              <ColumnRow key={col.id} column={col} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ColumnRow({ column }: { column: Column }) {
  return (
    <div className="relative grid grid-cols-[18px_1fr_auto_86px] items-center gap-1.5 px-3 py-1.5 text-xs hover:bg-accent/40 transition-colors group/col">

      {/* Source handle */}
      <Handle
        type="source"
        position={Position.Right}
        id={`${column.id}-source`}
        title="Drag to connect this column"
        className={cn(
          '!absolute !right-[3px] !top-1/2 !-translate-y-1/2',
          '!w-3 !h-3 !rounded-full !border-2 !border-background !bg-primary',
          'opacity-0 group-hover/col:opacity-100 transition-opacity cursor-grab !z-10',
        )}
        isConnectable
      />

      {/* Column type icon */}
      <div className="flex items-center justify-center w-4 flex-shrink-0">
        {column.isPrimaryKey ? (
          <Key className="w-3 h-3" style={{ color: 'hsl(var(--erd-pk))' }} />
        ) : column.isForeignKey ? (
          <Link2 className="w-3 h-3" style={{ color: 'hsl(var(--erd-fk))' }} />
        ) : column.isUnique ? (
          <Hash className="w-3 h-3" style={{ color: 'hsl(var(--erd-unique))' }} />
        ) : (
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
        )}
      </div>

      {/* Column name */}
      <span
        className={cn(
          'font-mono truncate text-foreground',
          column.isPrimaryKey && 'font-semibold',
        )}
      >
        {column.name}
      </span>

      {/* Data type — read only */}
      <span className="font-mono text-[10px] text-foreground/75 truncate">{column.type}</span>

      {/* Constraint badges */}
      <div className="flex items-center justify-end gap-1 text-[9px] font-mono uppercase tracking-wider">
        {column.isPrimaryKey && <Badge tone="pk">PK</Badge>}
        {!column.isNullable && <Badge tone="nn">NN</Badge>}
        {column.isAutoIncrement && <Badge tone="ai">AI</Badge>}
        {column.isForeignKey && <Badge tone="fk">FK</Badge>}
        {column.isUnique && !column.isPrimaryKey && <Badge tone="uk">UQ</Badge>}
      </div>

      {/* Target handle — kept inside the inner card bounds (left-[3px]) */}
      <Handle
        type="target"
        position={Position.Left}
        id={`${column.id}-target`}
        title="Drop here to connect to this column"
        className={cn(
          '!absolute !left-[3px] !top-1/2 !-translate-y-1/2',
          '!w-3 !h-3 !rounded-full !border-2 !border-background !bg-sky-500',
          'opacity-0 group-hover/col:opacity-20 hover:!opacity-100 transition-opacity !z-10',
        )}
        isConnectable
      />
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'pk' | 'fk' | 'nn' | 'ai' | 'uk' }) {
  const className = {
    pk: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    fk: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    nn: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    ai: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    uk: 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
  }[tone];
  return <span className={cn('rounded px-1 py-0.5', className)}>{children}</span>;
}

export const TableNode = memo(TableNodeComponent);
