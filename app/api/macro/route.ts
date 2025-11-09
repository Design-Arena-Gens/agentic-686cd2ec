import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [globalRes, ethRes, btcRes] = await Promise.all([
      fetch("https://api.coingecko.com/api/v3/global", { cache: "no-store" }),
      fetch("https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=30&interval=hourly", { cache: "no-store" }),
      fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=hourly", { cache: "no-store" }),
    ]);
    const global = await globalRes.json();
    const eth = await ethRes.json();
    const btc = await btcRes.json();

    const btcDom: number = global?.data?.market_cap_percentage?.btc ?? 0;
    const ethPrices: number[] = (eth?.prices ?? []).map((p: any) => p[1]);
    const btcPrices: number[] = (btc?.prices ?? []).map((p: any) => p[1]);

    const ethRets = returns(ethPrices);
    const btcRets = returns(btcPrices);
    const corr = pearson(ethRets, btcRets);

    const vol = realizedVolatility(ethRets);
    // crude proxy for news momentum: recent price drift vs last 24h
    const last = ethPrices[ethPrices.length - 1];
    const prev = ethPrices[Math.max(0, ethPrices.length - 25)];
    const drift = (last - prev) / prev;
    const newsMomentum = Math.max(-1, Math.min(1, drift * 10));

    return NextResponse.json({
      btcEthCorrelation: corr,
      btcDominance: btcDom,
      realizedVolatility: vol,
      newsMomentum,
      timestamp: Math.floor(Date.now() / 1000),
    });
  } catch (e) {
    return NextResponse.json({ error: "macro_fetch_failed" }, { status: 500 });
  }
}

function returns(prices: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) out.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  return out;
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
  for (let i = 0; i < n; i++) {
    const x = a[a.length - n + i];
    const y = b[b.length - n + i];
    sumA += x; sumB += y; sumAB += x * y; sumA2 += x * x; sumB2 += y * y;
  }
  const cov = sumAB / n - (sumA / n) * (sumB / n);
  const varA = sumA2 / n - (sumA / n) ** 2;
  const varB = sumB2 / n - (sumB / n) ** 2;
  const denom = Math.sqrt(varA * varB) || 1e-9;
  return cov / denom;
}

function realizedVolatility(rets: number[]): number {
  if (rets.length === 0) return 0;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const varr = rets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / rets.length;
  const daily = Math.sqrt(varr * 24); // hourly -> daily
  return daily * Math.sqrt(365) * 100; // annualized %
}
