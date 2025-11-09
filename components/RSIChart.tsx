"use client";

import { createChart, ColorType, ISeriesApi } from "lightweight-charts";
import React, { useEffect, useRef } from "react";
import type { RSISeriesPoint } from "@/lib/types";

type Props = { rsi: RSISeriesPoint[]; overbought: number; oversold: number };

export default function RSIChart({ rsi, overbought, oversold }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const obRef = useRef<ISeriesApi<"Line"> | null>(null);
  const osRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#0b1220" }, textColor: "#d1d5db" },
      grid: { vertLines: { color: "#111827" }, horzLines: { color: "#111827" } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      height: containerRef.current.clientHeight,
    });
    const series = (chart as any).addLineSeries({ color: "#c084fc", lineWidth: 2 });
    const ob = (chart as any).addLineSeries({ color: "#ef4444", lineWidth: 1 });
    const os = (chart as any).addLineSeries({ color: "#22c55e", lineWidth: 1 });
    chartRef.current = chart;
    seriesRef.current = series;
    obRef.current = ob;
    osRef.current = os;
    const handleResize = () => chart.applyOptions({ width: containerRef.current!.clientWidth });
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !obRef.current || !osRef.current) return;
    seriesRef.current.setData(rsi as any);
    if (rsi.length) {
      const times = rsi.map((p) => p.time as any);
      obRef.current.setData(times.map((t) => ({ time: t, value: overbought })));
      osRef.current.setData(times.map((t) => ({ time: t, value: oversold })));
    }
  }, [rsi, overbought, oversold]);

  return <div className="rsi-container panel" ref={containerRef} />;
}
