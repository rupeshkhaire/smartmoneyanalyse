import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { HelpCircle } from 'lucide-react';
import { CATEGORY_COLORS } from '../../services/categorizer';

interface SankeyNode {
  id: string;
  name: string;
  value: number;
  column: 'left' | 'middle' | 'right';
  color: string;
  x: number;
  y: number;
  height: number;
}

interface SankeyLink {
  id: string;
  source: string;
  target: string;
  value: number;
  color: string;
  strokeWidth: number;
  sy: number; // Source Y center offset
  ty: number; // Target Y center offset
}

export const SankeyDiagram = () => {
  const { filteredTransactions, currencySymbol, setCategoryFilter, setActiveTab } = useFinance();
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Group transactions for the Sankey flow
  const data = React.useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;

    // Group Inflows (Income/Salary, Transfers, etc.)
    const inflows: { [name: string]: number } = {};
    // Group Outflows (Expenses by Category)
    const outflows: { [cat: string]: number } = {};

    filteredTransactions.forEach(tx => {
      if (tx.category === 'Transfers' && tx.amount < 0) return; // Ignore outgoing internal transfers
      
      if (tx.amount > 0) {
        // Group income by category name
        const name = tx.category || 'Income/Salary';
        inflows[name] = (inflows[name] || 0) + tx.amount;
        totalInflow += tx.amount;
      } else {
        const cat = tx.category || 'Uncategorized';
        const absAmt = Math.abs(tx.amount);
        outflows[cat] = (outflows[cat] || 0) + absAmt;
        totalOutflow += absAmt;
      }
    });

    return {
      inflows: Object.entries(inflows)
        .map(([name, val]) => ({ name, val }))
        .sort((a, b) => b.val - a.val),
      outflows: Object.entries(outflows)
        .map(([name, val]) => ({ name, val }))
        .sort((a, b) => b.val - a.val),
      totalInflow,
      totalOutflow
    };
  }, [filteredTransactions]);

  // Layout parameters for responsive coordinate space
  const svgWidth = 800;
  const svgHeight = 360;
  const nodeWidth = 16;
  const leftX = 80;
  const middleX = 390;
  const rightX = 700;
  const colPaddingY = 16;
  const nodePadding = 12;

  // Compute heights & Y coordinates
  const nodesAndLinks = React.useMemo(() => {
    if (data.totalInflow === 0 && data.totalOutflow === 0) {
      return { nodes: [], links: [] };
    }

    const { inflows, outflows, totalInflow, totalOutflow } = data;
    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];

    const maxColumnSum = Math.max(totalInflow, totalOutflow);
    const usableHeight = svgHeight - colPaddingY * 2;
    const valueToPixels = maxColumnSum > 0 ? usableHeight / maxColumnSum : 0;

    // Adjust margins for small flow heights
    const scaleValue = (val: number) => Math.max(val * valueToPixels, 2);

    // 1. LEFT COLUMN: Inflows
    let currentYLeft = colPaddingY;
    inflows.forEach((inf, idx) => {
      const h = scaleValue(inf.val);
      nodes.push({
        id: `in_${idx}`,
        name: inf.name,
        value: inf.val,
        column: 'left',
        color: CATEGORY_COLORS[inf.name] || '#10b981',
        x: leftX,
        y: currentYLeft,
        height: h
      });
      currentYLeft += h + nodePadding;
    });

    // If outflow exceeds inflow, add deficit node
    if (totalOutflow > totalInflow) {
      const deficit = totalOutflow - totalInflow;
      const h = scaleValue(deficit);
      nodes.push({
        id: 'in_deficit',
        name: 'Savings Draw / Deficit',
        value: deficit,
        column: 'left',
        color: '#f43f5e', // rose-500
        x: leftX,
        y: currentYLeft,
        height: h
      });
    }

    // 2. MIDDLE COLUMN: Central Pool
    const middleHeight = scaleValue(maxColumnSum);
    const middleY = (svgHeight - middleHeight) / 2;
    nodes.push({
      id: 'middle_pool',
      name: 'Central Cash Pool',
      value: maxColumnSum,
      column: 'middle',
      color: '#6366f1', // indigo-500
      x: middleX,
      y: middleY,
      height: middleHeight
    });

    // 3. RIGHT COLUMN: Outflows
    let currentYRight = colPaddingY;
    outflows.forEach((out, idx) => {
      const h = scaleValue(out.val);
      nodes.push({
        id: `out_${idx}`,
        name: out.name,
        value: out.val,
        column: 'right',
        color: CATEGORY_COLORS[out.name] || '#6b7280',
        x: rightX,
        y: currentYRight,
        height: h
      });
      currentYRight += h + nodePadding;
    });

    // If inflow exceeds outflow, add surplus node
    if (totalInflow > totalOutflow) {
      const surplus = totalInflow - totalOutflow;
      const h = scaleValue(surplus);
      nodes.push({
        id: 'out_surplus',
        name: 'Surplus / Savings',
        value: surplus,
        column: 'right',
        color: '#22c55e', // green-500
        x: rightX,
        y: currentYRight,
        height: h
      });
    }

    // 4. GENERATE LINKS
    // A. Left Column -> Middle Node
    let currentYSource = 0;
    nodes
      .filter(n => n.column === 'left')
      .forEach(sourceNode => {
        const linkHeight = scaleValue(sourceNode.value);
        links.push({
          id: `link_${sourceNode.id}_to_middle`,
          source: sourceNode.id,
          target: 'middle_pool',
          value: sourceNode.value,
          color: sourceNode.color,
          strokeWidth: linkHeight,
          sy: sourceNode.y + sourceNode.height / 2,
          ty: middleY + currentYSource + linkHeight / 2
        });
        currentYSource += linkHeight;
      });

    // B. Middle Node -> Right Column
    let currentYTarget = 0;
    nodes
      .filter(n => n.column === 'right')
      .forEach(targetNode => {
        const linkHeight = scaleValue(targetNode.value);
        links.push({
          id: `link_middle_to_${targetNode.id}`,
          source: 'middle_pool',
          target: targetNode.id,
          value: targetNode.value,
          color: targetNode.color,
          strokeWidth: linkHeight,
          sy: middleY + currentYTarget + linkHeight / 2,
          ty: targetNode.y + targetNode.height / 2
        });
        currentYTarget += linkHeight;
      });

    return { nodes, links };
  }, [data]);

  const handleNodeClick = (node: SankeyNode) => {
    if (node.column === 'right' && node.id !== 'out_surplus') {
      setCategoryFilter(node.name);
      setActiveTab('transactions');
    } else if (node.column === 'left' && node.id !== 'in_deficit') {
      setCategoryFilter(node.name);
      setActiveTab('transactions');
    }
  };

  const getBezierPath = (link: SankeyLink) => {
    const sx = link.source === 'middle_pool' ? middleX + nodeWidth : leftX + nodeWidth;
    const tx = link.target === 'middle_pool' ? middleX : rightX;
    const sy = link.sy;
    const ty = link.ty;
    const dx = Math.abs(tx - sx) / 2;
    return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
  };

  if (nodesAndLinks.nodes.length === 0) {
    return null;
  }

  // Active hover states
  const activeHoveredLinkObj = nodesAndLinks.links?.find(l => l.id === hoveredLink);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl shadow-slate-100/70 dark:shadow-black/20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h3 className="text-xl font-bold font-display text-slate-900 dark:text-white flex items-center gap-1.5">
            Cash MoneyFlow
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Visual mapping of inflow sources running into category outflows</p>
        </div>
        <div className="text-[10px] text-indigo-500 font-bold border border-indigo-500/20 bg-indigo-500/[0.03] px-3 py-1 rounded-full flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" /> Tap nodes to filter transaction list
        </div>
      </div>

      {/* Swipe to explore hint (mobile only) */}
      <div className="flex md:hidden items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold mx-auto w-fit mb-3 animate-pulse">
        <span>👈 Swipe horizontally to explore flow diagram</span>
      </div>

      {/* Responsive Horizontal Scroll Box */}
      <div className="w-full relative overflow-x-auto pb-2 scrollbar-none">
        <div className="min-w-[760px] h-[360px]">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            width="100%"
            height="100%"
            className="overflow-visible"
          >
            <defs>
              <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="1" dy="1" stdDeviation="2" floodOpacity="0.1" floodColor="#000" />
              </filter>
            </defs>

            {/* Paths (Links) */}
            <g>
              {nodesAndLinks.links?.map(link => {
                const path = getBezierPath(link);
                const isHovered = hoveredLink === link.id || 
                  (hoveredNode && (link.source === hoveredNode || link.target === hoveredNode));
                return (
                  <path
                    key={link.id}
                    d={path}
                    fill="none"
                    stroke={link.color}
                    strokeWidth={link.strokeWidth}
                    opacity={isHovered ? 0.45 : 0.16}
                    onMouseEnter={() => setHoveredLink(link.id)}
                    onMouseLeave={() => setHoveredLink(null)}
                    className="transition-all duration-150 cursor-pointer"
                  />
                );
              })}
            </g>

            {/* Nodes */}
            <g>
              {nodesAndLinks.nodes?.map(node => {
                const isClickable = node.id !== 'out_surplus' && node.id !== 'in_deficit' && node.id !== 'middle_pool';
                const isHovered = hoveredNode === node.id;
                
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => handleNodeClick(node)}
                    className={`transition-all duration-200 ${isClickable ? 'cursor-pointer' : ''}`}
                  >
                    {/* Node Rect */}
                    <rect
                      width={nodeWidth}
                      height={node.height}
                      fill={node.color}
                      rx={4}
                      opacity={isHovered ? 1 : 0.9}
                      filter="url(#node-shadow)"
                      className="transition-all duration-150"
                    />

                    {/* Node Label Text */}
                    <text
                      x={node.column === 'right' ? nodeWidth + 10 : -10}
                      y={node.height / 2 - 3}
                      dy="0.32em"
                      textAnchor={node.column === 'right' ? 'start' : 'end'}
                      className={`text-[11px] font-bold font-display ${
                        isHovered
                          ? 'fill-indigo-600 dark:fill-indigo-400'
                          : 'fill-slate-800 dark:fill-slate-200'
                      }`}
                    >
                      {node.name}
                    </text>
                    
                    {/* Node Value Label */}
                    <text
                      x={node.column === 'right' ? nodeWidth + 10 : -10}
                      y={node.height / 2 + 10}
                      dy="0.32em"
                      textAnchor={node.column === 'right' ? 'start' : 'end'}
                      className="text-[9px] font-semibold font-tabular fill-slate-400 dark:fill-slate-500"
                    >
                      {currencySymbol}{node.value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Floating Tooltip details inside Sankey Diagram */}
          {activeHoveredLinkObj && (
            <div className="absolute bg-slate-900 border border-slate-850 text-white rounded-2xl p-3 shadow-2xl text-xs pointer-events-none transition-all duration-75 z-20 font-semibold"
                 style={{
                   left: `${activeHoveredLinkObj.source === 'middle_pool' ? (middleX + rightX) / 2 : (leftX + middleX) / 2}px`,
                   top: `${(activeHoveredLinkObj.sy + activeHoveredLinkObj.ty) / 2 - 45}px`,
                   transform: 'translate(-50%, -50%)'
                 }}
            >
              <div className="text-slate-450 uppercase tracking-wider text-[8px] font-extrabold">Transfer Amount</div>
              <div className="flex items-center gap-1.5 mt-1 font-semibold text-slate-100">
                <span className="font-tabular text-sm font-extrabold text-teal-400">
                  {currencySymbol}{activeHoveredLinkObj.value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
