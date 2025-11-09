"use client";

import React from "react";
import type { AlertConfig, Timeframe } from "@/lib/types";

type Props = {
  rsiPeriod: number;
  setRsiPeriod: (v: number) => void;
  rsiSmoothing: "sma" | "ema";
  setRsiSmoothing: (v: "sma" | "ema") => void;
  overbought: number;
  setOverbought: (v: number) => void;
  oversold: number;
  setOversold: (v: number) => void;
  timeframes: Timeframe[];
  setTimeframes: (t: Timeframe[]) => void;
  alerts: AlertConfig;
  setAlerts: (a: AlertConfig) => void;
  learning: boolean;
  setLearning: (v: boolean) => void;
};

const ALL_TF: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

export default function Controls(props: Props) {
  const { rsiPeriod, setRsiPeriod, rsiSmoothing, setRsiSmoothing, overbought, setOverbought, oversold, setOversold, timeframes, setTimeframes, alerts, setAlerts, learning, setLearning } = props;
  const toggleTf = (tf: Timeframe) => {
    const set = new Set(timeframes);
    if (set.has(tf)) set.delete(tf); else set.add(tf);
    setTimeframes(Array.from(set).sort((a, b) => ALL_TF.indexOf(a) - ALL_TF.indexOf(b)));
  };

  return (
    <div className="panel controls">
      <h3>Controls</h3>
      <div className="panel-body">
        <label>RSI Period</label>
        <input type="number" min={2} max={100} value={rsiPeriod} onChange={(e) => setRsiPeriod(parseInt(e.target.value))} />

        <label>RSI Smoothing</label>
        <select value={rsiSmoothing} onChange={(e) => setRsiSmoothing(e.target.value as any)}>
          <option value="ema">EMA</option>
          <option value="sma">SMA</option>
        </select>

        <label>Overbought</label>
        <input type="number" min={50} max={100} value={overbought} onChange={(e) => setOverbought(parseInt(e.target.value))} />

        <label>Oversold</label>
        <input type="number" min={0} max={50} value={oversold} onChange={(e) => setOversold(parseInt(e.target.value))} />

        <label>Timeframes</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {ALL_TF.map((tf) => (
            <button key={tf} className={`button ${timeframes.includes(tf) ? "primary" : ""}`} onClick={() => toggleTf(tf)}>{tf}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
          <span className="badge">Alerts</span>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={alerts.enableDesktopNotifications} onChange={(e) => setAlerts({ ...alerts, enableDesktopNotifications: e.target.checked })} /> Desktop notifications
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            Min confidence
            <input type="number" min={0} max={1} step={0.05} value={alerts.minConfidence} onChange={(e) => setAlerts({ ...alerts, minConfidence: parseFloat(e.target.value) })} />
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
          <span className="badge">Learning</span>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={learning} onChange={(e) => setLearning(e.target.checked)} /> Enable agent learning
          </label>
        </div>
      </div>
    </div>
  );
}
