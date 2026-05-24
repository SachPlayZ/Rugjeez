import { MarketFilterChips } from "./_components/MarketFilterChips";

/* ─── Static data ──────────────────────────────────────── */

const TICKER_ITEMS = [
  { t: "AGENT",  p: "SCANNING…",      dir: "up"   as const, alert: false },
  { t: "$BARK",  p: "-62.1%",         dir: "down" as const, alert: true  },
  { t: "$PDOGE", p: "-12.4%",         dir: "down" as const, alert: false },
  { t: "$VAPR",  p: "-28.0%",         dir: "down" as const, alert: true  },
  { t: "#0412",  p: "MINTED",         dir: "up"   as const, alert: false },
  { t: "$JEET",  p: "RESOLVED YES",   dir: "down" as const, alert: true  },
  { t: "$GPEPE", p: "-44.6%",         dir: "down" as const, alert: true  },
  { t: "$WGMI",  p: "+18.0%",         dir: "up"   as const, alert: false },
  { t: "#0411",  p: "MINTED",         dir: "up"   as const, alert: false },
  { t: "$NORM",  p: "RESOLVED NO",    dir: "up"   as const, alert: false },
  { t: "AGENT",  p: "UPTIME 99.97%",  dir: "up"   as const, alert: false },
  { t: "$BANA",  p: "+412%",          dir: "up"   as const, alert: false },
];

