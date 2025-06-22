// src/components/Grid/Grid.tsx
import React from 'react';
import GridCell from './GridCell';
import './Grid.css';

interface GridProps {
  width: number;
  height: number;
  onCellClick: (x: number, y: number) => void;
}

const Grid = ({ width, height, onCellClick }: GridProps) => {
  const cells = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push(
        <GridCell key={`${x}-${y}`} x={x} y={y} onClick={onCellClick} />
      );
    }
  }

  // We use a CSS variable to dynamically set the number of columns
  const gridStyle = {
    '--grid-width': width,
  } as React.CSSProperties;

  return (
    <div className="grid-container" style={gridStyle}>
      {cells}
    </div>
  );
};

export default Grid;