const tone = (name = "neutral") => `diagram-panel diagram-panel--${name}`;

function defs(kind) {
  return `<defs>
    <pattern id="grid-${kind}" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M24 0H0V24" fill="none" stroke="rgba(116,167,139,.105)" stroke-width="1"/>
      <circle cx="0" cy="0" r="1" fill="rgba(155,205,176,.18)"/>
    </pattern>
    <radialGradient id="halo-${kind}" cx="50%" cy="48%" r="64%">
      <stop offset="0" stop-color="#0d3b28" stop-opacity=".52"/>
      <stop offset=".58" stop-color="#082118" stop-opacity=".18"/>
      <stop offset="1" stop-color="#07120d" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="panel-${kind}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#10231a" stop-opacity=".96"/>
      <stop offset="1" stop-color="#0a1711" stop-opacity=".98"/>
    </linearGradient>
    <filter id="shadow-${kind}" x="-20%" y="-30%" width="140%" height="170%">
      <feDropShadow dx="0" dy="7" stdDeviation="8" flood-color="#000" flood-opacity=".28"/>
    </filter>
    <filter id="glow-${kind}" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="3.2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <marker id="arrow-${kind}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 8 4 0 8Z" fill="context-stroke"/>
    </marker>
  </defs>`;
}

function frame(kind, title, body, caption) {
  return `<svg viewBox="0 0 640 420" role="presentation">
    ${defs(kind)}
    <rect width="640" height="420" fill="#07120d"/>
    <rect width="640" height="420" fill="url(#halo-${kind})"/>
    <rect x="18" y="18" width="604" height="384" rx="18" fill="url(#grid-${kind})"/>
    <path class="diagram-frame-tick" d="M34 54V34H54M586 34H606V54M34 374V394H54M586 394H606V374"/>
    <text class="diagram-kicker diagram-kicker--strong" x="320" y="48" text-anchor="middle">${title}</text>
    ${body.trim()}
    <text class="diagram-caption" x="320" y="384" text-anchor="middle">${caption}</text>
  </svg>`;
}

function arrow(kind, d, extra = "") {
  return `<path class="diagram-arrow ${extra}" d="${d}" marker-end="url(#arrow-${kind})"/>`;
}

function dotGrid(x, y, columns, rows, stepX, stepY, accentEvery = 0) {
  let circles = "";
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const cls = accentEvery && index % accentEvery === 0 ? "diagram-dot diagram-dot--accent" : "diagram-dot";
      circles += `<circle class="${cls}" cx="${x + column * stepX}" cy="${y + row * stepY}" r="3.2"/>`;
    }
  }
  return circles;
}

const frost = frame("frost", "ONE TRACE · ALL POSEIDON2b EXECUTIONS", `
  <g class="trace-axis">
    <path d="M74 310H232M74 310V126M74 310 140 350"/>
    <text x="239" y="315">SLOT</text><text x="48" y="118">ROUND</text><text x="145" y="361">LANE</text>
  </g>
  <g class="trace-volume" filter="url(#shadow-frost)">
    <path class="trace-plane trace-plane--back" d="M126 152 319 65 543 145 348 235Z"/>
    <path class="trace-plane trace-plane--mid" d="M126 202 319 115 543 195 348 285Z"/>
    <path class="trace-plane trace-plane--front" d="M126 252 319 165 543 245 348 335Z"/>
    <path class="trace-edge" d="M126 152V252M319 65V165M543 145V245M348 235V335"/>
    <path class="trace-column" d="M192 173V273M270 138V238M355 104V204M425 128V228M487 151V251"/>
  </g>
  <g class="trace-points">
    <circle cx="192" cy="173" r="5"/><circle cx="270" cy="138" r="5"/><circle cx="355" cy="104" r="5"/>
    <circle cx="425" cy="128" r="5"/><circle cx="487" cy="151" r="5"/><circle cx="231" cy="231" r="5"/>
    <circle cx="350" cy="185" r="5"/><circle cx="455" cy="224" r="5"/><circle cx="296" cy="271" r="5"/>
  </g>
  <g class="trace-callout">
    <path d="M455 276 494 312"/><rect x="470" y="307" width="126" height="44" rx="9"/>
    <text class="diagram-micro" x="486" y="326">TWO REDUCTIONS</text>
    <text class="diagram-value diagram-value--compact" x="486" y="344">Σd9  +  Σd2</text>
  </g>
  <g class="diagram-tag"><rect x="92" y="80" width="134" height="29" rx="7"/><text x="159" y="99">59 PERMUTATIONS</text></g>
  <g class="diagram-tag diagram-tag--blue"><rect x="238" y="80" width="144" height="29" rx="7"/><text x="310" y="99">472 → 2 CHECKS</text></g>
`, "51.67× smaller transcript · 10.69× faster reduction prover");

