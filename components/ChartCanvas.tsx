"use client";

import { createChart, ColorType, ISeriesApi, LineStyle } from "lightweight-charts";
import React, { useEffect, useRef } from "react";
import type { Candle, SRZone, Signal } from "@/lib/types";

type Props = {
  candles: Candle[];
  zones: SRZone[];
  signals: Signal[];
};

export default function ChartCanvas({ candles, zones, signals }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const zoneSeriesRef = useRef<ISeriesApi<"Line">[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#0b1220" }, textColor: "#d1d5db" },
      grid: { vertLines: { color: "#111827" }, horzLines: { color: "#111827" } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      crosshair: { mode: 0 },
    });
    const series = (chart as any).addCandlestickSeries({ upColor: "#22c55e", downColor: "#ef4444", borderVisible: false, wickUpColor: "#22c55e", wickDownColor: "#ef4444" });
    chartRef.current = chart;
    mainSeriesRef.current = series;
    const handleResize = () => chart.applyOptions({ width: containerRef.current!.clientWidth });
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, []);

  useEffect(() => {
    if (!mainSeriesRef.current) return;
    mainSeriesRef.current.setData(
      candles.map((c) => ({ time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close }))
    );
  }, [candles]);

  useEffect(() => {
    if (!chartRef.current) return;
    // clear old zone lines
    for (const s of zoneSeriesRef.current) chartRef.current.removeSeries(s);
    zoneSeriesRef.current = [];
    // draw new zones as two dotted lines
    zones.slice(0, 8).forEach((z) => {
      const top = (chartRef.current as any)!.addLineSeries({ color: "#60a5fa", lineWidth: 1, lineStyle: LineStyle.Dotted });
      const bot = (chartRef.current as any)!.addLineSeries({ color: "#60a5fa", lineWidth: 1, lineStyle: LineStyle.Dotted });
      top.setData(candles.map((c) => ({ time: c.time as any, value: z.priceHigh })));
      bot.setData(candles.map((c) => ({ time: c.time as any, value: z.priceLow })));
      zoneSeriesRef.current.push(top, bot);
    });
  }, [zones, candles]);

  useEffect(() => {
    if (!mainSeriesRef.current) return;
    // set markers for signals
    const markers = signals.map((s) => ({
      time: s.time as any,
      position: s.type === "buy" ? "belowBar" : "aboveBar",
      color: s.type === "buy" ? "#22c55e" : "#ef4444",
      shape: s.type === "buy" ? "arrowUp" : "arrowDown",
      text: `${s.type.toUpperCase()} ${(s.confidence * 100).toFixed(0)}% ${s.timeframe}`,
    }));
    (mainSeriesRef.current as any).setMarkers(markers);
  }, [signals]);

  return <div className="chart-container panel" ref={containerRef} />;
}
