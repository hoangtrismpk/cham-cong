'use client'

import React, { memo } from 'react'
import { Handle, Position, NodeProps, Node } from '@xyflow/react'
import { Badge } from '@/components/ui/badge'

interface CustomNodeData extends Record<string, unknown> {
    label: string
    job: string
    image: string | null
    initials: string
    status: string
    isRoot?: boolean
    department?: string
}

type CustomNodeType = Node<CustomNodeData>

const CustomNode = ({ data }: NodeProps<CustomNodeType>) => {
    // Cast data safely
    const nodeData = data

    return (
        <div className={`px-4 py-3 shadow-xl rounded-xl bg-[#161b22] border-2 min-w-[220px] text-center transition-all duration-300 ${nodeData.isRoot ? 'border-primary shadow-primary/20 scale-105' : 'border-slate-700 hover:border-slate-500'}`}>
            <Handle type="target" position={Position.Top} className="!bg-slate-600 !w-3 !h-3" />

            <div className="flex flex-col items-center relative z-10">
                <div className={`w-14 h-14 rounded-full overflow-hidden border-4 mb-3 shadow-lg ${nodeData.status === 'active' ? 'border-emerald-500/30' : 'border-slate-700'}`}>
                    {nodeData.image ? (
                        <img src={nodeData.image} alt={nodeData.label} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold text-lg">
                            {String(nodeData.initials)}
                        </div>
                    )}
                </div>

                <h3 className="font-extrabold text-white text-sm mb-0.5">{String(nodeData.label)}</h3>
                <p className="text-xs text-primary font-medium uppercase tracking-wider mb-2">{nodeData.job || 'Nhân viên'}</p>

                {nodeData.department && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-slate-800 text-slate-400 border-slate-700">
                        {nodeData.department}
                    </Badge>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} className="!bg-slate-600 !w-3 !h-3" />
        </div>
    )
}

export default memo(CustomNode)
