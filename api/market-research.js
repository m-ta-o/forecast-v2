import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productDescription, region, productFormat, pricingUnit } = req.body;

    if (!productDescription || !region) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const regionName = region === 'US' ? 'United States' :
                       region === 'AU' ? 'Australia' :
                       region === 'UK' ? 'United Kingdom' :
                       region === 'CA' ? 'Canada' :
                       region === 'EU' ? 'Europe' : 'global';

    const currencyCode = region === 'US' ? 'USD' :
                        region === 'AU' ? 'AUD' :
                        region === 'UK' ? 'GBP' :
                        region === 'CA' ? 'CAD' :
                        region === 'EU' ? 'EUR' : 'USD';

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{
        googleSearch: {}
      }]
    });

    const pricingUnitInstruction = pricingUnit
      ? `- Standardize ALL prices to: ${pricingUnit}
- The "priceUnit" field must be exactly: "${pricingUnit}"`
      : `- Determine the most common pricing unit for this product category (e.g., "per bottle", "per unit", "per kg", "per 30-day supply", etc.)
- Standardize ALL prices to that unit
- Include the determined unit in "priceUnit" field`;

    const formatInfo = productFormat ? ` in ${productFormat} format` : '';

    const prompt = `Research the ${regionName} market for: "${productDescription}"${formatInfo}

Use Google Search to find current, real market data${productFormat ? ` specifically for ${productFormat} products` : ''}. Then provide your research in this EXACT JSON format (no markdown, just the JSON):

{
  "avgRetailPrice": <number>,
  "priceRange": { "min": <number>, "max": <number> },
  "priceUnit": "the pricing unit",
  "typicalCOGS": <number>,
  "cogsRange": { "min": <number>, "max": <number> },
  "grossMarginPercent": <number>,
  "purchaseFrequencyMonths": <number>,
  "competitorExamples": ["Competitor Name - Product Size/Supply - ${currencyCode}XX", "Competitor Name - Product Size/Supply - ${currencyCode}XX"],
  "marketInsights": "2-3 sentences about the market based on search results"
}

IMPORTANT PRICING RULES:
${pricingUnitInstruction}
- In competitorExamples, specify the package size/supply duration (e.g., "Brand X - 60 capsules (30-day) - ${currencyCode}49.99")
- All prices must be in ${currencyCode}
- Search for real current ${regionName} market data for similar products
- Be specific and accurate about what customers actually pay

CRITICAL - PURCHASE FREQUENCY MUST MATCH PRODUCT SIZE:
- If priceUnit is "per 30-day supply", purchaseFrequencyMonths should be approximately 1 month
- If priceUnit is "per 60-day supply", purchaseFrequencyMonths should be approximately 2 months
- If priceUnit is "per 90-day supply", purchaseFrequencyMonths should be approximately 3 months
- The purchase frequency represents how often customers RE-ORDER based on the product size
- DO NOT make purchaseFrequencyMonths longer than the supply duration implies

CRITICAL - COGS Definition:
- COGS = ONLY raw manufacturing cost (ingredients/materials + labor + packaging)
- DO NOT include: fulfillment, shipping, marketing, overhead, or any other costs
- For supplements: typical COGS should be 20-35% of retail price (aim for 65-80% gross margin)
- If your research suggests COGS > 40% of retail, recheck your sources`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse research data from AI response');
    }

    const research = JSON.parse(jsonMatch[0]);

    res.json(research);
  } catch (error) {
    console.error('Market research error:', error);
    res.status(500).json({
      error: 'Failed to conduct market research',
      details: error.message
    });
  }
}