const kernel = frame("kernel", "ONE CANONICAL GF(2¹²⁸) REPRESENTATION", `
  <g class="kernel-register">
    <text class="diagram-micro" x="50" y="83">FIELD ELEMENT · 128 BITS</text>
    <rect x="50" y="98" width="360" height="54" rx="11"/>
    <path d="M140 98V152M230 98V152M320 98V152"/>
    <text x="95" y="131">31…0</text><text x="185" y="131">63…32</text><text x="275" y="131">95…64</text><text x="365" y="131">127…96</text>
  </g>
  ${arrow("kernel", "M410 125H462")}
  <g class="kernel-digest"><rect x="462" y="88" width="128" height="76" rx="13"/><text class="diagram-micro" x="526" y="112" text-anchor="middle">SAME BYTES</text><text class="diagram-value diagram-value--compact" x="526" y="140" text-anchor="middle">STATE / PROOF</text></g>
  <g class="kernel-paths">
    <g class="${tone("neutral")}"><rect x="50" y="192" width="540" height="45" rx="10"/><text class="diagram-value diagram-value--compact" x="68" y="220">x86 BASE</text><text class="diagram-label" x="193" y="220">SSE4.1 + PCLMULQDQ</text><g class="lane-cells">${dotGrid(454, 214, 8, 1, 15, 0, 4)}</g></g>
    <g class="${tone("green")}"><rect x="50" y="247" width="540" height="45" rx="10"/><text class="diagram-value diagram-value--compact" x="68" y="275">x86 WIDE</text><text class="diagram-label" x="193" y="275">AVX2 + VPCLMULQDQ</text><g class="lane-cells">${dotGrid(424, 269, 10, 1, 15, 0, 3)}</g></g>
    <g class="${tone("blue")}"><rect x="50" y="302" width="540" height="45" rx="10"/><text class="diagram-value diagram-value--compact" x="68" y="330">ARM64</text><text class="diagram-label" x="193" y="330">NEON + PMULL</text><g class="lane-cells">${dotGrid(454, 324, 8, 1, 15, 0, 4)}</g></g>
  </g>
  <g class="diagram-tag"><rect x="456" y="51" width="134" height="28" rx="7"/><text x="523" y="70">UP TO 5.4×</text></g>
`, "Backend dispatch changes throughput, never arithmetic layout or proof bytes");

const state = frame("state", "PROOF-CARRYING SNAPSHOT INSTALL", `
  <g class="header-rail">
    <text class="diagram-micro" x="44" y="82">PERMANENT HEADER CHAIN</text>
    <path d="M44 112H596"/>
    <g><rect x="44" y="96" width="70" height="32" rx="7"/><text x="79" y="117">GENESIS</text></g>
    <g><rect x="126" y="96" width="42" height="32" rx="7"/><text x="147" y="117">…</text></g>
    <g><rect x="180" y="96" width="78" height="32" rx="7"/><text x="219" y="117">h−18</text></g>
    <g class="header-boundary"><rect x="276" y="88" width="118" height="48" rx="10"/><text class="diagram-micro" x="335" y="107">PROVED BOUNDARY</text><text class="diagram-value diagram-value--compact" x="335" y="127">ROOT Rₕ₋₁₈</text></g>
    <g><rect x="412" y="96" width="42" height="32" rx="7"/><text x="433" y="117">+1</text></g>
    <g><rect x="466" y="96" width="42" height="32" rx="7"/><text x="487" y="117">…</text></g>
    <g><rect x="520" y="96" width="76" height="32" rx="7"/><text x="558" y="117">TIP</text></g>
  </g>
  ${arrow("state", "M335 136V178")}
  <g class="${tone("green")}" filter="url(#shadow-state)"><rect x="44" y="180" width="250" height="148" rx="14"/>
    <text class="diagram-micro" x="66" y="207">01 · AUTHENTICATE PRESENT</text><text class="diagram-value diagram-value--compact" x="66" y="239">VERIFY HistoryStep π</text>
    <path class="diagram-divider" d="M66 256H272"/><text class="diagram-label" x="66" y="281">CONSTANT PROOF CHECK</text>
    <g class="proof-seal"><circle cx="249" cy="292" r="17"/><path d="M240 292 247 299 259 284"/></g>
  </g>
  ${arrow("state", "M294 254H346")}
  <g class="${tone("blue")}" filter="url(#shadow-state)"><rect x="346" y="180" width="250" height="148" rx="14"/>
    <text class="diagram-micro" x="368" y="207">02 · INSTALL EXACT STATE</text><text class="diagram-value diagram-value--compact" x="368" y="239">SEGMENTS + 18-BLOCK TAIL</text>
    <g class="state-segments"><rect x="368" y="263" width="48" height="39" rx="5"/><rect x="424" y="263" width="48" height="39" rx="5"/><rect x="480" y="263" width="48" height="39" rx="5"/><rect x="536" y="263" width="38" height="39" rx="5"/>
      <path d="M376 275H408M376 284H402M432 275H464M432 284H456M488 275H520M488 284H514M544 275H566M544 284H561"/></g>
  </g>
`, "Headers remain permanent · spent transaction bodies do not need historical replay");