const LOG_LINES = [
  { time: "12:04:31", act: "scan",    rest: <><span className="rj-hex">0xabc…7e21</span> · score <span className="rj-num">23</span> · below threshold</> },
  { time: "12:04:32", act: "scan",    rest: <><span className="rj-hex">0x44ee…6cc3</span> · score <span className="rj-num">42</span> · below threshold</> },
  { time: "12:04:33", act: "scan",    rest: <><span className="rj-hex">0xff10…3322</span> · score <span className="rj-num">8</span>  · below threshold</> },
  { time: "12:04:34", act: "scan",    rest: <><span className="rj-hex">0x9088…ddc2</span> · score <span className="rj-num">31</span> · below threshold</> },
  { time: "12:05:02", act: "flag",    rest: <><span className="rj-hex">0xdef0…1a4f</span> · score <span className="rj-neg">81</span> · minting market…</> },
  { time: "12:05:04", act: "mint",    rest: <>market <span className="rj-hex">#0412</span> deployed at <span className="rj-hex">0x7a3c…d4f1</span></> },
  { time: "12:05:05", act: "ok",      rest: <>IPFS trace pinned · <span className="rj-hex">bafy…r34d</span></> },
  { time: "12:05:18", act: "scan",    rest: <><span className="rj-hex">0x12cd…e7f9</span> · score <span className="rj-num">14</span> · below threshold</> },
  { time: "12:05:22", act: "scan",    rest: <><span className="rj-hex">0xaa01…0bbe</span> · score <span className="rj-num">52</span> · watch-listed</> },
  { time: "12:05:41", act: "resolve", rest: <>market <span className="rj-hex">#0381</span> · YES wins · <span className="rj-num">$57,300</span> distributed</> },
  { time: "12:05:42", act: "ok",      rest: <>oracle posted · <span className="rj-hex">price feed #0xchain.usdc</span></> },
  { time: "12:05:58", act: "scan",    rest: <><span className="rj-hex">0x6bc3…11a0</span> · score <span className="rj-num">19</span> · below threshold</> },
  { time: "12:06:17", act: "flag",    rest: <><span className="rj-hex">0xc02d…91be</span> · score <span className="rj-neg">83</span> · minting market…</> },
  { time: "12:06:19", act: "mint",    rest: <>market <span className="rj-hex">#0410</span> deployed at <span className="rj-hex">0xc02d…91be</span></> },
  { time: "12:06:20", act: "ok",      rest: <>IPFS trace pinned · <span className="rj-hex">bafy…m7q1</span></> },
  { time: "12:06:34", act: "scan",    rest: <><span className="rj-hex">0x3b18…c0aa</span> · score <span className="rj-num">38</span> · below threshold</> },
  { time: "12:06:51", act: "scan",    rest: <><span className="rj-hex">0xf12a…7820</span> · score <span className="rj-neg">66</span> · minting market…</> },
  { time: "12:06:54", act: "mint",    rest: <>market <span className="rj-hex">#0411</span> deployed</> },
];

/* ─── Page ─────────────────────────────────────────────── */

export default function LandingPage() {
  const tickerItems = [...TICKER_ITEMS, ...TICKER_ITEMS]; // duplicate for seamless loop

  return (
    <div data-page="landing">

      {/* ── TOP TICKER ────────────────────────────────────── */}
      <div className="rj-ticker" aria-hidden="true">
        <div className="rj-ticker__track">
          {tickerItems.map((item, i) => (
            <span key={i}>
              <span className={`rj-ticker__item${!item.alert ? " rj-ticker__item--safe" : ""}`}>
                <span className="rj-ticker__dot" />
                <span>{item.t}</span>
                <span className={`rj-ticker__pct--${item.dir === "up" ? "up" : "down"}`}>{item.p}</span>
              </span>
              <span className="rj-ticker__sep">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── NAV ───────────────────────────────────────────── */}
      <header className="rj-wrap">
        <nav className="rj-nav">
          <a className="rj-brand" href="#">Rug<i>jeez</i><b>v0 · ARC TESTNET</b></a>
          <div className="rj-nav__links">
            <a href="#problem">Problem</a>
            <a href="#how">How it works</a>
            <a href="#signals">Signals</a>
            <a href="#markets">Markets</a>
            <a href="#agent">Agent</a>
            <a href="#faq">FAQ</a>
          </div>
          <div>
            <a className="rj-btn rj-btn--solid" href="#markets">View live markets →</a>
          </div>
        </nav>
      </header>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="rj-hero">
        <div className="rj-wrap">
          <div className="rj-hero__grid">
            {/* Left col */}
            <div>
              <span className="rj-eyebrow">
                <span className="rj-dot" />
                Agent live · scanning 1,284 tokens
              </span>
              <h1 className="rj-h1">
                An AI agent that bets on <span className="rj-it">rug pulls</span>{" "}
                <span className="rj-mint">— before they happen.</span>
              </h1>
              <p className="rj-hero__lede">
                Rugjeez detects danger signals, mints a market on{" "}
                <b style={{ color: "var(--rj-paper)" }}>Arc Testnet</b>, and lets
                the crowd price the risk. The chain resolves it 7 days later.
              </p>
              <div className="rj-hero__cta">
                <a className="rj-btn rj-btn--solid rj-btn--lg" href="#markets">View live markets →</a>
                <a className="rj-btn rj-btn--ghost rj-btn--lg" href="#how">How it works</a>
                <span className="rj-hint">USDC betting · 7-day settlement · open source</span>
              </div>
              {/* TODO: wire to real contract stats */}
              <div className="rj-hero__meta">
                <div>
                  <div className="rj-stat__num">412</div>
                  <div className="rj-stat__lab">Markets minted</div>
                </div>
                <div>
                  <div className="rj-stat__num rj-red">147</div>
                  <div className="rj-stat__lab">Rugs confirmed</div>
                </div>
                <div>
                  <div className="rj-stat__num">$48.2k</div>
                  <div className="rj-stat__lab">USDC wagered</div>
                </div>
              </div>
            </div>

            {/* Rug-o-meter gauge card — TODO: wire to most-recent-minted market */}
            <aside className="rj-gauge">
              <div className="rj-gauge__pin">
                MARKET<br />MINTED<small>2 MIN AGO</small>
              </div>
              <div className="rj-gauge__head">
                <span className="rj-gauge__title">
                  <span className="rj-dot rj-dot--yellow" />Agent read · live
                </span>
                <span className="rj-gauge__live">
                  <span className="rj-dot" />Streaming
                </span>
              </div>
              <div className="rj-gauge__token">
                <div className="rj-name">MOONBARK <span>$BARK · 4hr old</span></div>
                <div className="rj-price">−62.4% / 24h</div>
              </div>
              <div className="rj-gauge__bar-wrap">
                <div className="rj-gauge__bar">
                  <div className="rj-gauge__bar-fill" />
                </div>
                <div className="rj-gauge__bar-marker" />
                <div className="rj-gauge__bar-num">78<small>/100 risk</small></div>
              </div>
              <div className="rj-gauge__scale">
                <span>Safe</span><span>Watch</span><span>Threshold ↑</span>
              </div>
              <div className="rj-gauge__verdict">
                <div className="rj-verdict">&ldquo;Threshold crossed.&rdquo;</div>
                <div className="rj-stake">Market <b>#0412</b> · 7d window</div>
              </div>
              <div className="rj-gauge__odds">
                <button className="rj-odd rj-odd--rug">
                  <span className="rj-lab">YES · loses &gt;50%</span>
                  <span className="rj-num">0.78</span>
                </button>
                <button className="rj-odd rj-odd--safe">
                  <span className="rj-lab">NO · holds value</span>
                  <span className="rj-num">0.22</span>
                </button>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── THE PROBLEM ───────────────────────────────────── */}
      <section className="rj-section rj-problem" id="problem">
        <div className="rj-wrap">
          <div className="rj-section__head">
            <div>
              <span className="rj-kicker">The problem</span>
              <h2 className="rj-h2">
                By the time Twitter <span className="rj-red">notices,</span><br />
                the liquidity is <span className="rj-it">already gone.</span>
              </h2>
            </div>
          </div>
          <div className="rj-problem__grid">
            <div className="rj-problem__body">
              <p className="rj-problem__lead">
                Rug pulls drain <span style={{ color: "var(--rj-red)" }}>billions</span> from retail every year.
                The warning signs are always on-chain — and nobody&rsquo;s watching every contract.
              </p>
              <p>By the time a thread goes viral, the LP is yanked and the dev wallet is empty. The bag is yours.</p>
              <p>
                <b>Rugjeez flips the loop.</b> Danger signals become a live market — so the crowd can price
                the risk <em style={{ color: "var(--rj-yellow)", fontStyle: "italic" }}>before</em> the rug, not after.
              </p>
            </div>
            <div className="rj-problem__viz">
              <div className="rj-metric">
                <div className="rj-lab2">Rug-pull losses · 2024</div>
                <div className="rj-val rj-red">$2.1B</div>
                <div className="rj-sub">across 1,143 incidents</div>
              </div>
              <div className="rj-metric">
                <div className="rj-lab2">Median time-to-detection</div>
                <div className="rj-val">14<span style={{ fontSize: "24px" }}> hr</span></div>
                <div className="rj-sub">after first warning signal on-chain</div>
              </div>
              <div className="rj-metric">
                <div className="rj-lab2">Median time-to-rug</div>
                <div className="rj-val rj-yellow">3.8<span style={{ fontSize: "24px" }}> hr</span></div>
                <div className="rj-sub">after first warning signal on-chain</div>
              </div>
              <div className="rj-metric">
                <div className="rj-lab2">Net: bag-holding window</div>
                <div className="rj-val rj-red">−10<span style={{ fontSize: "24px" }}> hr</span></div>
                <div className="rj-sub">you&rsquo;re already late</div>
              </div>
              <div className="rj-chart">
                <div className="rj-chart__head">
                  <span>Monthly rug-pull volume · 2024</span>
                  <span style={{ color: "var(--rj-red)" }}>↑ 38% YoY</span>
                </div>
                <div className="rj-chart__bars">
                  {[38,52,46,64,71,58,80,74,88,96,84,100].map((h, i) => (
                    <div key={i} className="rj-bar" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section className="rj-section rj-how" id="how">
        <div className="rj-wrap">
          <div className="rj-section__head">
            <div>
              <span className="rj-kicker">How it works</span>
              <h2 className="rj-h2">
                Scan → score → mint → resolve. <span className="rj-it">All on-chain.</span>
              </h2>
            </div>
          </div>
          <div className="rj-how__grid">
            {[
              { n: "01", title: "Scan",    body: "The agent watches every new deploy, ingested within seconds of confirmation." },
              { n: "02", title: "Score",   body: "47 signals run in parallel — LP lock, holder concentration, deployer history, social velocity." },
              { n: "03", title: "Mint",    body: "If risk crosses the threshold, the agent deploys a USDC market on Arc Testnet." },
              { n: "04", title: "Resolve", body: "After 7 days the price feed resolves it. Winners are paid on-chain." },
            ].map((step, i, arr) => (
              <div className="rj-step" key={step.n}>
                <div className="rj-step__num">{step.n}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                {i < arr.length - 1 && <div className="rj-step__arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SIGNAL STACK ──────────────────────────────────── */}
      <section className="rj-section rj-signals" id="signals">
        <div className="rj-wrap">
          <div className="rj-section__head">
            <div>
              <span className="rj-kicker">The signal stack</span>
              <h2 className="rj-h2">Seven signals. One <span className="rj-it">verdict.</span></h2>
            </div>
            <div className="rj-section__actions">
              <a className="rj-btn rj-btn--ghost" href="#">Read methodology →</a>
            </div>
          </div>
          <div className="rj-signal-grid">
            {[
              { n: "01 / 07", w: "high",   name: <><em>NFI</em> blacklist</>,          desc: "Community-curated rug list of deployers and bytecode. Direct match → instant flag.",                 src: "Community",  val: "128k entries" },
              { n: "02 / 07", w: "high",   name: <>Liquidity <em>lock</em></>,          desc: "Is the LP locked, vested, or removable? Unlocked pools are the strongest pre-rug signal.",          src: "On-chain",   val: "5 lockers"    },
              { n: "03 / 07", w: "medium", name: <>Holder concentration</>,             desc: "Top 10 wallets' share of supply. Above 70% means a coordinated dump can drain the market.",         src: "On-chain",   val: "Top-10 %"     },
              { n: "04 / 07", w: "high",   name: <>Deployer <em>history</em></>,        desc: "Has this wallet — or any wallet funding it within 3 hops — shipped a token that rugged before?",    src: "Indexer",    val: "3-hop graph"  },
              { n: "05 / 07", w: "low",    name: <>Contract age</>,                     desc: "Most rugs happen in the first 72 hours; fresh contracts get a higher weight that decays.",            src: "On-chain",   val: "Hours"        },
              { n: "06 / 07", w: "medium", name: <>Social <em>velocity</em></>,         desc: "Sudden mention spike with no product, audit, or builder behind it. Textbook rug precursor.",         src: "X · Telegram", val: "σ over baseline" },
              { n: "07 / 07", w: "medium", name: <>Trading anomalies</>,                desc: "Wash trading, circular flow between linked wallets, bot-only volume that vanishes on cue.",           src: "On-chain",   val: "Pattern match" },
            ].map((sig) => (
              <article className="rj-signal" key={sig.n}>
                <div className="rj-signal__head">
                  <span className="rj-signal__num">{sig.n}</span>
                  <span className={`rj-signal__weight${sig.w === "low" ? " rj-signal__weight--low" : sig.w === "high" ? " rj-signal__weight--high" : ""}`}>
                    {sig.w === "low" ? "Low" : sig.w === "high" ? "High" : "Medium"}
                  </span>
                </div>
                <div className="rj-signal__name">{sig.name}</div>
                <p className="rj-signal__desc">{sig.desc}</p>
                <div className="rj-signal__foot">
                  <span>{sig.src}</span>
                  <span className="rj-src">{sig.val}</span>
                </div>
              </article>
            ))}
            {/* Composite card */}
            <article className="rj-signal" style={{ background: "linear-gradient(180deg,rgba(249,188,96,.06),var(--rj-ink))", borderColor: "rgba(249,188,96,.3)" }}>
              <div className="rj-signal__head">
                <span className="rj-signal__num">∑</span>
                <span className="rj-signal__weight">Aggregated</span>
              </div>
              <div className="rj-signal__name" style={{ color: "var(--rj-yellow)" }}>
                Composite <em style={{ color: "var(--rj-paper)" }}>score</em>
              </div>
              <p className="rj-signal__desc">
                All seven signals normalized and weighted. Anything above <b style={{ color: "var(--rj-paper)" }}>65</b> auto-mints a market.
              </p>
              <div className="rj-signal__foot">
                <span>Threshold</span>
                <span className="rj-src" style={{ color: "var(--rj-yellow)" }}>≥ 65 / 100</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ── LIVE MARKETS ──────────────────────────────────── */}
      {/* TODO: wire to real on-chain market data */}
      <section className="rj-section rj-intel" id="markets">
        <div className="rj-wrap">
          <div className="rj-section__head">
            <div>
              <span className="rj-kicker">Live markets</span>
              <h2 className="rj-h2">What the crowd thinks <span className="rj-it">right now.</span></h2>
            </div>
            <div className="rj-section__actions">
              <a className="rj-btn rj-btn--ghost" href="/markets">All 412 markets →</a>
            </div>
          </div>
          <MarketFilterChips />
          <div className="rj-panel">
            <div role="table" aria-label="Live open markets">
              <div className="rj-rugtable__head" role="row">
                <span role="columnheader">Token · address</span>
                <span role="columnheader">Rug score</span>
                <span role="columnheader">YES pool</span>
                <span role="columnheader">NO pool</span>
                <span role="columnheader">Implied prob.</span>
                <span role="columnheader" style={{ textAlign: "right" }}>Time left</span>
                <span role="columnheader"></span>
              </div>
              {[
                { name: "MOONBARK",    ticker: "$BARK",  addr: "0x7a3c…d4f1", market: "#0412", score: 78, yes: "$37,604",  no: "$10,606",  prob: "YES 0.78", probType: "yes", time: "6d 23h", pat: "zig",   bg: "#e16162", stripe: "rgba(0,30,29,.3)"  },
                { name: "PUDGYDOGE",   ticker: "$PDOGE", addr: "0x1f8e…aa07", market: "#0411", score: 71, yes: "$91,164",  no: "$37,236",  prob: "YES 0.71", probType: "yes", time: "6d 22h", pat: "dots",  bg: "#f9bc60", stripe: "rgba(0,30,29,.5)"  },
                { name: "VAPORFI",     ticker: "$VAPR",  addr: "0xc02d…91be", market: "#0410", score: 83, yes: "$252,403", no: "$51,697",  prob: "YES 0.83", probType: "yes", time: "6d 19h", pat: "check", bg: "#003532", stripe: "rgba(225,97,98,.55)"},
                { name: "CHAD INU",    ticker: "$CHADI", addr: "0x44ee…6cc3", market: "#0409", score: 62, yes: "$38,998",  no: "$23,902",  prob: "NO 0.38",  probType: "no",  time: "5d 12h", pat: "",      bg: "#abd1c6", stripe: "rgba(0,30,29,.35)" },
                { name: "GIGAPEPE",    ticker: "$GPEPE", addr: "0xf12a…7820", market: "#0408", score: 66, yes: "$120,582", no: "$62,118",  prob: "YES 0.66", probType: "yes", time: "4d 03h", pat: "zig",   bg: "#001e1d", stripe: "rgba(249,188,96,.6)"},
                { name: "SAFEROCKET",  ticker: "$SROCK", addr: "0x8c91…ff2d", market: "#0407", score: 54, yes: "$23,296",  no: "$21,504",  prob: "NO 0.48",  probType: "no",  time: "2d 18h", pat: "dots",  bg: "#e16162", stripe: "rgba(255,255,255,.45)"},
              ].map((row) => (
                <div className="rj-rugtable__row" role="row" key={row.market}>
                  <div className="rj-rugtable__token" role="cell">
                    <div
                      className="rj-swatch"
                      data-pattern={row.pat || undefined}
                      style={{ width: 38, height: 38, ["--swatch-bg" as string]: row.bg, ["--swatch-stripe" as string]: row.stripe }}
                    />
                    <div>
                      <div className="rj-t">{row.name} <small>{row.ticker}</small></div>
                      <div className="rj-meta rj-mono">{row.addr} · {row.market}</div>
                    </div>
                  </div>
                  <div className="rj-rugtable__score" role="cell">
                    <div className="rj-risk-bar">
                      <div className="rj-risk-bar__fill" style={{ ["--w" as string]: `${row.score}%` }} />
                    </div>
                    <span className={`rj-risk-num ${row.score >= 70 ? "rj-red" : "rj-yellow"}`}>{row.score}</span>
                  </div>
                  <div role="cell" className="rj-mono">{row.yes}</div>
                  <div role="cell" className="rj-mono">{row.no}</div>
                  <div role="cell">
                    <span className={`rj-outcome rj-outcome--${row.probType}`}>{row.prob}</span>
                  </div>
                  <div role="cell" className="rj-muted">{row.time}</div>
                  <div role="cell"><a className="rj-cta" href="/markets">Trade →</a></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── GLOBAL STATS BAR ──────────────────────────────── */}
      {/* TODO: wire to real contract stats */}
      <section className="rj-stats" id="stats">
        <div className="rj-wrap">
          <div className="rj-stats__grid">
            {[
              { n: "412",  l: "Markets minted" },
              { n: "$48k", l: "USDC wagered",  italic: true },
              { n: "147",  l: "Rugs confirmed" },
              { n: "94%",  l: "Agent accuracy", italic: true },
              { n: "198",  l: "Open right now" },
            ].map((item) => (
              <div key={item.l}>
                <div className="rj-stats__n">
                  {item.italic
                    ? <>{item.n.replace(/[k%]/g, "")}<i>{item.n.match(/[k%]/)?.[0]}</i></>
                    : item.n}
                </div>
                <div className="rj-stats__l">{item.l}</div>
              </div>
            ))}
          </div>
          <div className="rj-split">
            <div className="rj-split__bar">
              <div className="rj-split__yes" style={{ width: "68.7%" }}>
                <span>YES · rugged</span>
                <span>147 · 68.7%</span>
              </div>
              <div className="rj-split__no" style={{ width: "31.3%" }}>
                <span>NO · safe</span>
                <span>67 · 31.3%</span>
              </div>
            </div>
            <div className="rj-split__note">
              214 resolved markets · 198 open · agent accuracy = % of YES-majority pools that resolved YES
            </div>
          </div>
        </div>
      </section>

      {/* ── RECENT RESOLUTIONS ────────────────────────────── */}
      <section className="rj-section rj-resolutions" id="resolutions">
        <div className="rj-wrap">
          <div className="rj-section__head">
            <div>
              <span className="rj-kicker">Recent resolutions</span>
              <h2 className="rj-h2">The track record <span className="rj-it">is on-chain.</span></h2>
            </div>
            <div className="rj-section__actions">
              <a className="rj-btn rj-btn--ghost" href="/markets">See all resolutions →</a>
            </div>
          </div>
          <div className="rj-res-grid">
            {[
              {
                type: "rugged", name: "JEETCOIN", ticker: "$JEET", addr: "0x9f02…51ab · #0381",
                verdict: "Rugged.", pat: "zig",   bg: "#e16162", stripe: "rgba(0,30,29,.3)",
                delta: "−99.9%", prob: "0.91 YES", pool: "$62.9k", paid: "$57.3k",
                yesW: 91, noW: 9, note: "Resolved 4d ago · honeypot detected", tx: "0xtx…4e7c ↗",
              },
              {
                type: "safe",   name: "NORMIES",  ticker: "$NORM", addr: "0x3b18…c0aa · #0387",
                verdict: "Safe.", pat: "",        bg: "#abd1c6", stripe: "rgba(0,30,29,.35)",
                delta: "+12.4%", prob: "0.42 YES", pool: "$89.2k", paid: "$80.8k",
                yesW: 42, noW: 58, note: "Resolved 3d ago · oracle priced clean", tx: "0xtx…91dd ↗",
              },
              {
                type: "rugged", name: "GIGAPEPE", ticker: "$GPEPE", addr: "0xf12a…7820 · #0398",
                verdict: "Rugged.", pat: "check", bg: "#f9bc60", stripe: "rgba(0,30,29,.5)",
                delta: "−74.6%", prob: "0.66 YES", pool: "$182.7k", paid: "$166.2k",
                yesW: 66, noW: 34, note: "Resolved 1d ago · LP drained", tx: "0xtx…7e09 ↗",
              },
            ].map((res) => (
              <article className={`rj-res rj-res--${res.type}`} key={res.name}>
                <div className="rj-res__band" />
                <div className="rj-res__head">
                  <div className="rj-res__token">
                    <div
                      className="rj-swatch"
                      data-pattern={res.pat || undefined}
                      style={{ width: 40, height: 40, ["--swatch-bg" as string]: res.bg, ["--swatch-stripe" as string]: res.stripe }}
                    />
                    <div>
                      <div className="rj-t">{res.name} <small>{res.ticker}</small></div>
                      <div className="rj-meta rj-mono">{res.addr}</div>
                    </div>
                  </div>
                  <div className="rj-big-verdict">{res.verdict}</div>
                </div>
                <div className="rj-res__stats">
                  <div className="rj-res__stat"><div className="rj-l">Final price Δ</div><div className="rj-v">{res.delta}</div></div>
                  <div className="rj-res__stat"><div className="rj-l">Implied prob.</div><div className="rj-v">{res.prob}</div></div>
                  <div className="rj-res__stat"><div className="rj-l">Total pool</div><div className="rj-v">{res.pool}</div></div>
                  <div className="rj-res__stat"><div className="rj-l">Paid to winners</div><div className="rj-v rj-yellow">{res.paid}</div></div>
                </div>
                <div className="rj-res__bar">
                  <div className="rj-res__bar-yes" style={{ width: `${res.yesW}%` }}><span>YES {res.yesW}%</span></div>
                  <div className="rj-res__bar-no"  style={{ width: `${res.noW}%`  }}><span>{res.noW}%</span></div>
                </div>
                <div className="rj-res__foot">
                  <span>{res.note}</span>
                  <span className="rj-tx">{res.tx}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENT ACTIVITY LOG ────────────────────────────── */}
      <section className="rj-section rj-agentlog" id="agent">
        <div className="rj-wrap">
          <div className="rj-section__head">
            <div>
              <span className="rj-kicker">Agent activity log</span>
              <h2 className="rj-h2">The agent is <span className="rj-it">awake.</span></h2>
            </div>
            <div className="rj-section__actions">
              <a className="rj-btn rj-btn--ghost" href="#">Full log API →</a>
            </div>
          </div>
          <div className="rj-term">
            <div className="rj-term__head">
              <div className="rj-term__dots"><span /><span /><span /></div>
              <div>rugjeez-agent@arc-testnet:~ · last 120 events</div>
              <div className="rj-term__pulse">LIVE · uptime 99.97%</div>
            </div>
            <div className="rj-term__body">
              {LOG_LINES.map((line, i) => (
                <div className="rj-term__line" key={i}>
                  <span className="rj-term__time">[{line.time}]</span>
                  <span className={`rj-term__action ${line.act}`}>{line.act.toUpperCase()}</span>
                  <span className="rj-term__rest">{line.rest}</span>
                </div>
              ))}
              <div className="rj-term__line"><span className="rj-cursor" /></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY PREDICTION MARKETS ────────────────────────── */}
      <section className="rj-section rj-why">
        <div className="rj-wrap">
          <div className="rj-why__grid">
            <div>
              <p className="rj-why__quote">
                When people put money on <span style={{ color: "var(--rj-red)" }}>YES,</span><br />
                that <span className="rj-it">is</span> the warning signal.
              </p>
              <div className="rj-why__attr">RUGJEEZ · DESIGN THESIS</div>
            </div>
            <div className="rj-why__body">
              <p>
                Prediction markets aggregate dispersed knowledge faster than any single bot or Twitter thread.
                The YES price isn&rsquo;t a hot take — it&rsquo;s <b>collective conviction</b>, weighted by stake.
              </p>
              <p>
                When the agent flags a token, it opens a market and lets the crowd vote with capital.
                Think it&rsquo;s safe? <b>Profit by being right.</b>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── BUILT ON ──────────────────────────────────────── */}
      <section className="rj-section rj-built" id="built">
        <div className="rj-wrap">
          <div className="rj-section__head">
            <div>
              <span className="rj-kicker">Built on</span>
              <h2 className="rj-h2">Three primitives. <span className="rj-it">Zero glue code.</span></h2>
            </div>
          </div>
          <div className="rj-built-grid">
            <article className="rj-built-card">
              <span className="rj-built-card__badge">
                <span className="rj-mark">A</span>ARC TESTNET
              </span>
              <div className="rj-built-card__name">Arc <em>Testnet</em></div>
              <p className="rj-built-card__why">
                Sub-second finality and <b>USDC-native gas</b>. Markets settle the instant the oracle posts.
              </p>
              <div className="rj-built-card__meta">
                <span>Chain ID</span><span><b>5042002</b></span>
              </div>
            </article>
            <article className="rj-built-card">
              <span className="rj-built-card__badge">
                <span className="rj-mark rj-mark--circle">$</span>CIRCLE
              </span>
              <div className="rj-built-card__name">Circle <em>USDC</em></div>
              <p className="rj-built-card__why">
                Every pool denominated in real, audited dollars. <b>No bridge friction.</b>
              </p>
              <div className="rj-built-card__meta">
                <span>Token</span><span><b>USDC · 0x3600…0000</b></span>
              </div>
            </article>
            <article className="rj-built-card">
              <span className="rj-built-card__badge">
                <span className="rj-mark rj-mark--ipfs">IP</span>IPFS / PINATA
              </span>
              <div className="rj-built-card__name">IPFS <em>traces</em></div>
              <p className="rj-built-card__why">
                Every agent decision pinned to IPFS and referenced on-chain. <b>Publicly verifiable</b>, not a black box.
              </p>
              <div className="rj-built-card__meta">
                <span>Pinned</span><span><b>412 / 412 markets</b></span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section className="rj-section rj-faq" id="faq">
        <div className="rj-wrap">
          <div className="rj-section__head">
            <div>
              <span className="rj-kicker">FAQ</span>
              <h2 className="rj-h2">Yeah, but <span className="rj-it">actually,</span> how does this work?</h2>
            </div>
          </div>
          <div className="rj-faq__list">
            {[
              { q: "Who mints the markets?",                     a: "The agent does, automatically. Score ≥ 65 triggers a market on Arc Testnet — no human approval, no admin key.", open: true },
              { q: "What if the token isn't on a price feed?",   a: "The market voids and all USDC refunds automatically." },
              { q: "Is this real money?",                        a: "No — testnet USDC only. This is a hackathon demo." },
              { q: "Can I run the agent myself?",                a: <>Yes. Fully open source. <a href="#">GitHub repo →</a></> },
              { q: "What's the agent's edge?",                   a: "Speed. It catches things in seconds and turns them into a market before Twitter has a chance to react." },
              { q: "How accurate is it?",                        a: "94.2% across 214 resolved markets — measured as YES-majority pools that resolved YES." },
            ].map((faq, i) => (
              <details className="rj-faq__row" key={i} open={faq.open}>
                <summary className="rj-faq__q">
                  {faq.q}<span className="rj-faq__plus">+</span>
                </summary>
                <div className="rj-faq__a">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="rj-foot">
        <div className="rj-wrap">
          <div className="rj-foot__top">
            <div className="rj-foot__brandbox">
              <a className="rj-brand" href="#">Rug<i>jeez</i></a>
              <p>An autonomous agent that scores tokens for rug risk and turns them into on-chain prediction markets.</p>
              <div className="rj-foot__badges">
                <span className="rj-foot__badge">Arc Testnet</span>
                <span className="rj-foot__badge">Circle USDC</span>
                <span className="rj-foot__badge rj-acc">Hackathon 2025</span>
              </div>
            </div>
            <div className="rj-foot__col">
              <h5>Product</h5>
              <a href="#markets">Live markets</a>
              <a href="#resolutions">Resolutions</a>
              <a href="#stats">Stats</a>
              <a href="#agent">Agent log</a>
            </div>
            <div className="rj-foot__col">
              <h5>Build</h5>
              <a href="https://github.com/SachPlayZ/Rugjeez" target="_blank" rel="noopener">GitHub repo ↗</a>
              <a href="https://testnet.arcscan.app" target="_blank" rel="noopener">Arc explorer ↗</a>
              <a href="#signals">Methodology ↗</a>
              <a href="/demo">Agent demo ↗</a>
            </div>
            <div className="rj-foot__col">
              <h5>On-chain</h5>
              <span className="rj-addr-lab">Agent wallet</span>
              <span className="rj-addr">0xag3n7…4f1d</span>
              <span className="rj-addr-lab">Market factory</span>
              <span className="rj-addr">0xfac…0412</span>
              <span className="rj-addr-lab">USDC</span>
              <span className="rj-addr">0x3600000000…</span>
            </div>
          </div>
          <div className="rj-foot__bottom">
            <span className="rj-legal">© 2026 Rugjeez · Testnet only · Not financial advice · 18+ where lawful</span>
            <span className="rj-legal">v0.1.4 · agent uptime 99.97% · last block 4,182,394</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
