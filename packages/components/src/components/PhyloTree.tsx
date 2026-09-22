import React from "react";
import { cluster, hierarchy, HierarchyPointNode } from "d3";
import randomColor from "randomcolor";
import { css } from "@emotion/css";

function TreeBranch({ node, shadeBranchBySupport }: TreeNodeProps) {
  return (
    <path
      d={`M${node.parent!.y},${node.parent!.x}
          L${node.parent!.y},${node.x}
          L${node.y},${node.x}`}
      className={css({
        fill: "none",
        stroke: "black",
        strokeWidth: 0.75,
        opacity: shadeBranchBySupport ? Number(node.parent!.data.name) : 0.9,
      })}
    />
  );
}

function defaultLeafText({
  node,
  fontSize = 11,
}: {
  node: HierarchyPointNode<Tree>;
  fontSize?: number;
}): JSX.Element {
  const {
    data: { name },
  } = node;
  return (
    <text
      x={0}
      y={0}
      className={css({ fontFamily: "sans-serif", fontSize: `${fontSize}` })}
    >
      {name}
    </text>
  );
}

function LeafNode({
  node,
  colorFunction,
  leafTextComponent,
}: // alignTips,
TreeNodeProps) {
  const {
    data: { name },
    x,
  } = node;
  // const textY = alignTips ? node.tipAlignY || node.y + 10 : node.y + 10;
  const textY = node.y + 10;
  const nodeY = node.y + 4;
  const colorSeed =
    typeof colorFunction !== "undefined" ? colorFunction(node) : name;
  const LeafTextComponent =
    typeof leafTextComponent === "undefined"
      ? defaultLeafText
      : leafTextComponent;
  return (
    <g className="tipnode">
      <title>{name}</title>
      <line
        x1={nodeY}
        x2={textY}
        y1={x}
        y2={x}
        className={css({
          stroke: "darkgrey",
          strokeWidth: 1,
          strokeDasharray: "1,2",
        })}
      />
      <circle
        className={css({ fill: randomColor({ seed: colorSeed }) })}
        cy={x}
        cx={nodeY}
        r="4.5"
      />
      <g transform={`translate(${textY},${x + 4})`}>
        <LeafTextComponent node={node} />
      </g>
    </g>
  );
}

function InternalNode({ node, fontSize, showSupportValues }: TreeNodeProps) {
  if (!showSupportValues) return <></>;
  const { data, x, y } = node;
  const { name } = data;
  return (
    <text
      x={y + 3}
      y={x + 2}
      dominantBaseline="middle"
      className={css({ fontSize, fontFamily: "sans-serif" })}
    >
      {name}
    </text>
  );
}

export type TreeNodeProps = {
  node: HierarchyPointNode<Tree>;
  showSupportValues?: boolean;
  shadeBranchBySupport?: boolean;
  colorFunction?: ColorFn;
  leafTextComponent?: LeafFn;
  fontSize: number;
  alignTips?: boolean;
};

/** @public */
export type Tree = {
  ID?: string | number;
  name: string;
  color_regex?: string;
  length: number;
  children: Tree[];
};

export type Node = {
  children?: Node[];
  data: Tree;
  depth: number;
  height: number;
  parent: Node;
  value: number;
  x: number;
  y: number;
  tipAlignY?: number;
};

function defaultColorFunction(node: HierarchyPointNode<Tree>): string {
  const { data } = node;
  const { name } = data;
  return name.split(" ").slice(0, -1).join();
}

function setNodeHeight(
  node: Node,
  currentHeight: number,
  scalingFactor: number
): void {
  node.tipAlignY = node.y;
  node.y = (currentHeight + node.data.length) * scalingFactor;
  if (node.children) {
    node.children.forEach((childNode) =>
      setNodeHeight(childNode, currentHeight + node.data.length, scalingFactor)
    );
  }
}

/** @public */
export type LeafFn = (arg0: {
  node: HierarchyPointNode<Tree>;
  fontSize?: number;
}) => JSX.Element;

/** @public */
export type ColorFn = (node: HierarchyPointNode<Tree>) => string;

/** @public */
export interface PhyloTreeProps {
  // Recursively defined tree object: `children` of a Tree are also a Tree */
  tree: Tree;
  // Maximum height in pixels
  height?: number;
  width?: number;
  cladogram?: boolean;
  showSupportValues?: boolean;
  shadeBranchBySupport?: boolean;
  colorFunction?: ColorFn;
  fontSize?: number;
  alignTips?: boolean;
  leafTextComponent?: LeafFn;
}

/**
 * @public
 * @returns JSX.Element
 */
export function PhyloTree({
  tree,
  height = 900,
  width = 1000,
  cladogram = false,
  showSupportValues = true,
  shadeBranchBySupport = true,
  colorFunction = defaultColorFunction,
  fontSize = 10,
  alignTips = true,
  leafTextComponent = defaultLeafText,
}: PhyloTreeProps): JSX.Element {
  const margin = {
    top: 10,
    bottom: 10,
    left: 20,
    right: 500,
  };

  const treeLayout = cluster<Tree>()
    .size([
      height - margin.top - margin.bottom,
      width - margin.left - margin.right,
    ])
    .separation(() => 1);

  const treeRoot = hierarchy(tree);

  const treeData = treeLayout(treeRoot);
  // treeData.sum((node: HierarchyPointNode<Tree>) => node.depth);

  if (!cladogram) {
    const initialHeight = 0;
    const scalingFactor = 400;
    setNodeHeight(treeData as unknown as Node, initialHeight, scalingFactor);
  }

  const nodes = treeData.descendants().filter((node) => node.parent);

  return (
    <div className="tree">
      <svg width={width} height={height}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {nodes.map((node) => {
            const TreeNode =
              typeof node.children === "undefined" ? LeafNode : InternalNode;
            return (
              <React.Fragment key={`${node.x}_${node.y}`}>
                <TreeBranch
                  node={node}
                  fontSize={fontSize}
                  shadeBranchBySupport={shadeBranchBySupport}
                />
                <TreeNode
                  node={node}
                  fontSize={fontSize}
                  showSupportValues={showSupportValues}
                  colorFunction={colorFunction}
                  alignTips={alignTips}
                  leafTextComponent={leafTextComponent}
                />
              </React.Fragment>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
