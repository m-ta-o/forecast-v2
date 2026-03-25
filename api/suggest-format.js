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
}
