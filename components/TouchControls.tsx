"use client";

import type { PointerEvent as ReactPointerEvent } from "react";

export interface TouchButton {
  code: string;
  label: string;
  // true si el engine del juego actual no escucha este code: el botón se
  // muestra igual (para mantener el layout fijo) pero deshabilitado.
  disabled?: boolean;
}

function dispatchKeyEvent(type: "keydown" | "keyup", code: string) {
  window.dispatchEvent(
    new KeyboardEvent(type, { code, key: code, bubbles: true }),
  );
}

const DPAD_POSITION: Record<string, string> = {
  ArrowUp: "dpad-up",
  ArrowDown: "dpad-down",
  ArrowLeft: "dpad-left",
  ArrowRight: "dpad-right",
};

function TouchButtonEl({
  button,
  className,
}: {
  button: TouchButton;
  className?: string;
}) {
  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (button.disabled) return;
    event.preventDefault();
    dispatchKeyEvent("keydown", button.code);
  };
  const handlePointerUp = () => {
    if (button.disabled) return;
    dispatchKeyEvent("keyup", button.code);
  };

  return (
    <button
      type="button"
      className={`btn touch-btn${button.disabled ? " touch-btn-disabled" : ""}${className ? ` ${className}` : ""}`}
      style={{ touchAction: "none" }}
      disabled={button.disabled}
      aria-disabled={button.disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {button.label}
    </button>
  );
}

export function TouchControls(props: {
  dpad: TouchButton[];
  actions: TouchButton[];
}) {
  const { dpad, actions } = props;

  return (
    <div className="touch-controls">
      <div className="touch-controls-group touch-controls-dpad">
        {dpad.map((button) => (
          <TouchButtonEl
            key={button.code}
            button={button}
            className={DPAD_POSITION[button.code]}
          />
        ))}
      </div>
      {actions.length > 0 && (
        <div className="touch-controls-group touch-controls-actions">
          {actions.map((button) => (
            <TouchButtonEl key={button.code} button={button} />
          ))}
        </div>
      )}
    </div>
  );
}
