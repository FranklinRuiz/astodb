import { useMemo, useState } from 'react';
import {
  Database,
  Plus,
  Search,
  MoreHorizontal,
  Copy,
  Trash2,
  FilePlus2,
  Table as TableIcon,
  AlertTriangle,
  CircleAlert,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/UI/dropdown-menu';
import { useDiagramStore, useUIStore } from '@/store';
import { cn } from '@/lib/utils';
import { APP_NAME, APP_TAGLINE } from '@/constants';
import { validateDiagram } from '@/utils/validation';

export function Sidebar() {
  const [search, setSearch] = useState('');
  const diagrams = useDiagramStore((s) => s.diagrams);
  const activeDiagramId = useDiagramStore((s) => s.activeDiagramId);
  const activeDiagram = diagrams.find((d) => d.id === activeDiagramId);

  const createNewDiagram = useDiagramStore((s) => s.createNewDiagram);
  const selectDiagram = useDiagramStore((s) => s.selectDiagram);
  const renameDiagram = useDiagramStore((s) => s.renameDiagram);
  const deleteDiagram = useDiagramStore((s) => s.deleteDiagram);
  const duplicateDiagram = useDiagramStore((s) => s.duplicateDiagram);

  const addTable = useDiagramStore((s) => s.addTable);
  const deleteTable = useDiagramStore((s) => s.deleteTable);
  const duplicateTable = useDiagramStore((s) => s.duplicateTable);

  const selectedTableId = useUIStore((s) => s.selectedTableId);
  const selectTable = useUIStore((s) => s.selectTable);
  const setPropertiesOpen = useUIStore((s) => s.setPropertiesOpen);

  const [editingDiagramName, setEditingDiagramName] = useState(false);
  const [editValue, setEditValue] = useState('');

  const tables = activeDiagram?.nodes.map((n) => n.data.table) ?? [];
  const relations = activeDiagram?.edges ?? [];
  const issues = useMemo(() => activeDiagram ? validateDiagram(activeDiagram) : [], [activeDiagram]);

  const filteredTables = tables.filter((t) =>
    `${t.schema ?? ''}.${t.name}`.toLowerCase().includes(search.toLowerCase())
  );

  const groupedTables = useMemo(() => {
    return filteredTables.reduce<Record<string, typeof filteredTables>>((acc, table) => {
      const key = table.schema || 'dbo';
      acc[key] = acc[key] ?? [];
      acc[key].push(table);
      return acc;
    }, {});
  }, [filteredTables]);

  const handleStartRename = () => {
    if (!activeDiagram) return;
    setEditValue(activeDiagram.name);
    setEditingDiagramName(true);
  };

  const handleSaveRename = () => {
    if (activeDiagram && editValue.trim()) renameDiagram(activeDiagram.id, editValue.trim());
    setEditingDiagramName(false);
  };

  return (
    <aside className="w-72 border-r border-border bg-card flex flex-col h-full">
      {/* App header */}
      <div className="px-4 py-3.5 border-b border-border flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-foreground text-background flex items-center justify-center">
          <Database className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h1 className="font-semibold text-sm tracking-tight">{APP_NAME}</h1>
          <p className="text-[10px] text-muted-foreground truncate">{APP_TAGLINE}</p>
        </div>
      </div>

      {/* Diagram name row */}
      <div className="px-3 py-2.5 border-b border-border flex items-center gap-1.5">
        {editingDiagramName ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveRename}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
            className="h-7 text-xs flex-1"
            autoFocus
          />
        ) : (
          <span
            className="flex-1 text-sm font-semibold font-mono truncate cursor-text"
            onDoubleClick={handleStartRename}
            title="Double-click to rename"
          >
            {activeDiagram?.name ?? 'No diagram'}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => createNewDiagram()}>
              <FilePlus2 className="w-3.5 h-3.5" /> New diagram
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleStartRename}>
              <Pencil className="w-3.5 h-3.5" /> Rename
            </DropdownMenuItem>
            {diagrams.length > 1 && (
              <>
                <DropdownMenuSeparator />
                {diagrams.filter((d) => d.id !== activeDiagramId).map((d) => (
                  <DropdownMenuItem key={d.id} onClick={() => selectDiagram(d.id)}>
                    Switch to: {d.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => activeDiagram && duplicateDiagram(activeDiagram.id)}>
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => activeDiagram && deleteDiagram(activeDiagram.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tables header */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Tables ({tables.length})
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => addTable()} title="New table (Cmd/Ctrl + N)">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tables, schemas..." className="h-7 pl-8 text-xs" />
        </div>
      </div>

      {/* Table list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filteredTables.length === 0 ? (
          <div className="px-2 py-6 text-center">
            <TableIcon className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">{search ? 'No tables found' : 'No tables yet'}</p>
            {!search && (
              <Button size="sm" variant="ghost" onClick={() => addTable()} className="mt-2 text-xs h-7">
                Create your first table
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedTables).map(([schema, groupTables]) => (
              <div key={schema}>
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {schema}
                </div>
                <div className="space-y-0.5">
                  {groupTables.map((table) => {
                    const tableIssues = issues.filter((i) => i.tableId === table.id);
                    const hasError = tableIssues.some((i) => i.severity === 'error');
                    const hasWarning = tableIssues.some((i) => i.severity === 'warning');
                    return (
                      <div
                        key={table.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => { selectTable(table.id); setPropertiesOpen(true); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') { selectTable(table.id); setPropertiesOpen(true); }
                        }}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 text-sm transition-colors group cursor-pointer',
                          selectedTableId === table.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                        )}
                      >
                        <div className="w-1 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: table.color }} />
                        <span className="font-mono text-xs truncate flex-1">
                          {table.schema ? `${table.schema}.` : ''}{table.name}
                        </span>
                        {hasError && <CircleAlert className="w-3.5 h-3.5 text-destructive" />}
                        {!hasError && hasWarning && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                        <span className="text-[10px] text-muted-foreground font-mono">{table.columns.length}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-foreground/10"
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateTable(table.id); }}>
                              <Copy className="w-3.5 h-3.5" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTable(table.id);
                                if (selectedTableId === table.id) selectTable(null);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer: validation + relations */}
        <div className="mt-4 border-t border-border pt-3">
          <button
            onClick={() => { selectTable(null); setPropertiesOpen(true); }}
            className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent/50 flex items-center gap-2"
          >
            {issues.length === 0
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              : issues.some((i) => i.severity === 'error')
                ? <CircleAlert className="w-3.5 h-3.5 text-destructive" />
                : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
            <span className="text-xs">Model validation</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{issues.length}</span>
          </button>

          <div className="mt-2 px-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            Relations ({relations.length})
          </div>
          {relations.slice(0, 12).map((edge) => (
            <button
              key={edge.id}
              onClick={() => useUIStore.getState().selectEdge(edge.id)}
              className="mt-0.5 w-full text-left px-2 py-1 rounded-md hover:bg-accent/50 flex items-center gap-2"
            >
              <span className="text-primary">↳</span>
              <span className="truncate text-[11px] font-mono">
                {edge.data?.foreignKeyName ?? edge.data?.label ?? edge.id}
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