const walk = frame("walk", "3 LINK + 6 BLOCK REGIONS · ONE WALK", `
  <g class="walk-sources">
    <text class="diagram-micro" x="44" y="81">RELATION FAMILIES</text>
    <g class="family-lines">
      <rect x="44" y="96" width="188" height="16" rx="4"/><rect x="44" y="121" width="164" height="16" rx="4"/><rect x="44" y="146" width="202" height="16" rx="4"/>
      <rect x="44" y="171" width="176" height="16" rx="4"/><rect x="44" y="196" width="214" height="16" rx="4"/><rect x="44" y="221" width="158" height="16" rx="4"/>
      <rect x="44" y="246" width="194" height="16" rx="4"/><rect x="44" y="271" width="170" height="16" rx="4"/><rect x="44" y="296" width="206" height="16" rx="4"/>
    </g>
    <text class="diagram-label" x="264" y="107">LINK ×3</text><text class="diagram-label" x="264" y="157">BLOCK ×6</text><text class="diagram-label" x="264" y="207">ONE SLOT DOMAIN</text><text class="diagram-label" x="264" y="257">ONE STATE CARRY</text><text class="diagram-label" x="264" y="307">ONE TRANSCRIPT</text>
  </g>
  <g class="walk-merge"><path d="M258 104C304 104 290 188 336 188M258 129C300 129 298 198 336 198M258 154C300 154 300 208 336 208M258 179C300 179 306 218 336 218M258 204H336M258 229C300 229 306 230 336 230M258 254C300 254 300 240 336 240M258 279C300 279 298 250 336 250M258 304C304 304 290 260 336 260"/></g>
  <g class="${tone("green")}" filter="url(#shadow-walk)"><rect x="336" y="157" width="112" height="130" rx="15"/><text class="diagram-micro" x="392" y="184" text-anchor="middle">SHARED CARRY</text><text class="diagram-number" x="392" y="224" text-anchor="middle">C0…C3</text><text class="diagram-label" x="392" y="252" text-anchor="middle">one accumulator</text></g>
  ${arrow("walk", "M448 222H482")}
  <g class="round-column"><rect x="482" y="82" width="114" height="270" rx="15"/><text class="diagram-micro" x="539" y="108" text-anchor="middle">POSEIDON2b</text><text class="diagram-number" x="539" y="150" text-anchor="middle">66</text><text class="diagram-label" x="539" y="170" text-anchor="middle">ROUNDS</text>
    <path d="M539 190V322"/><circle cx="539" cy="201" r="5"/><circle cx="539" cy="225" r="5"/><circle cx="539" cy="249" r="5"/><circle cx="539" cy="273" r="5"/><circle cx="539" cy="297" r="5"/><circle cx="539" cy="321" r="5"/>
    <text class="diagram-micro" x="522" y="205" text-anchor="end">ABSORB</text><text class="diagram-micro" x="522" y="253" text-anchor="end">MIX</text><text class="diagram-micro" x="522" y="301" text-anchor="end">CLOSE</text>
  </g>
`, "Nine recursive regions share one ordered ragged 66-layer Poseidon2b walk");

const authorization = frame("authorization", "ONE OWNER · ONE AUTHORIZATION CAPSULE", `
  <g class="${tone("neutral")}" filter="url(#shadow-authorization)"><rect x="42" y="78" width="226" height="246" rx="15"/>
    <text class="diagram-micro" x="64" y="105">ONE OWNER · MANY INPUT PAGES</text><text class="diagram-number" x="64" y="147">1,020</text><text class="diagram-label" x="157" y="145">INPUTS</text>
    <g class="page-grid">${dotGrid(66, 181, 8, 5, 21, 21, 7)}</g>
    <path class="diagram-divider" d="M64 279H246"/><text class="diagram-label" x="64" y="303">128 PHYSICAL PAGES</text><text class="diagram-micro" x="246" y="303" text-anchor="end">SECRET K₀</text>
  </g>
  ${arrow("authorization", "M268 201H315")}
  <g class="${tone("green")}" filter="url(#shadow-authorization)"><rect x="315" y="112" width="142" height="178" rx="16"/><text class="diagram-micro" x="386" y="140" text-anchor="middle">WITNESS-HIDING</text><circle class="proof-ring" cx="386" cy="187" r="32"/><text class="diagram-number" x="386" y="197" text-anchor="middle">π</text><text class="diagram-value diagram-value--compact" x="386" y="240" text-anchor="middle">≤92,696 B</text><text class="diagram-micro" x="386" y="261" text-anchor="middle">65 FS QUERIES</text><text class="diagram-micro" x="386" y="278" text-anchor="middle">ONE OWNER PROOF</text></g>
  ${arrow("authorization", "M457 201H498")}
  <g class="${tone("blue")}" filter="url(#shadow-authorization)"><rect x="498" y="91" width="100" height="220" rx="15"/><text class="diagram-micro" x="548" y="118" text-anchor="middle">BLOCK</text><g class="block-pages"><rect x="518" y="145" width="60" height="24" rx="4"/><rect x="518" y="178" width="60" height="24" rx="4"/><rect x="518" y="211" width="60" height="24" rx="4"/><rect x="518" y="244" width="60" height="24" rx="4"/></g><text class="diagram-label" x="548" y="291" text-anchor="middle">TRANSITION</text></g>
  <g class="diagram-tag"><rect x="291" y="327" width="190" height="30" rx="7"/><text x="386" y="347">PROOF COUNT = OWNERS</text></g>
`, "Proof count follows owners · HistoryStep proves the public State transition");

