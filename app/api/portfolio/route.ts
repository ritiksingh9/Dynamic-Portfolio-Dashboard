import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { portfolio as demoPortfolio } from "@/src/data/portfolio";
import type { PortfolioHolding, StockHolding } from "@/src/types/portfolio";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 15_000;
const REQUEST_TIMEOUT_MS = 7_000;
const FAILED_QUOTE_RETRY_MS = 60_000;
const FUNDAMENTALS_CACHE_TTL_MS = 6 * 60 * 60 * 1_000;
const FAILED_FUNDAMENTALS_RETRY_MS = 15 * 60 * 1_000;
const MAX_CONCURRENT_QUOTES = 5;

type YahooQuote = {
  price: number;
  previousClose: number | null;
  live: boolean;
};

type CachedQuote = {
  value: YahooQuote;
  cachedAt: number;
};

type GoogleFundamentals = {
  peRatio: number | null;
  latestEarnings: number | null;
  live: boolean;
};

type CachedFundamentals = {
  value: GoogleFundamentals;
  cachedAt: number;
};

const YAHOO_SYMBOL_ALIASES: Record<string, string> = {
  "LTIM.NS": "LTM.NS",
};

const quoteCache = new Map<string, CachedQuote>();
const fundamentalsCache = new Map<string, CachedFundamentals>();

function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isStockHolding(value: unknown): value is StockHolding {
  if (typeof value !== "object" || value === null) return false;
  const stock = value as Record<string, unknown>;
  return (
    typeof stock.id === "string" &&
    typeof stock.name === "string" &&
    typeof stock.sector === "string" &&
    typeof stock.exchangeCode === "string" &&
    typeof stock.yahooSymbol === "string" &&
    typeof stock.purchasePrice === "number" &&
    Number.isFinite(stock.purchasePrice) &&
    stock.purchasePrice > 0 &&
    typeof stock.quantity === "number" &&
    Number.isFinite(stock.quantity) &&
    stock.quantity > 0 &&
    typeof stock.referencePrice === "number" &&
    Number.isFinite(stock.referencePrice) &&
    stock.referencePrice >= 0 &&
    (stock.peRatio === null ||
      (typeof stock.peRatio === "number" && Number.isFinite(stock.peRatio))) &&
    (stock.latestEarnings === null ||
      (typeof stock.latestEarnings === "number" && Number.isFinite(stock.latestEarnings)))
  );
}

