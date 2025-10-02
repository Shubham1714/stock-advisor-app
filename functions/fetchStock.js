// Netlify function to fetch Yahoo Finance data
const fetch = require("node-fetch");

exports.handler = async function(event, context) {
  const symbol = event.queryStringParameters.symbol;
  if(!symbol) {
    return { statusCode: 400, body: "Symbol missing" };
  }

  try {
    // Fetch quote
    const quoteResp = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`);
    const quoteJson = await quoteResp.json();

    // Fetch chart (1 year daily)
    const chartResp = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1d`);
    const chartJson = await chartResp.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ quote: quoteJson, chart: chartJson })
    };
  } catch(err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
