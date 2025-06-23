// src/ components/ gridCell.tsc
import React from 'react';
import './GridCell.css';

interface GridCellProps {
  x: number;
  y: number;
  onClick: (x: number, y: number) => void;
}

const GridCell = ({ x, y, onClick }: GridCellProps) => {
  return (
    <div 
      className="grid-cell" 
      onClick={() => onClick(x, y)}
      title={`Cell (${x}, ${y})`}
    >
    </div>
  );
};

export default GridCell;