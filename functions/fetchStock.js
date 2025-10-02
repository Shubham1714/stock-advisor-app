// functions/fetchStock.js
const yahooFinance = require("yahoo-finance2").default;

exports.handler = async function(event, context) {
  const symbol = event.queryStringParameters?.symbol;
  if(!symbol){
    return { statusCode: 400, body: JSON.stringify({error: "Symbol missing"}) };
  }

  try {
    // Fetch quote
    const quote = await yahooFinance.quote(symbol);

    // Fetch historical chart (1 year daily)
    const chart = await yahooFinance.historical(symbol, { period1: "1y", interval: "1d" });

    return {
      statusCode: 200,
      body: JSON.stringify({ quote, chart })
    };
  } catch(err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
