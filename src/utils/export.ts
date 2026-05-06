import {toPng, toSvg} from 'html-to-image';
import type {Diagram, SerializedDiagram} from '@/types';
import {getFlowInstance} from '@/utils/flowInstance';

export function downloadFile(content: string, filename: string, type = 'text/plain') {
    const blob = new Blob([content], {type});
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

// High-contrast light-mode values applied during documentation exports.
// Compared to the default light theme: border goes from 91% → 62% lightness,
// muted-foreground goes from 46% → 26% lightness.
const DOC_OVERRIDES: Record<string, string> = {
    '--background': '0 0% 100%',
    '--foreground': '220 13% 8%',
    '--card': '0 0% 100%',
    '--card-foreground': '220 13% 8%',
    '--muted': '220 14% 93%',
    '--muted-foreground': '220 13% 26%',
    '--border': '220 13% 62%',
};

/** Crops a PNG data-URL to the given pixel-space rectangle. */
function cropPng(dataUrl: string, x: number, y: number, w: number, h: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('No canvas context'));
                return;
            }
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

/**
 * Fits all nodes into view, captures the full canvas, then restores the viewport.
 * In docMode the function:
 *   1. Forces a high-contrast light theme via CSS variable overrides.
 *   2. Crops the captured image tightly around the node bounding box.
 *   3. Restores the original theme after capture.
 */
async function captureFullDiagram(format: 'png' | 'svg', docMode = false): Promise<string> {
    const wrapper = document.querySelector<HTMLElement>('.react-flow');
    if (!wrapper) throw new Error('Canvas not found.');

    const flow = getFlowInstance();
    const savedViewport = flow?.getViewport();

    flow?.fitView({padding: 0.08, duration: 0, maxZoom: 1.5});
    await new Promise<void>((r) =>
        requestAnimationFrame(() =>
            requestAnimationFrame(() => r())
        )
    );

    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    const savedProps: Record<string, string> = {};

    if (docMode) {
        if (wasDark) root.classList.remove('dark');
        for (const [k, v] of Object.entries(DOC_OVERRIDES)) {
            savedProps[k] = root.style.getPropertyValue(k);
            root.style.setProperty(k, v);
        }
        // Wait for the browser to repaint with the new CSS variable values.
        await new Promise<void>((r) =>
            requestAnimationFrame(() =>
                requestAnimationFrame(() => r())
            )
        );
    }

    // In doc mode, calculate the tight bounding box of all rendered nodes
    // so the output image can be cropped to content instead of capturing
    // the entire (mostly empty) canvas area.
    let cropRect: { x: number; y: number; w: number; h: number } | null = null;
    if (docMode) {
        const wrapperRect = wrapper.getBoundingClientRect();
        const nodeEls = wrapper.querySelectorAll<HTMLElement>('.react-flow__node');
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodeEls.forEach((el) => {
            const r = el.getBoundingClientRect();
            minX = Math.min(minX, r.left - wrapperRect.left);
            minY = Math.min(minY, r.top - wrapperRect.top);
            maxX = Math.max(maxX, r.right - wrapperRect.left);
            maxY = Math.max(maxY, r.bottom - wrapperRect.top);
        });
        if (isFinite(minX)) {
            const pad = 52;
            cropRect = {
                x: Math.max(0, minX - pad),
                y: Math.max(0, minY - pad),
                w: Math.min(wrapper.offsetWidth, maxX - minX + pad * 2),
                h: Math.min(wrapper.offsetHeight, maxY - minY + pad * 2),
            };
        }
    }

    const bgRaw = getComputedStyle(root).getPropertyValue('--background').trim();
    const bg = bgRaw ? `hsl(${bgRaw})` : '#ffffff';
    const pixelRatio = docMode ? 3 : 2;

    const options = {
        backgroundColor: bg,
        width: wrapper.offsetWidth,
        height: wrapper.offsetHeight,
        pixelRatio,
        filter: (node: HTMLElement) => {
            const cls = node.classList;
            if (!cls) return true;
            return (
                !cls.contains('react-flow__controls') &&
                !cls.contains('react-flow__minimap') &&
                !cls.contains('react-flow__panel')
            );
        },
    };

    try {
        let result = format === 'png'
            ? await toPng(wrapper, options)
            : await toSvg(wrapper, options);

        if (docMode && format === 'png' && cropRect) {
            result = await cropPng(
                result,
                Math.round(cropRect.x * pixelRatio),
                Math.round(cropRect.y * pixelRatio),
                Math.round(cropRect.w * pixelRatio),
                Math.round(cropRect.h * pixelRatio),
            );
        }

        return result;
    } finally {
        if (flow && savedViewport) flow.setViewport(savedViewport, {duration: 0});
        if (docMode) {
            if (wasDark) root.classList.add('dark');
            for (const [k, v] of Object.entries(savedProps)) {
                if (v) root.style.setProperty(k, v);
                else root.style.removeProperty(k);
            }
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

/** High-contrast light-theme PNG — optimised for documentation / printing. */
export async function exportAsDocPNG(diagramName: string) {
    const dataUrl = await captureFullDiagram('png', true);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${slugify(diagramName)}-doc.png`;
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
