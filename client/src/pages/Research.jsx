import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Info, ArrowUpRight, Zap, Award } from 'lucide-react';

const SECTORS = [
  {
    id: 'financials',
    name: 'Financial Services',
    ticker: 'FINNIFTY',
    weight: 33.1,
    ytd: 3.8, sixM: -2.1, oneY: 7.2,
    pe: 18.2, divYield: 0.8,
    rating: 'HOLD',
    color52wLow: 19200, color52wHigh: 23800, colorCurrent: 21400,
    niftyPoints: 7944,
    mcapBreak: { mega: 62, large: 28, mid: 10 },
    holdings: [
      { name: 'HDFC Bank', weight: 28.4 },
      { name: 'ICICI Bank', weight: 19.2 },
      { name: 'Kotak Bank', weight: 8.1 },
      { name: 'State Bank', weight: 7.9 },
      { name: 'Axis Bank', weight: 5.2 },
    ],
    news: 'RBI rate pause signals credit cycle recovery. HDFC Bank margins stabilising post-merger.',
  },
  {
    id: 'it',
    name: 'Information Technology',
    ticker: 'NIFTYIT',
    weight: 13.2,
    ytd: 12.4, sixM: 8.2, oneY: 19.8,
    pe: 28.4, divYield: 1.2,
    rating: 'BUY',
    color52wLow: 32400, color52wHigh: 42800, colorCurrent: 40200,
    niftyPoints: 3168,
    mcapBreak: { mega: 74, large: 22, mid: 4 },
    holdings: [
      { name: 'TCS', weight: 30.2 },
      { name: 'Infosys', weight: 22.1 },
      { name: 'HCL Tech', weight: 8.4 },
      { name: 'Wipro', weight: 7.2 },
      { name: 'Tech Mahindra', weight: 4.8 },
    ],
    news: 'US BFSI deal ramp-up accelerating. AI-led deal momentum driving double-digit TCV growth across tier-1 IT.',
  },
  {
    id: 'auto',
    name: 'Consumer Discretionary',
    ticker: 'NIFTYAUTO',
    weight: 9.2,
    ytd: 18.6, sixM: 11.4, oneY: 28.4,
    pe: 32.1, divYield: 0.6,
    rating: 'BUY',
    color52wLow: 18800, color52wHigh: 28400, colorCurrent: 27100,
    niftyPoints: 2208,
    mcapBreak: { mega: 48, large: 38, mid: 14 },
    holdings: [
      { name: 'M&M', weight: 22.1 },
      { name: 'Maruti Suzuki', weight: 18.4 },
      { name: 'Tata Motors', weight: 15.2 },
      { name: 'Bajaj Auto', weight: 12.8 },
      { name: 'Hero Moto', weight: 7.4 },
    ],
    news: 'EV volume surge + SUV upcycle driving premium mix. M&M order book at record highs.',
  },
  {
    id: 'energy',
    name: 'Energy',
    ticker: 'NIFTYENERGY',
    weight: 8.6,
    ytd: -4.2, sixM: -8.4, oneY: 2.4,
    pe: 14.8, divYield: 3.2,
    rating: 'HOLD',
    color52wLow: 28400, color52wHigh: 38200, colorCurrent: 30100,
    niftyPoints: 2064,
    mcapBreak: { mega: 82, large: 14, mid: 4 },
    holdings: [
      { name: 'Reliance Ind.', weight: 45.2 },
      { name: 'ONGC', weight: 12.4 },
      { name: 'IOC', weight: 9.8 },
      { name: 'BPCL', weight: 8.4 },
      { name: 'Coal India', weight: 7.2 },
    ],
    news: 'Crude at $72 pressuring refining margins. Reliance Jio IPO hype partially offsetting sector drag.',
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    ticker: 'NIFTYPHARMA',
    weight: 7.4,
    ytd: 22.8, sixM: 14.2, oneY: 31.6,
    pe: 35.2, divYield: 0.4,
    rating: 'STRONG BUY',
    color52wLow: 14200, color52wHigh: 22800, colorCurrent: 22100,
    niftyPoints: 1776,
    mcapBreak: { mega: 36, large: 42, mid: 22 },
    holdings: [
      { name: 'Sun Pharma', weight: 22.4 },
      { name: "Dr Reddy's", weight: 12.8 },
      { name: 'Cipla', weight: 10.4 },
      { name: "Divi's Labs", weight: 9.2 },
      { name: 'Apollo Hospitals', weight: 8.8 },
    ],
    news: 'US FDA inspection tailwinds + domestic API demand. Biosimilar pipeline approvals ahead of schedule.',
  },
  {
    id: 'materials',
    name: 'Materials',
    ticker: 'NIFTYMETAL',
    weight: 6.8,
    ytd: -8.2, sixM: -12.4, oneY: -6.8,
    pe: 12.4, divYield: 2.8,
    rating: 'SELL',
    color52wLow: 7800, color52wHigh: 11400, colorCurrent: 8200,
    niftyPoints: 1632,
    mcapBreak: { mega: 28, large: 44, mid: 28 },
    holdings: [
      { name: 'Tata Steel', weight: 18.4 },
      { name: 'JSW Steel', weight: 16.2 },
      { name: 'Hindalco', weight: 14.8 },
      { name: 'SAIL', weight: 10.4 },
      { name: 'NMDC', weight: 8.2 },
    ],
    news: 'China steel overcapacity dampening global prices. Domestic HRC prices down 8% YTD.',
  },
  {
    id: 'industrials',
    name: 'Industrials',
    ticker: 'NIFTYINFRA',
    weight: 6.4,
    ytd: 14.2, sixM: 8.8, oneY: 22.4,
    pe: 38.4, divYield: 0.8,
    rating: 'BUY',
    color52wLow: 7200, color52wHigh: 10800, colorCurrent: 10400,
    niftyPoints: 1536,
    mcapBreak: { mega: 32, large: 46, mid: 22 },
    holdings: [
      { name: 'L&T', weight: 28.4 },
      { name: 'Siemens India', weight: 12.4 },
      { name: 'ABB India', weight: 9.8 },
      { name: 'BHEL', weight: 8.2 },
      { name: 'Cummins India', weight: 6.4 },
    ],
    news: 'Govt capex ₹11.1L cr budget intact. Defense PLI orders surging; L&T order book at record ₹5.6L cr.',
  },
  {
    id: 'staples',
    name: 'Consumer Staples',
    ticker: 'NIFTYFMCG',
    weight: 5.2,
    ytd: 6.4, sixM: 3.8, oneY: 10.2,
    pe: 42.8, divYield: 1.8,
    rating: 'HOLD',
    color52wLow: 52800, color52wHigh: 66400, colorCurrent: 61200,
    niftyPoints: 1248,
    mcapBreak: { mega: 54, large: 36, mid: 10 },
    holdings: [
      { name: 'HUL', weight: 24.4 },
      { name: 'ITC', weight: 22.1 },
      { name: 'Nestle India', weight: 12.8 },
      { name: 'Britannia', weight: 8.4 },
      { name: 'Dabur', weight: 6.2 },
    ],
    news: 'Rural demand recovery underway. Volume growth returning but margins still under RM cost pressure.',
  },
  {
    id: 'telecom',
    name: 'Communication Services',
    ticker: 'NIFTYTELECOM',
    weight: 3.2,
    ytd: 28.4, sixM: 16.8, oneY: 42.2,
    pe: 82.4, divYield: 0.2,
    rating: 'BUY',
    color52wLow: 2800, color52wHigh: 4800, colorCurrent: 4600,
    niftyPoints: 768,
    mcapBreak: { mega: 68, large: 24, mid: 8 },
    holdings: [
      { name: 'Bharti Airtel', weight: 62.4 },
      { name: 'Indus Towers', weight: 22.4 },
      { name: 'Vodafone Idea', weight: 8.2 },
      { name: 'MTNL', weight: 4.2 },
      { name: 'Tata Comm', weight: 2.8 },
    ],
    news: '5G monetisation via enterprise and FWA accelerating. Airtel ARPU crossed ₹240; next target ₹300.',
  },
  {
    id: 'realty',
    name: 'Real Estate',
    ticker: 'NIFTYREALTY',
    weight: 2.4,
    ytd: 16.2, sixM: 9.4, oneY: 28.8,
    pe: 48.2, divYield: 0.2,
    rating: 'BUY',
    color52wLow: 880, color52wHigh: 1280, colorCurrent: 1220,
    niftyPoints: 576,
    mcapBreak: { mega: 0, large: 62, mid: 38 },
    holdings: [
      { name: 'DLF', weight: 22.4 },
      { name: 'Godrej Properties', weight: 18.2 },
      { name: 'Prestige Estates', weight: 14.8 },
      { name: 'Oberoi Realty', weight: 12.4 },
      { name: 'Brigade Enterprises', weight: 8.2 },
    ],
    news: 'Housing demand resilient in ₹1cr+ segment. Office leasing at record 72M sqft. REITs gaining traction.',
  },
  {
    id: 'utilities',
    name: 'Utilities',
    ticker: 'NIFTYPSE',
    weight: 1.8,
    ytd: 4.8, sixM: 2.4, oneY: 8.2,
    pe: 22.4, divYield: 2.4,
    rating: 'HOLD',
    color52wLow: 3200, color52wHigh: 4400, colorCurrent: 3860,
    niftyPoints: 432,
    mcapBreak: { mega: 42, large: 44, mid: 14 },
    holdings: [
      { name: 'NTPC', weight: 32.4 },
      { name: 'Power Grid', weight: 28.4 },
      { name: 'Tata Power', weight: 18.2 },
      { name: 'Adani Green', weight: 12.4 },
      { name: 'CESC', weight: 4.2 },
    ],
    news: 'Renewable capacity addition at 18GW/yr. Govt grid modernisation spend supporting Power Grid earnings.',
  },
];

