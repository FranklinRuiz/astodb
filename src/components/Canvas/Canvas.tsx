import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type NodeTypes,
  type EdgeTypes,
  type OnSelectionChangeParams,
  ConnectionLineType,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TableNode } from './TableNode';
import { RelationEdge } from './RelationEdge';
import { useDiagramStore, useUIStore } from '@/store';
import { DEFAULT_VIEWPORT } from '@/constants';
import { useTheme } from '@/hooks/use-theme';
import { getTableValidationLevel } from '@/utils/validation';
import { registerFlowInstance } from '@/utils/flowInstance';

const nodeTypes: NodeTypes = { tableNode: TableNode };
const edgeTypes: EdgeTypes = { relationEdge: RelationEdge };

export function Canvas() {
  const theme = useTheme();
  const { screenToFlowPosition, fitView, getViewport, setViewport } = useReactFlow();

  useEffect(() => {
    registerFlowInstance({ fitView, getViewport, setViewport });
  }, [fitView, getViewport, setViewport]);

  const activeDiagram = useDiagramStore((s) => s.diagrams.find((d) => d.id === s.activeDiagramId));
  const onNodesChange = useDiagramStore((s) => s.onNodesChange);
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange);
  const onConnect = useDiagramStore((s) => s.onConnect);
  const addTable = useDiagramStore((s) => s.addTable);
  const selectTable = useUIStore((s) => s.selectTable);
  const selectEdge = useUIStore((s) => s.selectEdge);

  const handleSelectionChange = useCallback(
    ({ nodes, edges }: OnSelectionChangeParams) => {
      if (nodes.length > 0) {
        selectTable(nodes[0].id);
      } else if (edges.length > 0) {
        selectEdge(edges[0].id);
      } else {
        selectTable(null);
        selectEdge(null);
      }
    },
    [selectTable, selectEdge]
  );

  const handlePaneClick = useCallback(() => {
    selectTable(null);
    selectEdge(null);
  }, [selectTable, selectEdge]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/erd-node');
      if (type !== 'table') return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addTable(position);
    },
    [addTable, screenToFlowPosition]
  );

  const nodes = useMemo(() => {
    if (!activeDiagram) return [];
    return activeDiagram.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        validationLevel: getTableValidationLevel(activeDiagram, node.id),
      },
    }));
  }, [activeDiagram]);

  const edges = useMemo(() => activeDiagram?.edges ?? [], [activeDiagram]);
  const settings = activeDiagram?.settings;

  return (
    <div className="w-full h-full grain">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={handleSelectionChange}
        onPaneClick={handlePaneClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        defaultViewport={DEFAULT_VIEWPORT}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionRadius={48}
        snapToGrid={settings?.snapToGrid ?? true}
        snapGrid={[settings?.gridSize ?? 20, settings?.gridSize ?? 20]}
        fitView={nodes.length > 0}
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.15}
        maxZoom={2.5}
        defaultEdgeOptions={{ type: 'relationEdge' }}
        connectionLineStyle={{
          stroke: 'hsl(var(--primary))',
          strokeWidth: 2.5,
          strokeDasharray: '8 4',
          opacity: 0.85,
        }}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={settings?.gridSize ?? 20}
          size={1}
          color={theme === 'dark' ? '#2a2d35' : '#e5e7eb'}
        />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap
          position="bottom-left"
          pannable
          zoomable
          nodeColor={(node) => {
            const tn = node as typeof nodes[number];
            return tn.data?.table?.color ?? 'hsl(var(--muted-foreground))';
          }}
          maskColor={theme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)'}
          style={{ backgroundColor: theme === 'dark' ? '#0f1115' : '#ffffff' }}
        />
      </ReactFlow>
    </div>
  );
}
