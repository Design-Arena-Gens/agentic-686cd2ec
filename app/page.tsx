"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Controls from "@/components/Controls";
import ChartCanvas from "@/components/ChartCanvas";
import RSIChart from "@/components/RSIChart";
import SignalsPanel from "@/components/SignalsPanel";
import type { AgentWeights, AlertConfig, Candle, MacroSnapshot, RSISeriesPoint, SRZone, Signal, Timeframe } from "@/lib/types";
import { computeRSI } from "@/lib/indicators";
import { buildZones } from "@/lib/sr";
import { generateSignals } from "@/lib/signals";
import { fetchKlines, subscribeKlines } from "@/lib/data/binance";
import { loadWeights, saveWeights, updateWeightsFromOutcomes } from "@/lib/agent";

const DEFAULT_TFS: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

export default function Page() {
  const [timeframes, setTimeframes] = useState<Timeframe[]>(DEFAULT_TFS);
  const [byTf, setByTf] = useState<Record<Timeframe, Candle[]>>({} as any);
  const [rsiTf, setRsiTf] = useState<Record<Timeframe, RSISeriesPoint[]>>({} as any);
  const [zonesTf, setZonesTf] = useState<Record<Timeframe, SRZone[]>>({} as any);
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [rsiSmoothing, setRsiSmoothing] = useState<"sma" | "ema">("ema");
  const [overbought, setOverbought] = useState(70);
  const [oversold, setOversold] = useState(30);
  const [macro, setMacro] = useState<MacroSnapshot | null>(null);
  const [weights, setWeights] = useState<AgentWeights>(() => loadWeights());
  const [signals, setSignals] = useState<Signal[]>([]);
  const [alerts, setAlerts] = useState<AlertConfig>({ enableDesktopNotifications: false, minConfidence: 0.6 });
  const [learning, setLearning] = useState(true);

  // Initial historical fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(timeframes.map(async (tf) => [tf, await fetchKlines(tf, 500)] as const));
      if (cancelled) return;
      const map = Object.fromEntries(entries) as Record<Timeframe, Candle[]>;
      setByTf(map);
    })();
    return () => { cancelled = true; };
  }, [timeframes.join(",")]);

  // Compute indicators per timeframe
  useEffect(() => {
    const rsiMap: any = {};
    const zoneMap: any = {};
    (Object.keys(byTf) as Timeframe[]).forEach((tf) => {
      const candles = byTf[tf];
      if (!candles) return;
      rsiMap[tf] = computeRSI(candles, rsiPeriod, rsiSmoothing);
      zoneMap[tf] = buildZones(candles);
    });
    setRsiTf(rsiMap);
    setZonesTf(zoneMap);
  }, [byTf, rsiPeriod, rsiSmoothing]);

  // Macro snapshot fetch
  useEffect(() => {
    let stale = false;
    const fetchMacro = async () => {
      try {
        const res = await fetch("/api/macro", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!stale) setMacro(json);
      } catch {}
    };
    fetchMacro();
    const id = setInterval(fetchMacro, 10 * 60 * 1000);
    return () => { stale = true; clearInterval(id); };
  }, []);

  // Generate signals
  const latestSignals = useMemo(() => generateSignals(byTf, rsiTf, zonesTf, macro, weights), [byTf, rsiTf, zonesTf, macro, weights]);
  useEffect(() => {
    if (!latestSignals.length) return;
    const last = latestSignals[latestSignals.length - 1];
    setSignals((prev) => [...prev, last].slice(-200));
    if (alerts.enableDesktopNotifications && last.confidence >= alerts.minConfidence && typeof window !== "undefined") {
      if (Notification && Notification.permission === "granted") {
        new Notification(`${last.type.toUpperCase()} ${(last.confidence * 100).toFixed(0)}%`, { body: `TF ${last.timeframe} ? ${new Date(last.time * 1000).toLocaleTimeString()}` });
      } else if (Notification && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }
  }, [latestSignals.map((s) => `${s.time}-${s.type}-${s.timeframe}`).join(","), alerts.enableDesktopNotifications, alerts.minConfidence]);

  // Learning loop: evaluate last N signals outcomes and update weights
  useEffect(() => {
    if (!learning) return;
    const N = 20;
    const recent = signals.slice(-N);
    if (!recent.length) return;
    const outcomes: number[] = recent.map((s) => {
      const candles = byTf[s.timeframe] || [];
      const idx = candles.findIndex((c) => c.time === s.time);
      if (idx < 0 || idx + 5 >= candles.length) return 0; // need 5 bars forward
      const entry = candles[idx].close;
      const exit = candles[idx + 5].close;
      const pnl = (exit - entry) / entry * (s.type === "buy" ? 1 : -1);
      return pnl;
    });
    const newW = updateWeightsFromOutcomes(weights, recent, outcomes);
    setWeights(newW);
    saveWeights(newW);
  }, [signals.map((s) => s.time).join(","), learning]);

  // Realtime updates via Binance websockets
  useEffect(() => {
    const unsub = subscribeKlines(timeframes, (tf, candle, isClosed) => {
      setByTf((prev) => {
        const list = prev[tf] ? [...prev[tf]] : [];
        const last = list[list.length - 1];
        if (last && last.time === candle.time) list[list.length - 1] = candle;
        else list.push(candle);
        return { ...prev, [tf]: list.slice(-600) };
      });
    });
    return () => unsub();
  }, [timeframes.join(",")]);

  const primaryTf: Timeframe = "5m";
  const mainCandles = byTf[primaryTf] || [];
  const mainZones = zonesTf[primaryTf] || [];
  const rsiMain = rsiTf[primaryTf] || [];

  const onSetAlerts = useCallback((a: AlertConfig) => {
    setAlerts(a);
    if (a.enableDesktopNotifications && typeof window !== "undefined" && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <>
      <div className="header">
        <div className="brand">Agentic ETH AI Trader</div>
        <div className="badge">ETHUSDT ? Live</div>
      </div>

      <div className="content">
        <Controls
          rsiPeriod={rsiPeriod}
          setRsiPeriod={setRsiPeriod}
          rsiSmoothing={rsiSmoothing}
          setRsiSmoothing={setRsiSmoothing}
          overbought={overbought}
          setOverbought={setOverbought}
          oversold={oversold}
          setOversold={setOversold}
          timeframes={timeframes}
          setTimeframes={setTimeframes}
          alerts={alerts}
          setAlerts={onSetAlerts}
          learning={learning}
          setLearning={setLearning}
        />

        <div>
          <ChartCanvas candles={mainCandles} zones={mainZones} signals={signals} />
          <div style={{ height: 12 }} />
          <RSIChart rsi={rsiMain} overbought={overbought} oversold={oversold} />
        </div>

        <SignalsPanel signals={signals} />
      </div>
    </>
  );
}