const binding = frame("binding", "SOURCE-BOUND COMPACT MIXED OPENING", `
  <g class="${tone("green")}" filter="url(#shadow-binding)"><rect x="42" y="77" width="206" height="242" rx="15"/><text class="diagram-micro" x="62" y="104">POSEIDON2b SOURCE CAP</text>
    <g class="merkle-tree"><path d="M145 139 97 184M145 139 193 184M97 184 73 229M97 184 121 229M193 184 169 229M193 184 217 229"/><circle cx="145" cy="139" r="14"/><circle cx="97" cy="184" r="11"/><circle cx="193" cy="184" r="11"/><circle cx="73" cy="229" r="8"/><circle cx="121" cy="229" r="8"/><circle cx="169" cy="229" r="8"/><circle cx="217" cy="229" r="8"/><path class="merkle-open" d="M145 139 193 184 217 229"/></g>
    <text class="diagram-label" x="62" y="276">ENCODED GF(2¹²⁸)</text><text class="diagram-value diagram-value--compact" x="62" y="300">32-BYTE HASHES</text>
  </g>
  ${arrow("binding", "M248 198H292")}
  <g class="query-gate" filter="url(#shadow-binding)"><rect x="292" y="132" width="116" height="132" rx="15"/><text class="diagram-micro" x="350" y="159" text-anchor="middle">SAME INDICES</text><text class="diagram-value" x="350" y="207" text-anchor="middle">SHARED q</text><path d="M319 229H381"/><circle cx="329" cy="229" r="4"/><circle cx="350" cy="229" r="4"/><circle cx="371" cy="229" r="4"/></g>
  ${arrow("binding", "M408 198H452")}
  <g class="${tone("blue")}" filter="url(#shadow-binding)"><rect x="452" y="77" width="146" height="242" rx="15"/><text class="diagram-micro" x="525" y="104" text-anchor="middle">COMPACT FRI</text><g class="fri-layers"><rect x="474" y="137" width="102" height="22" rx="4"/><rect x="486" y="174" width="78" height="22" rx="4"/><rect x="498" y="211" width="54" height="22" rx="4"/><rect x="510" y="248" width="30" height="22" rx="4"/><path d="M525 159V174M525 196V211M525 233V248"/></g><text class="diagram-label" x="525" y="296" text-anchor="middle">ROUND-ZERO ROOT</text></g>
  <g class="rejected-splice"><path d="M248 296C309 343 393 343 452 296"/><path d="M330 319 350 339M350 319 330 339"/><text class="diagram-micro" x="340" y="358" text-anchor="middle">A′ SPLICE REJECTED</text></g>
`, "Authenticated source symbols · shared queries · round-zero root equality");

const pcs = frame("pcs", "THREE PCS EXPERIMENTS · THREE DIFFERENT LIMITS", `
  <g class="${tone("yellow")}" filter="url(#shadow-pcs)"><rect x="36" y="78" width="178" height="250" rx="15"/><text class="diagram-micro" x="56" y="105">01 · OPENING BYTES</text><text class="diagram-value diagram-value--compact" x="56" y="138">LADDER FRI</text><text class="diagram-number" x="56" y="183">99.1%</text><text class="diagram-label" x="56" y="205">OF MULTIPOINT OBJECT</text><g class="byte-stack"><rect x="56" y="237" width="138" height="12" rx="4"/><rect x="56" y="257" width="136" height="12" rx="4"/><rect x="56" y="277" width="134" height="12" rx="4"/><rect x="56" y="297" width="132" height="12" rx="4"/></g></g>
  <g class="${tone("coral")}" filter="url(#shadow-pcs)"><rect x="231" y="78" width="178" height="250" rx="15"/><text class="diagram-micro" x="251" y="105">02 · PROVENANCE</text><text class="diagram-value diagram-value--compact" x="251" y="138">FRI-BINIUS</text><text class="diagram-number diagram-number--coral" x="251" y="183">A ≠ A′</text><g class="source-identity"><rect x="253" y="228" width="54" height="42" rx="7"/><rect x="333" y="228" width="54" height="42" rx="7"/><text x="280" y="254" text-anchor="middle">A</text><text x="360" y="254" text-anchor="middle">A′</text><path d="M307 249H333"/><path class="cross" d="M310 237 330 261M330 237 310 261"/></g><text class="diagram-label" x="251" y="302">SOURCE EDGE REQUIRED</text></g>
  <g class="${tone("blue")}" filter="url(#shadow-pcs)"><rect x="426" y="78" width="178" height="250" rx="15"/><text class="diagram-micro" x="446" y="105">03 · RECURSIVE COST</text><text class="diagram-value diagram-value--compact" x="446" y="138">BASEFOLD</text><g class="nested-proof"><rect x="454" y="182" width="122" height="91" rx="11"/><rect x="474" y="202" width="82" height="51" rx="8"/><text class="diagram-micro" x="515" y="223" text-anchor="middle">SUCCESSOR</text><text class="diagram-value diagram-value--compact" x="515" y="244" text-anchor="middle">V(π)=1</text></g><text class="diagram-label" x="446" y="302">VERIFIER INSIDE TRACE</text></g>
`, "Opening size · source provenance · recursive verifier cost must be measured separately");

