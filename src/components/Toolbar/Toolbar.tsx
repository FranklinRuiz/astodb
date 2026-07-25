import { useEffect, useRef, useState } from 'react';
import {
  Download,
  Save,
  FolderOpen,
  Sun,
  Moon,
  FileCode,
  FileImage,
  Plus,
  Keyboard,
  LayoutGrid,
  AlignHorizontalSpaceAround,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Undo2,
  Redo2,
  Search,
  FileUp,
  Braces,
} from 'lucide-react';
import { Button } from '@/components/UI/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/UI/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/UI/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/UI/dialog';
import { useDiagramStore, useUIStore } from '@/store';
import {
  exportDiagramAsJSON,
  importDiagramFromJSON,
  exportAsDocPNG,
  downloadFile,
} from '@/utils/export';
import { generateSQL } from '@/utils/sql-generator';
import { generateDBML, parseDBMLToDiagram, DBMLParseError } from '@/utils/dbml';
import { getFlowInstance } from '@/utils/flowInstance';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sqlOpen, setSqlOpen] = useState(false);
  const [codeTab, setCodeTab] = useState<'sql' | 'dbml'>('sql');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [dbmlImportOpen, setDbmlImportOpen] = useState(false);
  const [dbmlImportText, setDbmlImportText] = useState('');
  const [dbmlImportError, setDbmlImportError] = useState<string | null>(null);

  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const addTable = useDiagramStore((s) => s.addTable);
  const loadDiagram = useDiagramStore((s) => s.loadDiagram);
  const getActiveDiagram = useDiagramStore((s) => s.getActiveDiagram);
  const autoLayout = useDiagramStore((s) => s.autoLayout);
  const undo = useDiagramStore((s) => s.undo);
  const redo = useDiagramStore((s) => s.redo);
  const canUndo = useDiagramStore((s) => s.history.past.length > 0);
  const canRedo = useDiagramStore((s) => s.history.future.length > 0);
  const alignSelected = useDiagramStore((s) => s.alignSelected);
  const distributeSelected = useDiagramStore((s) => s.distributeSelected);
  const selectedTableIds = useUIStore((s) => s.selectedTableIds);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const canAlign = selectedTableIds.length >= 2;
  const canDistribute = selectedTableIds.length >= 3;

  const handleSaveProject = () => {
    const diagram = getActiveDiagram();
    if (!diagram) return;
    const json = exportDiagramAsJSON(diagram);
    downloadFile(json, `${slugify(diagram.name)}.json`, 'application/json');
    toast.success('Project saved — open this file later to continue editing');
  };

  const handleOpenProject = () => {
    fileInputRef.current?.click();
  };

  const handleExportSQL = () => {
    const diagram = getActiveDiagram();
    if (!diagram) return;
    const sql = generateSQL(diagram);
    downloadFile(sql, `${slugify(diagram.name)}.sql`, 'text/plain');
    toast.success('T-SQL script exported');
  };

  const handleViewSQL = () => {
    setCodeTab('sql');
    setSqlOpen(true);
  };

  const handleExportDBML = () => {
    const diagram = getActiveDiagram();
    if (!diagram) return;
    downloadFile(generateDBML(diagram), `${slugify(diagram.name)}.dbml`, 'text/plain');
    toast.success('DBML script exported');
  };

  const handleViewDBML = () => {
    setCodeTab('dbml');
    setSqlOpen(true);
  };

  const handleImportDBML = () => {
    setDbmlImportError(null);
    try {
      const diagram = parseDBMLToDiagram(dbmlImportText, 'Imported Diagram');
      loadDiagram(diagram);
      useDiagramStore.getState().autoLayout();
      setTimeout(() => getFlowInstance()?.fitView({ padding: 0.2, maxZoom: 1, duration: 400 }), 50);
      setDbmlImportOpen(false);
      setDbmlImportText('');
      toast.success(`Diagram imported from DBML (${diagram.nodes.length} tables)`);
    } catch (err) {
      setDbmlImportError(err instanceof DBMLParseError ? err.message : 'Could not parse this DBML script.');
    }
  };

  const handleExportDocPNG = async () => {
    const diagram = getActiveDiagram();
    if (!diagram) return;
    try {
      await exportAsDocPNG(diagram.name);
      toast.success('Documentation PNG exported');
    } catch (e) {
      console.error(e);
      toast.error('Could not export image');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const diagram = importDiagramFromJSON(ev.target?.result as string);
        loadDiagram(diagram);
        toast.success(`Project "${diagram.name}" opened`);
      } catch (err) {
        console.error(err);
        toast.error('Invalid project file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const activeDiagram = getActiveDiagram();
  const sqlPreview = activeDiagram ? generateSQL(activeDiagram) : '';
  const dbmlPreview = activeDiagram ? generateDBML(activeDiagram) : '';
  const codePreview = codeTab === 'sql' ? sqlPreview : dbmlPreview;

  return (
    <header className="h-12 border-b border-border bg-card/60 backdrop-blur-sm flex items-center justify-between px-3 flex-shrink-0">
      {/* Left actions */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addTable()}
              className="h-8 gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-xs">New Table</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Create new table (⌘N)</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} className="h-8 w-8">
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (⌘Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} className="h-8 w-8">
              <Redo2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                autoLayout();
                setTimeout(() => {
                  getFlowInstance()?.fitView({ padding: 0.2, maxZoom: 1, duration: 400 });
                }, 50);
              }}
              className="h-8 gap-1.5"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-xs">Auto layout</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Arrange tables automatically</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5" disabled={!canAlign}>
                  <AlignHorizontalSpaceAround className="w-3.5 h-3.5" />
                  <span className="text-xs">Align</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              {canAlign ? 'Align or distribute selected tables' : 'Shift-drag to select 2+ tables to align'}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Align ({selectedTableIds.length} selected)</DropdownMenuLabel>
            <DropdownMenuItem disabled={!canAlign} onClick={() => alignSelected(selectedTableIds, 'left')}>
              <AlignStartVertical className="w-3.5 h-3.5" /> Align left
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canAlign} onClick={() => alignSelected(selectedTableIds, 'center')}>
              <AlignCenterVertical className="w-3.5 h-3.5" /> Align center
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canAlign} onClick={() => alignSelected(selectedTableIds, 'right')}>
              <AlignEndVertical className="w-3.5 h-3.5" /> Align right
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!canAlign} onClick={() => alignSelected(selectedTableIds, 'top')}>
              <AlignStartHorizontal className="w-3.5 h-3.5" /> Align top
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canAlign} onClick={() => alignSelected(selectedTableIds, 'middle')}>
              <AlignCenterHorizontal className="w-3.5 h-3.5" /> Align middle
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canAlign} onClick={() => alignSelected(selectedTableIds, 'bottom')}>
              <AlignEndHorizontal className="w-3.5 h-3.5" /> Align bottom
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Distribute (3+ selected)</DropdownMenuLabel>
            <DropdownMenuItem disabled={!canDistribute} onClick={() => distributeSelected(selectedTableIds, 'horizontal')}>
              Distribute horizontally
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canDistribute} onClick={() => distributeSelected(selectedTableIds, 'vertical')}>
              Distribute vertically
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Open project */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenProject}
              className="h-8 gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="text-xs">Open</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open project file (.json) to continue editing</TooltipContent>
        </Tooltip>

        {/* Import DBML */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setDbmlImportError(null); setDbmlImportOpen(true); }}
              className="h-8 gap-1.5"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span className="text-xs">Import DBML</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Paste a DBML script (e.g. from dbdiagram.io) to build the diagram</TooltipContent>
        </Tooltip>

        {/* Save project */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveProject}
              className="h-8 gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="text-xs">Save</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save project (.json) — reload to continue editing later</TooltipContent>
        </Tooltip>

        {/* Export dropdown: SQL / images */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  <span className="text-xs">Export</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Export diagram</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Generate</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleExportSQL}>
              <FileCode className="w-3.5 h-3.5" />
              T-SQL script (.sql)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportDBML}>
              <Braces className="w-3.5 h-3.5" />
              DBML script (.dbml)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Image</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleExportDocPNG}>
              <FileImage className="w-3.5 h-3.5" />
              PNG image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewSQL}
              className="h-8 gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="text-xs">SQL Preview</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Preview generated T-SQL</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewDBML}
              className="h-8 gap-1.5"
            >
              <Braces className="w-3.5 h-3.5" />
              <span className="text-xs">DBML</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Preview generated DBML (dbdiagram.io compatible)</TooltipContent>
        </Tooltip>

        <input
          id="astodb-open-project-input"
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImport}
          className="hidden"
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <SavedIndicator updatedAt={activeDiagram?.updatedAt} />

        <div className="w-px h-5 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCommandPaletteOpen(true)}
              className="h-8 gap-1.5 text-muted-foreground"
            >
              <Search className="w-3.5 h-3.5" />
              <kbd className="text-[10px] font-mono px-1 py-0.5 rounded border border-border bg-muted">⌘K</kbd>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Command palette — search tables, columns, actions</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShortcutsOpen(true)}
              className="h-8 w-8"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Keyboard shortcuts</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>
      </div>

      {/* Code Preview Dialog: T-SQL / DBML */}
      <Dialog open={sqlOpen} onOpenChange={setSqlOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{codeTab === 'sql' ? 'T-SQL Preview' : 'DBML Preview'}</DialogTitle>
            <DialogDescription>
              {codeTab === 'sql'
                ? 'Generated DDL from your diagram. Compatible with Microsoft SQL Server.'
                : 'Generated DBML — paste it into dbdiagram.io, or share it as documentation.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-1 -mt-2">
            <button
              onClick={() => setCodeTab('sql')}
              className={cn('px-2.5 py-1 text-xs rounded-md font-mono', codeTab === 'sql' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50')}
            >
              T-SQL
            </button>
            <button
              onClick={() => setCodeTab('dbml')}
              className={cn('px-2.5 py-1 text-xs rounded-md font-mono', codeTab === 'dbml' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50')}
            >
              DBML
            </button>
          </div>
          <pre className="flex-1 overflow-auto bg-muted rounded-lg p-4 text-xs font-mono leading-relaxed">
            <code>{codePreview}</code>
          </pre>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(codePreview);
                toast.success(`${codeTab === 'sql' ? 'SQL' : 'DBML'} copied to clipboard`);
              }}
            >
              Copy
            </Button>
            <Button size="sm" onClick={codeTab === 'sql' ? handleExportSQL : handleExportDBML}>
              Download {codeTab === 'sql' ? '.sql' : '.dbml'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import DBML Dialog */}
      <Dialog open={dbmlImportOpen} onOpenChange={setDbmlImportOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import DBML</DialogTitle>
            <DialogDescription>
              Paste a DBML script (e.g. exported from dbdiagram.io) to build a new diagram. Tables, columns, types,
              constraints and relationships are imported; canvas layout is generated automatically.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={dbmlImportText}
            onChange={(e) => setDbmlImportText(e.target.value)}
            placeholder={'Table dbo.users {\n  id int [pk, increment]\n  email nvarchar(255) [not null, unique]\n}'}
            className="flex-1 min-h-[280px] resize-none bg-muted rounded-lg p-4 text-xs font-mono leading-relaxed outline-none border border-transparent focus:border-primary/40"
            spellCheck={false}
          />
          {dbmlImportError && (
            <p className="text-xs text-destructive">{dbmlImportError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDbmlImportOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleImportDBML} disabled={!dbmlImportText.trim()}>
              Import
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shortcuts Dialog */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <ShortcutRow keys="⌘ / Ctrl + N" desc="Create new table" />
            <ShortcutRow keys="⌘ / Ctrl + Z" desc="Undo" />
            <ShortcutRow keys="⌘ / Ctrl + ⇧ + Z" desc="Redo" />
            <ShortcutRow keys="⌘ / Ctrl + D" desc="Duplicate selected table" />
            <ShortcutRow keys="⌘ / Ctrl + K" desc="Open command palette" />
            <ShortcutRow keys="Delete / Backspace" desc="Delete selected element" />
            <ShortcutRow keys="Arrow keys" desc="Nudge selected table (⇧ for 1px)" />
            <ShortcutRow keys="Esc" desc="Deselect" />
            <ShortcutRow keys="Double-click name" desc="Rename table / column inline" />
            <ShortcutRow keys="Shift + drag" desc="Box-select multiple tables" />
            <ShortcutRow keys="Drag" desc="Move tables on canvas" />
            <ShortcutRow keys="Drag from handle" desc="Create relation" />
            <ShortcutRow keys="Mouse wheel" desc="Zoom in/out" />
            <ShortcutRow keys="Space + drag" desc="Pan canvas" />
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}

function SavedIndicator({ updatedAt }: { updatedAt?: string }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  if (!updatedAt) return null;

  const seconds = Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000));
  const label =
    seconds < 5 ? 'Saved just now'
    : seconds < 60 ? `Saved ${seconds}s ago`
    : seconds < 3600 ? `Saved ${Math.floor(seconds / 60)}m ago`
    : `Saved ${Math.floor(seconds / 3600)}h ago`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1.5 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent>Autosaved to this browser — use Save to export a .json backup</TooltipContent>
    </Tooltip>
  );
}

function ShortcutRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-muted-foreground">{desc}</span>
      <kbd className="px-2 py-0.5 text-xs font-mono bg-muted rounded border border-border">
        {keys}
      </kbd>
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'diagram';
}
