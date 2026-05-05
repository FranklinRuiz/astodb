import { useEffect } from 'react';
import { useDiagramStore, useUIStore } from '@/store';

export function useKeyboardShortcuts() {
  const addTable = useDiagramStore((s) => s.addTable);
  const deleteTable = useDiagramStore((s) => s.deleteTable);
  const deleteEdge = useDiagramStore((s) => s.deleteEdge);
  const selectedTableId = useUIStore((s) => s.selectedTableId);
  const selectedEdgeId = useUIStore((s) => s.selectedEdgeId);
  const selectTable = useUIStore((s) => s.selectTable);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Ignore shortcuts while typing
      if (isInput) return;

      // Cmd/Ctrl + N: New table
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        addTable();
      }

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTableId) {
          deleteTable(selectedTableId);
          selectTable(null);
        } else if (selectedEdgeId) {
          deleteEdge(selectedEdgeId);
        }
      }

      // Escape: deselect
      if (e.key === 'Escape') {
        selectTable(null);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [addTable, deleteTable, deleteEdge, selectedTableId, selectedEdgeId, selectTable]);
}