const TOP3_ANALYSIS = [
  {
    rank: 1,
    sector: 'Healthcare',
    ticker: 'NIFTYPHARMA',
    ytd: 22.8,
    target6M: '+18–25%',
    thesis: 'FDA approval pipeline strongest in 5 years. Domestic formulations growing 12% driven by insurance penetration. Biosimilar launches in EU & US markets de-risking revenue. Defensive earnings quality stands out in an uncertain macro.',
    catalysts: ['US FDA EIR receipts for 6 key plants', 'Biosimilar EU launches (Q2 2026)', 'Domestic NLEM revision — net positive', 'Strong Q4 FY26 earnings expected'],
    risk: 'INR appreciation, regulatory delays',
    icon: '🧬',
  },
  {
    rank: 2,
    sector: 'Communication Services',
    ticker: 'NIFTYTELECOM',
    thesis: 'Airtel ARPU trajectory to ₹300 by FY27 is a structural re-rating story. 5G fixed wireless access (FWA) displacing broadband in Tier 2/3 cities. Enterprise connectivity deals accelerating. Duopoly pricing power is unprecedented in Indian telecom history.',
    ytd: 28.4,
    target6M: '+20–30%',
    catalysts: ['Airtel Q1 FY27 ARPU print', '5G FWA subscriber ramp (target 10M by FY27)', 'Potential Jio IPO — sector re-rating', 'Spectrum auction clarity'],
    risk: 'Regulatory risk, capex intensity',
    icon: '📡',
  },
  {
    rank: 3,
    sector: 'Industrials',
    ticker: 'NIFTYINFRA',
    ytd: 14.2,
    target6M: '+15–22%',
    thesis: 'India\'s ₹11.1 lakh crore capex budget is flowing into roads, rail, and defence. L&T\'s order book at record ₹5.6L crore. Defence PLI creating a new domestic manufacturing ecosystem. The capex supercycle is in its 3rd year with no sign of slowdown.',
    catalysts: ['Railway electrification orders', 'Defence export targets (₹50,000 cr by FY27)', 'Budget infrastructure allocation intact', 'Private capex revival (power + data centres)'],
    risk: 'Election-cycle delays in order execution',
    icon: '🏗️',
  },
];

