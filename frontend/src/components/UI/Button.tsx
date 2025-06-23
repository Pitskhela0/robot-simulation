// src/ components/ ui/ button.tsx
import React from 'react';
import './Button.css';


type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

const Button = ({ children, ...props }: ButtonProps) => {
  return (
    <button className="custom-button" {...props}>
      {children}
    </button>
  );
};

export default Button;