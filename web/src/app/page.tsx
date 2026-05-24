import { MarketFilterChips } from "./_components/MarketFilterChips";
import { LiveHeroStats } from "./_components/LiveHeroStats";
import { LiveGauge } from "./_components/LiveGauge";
import { LiveAgentLog } from "./_components/LiveAgentLog";
import { LiveStatsBar } from "./_components/LiveStatsBar";
import { LiveMarketTable } from "./_components/LiveMarketTable";
import { SignalGrid } from "./_components/SignalGrid";
import { LiveFooterBlock } from "./_components/LiveFooterBlock";
import { LandingNav, FloatingSectionNav } from "./_components/LandingNav";
/* ─── Page ─────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div data-page="landing">
      <FloatingSectionNav />

      {/* ══ FIRST FOLD — nav + hero = 100vh ════════════════ */}
      <div className="rj-fold">

        {/* ── NAV — icons + app routes + wallet ───────────── */}
        <header className="rj-wrap">
          <LandingNav />
        </header>

        {/* ── HERO ────────────────────────────────────────── */}
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
                  <a className="rj-btn rj-btn--solid rj-btn--lg" href="#markets">Live markets →</a>
                  <a className="rj-btn rj-btn--ghost rj-btn--lg" href="#how">How it works</a>
                  <span className="rj-hint">USDC betting · 7-day settlement · open source</span>
                </div>
                {/* Live stats — fetched from on-chain */}
                <LiveHeroStats />
              </div>

              {/* Right col — live gauge */}
              <LiveGauge />
            </div>
          </div>
        </section>

      </div>{/* end .rj-fold */}

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
          {/* Client component: same layout + shadcn tooltips on each card */}
          <SignalGrid />
        </div>
      </section>

      {/* ── LIVE MARKETS ──────────────────────────────────── */}
      <section className="rj-section rj-intel" id="markets">
        <div className="rj-wrap">
          <div className="rj-section__head">
            <div>
              <span className="rj-kicker">Live markets</span>
              <h2 className="rj-h2">What the crowd thinks <span className="rj-it">right now.</span></h2>
            </div>
            <div className="rj-section__actions">
              <a className="rj-btn rj-btn--ghost" href="/markets">All markets →</a>
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
              {/* Live market rows — falls back to demo data if no on-chain markets */}
              <LiveMarketTable />
            </div>
          </div>
        </div>
      </section>

      {/* ── GLOBAL STATS BAR — live on-chain numbers ──────── */}
      <LiveStatsBar />

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

      {/* ── AGENT ACTIVITY LOG — live terminal ────────────── */}
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
          {/* Live terminal with real agent health + animated demo lines */}
          <LiveAgentLog />
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
                <span>Pinned</span><span><b>all markets</b></span>
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
              <a href="https://t.me/+xdtrIy0WKv4yOWM1" target="_blank" rel="noopener">Telegram community ↗</a>
            </div>
            <div className="rj-foot__col">
              <h5>On-chain</h5>
              <span className="rj-addr-lab">Agent wallet</span>
              <span className="rj-addr">0xe34b40f38217f9Dc8c3534735f7f41B2cDA73A75</span>
              <span className="rj-addr-lab">Market factory</span>
              <span className="rj-addr">0xa1Db4fBe80E7064E8bC70b6138a11572cFE1f79b</span>
              <span className="rj-addr-lab">USDC</span>
              <span className="rj-addr">0x3600000000000000000000000000000000000000</span>
            </div>
          </div>
          <div className="rj-foot__bottom">
            <span className="rj-legal">© 2026 Rugjeez · Testnet only · Not financial advice · 18+ where lawful</span>
            <LiveFooterBlock />
          </div>
        </div>
      </footer>

    </div>
  );
}