const DOUBLE_SECTOR = {
  sector: 'Communication Services',
  ticker: 'NIFTYTELECOM',
  current: 4600,
  target: '8,000–10,000',
  timeframe: '18–24 months',
  ytd: 28.4,
  why: [
    'Airtel is the only large-cap telecom with positive free cash flow and rising ARPU simultaneously.',
    'India\'s 5G subscriber base expected to hit 500M by FY28 — FWA monetisation has barely started.',
    'Jio IPO (expected FY27) will force a sector re-rating as global funds benchmark allocation.',
    'ARPU trajectory from ₹240 → ₹300+ implies 25% revenue CAGR with high operating leverage.',
    'Indus Towers capex cycle peaking — EBITDA margins set to expand 300–400bps in FY27.',
  ],
  newsItems: [
    { date: 'May 2026', headline: 'Airtel Q4 FY26 ARPU hits ₹248 — street estimates breached by 8%' },
    { date: 'Apr 2026', headline: 'Jio FWA crosses 8M subscribers; targeting 15M by Dec 2026' },
    { date: 'Mar 2026', headline: 'DoT 5G spectrum pricing stays frozen — removes key overhang' },
    { date: 'Feb 2026', headline: 'Airtel Enterprise revenues grow 28% YoY driven by cloud + connectivity' },
  ],
};

