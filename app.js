// Stock Advisor - app.js (Netlify Function version)
const q = s => document.querySelector(s);
const symbolInput = q("#symbol");
const checkBtn = q("#checkBtn");
const summaryEl = q("#summary");

function show(el){ el.classList.remove("hidden"); }
function hide(el){ el.classList.add("hidden"); }

checkBtn.addEventListener("click", () => {
  const sym = symbolInput.value.trim();
  if(!sym){ alert("Enter ticker like RPOWER.NS"); return; }
  runAnalysis(sym.toUpperCase());
});

// Fetch quote via Netlify Function
async function fetchQuote(symbol){
  const url = `/.netlify/functions/fetchStock?symbol=${symbol}`;
  const resp = await fetch(url);
  if(!resp.ok) throw new Error("Fetch failed: " + resp.status);
  const data = await resp.json();
  return data.quote;
}

// Fetch chart via Netlify Function
async function fetchChart(symbol){
  const url = `/.netlify/functions/fetchStock?symbol=${symbol}`;
  const resp = await fetch(url);
  if(!resp.ok) throw new Error("Fetch failed: " + resp.status);
  const data = await resp.json();
  // Convert historical chart to expected format
  return {
    indicators: {
      quote: [{ close: data.chart.map(c => c.close) }]
    }
  };
}

// SMA
function sma(values, period){
  const res = [];
  for(let i=0;i<values.length;i++){
    if(i+1<period) res.push(null);
    else {
      const slice = values.slice(i+1-period, i+1);
      res.push(slice.reduce((a,b)=>a+b,0)/period);
    }
  }
  return res;
}

// RSI
function rsi(values, period=14){
  const deltas = [];
  for(let i=1;i<values.length;i++) deltas.push(values[i]-values[i-1]);
  let seedUp = 0, seedDown = 0;
  for(let i=0;i<period;i++){
    const d = deltas[i];
    if(d>0) seedUp+=d; else seedDown-=d;
  }
  let upAvg = seedUp/period, downAvg = seedDown/period;
  const rsiArr = new Array(period).fill(null);
  for(let i=period;i<deltas.length;i++){
    const d = deltas[i];
    upAvg = (upAvg*(period-1) + Math.max(0,d))/period;
    downAvg = (downAvg*(period-1) + Math.max(0,-d))/period;
    const rs = upAvg / (downAvg || 1e-9);
    rsiArr.push(100 - (100 / (1 + rs)));
  }
  rsiArr.unshift(null);
  return rsiArr;
}

// Weighted score
function buildScore(fundPct, techPct, riskPct){
  return (fundPct*0.5) + (techPct*0.3) + (riskPct*0.2);
}

// Run analysis
async function runAnalysis(symbol){
  try{
    hide(summaryEl);
    summaryEl.innerHTML = "Fetching data...";
    show(summaryEl);

    const [quote, chart] = await Promise.all([
      fetchQuote(symbol),
      fetchChart(symbol)
    ]);

    const closes = chart.indicators.quote[0].close;
    const lastClose = closes[closes.length-1];
    const sma50 = sma(closes,50).slice(-1)[0];
    const sma200 = sma(closes,200).slice(-1)[0];
    const lastRsi = rsi(closes,14).slice(-1)[0];

    // Fundamental checks
    let fundScore = 0, fundNote = [];
    const pe = quote.trailingPE || null;
    const pb = quote.priceToBook || null;
    if(pe && pe<25) { fundScore+=1; fundNote.push("P/E reasonable"); } else fundNote.push("P/E high/NA");
    if(pb && pb<4) { fundScore+=1; fundNote.push("P/B reasonable"); } else fundNote.push("P/B high/NA");
    fundNote.push("Manual check: debt & results");
    const fundPct = (fundScore/3)*100;

    // Technical checks
    let techScore=0, techNote=[];
    if(lastClose && sma50 && lastClose>sma50){ techScore+=1; techNote.push("Price>SMA50"); } else techNote.push("Price<=SMA50");
    if(lastClose && sma200 && lastClose>sma200){ techScore+=1; techNote.push("Price>SMA200"); } else techNote.push("Price<=SMA200");
    if(lastRsi && lastRsi>30 && lastRsi<70){ techScore+=1; techNote.push("RSI neutral"); } else techNote.push("RSI extreme");
    const techPct = (techScore/3)*100;

    const finalScore = buildScore(fundPct, techPct, 50); // risk fixed 50%
    let rec="HOLD";
    if(finalScore>=70) rec="STRONG BUY";
    else if(finalScore>=60) rec="BUY";
    else if(finalScore>=45) rec="HOLD";
    else rec="SELL/AVOID";

    summaryEl.className="card "+(finalScore>=60?"summary-good":"summary-bad");
    summaryEl.innerHTML=`<h2>${quote.longName||symbol}</h2>
    <p>Price: ${lastClose}</p>
    <p>Score: ${finalScore.toFixed(1)}% → <strong>${rec}</strong></p>
    <p>P/E: ${pe?pe.toFixed(2):'NA'} | P/B: ${pb?pb.toFixed(2):'NA'}</p>`;

  } catch(err){
    summaryEl.className="card summary-bad";
    summaryEl.innerHTML=`<h2>Error</h2><p>${err.message}</p>`;
    show(summaryEl);
  }
       }