const compiler = frame("compiler", "AUTHSTREAM · BOUNDED WORKLOAD STUDY", `
  <g class="${tone("neutral")}" filter="url(#shadow-compiler)"><rect x="36" y="88" width="148" height="226" rx="15"/><text class="diagram-micro" x="56" y="115">PRIVATE SIDECARS</text><text class="diagram-number" x="56" y="157">14—16</text><text class="diagram-value diagram-value--compact" x="56" y="180">MiB / MAX BLOCK</text><g class="stream-lines"><path d="M56 216H162M56 236H148M56 256H158M56 276H139"/></g></g>
  ${arrow("compiler", "M184 201H222")}
  <g class="${tone("green")}" filter="url(#shadow-compiler)"><rect x="222" y="70" width="196" height="262" rx="15"/><text class="diagram-micro" x="244" y="98">BOUNDED STREAM COMPILER</text><g class="compiler-stages"><rect x="244" y="124" width="152" height="38" rx="7"/><rect x="244" y="174" width="152" height="38" rx="7"/><rect x="244" y="224" width="152" height="38" rx="7"/><text x="260" y="148">01 · typed extraction</text><text x="260" y="198">02 · sparse segments</text><text x="260" y="248">03 · coverage plan</text></g><path class="diagram-divider" d="M244 279H396"/><text class="diagram-label" x="244" y="306">PEAK BOUND</text><text class="diagram-value diagram-value--compact" x="396" y="306" text-anchor="end">≤432 MiB</text></g>
  ${arrow("compiler", "M418 201H456")}
  <g class="${tone("blue")}" filter="url(#shadow-compiler)"><rect x="456" y="78" width="148" height="246" rx="15"/><text class="diagram-micro" x="476" y="105">OUTPUTS MEASURED</text><g class="terminal-options"><rect x="474" y="124" width="112" height="69" rx="9"/><text class="diagram-micro" x="486" y="145">INTERNAL HANDOFF</text><text class="diagram-number diagram-number--blue" x="486" y="176">113 B</text><rect class="terminal-option--dense" x="474" y="211" width="112" height="87" rx="9"/><text class="diagram-micro" x="486" y="232">DENSE TERMINAL π</text><text class="diagram-number diagram-number--coral" x="486" y="263">~11 min</text><text class="diagram-micro diagram-micro--coral" x="486" y="283">AT 255 AUTHORIZATIONS</text></g></g>
`, "Streaming and memory gates passed · evaluated terminal latency did not");

const atomic = frame("atomic", "ONE HEIGHT MUST MEAN ONE COMPLETE OBJECT", `
  <g class="${tone("coral")}" filter="url(#shadow-atomic)"><rect x="38" y="75" width="270" height="255" rx="15"/><text class="diagram-micro" x="60" y="103">BACKGROUND VALIDITY PIPELINE</text><text class="diagram-label" x="60" y="139">BLOCK TIP</text><text class="diagram-number" x="286" y="141" text-anchor="end">1042</text><text class="diagram-label" x="60" y="175">PROVEN TIP</text><text class="diagram-number diagram-number--coral" x="286" y="177" text-anchor="end">1039</text><path class="diagram-divider" d="M60 197H286"/>
    <g class="pipeline-steps"><rect x="60" y="222" width="62" height="48" rx="8"/><rect x="142" y="222" width="62" height="48" rx="8"/><rect x="224" y="222" width="62" height="48" rx="8"/><text x="91" y="251" text-anchor="middle">BLOCK</text><text x="173" y="251" text-anchor="middle">LINK</text><text x="255" y="251" text-anchor="middle">PROMOTE</text><path d="M122 246H142M204 246H224" marker-end="url(#arrow-atomic)"/></g><text class="diagram-micro" x="60" y="302">TWO DURABLE CURSORS · BACKLOG RECOVERY</text></g>
  <g class="comparison-mark"><path d="M320 186V220"/><circle cx="320" cy="203" r="16"/><text x="320" y="208" text-anchor="middle">→</text></g>
  <g class="${tone("green")}" filter="url(#shadow-atomic)"><rect x="332" y="75" width="270" height="255" rx="15"/><text class="diagram-micro" x="354" y="103">ATOMIC BLOCK BUNDLE</text><g class="bundle"><rect x="374" y="134" width="186" height="139" rx="13"/><rect x="396" y="157" width="142" height="39" rx="7"/><rect x="396" y="211" width="142" height="39" rx="7"/><text class="diagram-value diagram-value--compact" x="467" y="182" text-anchor="middle">BLOCK h</text><text class="diagram-value diagram-value--compact" x="467" y="236" text-anchor="middle">HistoryStep πₕ</text><path d="M467 196V211"/></g><g class="proof-seal"><circle cx="570" cy="297" r="15"/><path d="M562 297 568 303 578 289"/></g><text class="diagram-micro" x="354" y="304">ONE ACCEPTED HEIGHT · NO VALIDITY LAG</text></g>
`, "Atomicity removes the second progress cursor and every partial-promotion state");