const RATING_COLORS = {
  'STRONG BUY': { bg: 'rgba(34,255,136,0.15)', color: '#22ff88', border: 'rgba(34,255,136,0.3)' },
  'BUY': { bg: 'rgba(34,197,94,0.1)', color: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  'HOLD': { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
  'SELL': { bg: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'rgba(239,68,68,0.25)' },
};

function getYtdColor(ytd) {
  if (ytd >= 20) return { bg: 'rgba(34,197,94,0.18)', border: 'rgba(34,197,94,0.4)', text: '#22c55e' };
  if (ytd >= 10) return { bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.25)', text: '#4ade80' };
  if (ytd >= 0) return { bg: 'rgba(34,197,94,0.05)', border: 'rgba(34,197,94,0.15)', text: '#86efac' };
  if (ytd >= -5) return { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.18)', text: '#fca5a5' };
  return { bg: 'rgba(239,68,68,0.14)', border: 'rgba(239,68,68,0.35)', text: '#f87171' };
}

function ReturnBadge({ val }) {
  const pos = val >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      fontSize: 11, fontFamily: 'var(--font-mono)',
      color: pos ? '#22c55e' : '#f87171',
    }}>
      {pos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {pos ? '+' : ''}{val.toFixed(1)}%
    </span>
  );
}

