"use client";

import type { PointerEvent as ReactPointerEvent } from "react";

export interface TouchButton {
  code: string;
  label: string;
}

function dispatchKeyEvent(type: "keydown" | "keyup", code: string) {
  window.dispatchEvent(
    new KeyboardEvent(type, { code, key: code, bubbles: true }),
  );
}

function TouchButtonEl({ button }: { button: TouchButton }) {
  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    dispatchKeyEvent("keydown", button.code);
  };
  const handlePointerUp = () => dispatchKeyEvent("keyup", button.code);

  return (
    <button
      type="button"
      className="btn touch-btn"
      style={{ touchAction: "none" }}
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
          <TouchButtonEl key={button.code} button={button} />
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