const incarnation = frame("incarnation", "ONE PHYSICAL SLOT · DISTINCT LOGICAL OUTPUTS", `
  <g class="${tone("neutral")}" filter="url(#shadow-incarnation)"><rect x="38" y="78" width="230" height="246" rx="15"/><text class="diagram-micro" x="60" y="105">SLOT 148 · INCARNATION 41</text><text class="diagram-value diagram-value--compact" x="60" y="143">50 NOID</text><path class="diagram-divider" d="M60 161H246"/><text class="diagram-label" x="60" y="190">OWNER</text><text class="diagram-value diagram-value--compact" x="246" y="190" text-anchor="end">A7…2C</text><text class="diagram-label" x="60" y="224">CREATION</text><text class="diagram-number" x="246" y="226" text-anchor="end">41</text><g class="leaf-hash"><rect x="60" y="252" width="186" height="43" rx="8"/><text class="diagram-micro" x="74" y="269">LEAF IDENTITY</text><text class="diagram-value diagram-value--compact" x="74" y="289">H(slot ∥ 41 ∥ value)</text></g></g>
  <g class="reuse-channel"><path d="M268 169H372" marker-end="url(#arrow-incarnation)"/><text class="diagram-micro" x="320" y="151" text-anchor="middle">SPEND → REUSE</text><path class="stale-cross" d="M301 232 339 270M339 232 301 270"/><text class="diagram-micro diagram-micro--coral" x="320" y="292" text-anchor="middle">STALE H₄₁</text></g>
  <g class="${tone("green")}" filter="url(#shadow-incarnation)"><rect x="372" y="78" width="230" height="246" rx="15"/><text class="diagram-micro" x="394" y="105">SLOT 148 · INCARNATION 42</text><text class="diagram-value diagram-value--compact" x="394" y="143">50 NOID</text><path class="diagram-divider" d="M394 161H580"/><text class="diagram-label" x="394" y="190">OWNER</text><text class="diagram-value diagram-value--compact" x="580" y="190" text-anchor="end">A7…2C</text><text class="diagram-label" x="394" y="224">CREATION</text><text class="diagram-number" x="580" y="226" text-anchor="end">42</text><g class="leaf-hash leaf-hash--new"><rect x="394" y="252" width="186" height="43" rx="8"/><text class="diagram-micro" x="408" y="269">NEW LEAF IDENTITY</text><text class="diagram-value diagram-value--compact" x="408" y="289">H(slot ∥ 42 ∥ value)</text></g></g>
`, "The incarnation travels with value, so reuse needs no quarantine root or delay");

const fusion = frame("fusion", "MERKLE FUSION · MEASURED TRADE-OFF", `
  <g class="chart-axis"><path d="M104 82V322H402"/><path d="M104 122H402M104 172H402M104 222H402M104 272H402"/><text x="93" y="326" text-anchor="end">0</text><text x="93" y="276" text-anchor="end">25</text><text x="93" y="226" text-anchor="end">50</text><text x="93" y="176" text-anchor="end">75</text><text x="93" y="126" text-anchor="end">100</text></g>
  <g class="fusion-bars">
    <text class="diagram-micro" x="125" y="346">PROOF BYTES</text><rect class="bar bar--base" x="126" y="142" width="72" height="180" rx="7"/><rect class="bar bar--good" x="211" y="178" width="72" height="144" rx="7"/><text x="162" y="132" text-anchor="middle">29.69 KiB</text><text x="247" y="168" text-anchor="middle">23.75 KiB</text>
    <text class="diagram-micro" x="305" y="346">PROVER TIME</text><rect class="bar bar--base" x="306" y="215" width="72" height="107" rx="7"/><rect class="bar bar--bad" x="391" y="142" width="72" height="180" rx="7"/><text x="342" y="205" text-anchor="middle">2.68 s</text><text x="427" y="132" text-anchor="middle">4.50 s</text>
  </g>
  <g class="fusion-legend"><circle cx="139" cy="370" r="4"/><text x="150" y="374">SEPARATE</text><circle class="good" cx="232" cy="370" r="4"/><text x="243" y="374">FUSED</text></g>
  <g class="fusion-metrics"><rect x="488" y="102" width="112" height="91" rx="12"/><text class="diagram-micro" x="506" y="128">SERIALIZED</text><text class="diagram-number" x="506" y="166">−20.0%</text><rect x="488" y="219" width="112" height="91" rx="12"/><text class="diagram-micro" x="506" y="245">PROVER</text><text class="diagram-number diagram-number--coral" x="506" y="283">+67.9%</text></g>
`, "Smaller serialization lost to a larger MLE and reduced prover parallelism");

const nonce = frame("nonce", "PROVE THE TEMPLATE ONCE · SEARCH THE NONCE", `
  <g class="${tone("neutral")}" filter="url(#shadow-nonce)"><rect x="38" y="83" width="184" height="238" rx="15"/><text class="diagram-micro" x="60" y="111">FIXED BLOCK TEMPLATE</text><text class="diagram-value diagram-value--compact" x="60" y="145">SEMHDR__</text><g class="template-fields"><rect x="60" y="174" width="140" height="28" rx="6"/><rect x="60" y="211" width="140" height="28" rx="6"/><rect x="60" y="248" width="140" height="28" rx="6"/><text x="72" y="193">STATE ROOT</text><text x="72" y="230">TX COMMITMENT</text><text x="72" y="267">DIFFICULTY</text></g><text class="diagram-micro" x="60" y="301">NONCE EXCLUDED</text></g>
  ${arrow("nonce", "M222 202H268")}
  <g class="${tone("green")}" filter="url(#shadow-nonce)"><rect x="268" y="133" width="120" height="138" rx="15"/><text class="diagram-micro" x="328" y="160" text-anchor="middle">HISTORYSTEP</text><text class="diagram-number" x="328" y="207" text-anchor="middle">π</text><text class="diagram-label" x="328" y="237" text-anchor="middle">ONE PROOF</text></g>
  <g class="nonce-bus"><path d="M388 202H423M423 113V299"/><circle cx="423" cy="113" r="4"/><circle cx="423" cy="175" r="4"/><circle cx="423" cy="237" r="4"/><circle cx="423" cy="299" r="4"/></g>
  <g class="nonce-list">
    <g><rect x="444" y="84" width="154" height="49" rx="9"/><text x="460" y="105">NONCE 0017</text><text class="diagram-micro" x="460" y="122">HASH 9A…E2</text></g>
    <g><rect x="444" y="146" width="154" height="49" rx="9"/><text x="460" y="167">NONCE A84C</text><text class="diagram-micro" x="460" y="184">HASH 41…90</text></g>
    <g><rect x="444" y="208" width="154" height="49" rx="9"/><text x="460" y="229">NONCE D331</text><text class="diagram-micro" x="460" y="246">HASH 07…B4</text></g>
    <g class="winner"><rect x="444" y="270" width="154" height="58" rx="9"/><text x="460" y="292">NONCE F102</text><text class="diagram-micro" x="460" y="310">0000…A7 · WINNER</text><circle cx="576" cy="299" r="9"/><path d="M571 299 575 303 582 294"/></g>
  </g>
`, "The winning PoW nonce is reconnected to the already-proved immutable template");

