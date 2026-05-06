import { useRef, useState } from 'react';
import {
  Download,
  Save,
  FolderOpen,
  Sun,
  Moon,
  FileCode,
  Image as ImageIcon,
  Plus,
  Keyboard,
  LayoutGrid,
  AlignHorizontalSpaceAround,
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
  exportAsPNG,
  exportAsSVG,
  downloadFile,
} from '@/utils/export';
import { generateSQL } from '@/utils/sql-generator';
import { getFlowInstance } from '@/utils/flowInstance';
import { toast } from 'sonner';

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sqlOpen, setSqlOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const addTable = useDiagramStore((s) => s.addTable);
  const loadDiagram = useDiagramStore((s) => s.loadDiagram);
  const getActiveDiagram = useDiagramStore((s) => s.getActiveDiagram);
  const autoLayout = useDiagramStore((s) => s.autoLayout);

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
    setSqlOpen(true);
  };

  const handleExportPNG = async () => {
    const diagram = getActiveDiagram();
    if (!diagram) return;
    try {
      await exportAsPNG(diagram.name);
      toast.success('Exported as PNG');
    } catch (e) {
      console.error(e);
      toast.error('Could not export image');
    }
  };

  const handleExportSVG = async () => {
    const diagram = getActiveDiagram();
    if (!diagram) return;
    try {
      await exportAsSVG(diagram.name);
      toast.success('Exported as SVG');
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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5" disabled>
              <AlignHorizontalSpaceAround className="w-3.5 h-3.5" />
              <span className="text-xs">Align</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Select multiple tables to align/distribute</TooltipContent>
        </Tooltip>

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
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Image</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleExportPNG}>
              <ImageIcon className="w-3.5 h-3.5" />
              PNG image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportSVG}>
              <ImageIcon className="w-3.5 h-3.5" />
              SVG vector
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

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImport}
          className="hidden"
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
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

      {/* SQL Preview Dialog */}
      <Dialog open={sqlOpen} onOpenChange={setSqlOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>T-SQL Preview</DialogTitle>
            <DialogDescription>
              Generated DDL from your diagram. Compatible with Microsoft SQL Server.
            </DialogDescription>
          </DialogHeader>
          <pre className="flex-1 overflow-auto bg-muted rounded-lg p-4 text-xs font-mono leading-relaxed">
            <code>{sqlPreview}</code>
          </pre>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(sqlPreview);
                toast.success('SQL copied to clipboard');
              }}
            >
              Copy
            </Button>
            <Button size="sm" onClick={handleExportSQL}>
              Download .sql
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
            <ShortcutRow keys="Delete / Backspace" desc="Delete selected element" />
            <ShortcutRow keys="Esc" desc="Deselect" />
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
