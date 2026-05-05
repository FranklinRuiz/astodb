import { toPng, toSvg } from 'html-to-image';
import type { Diagram, SerializedDiagram } from '@/types';
import { getFlowInstance } from '@/utils/flowInstance';

export function downloadFile(content: string, filename: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportDiagramAsJSON(diagram: Diagram): string {
  const payload: SerializedDiagram = {
    version: '1.2',
    diagram,
  };
  return JSON.stringify(payload, null, 2);
}

export function importDiagramFromJSON(json: string): Diagram {
  const parsed = JSON.parse(json);
  if (!parsed.diagram || !['1.0', '1.1', '1.2'].includes(parsed.version)) {
    throw new Error('Invalid diagram file format.');
  }
  return parsed.diagram as Diagram;
}

/**
 * Fits all nodes into view, captures the full canvas, then restores the viewport.
 */
async function captureFullDiagram(format: 'png' | 'svg'): Promise<string> {
  const wrapper = document.querySelector<HTMLElement>('.react-flow');
  if (!wrapper) throw new Error('Canvas not found.');

  const flow = getFlowInstance();
  const savedViewport = flow?.getViewport();

  // Fit all nodes into the visible canvas area with a small padding.
  flow?.fitView({ padding: 0.12, duration: 0, maxZoom: 1.5 });

  // Wait two animation frames so the DOM reflects the new viewport.
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const bgRaw = getComputedStyle(document.documentElement)
    .getPropertyValue('--background')
    .trim();
  const bg = bgRaw ? `hsl(${bgRaw})` : '#ffffff';

  const options = {
    backgroundColor: bg,
    width: wrapper.offsetWidth,
    height: wrapper.offsetHeight,
    pixelRatio: 2,
    // Exclude UI controls (minimap, zoom buttons) from the export.
    filter: (node: HTMLElement) => {
      const cls = (node as HTMLElement).classList;
      if (!cls) return true;
      return (
        !cls.contains('react-flow__controls') &&
        !cls.contains('react-flow__minimap') &&
        !cls.contains('react-flow__panel')
      );
    },
  };

  try {
    return format === 'png'
      ? await toPng(wrapper, options)
      : await toSvg(wrapper, options);
  } finally {
    // Always restore the original viewport so the user's view is unchanged.
    if (flow && savedViewport) {
      flow.setViewport(savedViewport, { duration: 0 });
    }
  }
}

export async function exportAsPNG(diagramName: string) {
  const dataUrl = await captureFullDiagram('png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${slugify(diagramName)}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function exportAsSVG(diagramName: string) {
  const dataUrl = await captureFullDiagram('svg');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${slugify(diagramName)}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
