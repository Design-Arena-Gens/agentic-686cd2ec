"use client";

import React from "react";
import type { Signal } from "@/lib/types";

type Props = { signals: Signal[] };

export default function SignalsPanel({ signals }: Props) {
  return (
    <div className="panel">
      <h3>Signals</h3>
      <div className="panel-body" style={{ maxHeight: 480, overflow: "auto" }}>
        {signals.length === 0 && <div style={{ color: "#9ca3af" }}>No signals yet.</div>}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {signals.slice().reverse().map((s, idx) => (
            <li key={idx} style={{ padding: "8px 6px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong className={s.type === "buy" ? "signal-buy" : "signal-sell"}>{s.type.toUpperCase()}</strong>
                <span className="badge">{(s.confidence * 100).toFixed(0)}%</span>
              </div>
              <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 4 }}>TF: {s.timeframe} ? {new Date(s.time * 1000).toLocaleString()}</div>
              <div style={{ fontSize: 12, color: "#d1d5db", marginTop: 4 }}>{s.reasons.join(" ? ")}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
