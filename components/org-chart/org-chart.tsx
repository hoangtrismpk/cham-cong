'use client'

import React, { useCallback, useEffect, useMemo } from 'react'
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Panel,
    Position,
    ConnectionLineType,
    Node,
    Edge
} from '@xyflow/react'
import dagre from 'dagre'
import '@xyflow/react/dist/style.css'

import CustomNode from './custom-node'
import { TeamMember } from '@/app/actions/my-team'
import { Button } from '@/components/ui/button'
import { Maximize2, Minus, Plus } from 'lucide-react'

// Layout configuration
const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({}))

const nodeWidth = 240
const nodeHeight = 180

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const isHorizontal = direction === 'LR'
    dagreGraph.setGraph({ rankdir: direction })

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
    })

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target)
    })

    dagre.layout(dagreGraph)

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id)
        node.targetPosition = isHorizontal ? Position.Left : Position.Top
        node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom

        // We are shifting the dagre node position (anchor=center center) to the top left
        // so it matches the React Flow node anchor point (top left).
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        }
    })

    return { nodes: layoutedNodes, edges }
}

interface OrgChartProps {
    members: TeamMember[]
    currentUserId: string
}

export default function OrgChart({ members, currentUserId }: OrgChartProps) {
    const nodeTypes = useMemo(() => ({ custom: CustomNode }), []) as any
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

    // Process data into nodes and edges
    useEffect(() => {
        if (!members.length) return

        const initialNodes: Node[] = members.map(m => ({
            id: m.id,
            type: 'custom',
            data: {
                label: m.full_name,
                job: m.job_title,
                image: m.avatar_url,
                initials: `${m.first_name?.[0] || ''}${m.last_name?.[0] || ''}`,
                department: m.department,
                status: m.status,
                isRoot: m.id === currentUserId
            },
            position: { x: 0, y: 0 } // Layout to handle
        }))

        const initialEdges: Edge[] = []

        members.forEach(m => {
            if (m.manager_id && members.find(p => p.id === m.manager_id)) {
                initialEdges.push({
                    id: `e-${m.manager_id}-${m.id}`,
                    source: m.manager_id,
                    target: m.id,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#475569', strokeWidth: 2 },
                })
            }
        })

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            initialNodes,
            initialEdges
        )

        setNodes(layoutedNodes)
        setEdges(layoutedEdges)
    }, [members, currentUserId, setNodes, setEdges])

    return (
        <div className="w-full h-full min-h-[600px] bg-[#0d1117] rounded-xl overflow-hidden border border-slate-800">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                className="bg-[#0d1117]"
                minZoom={0.2}
                maxZoom={1.5}
                attributionPosition="bottom-right"
            >
                <Background color="#334155" gap={20} size={1} />
                <Controls className="bg-slate-800 border-slate-700 fill-white [&>button]:fill-slate-300 [&>button:hover]:bg-slate-700" />
                <Panel position="top-right" className="bg-slate-800/80 p-2 rounded-lg border border-slate-700 text-xs text-slate-300 backdrop-blur-sm">
                    {members.length} Members Loaded
                </Panel>
            </ReactFlow>
        </div>
    )
}