async function loadPortfolio(): Promise<{
  holdings: StockHolding[];
  datasetSource: "private" | "demo";
}> {
  let content: string;
  try {
    content = await readFile(
      path.join(process.cwd(), "data", "portfolio.private.json"),
      "utf8",
    );
  } catch (error) {
    if (isMissingFile(error)) {
      return { holdings: demoPortfolio, datasetSource: "demo" };
    }
    console.error("Unable to read the local portfolio data file:", error);
    throw new Error("Portfolio data could not be read.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error("The local portfolio data file is not valid JSON:", error);
    throw new Error("Portfolio data is not valid JSON.");
  }

  if (
    !Array.isArray(parsed) ||
    parsed.length === 0 ||
    !parsed.every(isStockHolding) ||
    new Set(parsed.map((stock) => stock.id)).size !== parsed.length
  ) {
    throw new Error("Portfolio data must be a non-empty list of valid, uniquely identified holdings.");
  }

  return { holdings: parsed, datasetSource: "private" };
}

async function fetchYahooQuote(symbol: string, referencePrice: number): Promise<YahooQuote> {
  const yahooSymbol = YAHOO_SYMBOL_ALIASES[symbol] ?? symbol;
  const cached = quoteCache.get(yahooSymbol);
  const cacheTtl = cached?.value.live ? CACHE_TTL_MS : FAILED_QUOTE_RETRY_MS;
  if (cached && Date.now() - cached.cachedAt < cacheTtl) {
    return cached.value;
  }

  try {
    const url = new URL(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`,
    );
    url.searchParams.set("range", "1d");
    url.searchParams.set("interval", "1m");

    const response = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 PortfolioDashboard/1.0" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Yahoo Finance returned HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    const result = (
      payload as {
        chart?: {
          error?: { description?: string } | null;
          result?: Array<{
            meta?: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number };
            indicators?: { quote?: Array<{ close?: Array<number | null> }> };
          } | null> | null;
        };
      }
    ).chart;
    const chart = result?.result?.[0];
    if (result?.error || !chart) {
      throw new Error(result?.error?.description ?? "Yahoo Finance returned no quote");
    }

    const closes = chart.indicators?.quote?.[0]?.close ?? [];
    const latestClose = [...closes].reverse().find((close) => close !== null);
    const price = chart.meta?.regularMarketPrice ?? latestClose;
    if (typeof price !== "number" || !Number.isFinite(price)) {
      throw new Error("Yahoo Finance quote did not include a valid market price");
    }

    const quote = {
      price,
      previousClose: chart.meta?.chartPreviousClose ?? chart.meta?.previousClose ?? null,
      live: true,
    };
    quoteCache.set(yahooSymbol, { value: quote, cachedAt: Date.now() });
    return quote;
  } catch (error) {
    console.error(`Unable to refresh ${yahooSymbol}; using the local reference price:`, error);
    const fallback = { price: referencePrice, previousClose: null, live: false };
    quoteCache.set(yahooSymbol, { value: fallback, cachedAt: Date.now() });
    return fallback;
  }
}

function getGoogleFinanceSymbol(yahooSymbol: string): string | null {
  const match = /^(.+)\.(NS|BO)$/.exec(yahooSymbol);
  if (!match) return null;
  return `${match[1]}:${match[2] === "NS" ? "NSE" : "BOM"}`;
}

function extractGoogleMetric(html: string, label: "P/E ratio" | "EPS"): number | null {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<div class="KxsRFb">\\s*<div class="SwQK7">${escapedLabel}</div>\\s*<div class="dO6ijd">([^<]+)</div>\\s*</div>`,
  );
  const rawValue = html.match(pattern)?.[1];
  if (!rawValue) return null;

  const normalizedValue = rawValue
    .replace(/&minus;|−/g, "-")
    .replace(/&nbsp;|&#160;/g, "")
    .replace(/[₹,\s]/g, "");
  const value = Number(normalizedValue);
  return Number.isFinite(value) ? value : null;
}

async function fetchGoogleFundamentals(yahooSymbol: string): Promise<GoogleFundamentals> {
  const googleSymbol = getGoogleFinanceSymbol(yahooSymbol);
  if (!googleSymbol) {
    return { peRatio: null, latestEarnings: null, live: false };
  }

  const cached = fundamentalsCache.get(googleSymbol);
  const cacheTtl = cached?.value.live
    ? FUNDAMENTALS_CACHE_TTL_MS
    : FAILED_FUNDAMENTALS_RETRY_MS;
  if (cached && Date.now() - cached.cachedAt < cacheTtl) {
    return cached.value;
  }

  try {
    const url = new URL(
      `https://www.google.com/finance/quote/${encodeURIComponent(googleSymbol)}`,
    );
    url.searchParams.set("hl", "en");
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 PortfolioDashboard/1.0" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Google Finance returned HTTP ${response.status}`);
    }

    const html = await response.text();
    const peRatio = extractGoogleMetric(html, "P/E ratio");
    const latestEarnings = extractGoogleMetric(html, "EPS");
    const fundamentals = {
      peRatio,
      latestEarnings,
      live: peRatio !== null || latestEarnings !== null,
    };
    if (!fundamentals.live) {
      throw new Error("Google Finance page did not include P/E ratio or EPS metrics");
    }

    fundamentalsCache.set(googleSymbol, { value: fundamentals, cachedAt: Date.now() });
    return fundamentals;
  } catch (error) {
    console.error(`Unable to refresh Google Finance fundamentals for ${googleSymbol}:`, error);
    const fallback = { peRatio: null, latestEarnings: null, live: false };
    fundamentalsCache.set(googleSymbol, { value: fallback, cachedAt: Date.now() });
    return fallback;
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await worker(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

export async function GET() {
  const { holdings: portfolio, datasetSource } = await loadPortfolio();
  let liveQuoteFailures = 0;
  let fundamentalsFallbacks = 0;
  const holdings = await mapWithConcurrency(portfolio, MAX_CONCURRENT_QUOTES, async (stock) => {
    const [quote, fundamentals] = await Promise.all([
      fetchYahooQuote(stock.yahooSymbol, stock.referencePrice),
      fetchGoogleFundamentals(stock.yahooSymbol),
    ]);
    const cmp = quote.price;
    const previousClose = quote.previousClose;
    const priceSource: PortfolioHolding["priceSource"] = quote.live ? "yahoo" : "reference";
    if (!quote.live) liveQuoteFailures += 1;

    const peRatio = fundamentals.peRatio ?? stock.peRatio;
    const latestEarnings = fundamentals.latestEarnings ?? stock.latestEarnings;
    const peRatioSource: PortfolioHolding["peRatioSource"] =
      fundamentals.peRatio !== null
        ? "google-finance"
        : stock.peRatio === null
          ? "unavailable"
          : "workbook";
    const latestEarningsSource: PortfolioHolding["latestEarningsSource"] =
      fundamentals.latestEarnings !== null
        ? "google-finance"
        : stock.latestEarnings === null
          ? "unavailable"
          : "workbook";
    if (peRatioSource !== "google-finance" || latestEarningsSource !== "google-finance") {
      fundamentalsFallbacks += 1;
    }

    return {
      ...stock,
      peRatio,
      latestEarnings,
      peRatioSource,
      latestEarningsSource,
      cmp,
      previousClose,
      dayChangePercent:
        previousClose && previousClose > 0
          ? ((cmp - previousClose) / previousClose) * 100
          : null,
      investment: stock.purchasePrice * stock.quantity,
      presentValue: cmp * stock.quantity,
      gainLoss: (cmp - stock.purchasePrice) * stock.quantity,
      gainLossPercent: ((cmp - stock.purchasePrice) / stock.purchasePrice) * 100,
      portfolioPercent: 0,
      priceSource,
    };
  });

  const totalInvestment = holdings.reduce((sum, holding) => sum + holding.investment, 0);
  const totalPresentValue = holdings.reduce((sum, holding) => sum + holding.presentValue, 0);
  const totalGainLoss = totalPresentValue - totalInvestment;
  for (const holding of holdings) {
    holding.portfolioPercent =
      totalInvestment > 0 ? (holding.investment / totalInvestment) * 100 : 0;
  }

  const warnings: string[] = [];
  if (liveQuoteFailures > 0) {
    warnings.push(
      `${liveQuoteFailures} of ${portfolio.length} live quotes could not be refreshed. Those rows use local reference prices.`,
    );
  }
  if (fundamentalsFallbacks > 0) {
    warnings.push(
      `Google Finance P/E or EPS data was unavailable for ${fundamentalsFallbacks} of ${portfolio.length} holdings. Workbook values are shown where available.`,
    );
  }

  return NextResponse.json(
    {
      holdings,
      totals: {
        investment: totalInvestment,
        presentValue: totalPresentValue,
        gainLoss: totalGainLoss,
        gainLossPercent:
          totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0,
      },
      updatedAt: new Date().toISOString(),
      refreshIntervalMs: CACHE_TTL_MS,
      datasetSource,
      warnings,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
