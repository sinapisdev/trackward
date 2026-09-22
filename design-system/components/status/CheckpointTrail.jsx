import React from "react";
import { Icon } from "../core/Icon.jsx";

/* The trilha: the product's signature object. Done checkpoints are filled grey discs with
   a check, the current one is an open lime ring, future ones are hollow outlines, and the
   connector behind the current node is lime. */
export function CheckpointTrail({
  steps = [], current = 0, orientation = "horizontal", nowLabel = "Agora",
  numbered = true, labelIndex, onSelect, size = 28, style,
}) {
  const prefix = labelIndex == null ? numbered : labelIndex;
  const horizontal = orientation === "horizontal";
  return (
    <div style={horizontal
      ? { display: "grid", gridAutoFlow: "column", gridAutoColumns: "1fr", alignItems: "start", ...style }
      : { display: "grid", gap: 0, ...style }}>
      {steps.map((s, i) => {
        const step = typeof s === "string" ? { label: s } : s;
        const done = i < current, isNow = i === current;
        const node = (
          <span style={{
            width: size, height: size, flex: "none", borderRadius: "var(--r-pill)", display: "grid", placeItems: "center",
            background: done ? "var(--n-600)" : "transparent",
            border: done ? "none" : `2px solid ${isNow ? "var(--accent)" : "var(--n-700)"}`,
            color: isNow ? "var(--ink-0)" : "var(--ink-2)",
            font: `var(--fw-semibold) ${Math.round(size * 0.46)}px/1 var(--font-ui)`,
            boxShadow: isNow ? "0 0 0 5px rgba(208,250,60,.08)" : "none",
            transition: "var(--t-hover)",
          }}>
            {done ? <Icon name="check" style={{ width: size * 0.5, height: size * 0.5, strokeWidth: 3, color: "var(--ink-0)" }} />
              : numbered ? i + 1 : null}
          </span>
        );
        const line = (after) => (
          <span style={{
            flex: 1, height: 1, minWidth: 12,
            background: (after ? i < current : i <= current) ? "var(--accent)" : "var(--border-strong)",
            opacity: (after ? i < current : i <= current) ? .9 : 1,
          }} />
        );
        if (horizontal) {
          return (
            <div key={i} onClick={onSelect && (() => onSelect(i))}
              style={{ display: "grid", gap: 10, justifyItems: "center", cursor: onSelect ? "pointer" : "default", minWidth: 0 }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%", justifyContent: "center", height: size }}>
                <span style={{ position: "absolute", left: 0, right: "50%", height: 1, background: i === 0 ? "transparent" : i <= current ? "var(--accent)" : "var(--border-strong)" }} />
                <span style={{ position: "absolute", left: "50%", right: 0, height: 1, background: i === steps.length - 1 ? "transparent" : i < current ? "var(--accent)" : "var(--border-strong)" }} />
                <span style={{ position: "relative" }}>{node}</span>
                {isNow && nowLabel && (
                  <span style={{ position: "absolute", top: -26, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", color: "var(--ink-2)", font: "var(--type-meta)" }}>{nowLabel}</span>
                )}
              </div>
              <span style={{ display: "grid", gap: 3, justifyItems: "center", textAlign: "center", minWidth: 0 }}>
                <span style={{ color: isNow ? "var(--ink-0)" : done ? "var(--ink-1)" : "var(--ink-2)", font: `${isNow ? "var(--fw-semibold)" : "var(--fw-medium)"} var(--fs-ui)/1.3 var(--font-ui)` }}>
                  {prefix ? `${i + 1}. ` : ""}{step.label}
                </span>
                {step.meta && <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>{step.meta}</span>}
              </span>
            </div>
          );
        }
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: `${size}px minmax(0,1fr)`, gap: 16 }}>
            <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
              {node}
              {i < steps.length - 1 && <span style={{ width: 1, minHeight: 28, flex: 1, background: i < current ? "var(--accent)" : "var(--border-strong)" }} />}
            </div>
            <div style={{ display: "grid", gap: 3, paddingBottom: i < steps.length - 1 ? 22 : 0, marginTop: 2 }}>
              {isNow && nowLabel && <span style={{ color: "var(--accent)", font: "var(--type-meta)" }}>{nowLabel}</span>}
              <span style={{ color: isNow ? "var(--ink-0)" : "var(--ink-1)", font: `${isNow ? "var(--fw-semibold)" : "var(--fw-medium)"} var(--fs-body-lg)/1.25 var(--font-ui)` }}>
                {prefix ? `${i + 1}. ` : ""}{step.label}
              </span>
              {step.meta && <span style={{ color: "var(--ink-3)", font: "var(--type-meta)" }}>{step.meta}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
