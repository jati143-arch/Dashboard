CREATE TABLE IF NOT EXISTS trades (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  date            TEXT NOT NULL,
  entry_time      TEXT,
  exit_time       TEXT,
  exit_date       TEXT,
  symbol          TEXT NOT NULL,
  instrument_type TEXT NOT NULL CHECK(instrument_type IN ('stock','crypto')),
  direction       TEXT NOT NULL CHECK(direction IN ('long','short')),
  entry_price     REAL NOT NULL,
  exit_price      REAL,
  size            REAL NOT NULL,
  pnl_dollar      REAL,
  pnl_percent     REAL,
  pattern_tag     TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'closed' CHECK(status IN ('open','closed')),
  is_best_trade   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_records (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  date          TEXT NOT NULL UNIQUE,
  lesson_of_day TEXT,
  best_setups   TEXT,
  ai_insight    TEXT,
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patterns (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  slug              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT,
  how_to_trade      TEXT,
  example_image_url TEXT,
  is_builtin        INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO patterns (slug, name, description, how_to_trade) VALUES
  ('bull-flag', 'Bull Flag',
   'A continuation pattern where price makes a strong move up (the pole), then consolidates sideways or slightly downward in a tight channel (the flag) before breaking out higher.',
   'Wait for a strong upward pole on high volume. During the flag consolidation, volume should dry up. Enter on a breakout above the flag''s upper trendline with a stop below the flag''s low. Target is the pole''s length projected from the breakout.'),
  ('bear-flag', 'Bear Flag',
   'The bearish mirror of the bull flag. Price drops sharply (the pole), then consolidates slightly upward or sideways (the flag) before continuing lower.',
   'Wait for a sharp drop on high volume. Enter on a break below the flag''s lower trendline with a stop above the flag''s high. Target is the pole''s length projected downward from the breakdown.'),
  ('vwap-reclaim', 'VWAP Reclaim',
   'Price dips below VWAP (Volume Weighted Average Price) then reclaims it, often signaling a reversal from intraday weakness to strength.',
   'Wait for price to pull back below VWAP then close back above it with volume. Enter just above VWAP with a stop below the intraday low. Best in trending market conditions during first half of trading session.'),
  ('head-and-shoulders', 'Head and Shoulders',
   'A reversal pattern with three peaks: a left shoulder, a higher head, and a right shoulder. A neckline connects the lows between the peaks. Signals a trend reversal from bullish to bearish.',
   'Identify the neckline connecting the two troughs. Short on a break below the neckline with a stop above the right shoulder. Target is the distance from the head to the neckline projected below the breakout.'),
  ('cup-and-handle', 'Cup and Handle',
   'A bullish continuation pattern shaped like a tea cup. A rounded bottom (the cup) is followed by a slight downward drift (the handle) before a breakout higher.',
   'The cup should be U-shaped (not V-shaped). The handle should retrace no more than 50% of the cup. Buy on a break above the handle''s resistance with volume. Stop below the handle low.'),
  ('wedge-ascending', 'Ascending Wedge',
   'Price makes higher highs and higher lows but both trendlines converge upward. Despite the upward slope, this is typically a bearish reversal pattern as buying pressure weakens.',
   'Look for at least two touches on each trendline. Volume should decline during the pattern. Short on a break below the lower trendline. Stop above the most recent high inside the wedge.'),
  ('wedge-descending', 'Descending Wedge',
   'Price makes lower highs and lower lows but both trendlines converge downward. Despite the downward slope, this is typically a bullish reversal pattern.',
   'Volume should contract during the wedge. Buy on a break above the upper trendline. Stop below the most recent low inside the wedge. This pattern often precedes strong moves.'),
  ('double-top', 'Double Top',
   'A bearish reversal pattern where price tests the same resistance level twice, failing both times, forming an "M" shape. Signals exhaustion of buying pressure.',
   'The two peaks should be roughly equal in height. Enter short on a break below the neckline (the low between the two peaks). Stop above the second peak. Target is the distance from the peaks to the neckline.'),
  ('double-bottom', 'Double Bottom',
   'A bullish reversal pattern where price tests the same support level twice, holding both times, forming a "W" shape. Signals exhaustion of selling pressure.',
   'The two troughs should be roughly equal. Enter long on a break above the neckline (the high between the two troughs) with a stop below the second trough. Target is the neckline-to-trough distance projected upward.');
