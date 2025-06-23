// src/ components/ ui/ input
import React from 'react';
import './Input.css';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = (props: InputProps) => {
  return <input className="custom-input" {...props} />;
};

export default Input;