const fsfri = frame("fsfri", "CONCRETE FS-FRI SECURITY · BLOCK–TIWARI EXPECTED WORK", `
  <g class="${tone("neutral")}" filter="url(#shadow-fsfri)">
    <rect x="42" y="76" width="148" height="244" rx="14"/>
    <text class="diagram-micro" x="60" y="101">HISTORY INPUT</text>
    <text class="diagram-label" x="60" y="132">CHALLENGE</text>
    <text class="diagram-value diagram-value--compact" x="172" y="132" text-anchor="end">2²⁵⁵</text>
    <path class="diagram-divider" d="M60 146H172"/>
    <text class="diagram-label" x="60" y="171">RATE ρ</text>
    <text class="diagram-value diagram-value--compact" x="172" y="171" text-anchor="end">1 / 4</text>
    <text class="diagram-label" x="60" y="202">QUERIES ℓ</text>
    <text class="diagram-value diagram-value--compact" x="172" y="202" text-anchor="end">133</text>
    <text class="diagram-label" x="60" y="233">ORACLE κ</text>
    <text class="diagram-value diagram-value--compact" x="172" y="233" text-anchor="end">256</text>
    <path class="diagram-divider" d="M60 249H172"/>
    <text class="diagram-label" x="60" y="275">PROOF</text>
    <text class="diagram-value diagram-value--compact" x="172" y="275" text-anchor="end">HistoryStep</text>
    <g class="diagram-tag"><rect x="60" y="289" width="112" height="23" rx="6"/><text x="116" y="305">TARGET · 128</text></g>
  </g>

  ${arrow("fsfri", "M190 198H222")}

  <g class="${tone("blue")}" filter="url(#shadow-fsfri)">
    <rect x="222" y="105" width="166" height="184" rx="15"/>
    <text class="diagram-micro" x="305" y="131" text-anchor="middle">MINIMIZE OVER ALL Q ≥ 1</text>
    <text class="diagram-value diagram-value--compact" x="305" y="169" text-anchor="middle">W(Q) = Q / ε(Q)</text>
    <path class="diagram-divider" d="M242 187H368"/>
    <text class="diagram-label" x="305" y="214" text-anchor="middle">EXPECTED ORACLE WORK</text>
    <text class="diagram-number diagram-number--blue" x="305" y="254" text-anchor="middle">min W(Q)</text>
    <text class="diagram-micro" x="305" y="274" text-anchor="middle">EXACT INTEGER BOUNDARY</text>
  </g>

  ${arrow("fsfri", "M388 170H416")}
  ${arrow("fsfri", "M388 238H416")}

  <g class="${tone("green")}" filter="url(#shadow-fsfri)">
    <rect x="416" y="76" width="182" height="111" rx="14"/>
    <text class="diagram-micro" x="434" y="101">PROVED RBR · m = 861824</text>
    <text class="diagram-label" x="434" y="127">FS-FRI BITS</text>
    <text class="diagram-number" x="580" y="157" text-anchor="end">127</text>
    <text class="diagram-micro" x="434" y="171">CERTIFICATE [127, 128)</text>
  </g>

  <g class="${tone("blue")}" filter="url(#shadow-fsfri)">
    <rect x="416" y="209" width="182" height="111" rx="14"/>
    <text class="diagram-micro" x="434" y="234">CONJECTURE 1 · 2⁻²⁵⁵</text>
    <text class="diagram-label" x="434" y="260">FS-FRI BITS</text>
    <text class="diagram-number diagram-number--blue" x="580" y="290" text-anchor="end">127</text>
    <text class="diagram-micro" x="434" y="304">CERTIFICATE [127, 128)</text>
  </g>
`, "One parameter set · two RBR premises · exact minimization across every query budget");

