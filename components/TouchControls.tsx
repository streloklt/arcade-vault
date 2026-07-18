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

const DPAD_ARROW_PATH: Record<string, string> = {
  ArrowUp: "M12 4 L20 16 L4 16 Z",
  ArrowRight: "M8 4 L20 12 L8 20 Z",
  ArrowDown: "M4 8 L20 8 L12 20 Z",
  ArrowLeft: "M16 4 L16 20 L4 12 Z",
};

function DpadButtonEl({ button }: { button: TouchButton }) {
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
      className={`btn touch-btn dp${DPAD_POSITION[button.code] ? ` ${DPAD_POSITION[button.code]}` : ""}${button.disabled ? " touch-btn-disabled" : ""}`}
      style={{ touchAction: "none" }}
      disabled={button.disabled}
      aria-disabled={button.disabled}
      aria-label={button.label}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <svg className="dp-arrow" viewBox="0 0 24 24">
        <path d={DPAD_ARROW_PATH[button.code]} fill="currentColor" />
      </svg>
    </button>
  );
}

function AbButtonEl({
  button,
  variant,
}: {
  button: TouchButton;
  variant: "a" | "b";
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
      className={`btn touch-btn ab ${variant}${button.disabled ? " touch-btn-disabled" : ""}`}
      style={{ touchAction: "none" }}
      disabled={button.disabled}
      aria-disabled={button.disabled}
      aria-label={button.label}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <span className="ab-ring" />
      <span className="ab-letter">{button.label}</span>
    </button>
  );
}

export function TouchControls(props: {
  dpad: TouchButton[];
  actions: TouchButton[];
}) {
  const { dpad, actions } = props;
  const buttonB = actions.find((button) => button.label === "B");
  const buttonA = actions.find((button) => button.label === "A");

  return (
    <div className="gp" role="group" aria-label="Gamepad">
      <div className="gp-body">
        <div className="gp-col gp-col-left">
          <div className="touch-controls-group touch-controls-dpad gp-dpad">
            {dpad.map((button) => (
              <DpadButtonEl key={button.code} button={button} />
            ))}
            <div className="dp-hub" aria-hidden="true">
              <span className="dp-hub-gem" />
            </div>
          </div>
        </div>
        {actions.length > 0 && (
          <div className="gp-col gp-col-right">
            <div className="touch-controls-group touch-controls-actions gp-actions">
              {buttonB && (
                <AbButtonEl key={buttonB.code} button={buttonB} variant="b" />
              )}
              {buttonA && (
                <AbButtonEl key={buttonA.code} button={buttonA} variant="a" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
