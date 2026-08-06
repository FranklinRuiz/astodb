import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  LayoutGrid,
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  FileCode,
  FileImage,
  FilePlus2,
  Table as TableIcon,
  Columns3,
  Zap,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/UI/dialog';
import { useDiagramStore, useUIStore } from '@/store';
import { generateSQL } from '@/utils/sql-generator';
import { exportDiagramAsJSON, exportAsDocPNG, downloadFile } from '@/utils/export';
import { getFlowInstance } from '@/utils/flowInstance';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PaletteItem {
  id: string;
  section: 'Actions' | 'Tables' | 'Columns' | 'Diagrams';
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  keywords?: string;
  run: () => void;
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') || 'diagram';
}

export function CommandPalette() {
  const isOpen = useUIStore((s) => s.isCommandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const selectTable = useUIStore((s) => s.selectTable);
  const setPropertiesOpen = useUIStore((s) => s.setPropertiesOpen);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  const getActiveDiagram = useDiagramStore((s) => s.getActiveDiagram);
  const diagrams = useDiagramStore((s) => s.diagrams);
  const activeDiagramId = useDiagramStore((s) => s.activeDiagramId);
  const addTable = useDiagramStore((s) => s.addTable);
  const autoLayout = useDiagramStore((s) => s.autoLayout);
  const undo = useDiagramStore((s) => s.undo);
  const redo = useDiagramStore((s) => s.redo);
  const createNewDiagram = useDiagramStore((s) => s.createNewDiagram);
  const selectDiagram = useDiagramStore((s) => s.selectDiagram);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl/Cmd+K opens the palette regardless of focus (mirrors VS Code / Navicat).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, setOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  const jumpToTable = (tableId: string) => {
    selectTable(tableId);
    setPropertiesOpen(true);
    setTimeout(() => {
      getFlowInstance()?.fitView({ nodes: [{ id: tableId }], duration: 400, padding: 0.4, maxZoom: 1.3 });
    }, 50);
  };

  const items = useMemo<PaletteItem[]>(() => {
    const diagram = getActiveDiagram();
    const list: PaletteItem[] = [
      { id: 'new-table', section: 'Actions', label: 'New table', icon: <Plus className="w-3.5 h-3.5" />, run: () => addTable() },
      { id: 'auto-layout', section: 'Actions', label: 'Auto layout', icon: <LayoutGrid className="w-3.5 h-3.5" />, run: () => { autoLayout(); setTimeout(() => getFlowInstance()?.fitView({ padding: 0.04, maxZoom: 2, duration: 400 }), 50); } },
      { id: 'undo', section: 'Actions', label: 'Undo', icon: <Undo2 className="w-3.5 h-3.5" />, run: () => undo() },
      { id: 'redo', section: 'Actions', label: 'Redo', icon: <Redo2 className="w-3.5 h-3.5" />, run: () => redo() },
      {
        id: 'copy-sql', section: 'Actions', label: 'Copy T-SQL to clipboard', icon: <FileCode className="w-3.5 h-3.5" />,
        run: () => {
          if (!diagram) return;
          navigator.clipboard.writeText(generateSQL(diagram));
          toast.success('SQL copied to clipboard');
        },
      },
      {
        id: 'export-sql', section: 'Actions', label: 'Export T-SQL script (.sql)', icon: <FileCode className="w-3.5 h-3.5" />,
        run: () => {
          if (!diagram) return;
          downloadFile(generateSQL(diagram), `${slugify(diagram.name)}.sql`, 'text/plain');
          toast.success('T-SQL script exported');
        },
      },
      {
        id: 'export-png', section: 'Actions', label: 'Export documentation PNG', icon: <FileImage className="w-3.5 h-3.5" />,
        run: () => {
          if (!diagram) return;
          exportAsDocPNG(diagram.name).then(() => toast.success('Documentation PNG exported'));
        },
      },
      {
        id: 'save-project', section: 'Actions', label: 'Save project (.asto)', icon: <Save className="w-3.5 h-3.5" />,
        run: () => {
          if (!diagram) return;
          downloadFile(exportDiagramAsJSON(diagram), `${slugify(diagram.name)}.asto`, 'application/json');
          toast.success('Project saved');
        },
      },
      {
        id: 'open-project', section: 'Actions', label: 'Open project (.asto)', icon: <FolderOpen className="w-3.5 h-3.5" />,
        run: () => document.getElementById('astodb-open-project-input')?.click(),
      },
      { id: 'new-diagram', section: 'Actions', label: 'New diagram', icon: <FilePlus2 className="w-3.5 h-3.5" />, run: () => createNewDiagram() },
      { id: 'toggle-theme', section: 'Actions', label: 'Toggle theme', icon: <Zap className="w-3.5 h-3.5" />, run: () => toggleTheme() },
    ];

    diagrams.forEach((d) => {
      if (d.id === activeDiagramId) return;
      list.push({
        id: `diagram-${d.id}`,
        section: 'Diagrams',
        label: `Switch to: ${d.name}`,
        icon: <FilePlus2 className="w-3.5 h-3.5" />,
        run: () => selectDiagram(d.id),
      });
    });

    if (diagram) {
      diagram.nodes.forEach((node) => {
        const table = node.data.table;
        list.push({
          id: `table-${table.id}`,
          section: 'Tables',
          label: table.schema ? `${table.schema}.${table.name}` : table.name,
          sublabel: `${table.columns.length} columns`,
          icon: <TableIcon className="w-3.5 h-3.5" />,
          run: () => jumpToTable(table.id),
        });
        table.columns.forEach((col) => {
          list.push({
            id: `column-${table.id}-${col.id}`,
            section: 'Columns',
            label: col.name,
            sublabel: `${table.schema ? `${table.schema}.` : ''}${table.name} · ${col.type}`,
            keywords: table.name,
            icon: <Columns3 className="w-3.5 h-3.5" />,
            run: () => jumpToTable(table.id),
          });
        });
      });
    }

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getActiveDiagram, diagrams, activeDiagramId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.filter((i) => i.section === 'Actions');
    return items.filter((i) =>
      i.label.toLowerCase().includes(q) ||
      i.sublabel?.toLowerCase().includes(q) ||
      i.keywords?.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => setActiveIndex(0), [query]);

  const runItem = (item: PaletteItem) => {
    item.run();
    setOpen(false);
  };

  const sections = useMemo(() => {
    const order: PaletteItem['section'][] = ['Actions', 'Diagrams', 'Tables', 'Columns'];
    return order
      .map((section) => ({ section, items: filtered.filter((i) => i.section === section) }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="top-[18%] translate-y-0 max-w-xl p-0 gap-0 overflow-hidden">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tables, columns, or run a command..."
          className="w-full pl-4 pr-10 py-3 text-sm bg-transparent border-b border-border outline-none font-mono"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (filtered[activeIndex]) runItem(filtered[activeIndex]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
        <div className="max-h-96 overflow-y-auto py-1.5">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-xs text-center text-muted-foreground">No results</p>
          ) : (
            sections.map((group) => (
              <div key={group.section} className="mb-1 last:mb-0">
                <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.section}
                </div>
                {group.items.map((item) => {
                  const flatIndex = filtered.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      onClick={() => runItem(item)}
                      onMouseEnter={() => setActiveIndex(flatIndex)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-4 py-2 text-left text-xs transition-colors',
                        flatIndex === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                      )}
                    >
                      <span className="text-muted-foreground flex-shrink-0">{item.icon}</span>
                      <span className="font-mono truncate flex-1">{item.label}</span>
                      {item.sublabel && <span className="text-[10px] text-muted-foreground truncate flex-shrink-0">{item.sublabel}</span>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border border-border bg-muted">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border border-border bg-muted">↵</kbd> select</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border border-border bg-muted">esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