const categoryone = `<svg viewBox="0 0 640 420" role="presentation">
  <defs>
    <radialGradient id="categoryone-disc" cx="39%" cy="31%" r="76%">
      <stop offset="0" stop-color="#182b30"/>
      <stop offset=".58" stop-color="#091316"/>
      <stop offset="1" stop-color="#020607"/>
    </radialGradient>
    <linearGradient id="categoryone-green" x1=".2" y1=".1" x2=".8" y2=".9">
      <stop offset="0" stop-color="#3dff91"/>
      <stop offset=".42" stop-color="#00e874"/>
      <stop offset="1" stop-color="#00b95c"/>
    </linearGradient>
    <radialGradient id="categoryone-blue" cx="35%" cy="28%" r="72%">
      <stop offset="0" stop-color="#78a8ff"/>
      <stop offset=".38" stop-color="#1768ef"/>
      <stop offset="1" stop-color="#002d92"/>
    </radialGradient>
    <radialGradient id="categoryone-node-green" cx="35%" cy="28%" r="72%">
      <stop offset="0" stop-color="#57ff9b"/>
      <stop offset=".38" stop-color="#00c960"/>
      <stop offset="1" stop-color="#006f34"/>
    </radialGradient>
    <radialGradient id="categoryone-red" cx="35%" cy="28%" r="72%">
      <stop offset="0" stop-color="#ff8c75"/>
      <stop offset=".4" stop-color="#ec3e28"/>
      <stop offset="1" stop-color="#891207"/>
    </radialGradient>
    <filter id="categoryone-orbit-glow" x="-10%" y="-15%" width="120%" height="130%">
      <feGaussianBlur stdDeviation=".65" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="categoryone-node-glow" x="-170%" y="-170%" width="440%" height="440%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="categoryone-coin-shadow" x="-35%" y="-35%" width="170%" height="180%">
      <feDropShadow dx="0" dy="9" stdDeviation="11" flood-color="#000" flood-opacity=".86"/>
    </filter>
    <filter id="categoryone-green-glow" x="-45%" y="-45%" width="190%" height="190%">
      <feGaussianBlur stdDeviation="3.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <g class="categoryone-orbits" fill="none" stroke="#f4f8f6" stroke-width="1.15" filter="url(#categoryone-orbit-glow)">
    <ellipse cx="320" cy="200" rx="150" ry="152" stroke-dasharray="5.2 5.2" opacity=".9"/>
    <ellipse cx="320" cy="200" rx="150" ry="55" stroke-dasharray="5.2 5.2" opacity=".88"/>
    <ellipse cx="320" cy="200" rx="59" ry="152" stroke-dasharray="5.2 5.2" opacity=".88"/>
    <path d="M170 200H470" stroke-dasharray="5.2 5.2" opacity=".9"/>
    <path d="M320 48V352" stroke-dasharray="5.2 5.2" opacity=".9"/>
  </g>

  <g class="categoryone-states" fill="#fff" font-family="KaTeX_Main, 'Times New Roman', serif" font-size="25">
    <text x="320" y="31" text-anchor="middle">|0⟩</text>
    <text x="320" y="382" text-anchor="middle">|1⟩</text>
    <text x="132" y="210" text-anchor="middle">|−i⟩</text>
    <text x="508" y="210" text-anchor="middle">|i⟩</text>
    <text x="208" y="282" text-anchor="middle">|−⟩</text>
    <text x="432" y="282" text-anchor="middle">|+⟩</text>
  </g>

  <g class="categoryone-nodes" filter="url(#categoryone-node-glow)" stroke-width=".8">
    <circle cx="320" cy="48" r="7.5" fill="url(#categoryone-blue)" stroke="#5595ff"/>
    <circle cx="320" cy="352" r="7.5" fill="url(#categoryone-red)" stroke="#ff6a50"/>
    <circle cx="170" cy="200" r="7.5" fill="url(#categoryone-node-green)" stroke="#3bfb85"/>
    <circle cx="470" cy="200" r="7.5" fill="url(#categoryone-node-green)" stroke="#3bfb85"/>
    <circle cx="208" cy="299" r="7.5" fill="url(#categoryone-blue)" stroke="#5595ff"/>
    <circle cx="432" cy="299" r="7.5" fill="url(#categoryone-blue)" stroke="#5595ff"/>
  </g>

  <g class="categoryone-coin" filter="url(#categoryone-coin-shadow)">
    <circle cx="320" cy="210" r="86" fill="url(#categoryone-disc)" stroke="#31545b" stroke-width="1.1"/>
    <circle cx="320" cy="210" r="66" fill="none" stroke="#004c2c" stroke-width="23" opacity=".7"/>
    <circle cx="320" cy="210" r="66" fill="none" stroke="url(#categoryone-green)" stroke-width="18" filter="url(#categoryone-green-glow)"/>
    <circle cx="320" cy="210" r="52" fill="#020809" stroke="#152729" stroke-width="1"/>
    <path d="M298 194L319 173C324 168 331 172 331 179V253" fill="none" stroke="#006b3e" stroke-width="23" stroke-linecap="round" stroke-linejoin="round" opacity=".68"/>
    <path d="M298 191L317 172C322 167 328 171 328 178V251" fill="none" stroke="url(#categoryone-green)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" filter="url(#categoryone-green-glow)"/>
  </g>
</svg>`;

export const artDiagrams = {
  frost,
  kernel,
  state,
  walk,
  authorization,
  binding,
  pcs,
  compiler,
  atomic,
  incarnation,
  fusion,
  nonce,
  fsfri,
  categoryone
};
