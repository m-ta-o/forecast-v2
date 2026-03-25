import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/market-research', async (req, res) => {
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

    // Use Gemini with Google Search grounding
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

    // Extract JSON from response
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
});

app.post('/api/suggest-format', async (req, res) => {
  try {
    const { productDescription } = req.body;

    if (!productDescription) {
      return res.status(400).json({ error: 'Missing product description' });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const prompt = `Based on this product: "${productDescription}"

Suggest the 3-4 most common product formats and pricing units for this type of product. Be comprehensive and include diverse delivery methods.

Respond in this EXACT JSON format (no markdown, just JSON):

{
  "suggestedFormats": ["format1", "format2", "format3", "format4"],
  "suggestedUnits": ["unit1", "unit2", "unit3"],
  "reasoning": "1-2 sentences explaining why these are common for this product category"
}

Examples:
- Supplements → formats: ["capsules", "gummies", "powder", "tablets"], units: ["per 60-count bottle", "per 30-day supply (60 caps)", "per 30-serving container"]
- Recovery/wellness → formats: ["patches", "gummies", "powder", "liquid"], units: ["per 30-day supply", "per box (30 patches)", "per 16oz bottle"]
- Skincare → formats: ["cream", "serum", "gel", "patches"], units: ["per 1oz bottle", "per 50ml jar", "per 30ml tube"]
- Protein/Food → formats: ["powder", "bars", "ready-to-drink", "gummies"], units: ["per 2lb tub (30 servings)", "per box (12 bars)", "per 12-pack"]

CRITICAL RULES FOR PRICING UNITS:
- ALWAYS include specific quantities (e.g., "60-count", "30-day", "2lb", "50ml")
- NEVER just say "per bottle" or "per container" without a size
- Use industry-standard sizes for this product category
- Include both the container type AND the quantity/duration (e.g., "per 30-day supply (60 capsules)")

IMPORTANT: Consider ALL common delivery methods for this product category, including gummies, patches, liquids, etc.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse suggestions from AI response');
    }

    const suggestions = JSON.parse(jsonMatch[0]);
    res.json(suggestions);
  } catch (error) {
    console.error('Format suggestion error:', error);
    res.status(500).json({
      error: 'Failed to get format suggestions',
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
