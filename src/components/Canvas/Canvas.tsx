import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
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
import type { RelationEdge as RelationEdgeType } from '@/types';
import { DEFAULT_VIEWPORT } from '@/constants';
import { useTheme } from '@/hooks/use-theme';
import { getTableValidationLevel } from '@/utils/validation';
import { registerFlowInstance } from '@/utils/flowInstance';

const nodeTypes: NodeTypes = { tableNode: TableNode };
const edgeTypes: EdgeTypes = { relationEdge: RelationEdge };

export function Canvas() {
  const theme = useTheme();
  const { fitView, getViewport, setViewport } = useReactFlow();

  useEffect(() => {
    registerFlowInstance({ fitView, getViewport, setViewport });
  }, [fitView, getViewport, setViewport]);

  const activeDiagram = useDiagramStore((s) => s.diagrams.find((d) => d.id === s.activeDiagramId));
  const onNodesChange = useDiagramStore((s) => s.onNodesChange);
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange);
  const onConnect = useDiagramStore((s) => s.onConnect);
  const selectTable = useUIStore((s) => s.selectTable);
  const selectEdge = useUIStore((s) => s.selectEdge);
  const setSelectedTableIds = useUIStore((s) => s.setSelectedTableIds);
  const selectedTableId = useUIStore((s) => s.selectedTableId);
  const selectedTableIds = useUIStore((s) => s.selectedTableIds);
  const hoveredTableId = useUIStore((s) => s.hoveredTableId);
  const setHoveredTableId = useUIStore((s) => s.setHoveredTableId);

  const handleSelectionChange = useCallback(
    ({ nodes, edges }: OnSelectionChangeParams) => {
      setSelectedTableIds(nodes.map((n) => n.id));
      if (nodes.length > 0) {
        selectTable(nodes[0].id);
      } else if (edges.length > 0) {
        selectEdge(edges[0].id);
      } else {
        selectTable(null);
        selectEdge(null);
      }
    },
    [selectTable, selectEdge, setSelectedTableIds]
  );

  const handlePaneClick = useCallback(() => {
    selectTable(null);
    selectEdge(null);
    setSelectedTableIds([]);
  }, [selectTable, selectEdge, setSelectedTableIds]);

  const handleNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => setHoveredTableId(node.id),
    [setHoveredTableId]
  );
  const handleNodeMouseLeave = useCallback(() => setHoveredTableId(null), [setHoveredTableId]);

  // Focus id: whatever the user is currently hovering, falling back to a single selected table.
  const focusTableId =
    hoveredTableId ?? (selectedTableIds.length <= 1 ? selectedTableId : null);

  const rawEdges = activeDiagram?.edges ?? [];

  const { connectedNodeIds, connectedEdgeIds } = useMemo(() => {
    if (!focusTableId) return { connectedNodeIds: null, connectedEdgeIds: null };
    const nodeIds = new Set<string>([focusTableId]);
    const edgeIds = new Set<string>();
    for (const edge of rawEdges) {
      if (edge.source === focusTableId || edge.target === focusTableId) {
        edgeIds.add(edge.id);
        nodeIds.add(edge.source);
        nodeIds.add(edge.target);
      }
    }
    return { connectedNodeIds: nodeIds, connectedEdgeIds: edgeIds };
  }, [focusTableId, rawEdges]);

  const nodes = useMemo(() => {
    if (!activeDiagram) return [];
    return activeDiagram.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        validationLevel: getTableValidationLevel(activeDiagram, node.id),
        dimmed: connectedNodeIds ? !connectedNodeIds.has(node.id) : false,
      },
    }));
  }, [activeDiagram, connectedNodeIds]);

  const edges = useMemo((): RelationEdgeType[] => {
    return rawEdges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        dimmed: connectedEdgeIds ? !connectedEdgeIds.has(edge.id) : false,
        highlighted: connectedEdgeIds ? connectedEdgeIds.has(edge.id) && !!focusTableId : false,
      } as RelationEdgeType['data'],
    }));
  }, [rawEdges, connectedEdgeIds, focusTableId]);

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
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
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
