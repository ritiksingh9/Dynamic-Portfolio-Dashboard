"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FundamentalSource, PortfolioHolding, PortfolioResponse } from "@/src/types/portfolio";

const REFRESH_INTERVAL_MS = 15_000;
const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const compactMoney = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 2,
});
const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

type SectorSummary = {
  name: string;
  holdings: PortfolioHolding[];
  investment: number;
  presentValue: number;
  gainLoss: number;
};

const SECTOR_COLORS = ["#178466", "#5b9bd5", "#e6a23c", "#8a76c2", "#d66b72", "#55a6a1"];

function formatMoney(value: number, compact = false) {
  return (compact ? compactMoney : money).format(value);
}

function formatMetric(value: number | null) {
  return value === null ? "—" : number.format(value);
}

function formatSource(source: FundamentalSource) {
  if (source === "google-finance") return "GOOGLE";
  if (source === "workbook") return "FILE";
  return "N/A";
}

function formatTime(value: string | null) {
  if (!value) return "Connecting to market data…";
  return `Updated ${new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value))}`;
}

function Icon({
  name,
  size = 18,
}: {
  name: "grid" | "briefcase" | "chart" | "refresh" | "search" | "arrow" | "chevron";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  const shapes = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m7 14 4-4 4 3 6-7" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.8-2L20 12M4 12l2.6 5a7 7 0 0 0 11.8-2" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.4 4.4" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    chevron: <path d="m7 10 5 5 5-5" />,
  };
  return <svg {...common}>{shapes[name]}</svg>;
}

function MetricCard({
  label,
  value,
  note,
  icon,
  tone = "plain",
}: {
  label: string;
  value: string;
  note: string;
  icon: "briefcase" | "chart" | "arrow";
  tone?: "plain" | "positive" | "negative";
}) {
  return (
    <article className="metric-card">
      <div className="metric-card-top">
        <span className="metric-label">{label}</span>
        <span className={`metric-icon metric-icon-${tone}`}><Icon name={icon} size={17} /></span>
      </div>
      <p className={`metric-value ${tone !== "plain" ? tone : ""}`}>{value}</p>
      <p className="metric-note">{note}</p>
    </article>
  );
}

function SectorCard({ sector, total }: { sector: SectorSummary; total: number }) {
  const share = total > 0 ? (sector.investment / total) * 100 : 0;
  const positive = sector.gainLoss >= 0;
  return (
    <article className="sector-card">
      <div className="sector-card-heading">
        <div>
          <p className="sector-name">{sector.name}</p>
          <p className="sector-count">{sector.holdings.length} holdings</p>
        </div>
        <span className={`sector-return ${positive ? "positive" : "negative"}`}>
          {positive ? "+" : ""}{number.format((sector.gainLoss / sector.investment) * 100)}%
        </span>
      </div>
      <div className="sector-bar"><span style={{ width: `${Math.min(share, 100)}%` }} /></div>
      <div className="sector-card-foot">
        <span>{formatMoney(sector.investment, true)} invested</span>
        <strong className={positive ? "positive" : "negative"}>{positive ? "+" : ""}{formatMoney(sector.gainLoss, true)}</strong>
      </div>
    </article>
  );
}

function SectorAllocationChart({ sectors, total }: { sectors: SectorSummary[]; total: number }) {
  let accumulatedShare = 0;
  const allocations = sectors.map((sector, index) => {
    const share = total > 0 ? (sector.investment / total) * 100 : 0;
    const allocation = {
      ...sector,
      color: SECTOR_COLORS[index % SECTOR_COLORS.length],
      share,
      start: accumulatedShare,
      end: accumulatedShare + share,
    };
    accumulatedShare += share;
    return allocation;
  });
  const chartBackground = allocations.length
    ? `conic-gradient(${allocations.map(({ color, start, end }) => `${color} ${start}% ${end}%`).join(", ")})`
    : "#e9edf2";

  return (
    <article className="allocation-chart-card">
      <h3>Investment by sector</h3>
      <div className="allocation-chart-content">
        <div
          className="pie-chart"
          role="img"
          aria-label={`Portfolio investment allocation by sector: ${allocations.map(({ name, share }) => `${name} ${number.format(share)} percent`).join(", ") || "No data"}`}
          style={{ background: chartBackground }}
        />
        <ul className="allocation-legend">
          {allocations.map(({ name, share, color }) => (
            <li key={name}>
              <span className="allocation-swatch" style={{ backgroundColor: color }} />
              <span className="allocation-name">{name}</span>
              <strong>{number.format(share)}%</strong>
            </li>
          ))}
          {allocations.length === 0 && <li className="allocation-empty">No sector data available</li>}
        </ul>
      </div>
      <p className="allocation-chart-total">{formatMoney(total, true)} total invested</p>
    </article>
  );
}