function SectorCard({ s, sortKey }) {
  const [expanded, setExpanded] = useState(false);
  const colors = getYtdColor(s.ytd);
  const ratColor = RATING_COLORS[s.rating] || RATING_COLORS['HOLD'];
  const range52w = s.color52wHigh - s.color52wLow;
  const pct = Math.max(0, Math.min(100, ((s.colorCurrent - s.color52wLow) / range52w) * 100));

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      style={{
        background: '#12151c',
        border: `1px solid ${expanded ? colors.border : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 16,
        padding: 20,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: expanded ? `0 0 32px ${colors.bg}` : 'none',
        animation: 'fadeSlideIn 0.5s ease both',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{s.name}</div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>{s.ticker}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 6,
            background: ratColor.bg, color: ratColor.color, border: `1px solid ${ratColor.border}`,
          }}>{s.rating}</span>
          {expanded ? <ChevronUp size={14} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.3)" />}
        </div>
      </div>

      {/* Returns Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[['YTD', s.ytd], ['6M', s.sixM], ['1Y', s.oneY]].map(([label, val]) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 3, letterSpacing: '0.05em' }}>{label}</div>
            <ReturnBadge val={val} />
          </div>
        ))}
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>P/E</div>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#fff' }}>{s.pe}x</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Div Yield</div>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#fff' }}>{s.divYield}%</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Wt</div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.7)' }}>{s.weight}%</div>
        </div>
      </div>

      {/* YTD colour bar */}
      <div style={{ height: 3, borderRadius: 9999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 9999,
          width: `${Math.abs(s.ytd) / 45 * 100}%`,
          background: s.ytd >= 0 ? 'linear-gradient(90deg,#22c55e,#4ade80)' : 'linear-gradient(90deg,#ef4444,#f87171)',
          transition: 'width 0.8s ease',
        }} />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ marginTop: 18, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
          {/* Top 5 Holdings */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Top 5 Holdings</div>
            {s.holdings.map(h => (
              <div key={h.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', flex: 1 }}>{h.name}</span>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.45)', width: 36, textAlign: 'right' }}>{h.weight}%</span>
                <div style={{ width: 60, height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(h.weight / s.holdings[0].weight) * 100}%`, background: colors.text, borderRadius: 9999 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Market Cap Breakdown */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Market Cap Mix</div>
            <div style={{ display: 'flex', height: 8, borderRadius: 9999, overflow: 'hidden', gap: 1 }}>
              <div style={{ flex: s.mcapBreak.mega, background: '#6366f1' }} title={`Mega ${s.mcapBreak.mega}%`} />
              <div style={{ flex: s.mcapBreak.large, background: '#8b5cf6' }} title={`Large ${s.mcapBreak.large}%`} />
              <div style={{ flex: s.mcapBreak.mid, background: '#a78bfa' }} title={`Mid ${s.mcapBreak.mid}%`} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 5 }}>
              {[['Mega', '#6366f1', s.mcapBreak.mega], ['Large', '#8b5cf6', s.mcapBreak.large], ['Mid', '#a78bfa', s.mcapBreak.mid]].map(([l, c, v]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{l} {v}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 52-Week Range */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>52-Week Range</div>
            <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 9999 }}>
              <div style={{
                position: 'absolute', left: `${pct}%`, top: '50%', transform: 'translate(-50%,-50%)',
                width: 12, height: 12, borderRadius: '50%', background: colors.text,
                border: '2px solid #12151c', boxShadow: `0 0 8px ${colors.text}`,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.35)' }}>{s.color52wLow.toLocaleString()}</span>
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#fff' }}>{s.colorCurrent.toLocaleString()} ▲</span>
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.35)' }}>{s.color52wHigh.toLocaleString()}</span>
            </div>
          </div>

          {/* News */}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, fontStyle: 'italic', borderLeft: `2px solid ${colors.text}`, paddingLeft: 10 }}>
            {s.news}
          </div>
        </div>
      )}
    </div>
  );
}

const SORT_OPTIONS = [
  { key: 'ytd', label: 'YTD Return' },
  { key: 'weight', label: 'Index Weight' },
  { key: 'pe', label: 'P/E Ratio' },
  { key: 'divYield', label: 'Div Yield' },
];

const INDEX_DATA = [
  { label: 'NIFTY 50', value: '24,183', change: '+0.38%', pos: true },
  { label: 'NIFTY 500', value: '22,641', change: '+0.52%', pos: true },
  { label: 'SENSEX', value: '79,408', change: '+0.41%', pos: true },
];

