import * as React from "react";

export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly checkedColor?: string; // Màu khi bật, ví dụ: "bg-violet-600", "bg-amber-500"
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className = "", checked, onCheckedChange, checkedColor = "bg-blue-600", ...props }, ref) => {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        ref={ref}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full 
          transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 
          focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
          ${checked ? checkedColor : "bg-slate-200"}
          ${className}
        `}
        onClick={() => onCheckedChange(!checked)}
        {...props}
      >
        <span
          className={`
            pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 
            transition-transform duration-200 ease-in-out
            ${checked ? "translate-x-5" : "translate-x-0.5"}
          `}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";