export default function Home() {
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All sectors");
  const [sortBy, setSortBy] = useState<"value" | "gain" | "name">("value");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const refreshInFlight = useRef(false);

  const refresh = useCallback(async (showSpinner = false) => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    if (showSpinner) setRefreshing(true);
    try {
      const response = await fetch("/api/portfolio", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Portfolio refresh failed (HTTP ${response.status}).`);
      }
      const nextData = (await response.json()) as PortfolioResponse;
      setData(nextData);
      setLastUpdated(nextData.updatedAt);
      setError(null);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Unable to refresh your portfolio. Please try again.",
      );
    } finally {
      refreshInFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const sectors = useMemo<SectorSummary[]>(() => {
    if (!data) return [];
    const groups = new Map<string, PortfolioHolding[]>();
    for (const holding of data.holdings) {
      const items = groups.get(holding.sector) ?? [];
      items.push(holding);
      groups.set(holding.sector, items);
    }
    return Array.from(groups, ([name, holdings]) => ({
      name,
      holdings,
      investment: holdings.reduce((sum, holding) => sum + holding.investment, 0),
      presentValue: holdings.reduce((sum, holding) => sum + holding.presentValue, 0),
      gainLoss: holdings.reduce((sum, holding) => sum + holding.gainLoss, 0),
    }));
  }, [data]);

  const visibleHoldings = useMemo(() => {
    if (!data) return [];
    const filtered = data.holdings.filter((holding) => {
      const matchesQuery = `${holding.name} ${holding.exchangeCode}`
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      return matchesQuery && (sectorFilter === "All sectors" || holding.sector === sectorFilter);
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "gain") return b.gainLoss - a.gainLoss;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return b.presentValue - a.presentValue;
    });
  }, [data, query, sectorFilter, sortBy]);

  const gainPositive = (data?.totals.gainLoss ?? 0) >= 0;
  const selectedSector = sectorFilter !== "All sectors";

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="8Byte Capital Portfolio home">
          <span className="brand-mark"><span /></span>
          <span className="brand-copy">8Byte<span>CAPITAL</span></span>
        </a>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-item active" href="#overview"><Icon name="grid" />Overview</a>
          <a className="nav-item" href="#holdings"><Icon name="briefcase" />Holdings</a>
          <a className="nav-item" href="#sectors"><Icon name="chart" />Sectors</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="market-status"><span className="status-dot" /><div><strong>Market data</strong><span>Yahoo Finance · unofficial</span></div></div>
          <p className="sidebar-disclaimer">For informational purposes only. Not investment advice.</p>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Portfolio overview</strong></div>
          <div className="topbar-right">
            <span className="updated-label"><span className="status-dot" />{formatTime(lastUpdated)}</span>
            <button className="refresh-button" type="button" onClick={() => void refresh(true)} disabled={refreshing}>
              <span className={refreshing ? "spin" : ""}><Icon name="refresh" size={16} /></span>
              <span>{refreshing ? "Refreshing" : "Refresh"}</span>
            </button>
            <div className="avatar" aria-label="Portfolio owner">A</div>
          </div>
        </header>

        <div className="dashboard-content" id="overview">
          <section className="page-heading">
            <div>
              <p className="eyebrow">YOUR MONEY, IN FOCUS</p>
              <h1>Portfolio overview</h1>
              <p className="page-subtitle">A clear view of your investments, all in one place.</p>
            </div>
            <div className="heading-badges">
              {data && <span className={`data-mode ${data.datasetSource}`}>{data.datasetSource === "private" ? "Private portfolio" : "Demo data"}</span>}
              <div className="refresh-chip"><span className="live-dot" />Live quotes <span>·</span> refresh every 15 sec</div>
            </div>
          </section>

          {error && <div className="alert alert-error" role="alert">{error} Showing the latest available values.</div>}
          {data?.datasetSource === "demo" && <div className="alert alert-warning" role="status">Demo portfolio shown. Your private holdings file is not included in this copy of the project.</div>}

          <section className="metrics-grid" aria-label="Portfolio summary">
            <MetricCard
              label="Total investment"
              value={data ? formatMoney(data.totals.investment) : loading ? "Loading…" : "—"}
              note={`${data?.holdings.length ?? "—"} holdings across ${sectors.length || "—"} sectors`}
              icon="briefcase"
            />
            <MetricCard
              label="Current value"
              value={data ? formatMoney(data.totals.presentValue) : loading ? "Loading…" : "—"}
              note="Based on latest available prices"
              icon="chart"
            />
            <MetricCard
              label="Total returns"
              value={data ? `${gainPositive ? "+" : ""}${formatMoney(data.totals.gainLoss)}` : loading ? "Loading…" : "—"}
              note={data ? `${gainPositive ? "+" : ""}${number.format(data.totals.gainLossPercent)}% overall return` : "Compared with your purchase cost"}
              icon="arrow"
              tone={data ? (gainPositive ? "positive" : "negative") : "plain"}
            />
          </section>

          <section className="content-section" id="sectors">
            <div className="section-heading">
              <div><h2>Sector allocation</h2><p>See where your capital is invested</p></div>
              <a className="text-link" href="#holdings">View holdings <span>→</span></a>
            </div>
            <div className="allocation-layout">
              <SectorAllocationChart sectors={sectors} total={data?.totals.investment ?? 0} />
              <div className="sector-grid">
                {sectors.map((sector) => <SectorCard key={sector.name} sector={sector} total={data?.totals.investment ?? 0} />)}
              </div>
            </div>
          </section>

          <section className="holdings-section" id="holdings">
            <div className="section-heading holdings-heading">
              <div><h2>Your holdings</h2><p>Prices refresh automatically; Google Finance fundamentals are cached between refreshes.</p></div>
              <span className="holdings-count">{visibleHoldings.length} of {data?.holdings.length ?? 0} stocks</span>
            </div>

            <div className="table-toolbar">
              <label className="search-box">
                <Icon name="search" size={17} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stocks or symbols" aria-label="Search holdings" />
              </label>
              <label className="filter-select">
                <span className="sr-only">Filter by sector</span>
                <select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)}>
                  <option>All sectors</option>
                  {sectors.map((sector) => <option key={sector.name}>{sector.name}</option>)}
                </select>
                <Icon name="chevron" size={15} />
              </label>
              <label className="filter-select sort-select">
                <span className="sr-only">Sort holdings</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
                  <option value="value">Sort: value</option>
                  <option value="gain">Sort: return</option>
                  <option value="name">Sort: name</option>
                </select>
                <Icon name="chevron" size={15} />
              </label>
            </div>

            <div className="table-scroll">
              <table>
                <thead><tr>
                  <th>Particulars</th><th>Purchase price</th><th>Qty</th><th>Investment</th>
                  <th>Portfolio</th><th>NSE / BSE</th><th>CMP</th><th>Present value</th>
                  <th>Gain / loss</th><th>P/E ratio</th><th>Latest earnings (EPS / share)</th>
                </tr></thead>
                <tbody>
                  {loading && !data && <tr><td className="empty-state" colSpan={11}>Loading your portfolio…</td></tr>}
                  {!loading && visibleHoldings.map((holding) => {
                    const positive = holding.gainLoss >= 0;
                    return <tr key={holding.id}>
                      <td><div className="stock-name">{holding.name}</div><div className="stock-sector">{holding.sector}</div></td>
                      <td>{formatMoney(holding.purchasePrice)}</td>
                      <td>{number.format(holding.quantity)}</td>
                      <td>{formatMoney(holding.investment)}</td>
                      <td>{number.format(holding.portfolioPercent)}%</td>
                      <td><span className="exchange-code">{holding.exchangeCode}</span></td>
                      <td><div className="cmp-value">{formatMoney(holding.cmp)}</div><span className={`price-source ${holding.priceSource}`}>{holding.priceSource === "yahoo" ? "LIVE" : "REF"}</span></td>
                      <td className="cell-strong">{formatMoney(holding.presentValue)}</td>
                      <td><span className={`gain-value ${positive ? "positive" : "negative"}`}>{positive ? "+" : ""}{formatMoney(holding.gainLoss)}</span><span className={`gain-percent ${positive ? "positive" : "negative"}`}>{positive ? "+" : ""}{number.format(holding.gainLossPercent)}%</span></td>
                      <td>
                        <div>{formatMetric(holding.peRatio)}</div>
                        <span className={`fundamental-source ${holding.peRatioSource}`}>{formatSource(holding.peRatioSource)}</span>
                      </td>
                      <td>
                        <div>{holding.latestEarnings === null ? "—" : formatMoney(holding.latestEarnings)}</div>
                        <span className={`fundamental-source ${holding.latestEarningsSource}`}>{formatSource(holding.latestEarningsSource)}</span>
                      </td>
                    </tr>;
                  })}
                  {!loading && visibleHoldings.length === 0 && <tr><td className="empty-state" colSpan={11}>{selectedSector ? "No holdings match your search in this sector." : "No holdings match your search."}</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="table-footnote">LIVE / REF = Yahoo Finance quote / local reference price · GOOGLE = unofficial Google Finance P/E or EPS per share · FILE = supplied workbook snapshot · N/A = no value available. EPS is per-share earnings, not total or quarterly company earnings.</p>
          </section>

          <footer className="page-footer">
            <span>Market data is indicative and may be delayed. Verify prices before making investment decisions.</span>
            <a href="https://finance.yahoo.com/" target="_blank" rel="noreferrer">Data via Yahoo Finance <Icon name="arrow" size={13} /></a>
          </footer>
        </div>
      </section>
    </main>
  );
}