export default function Research() {
  const [sortKey, setSortKey] = useState('ytd');
  const [sortDesc, setSortDesc] = useState(true);
  const [showExplainer, setShowExplainer] = useState(false);

  const sorted = [...SECTORS].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    return sortDesc ? bv - av : av - bv;
  });

  const maxPoints = Math.max(...SECTORS.map(s => s.niftyPoints));

  return (
    <div style={{ color: '#fff' }}>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 16px rgba(34,255,136,0.2); }
          50% { box-shadow: 0 0 32px rgba(34,255,136,0.45); }
        }
      `}</style>

      {/* Page Header */}
      <div style={{ marginBottom: 32, animation: 'fadeSlideIn 0.4s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'linear-gradient(135deg, #22ff88, #06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(34,255,136,0.3)',
              }}>
                <TrendingUp size={16} color="#000" />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
                NIFTY 500 Sector Research
              </h1>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              11 GICS sectors · colour-coded by YTD performance · tap any card to expand
            </p>
          </div>

          {/* Index Pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {INDEX_DATA.map(idx => (
              <div key={idx.label} style={{
                background: '#12151c', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '8px 14px',
              }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', marginBottom: 3 }}>{idx.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{idx.value}</span>
                  <span style={{ fontSize: 11, color: idx.pos ? '#22c55e' : '#f87171', fontFamily: 'var(--font-mono)' }}>{idx.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap', animation: 'fadeSlideIn 0.5s ease both' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Sort by:</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => { if (sortKey === opt.key) setSortDesc(d => !d); else { setSortKey(opt.key); setSortDesc(true); } }}
              style={{
                background: sortKey === opt.key ? 'rgba(34,255,136,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${sortKey === opt.key ? 'rgba(34,255,136,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 9999, padding: '6px 14px', fontSize: 12, cursor: 'pointer',
                color: sortKey === opt.key ? '#22ff88' : 'rgba(255,255,255,0.55)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {opt.label}
              {sortKey === opt.key && (sortDesc ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowExplainer(e => !e)}
          style={{
            marginLeft: 'auto', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9999,
            padding: '6px 14px', fontSize: 12, cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <Info size={13} /> {showExplainer ? 'Hide' : 'What is this?'}
        </button>
      </div>

      {/* Beginner Explainer */}
      {showExplainer && (
        <div style={{
          background: '#12151c', border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 16, padding: 20, marginBottom: 24,
          animation: 'fadeSlideIn 0.3s ease both',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#818cf8' }}>📚 Beginner's Guide to Sector Heatmaps</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
            {[
              ['What are GICS sectors?', 'The 11 Global Industry Classification Standard sectors group companies with similar business activities — from banks to pharma to tech.'],
              ['What does YTD mean?', 'Year-To-Date: how much the sector index has gained or lost since January 1st of the current year.'],
              ['What is P/E ratio?', 'Price-to-Earnings: how much investors pay per ₹1 of profit. High P/E = growth expectations; low P/E = value territory.'],
              ['What is Div Yield?', 'The annual dividend income as a % of current index price. Higher yield often signals mature, cash-generative businesses.'],
            ].map(([title, desc]) => (
              <div key={title} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 5, color: '#fff' }}>{title}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, animation: 'fadeSlideIn 0.5s ease both' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Performance</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <span style={{ fontSize: 10, color: '#f87171', fontFamily: 'var(--font-mono)' }}>-15%</span>
          <div style={{
            width: 180, height: 8, borderRadius: 9999, margin: '0 8px',
            background: 'linear-gradient(90deg, #ef4444, #fca5a5, rgba(255,255,255,0.1), #86efac, #22c55e)',
          }} />
          <span style={{ fontSize: 10, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>+30%</span>
        </div>
      </div>

      {/* Sector Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 16,
        marginBottom: 48,
      }}>
        {sorted.map((s, i) => (
          <div key={s.id} style={{ animationDelay: `${i * 0.05}s` }}>
            <SectorCard s={s} sortKey={sortKey} />
          </div>
        ))}
      </div>

      {/* ═══ ANALYSIS SECTION ═══ */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 40, marginBottom: 40 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Market Intelligence</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Sector Analysis & Outlook</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 32px' }}>Based on latest news, earnings, and macro data — May 2026</p>

        {/* Index Points Breakdown */}
        <div style={{ background: '#12151c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>NIFTY 500 — Index Points Contribution</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>How many NIFTY 50 points each sector approximately contributes (at 24,000 level)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...SECTORS].sort((a, b) => b.niftyPoints - a.niftyPoints).map(s => {
              const colors = getYtdColor(s.ytd);
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', width: 180, flexShrink: 0 }}>{s.name}</span>
                  <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 9999,
                      width: `${(s.niftyPoints / maxPoints) * 100}%`,
                      background: s.ytd >= 0 ? `linear-gradient(90deg, ${colors.text}, rgba(255,255,255,0.3))` : `linear-gradient(90deg, #ef4444, #fca5a5)`,
                      transition: 'width 1s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.5)', width: 60, textAlign: 'right' }}>{s.niftyPoints.toLocaleString()} pts</span>
                  <ReturnBadge val={s.ytd} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 3 Sectors */}
        <div style={{ background: '#12151c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Award size={18} color="#fbbf24" />
            <div style={{ fontSize: 14, fontWeight: 700 }}>Top 3 Sectors to Watch — Next 6 Months</div>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>Sectors with the best risk-adjusted return potential based on current macro & earnings cycle</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
            {TOP3_ANALYSIS.map(t => (
              <div key={t.rank} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16, padding: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, fontSize: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: t.rank === 1 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                    border: t.rank === 1 ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  }}>{t.icon}</div>
                  <div>
                    <div style={{ fontSize: 9, color: t.rank === 1 ? '#fbbf24' : 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', marginBottom: 2 }}>#{t.rank} PICK</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{t.sector}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>6M Target</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>{t.target6M}</div>
                  </div>
                </div>

                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, marginBottom: 14 }}>{t.thesis}</p>

                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', marginBottom: 8, textTransform: 'uppercase' }}>Key Catalysts</div>
                  {t.catalysts.map(c => (
                    <div key={c} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
                      <span style={{ color: '#22c55e', fontSize: 10, marginTop: 2, flexShrink: 0 }}>▸</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{c}</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(239,68,68,0.07)', borderRadius: 8, display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 10, color: '#f87171', flexShrink: 0 }}>⚠</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{t.risk}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sector That Can 2x */}
        <div style={{
          background: '#12151c',
          border: '1px solid rgba(34,255,136,0.2)',
          borderRadius: 20, padding: 28,
          boxShadow: '0 0 40px rgba(34,255,136,0.06)',
          animation: 'pulseGlow 4s ease-in-out infinite',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Zap size={18} color="#22ff88" />
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              Sector That Can <span style={{ color: '#22ff88' }}>2× the Market</span> — Outlook 18–24M
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
            Highest-conviction call based on earnings trajectory, structural tailwinds, and re-rating potential
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 32 }}>📡</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>{DOUBLE_SECTOR.sector}</div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{DOUBLE_SECTOR.ticker}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  ['Current Level', DOUBLE_SECTOR.current.toLocaleString()],
                  ['Target', DOUBLE_SECTOR.target],
                  ['Timeframe', DOUBLE_SECTOR.timeframe],
                  ['YTD So Far', `+${DOUBLE_SECTOR.ytd}%`],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 4, letterSpacing: '0.05em' }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#22ff88' }}>{v}</div>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Why It Can 2x</div>
                {DOUBLE_SECTOR.why.map((w, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      background: 'rgba(34,255,136,0.15)', border: '1px solid rgba(34,255,136,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, color: '#22ff88',
                    }}>{i + 1}</div>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>{w}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Latest News Catalysts</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DOUBLE_SECTOR.newsItems.map((n, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    borderLeft: '3px solid rgba(34,255,136,0.4)',
                    borderRadius: '0 10px 10px 0', padding: '12px 14px',
                  }}>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'rgba(34,255,136,0.7)', marginBottom: 5, letterSpacing: '0.05em' }}>{n.date}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{n.headline}</div>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: 20, padding: 16, borderRadius: 14,
                background: 'rgba(34,255,136,0.06)', border: '1px solid rgba(34,255,136,0.15)',
                display: 'flex', gap: 10,
              }}>
                <ArrowUpRight size={18} color="#22ff88" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#22ff88', marginBottom: 4 }}>High Conviction View</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                    Communication Services is the only NIFTY 500 sector where pricing power, subscriber growth, and margin expansion are all improving simultaneously. The structural shift from ₹100 → ₹300 ARPU is a multi-year re-rating event.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6, marginTop: 8, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        Data is for informational purposes only and does not constitute financial advice. Sector data based on NIFTY 500 constituents as of May 2026. Past performance does not guarantee future results.
      </div>
    </div>
  );
}
