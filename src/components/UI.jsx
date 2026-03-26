import React from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
import { theme } from '../styles/theme';

export const AppField = ({ label, children, className = "" }) => (
  <div className={clsx("flex flex-col gap-3", className)}>
    <div className="flex items-center min-h-[32px]">
      <label className={theme.label}>{label}</label>
      <div className="flex gap-2 ml-4">
        {children}
      </div>
    </div>
  </div>
);

export const AppButton = ({ text, action, icon, size = "sub", active = false, className = "", title = "" }) => (
  <button 
    onClick={action}
    title={title}
    className={clsx(
      size === "main" ? theme.btn.main : theme.btn.sub,
      active && "bg-[#818cf8] text-white",
      className
    )}
  >
    {icon}
    {text}
  </button>
);

export const AppPill = ({ text, active, action, className = "" }) => (
  <button
    onClick={action}
    className={clsx(theme.pill.base, active ? theme.pill.active : theme.pill.inactive, className)}
  >
    {text}
  </button>
);

export const AppInput = ({ className = "", ...props }) => (
  <input 
    {...props} 
    className={clsx(theme.input, "font-bold", className)} 
  />
);

export const AppTextArea = React.forwardRef(({ minHeight = "100px", className = "", ...props }, ref) => (
  <textarea
    ref={ref}
    {...props}
    style={{ minHeight, ...props.style }}
    className={clsx(theme.input, "leading-relaxed", className)}
  />
));

export const AppSelect = ({ className = "", children, ...props }) => (
  <div className={clsx("relative w-full", className)}>
    <select 
      {...props} 
      className={theme.select}
    >
      {children}
    </select>
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#818cf8]">
      <ChevronDown size={18} strokeWidth={3} />
    </div>
  </div>
);
