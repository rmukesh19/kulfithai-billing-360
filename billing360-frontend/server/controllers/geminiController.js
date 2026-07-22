import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiInstance = null;
let lastQuotaExhaustedTime = 0;
const QUOTA_BACKOFF_DURATION = 15 * 60 * 1000; // 15 minutes backoff

function getAi() {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

function generateLocalInsights(data) {
  const insights = [];

  // 1. Stock / Inventory check
  const inventory = data.inventory || [];
  const meta = data.inventorySummary || {
    totalProducts: inventory.length,
    lowStockCount: inventory.filter(p => Number(p.stock) < 10).length,
    outOfStockCount: inventory.filter(p => Number(p.stock) <= 0).length
  };

  if (meta.outOfStockCount > 0 || meta.lowStockCount > 0) {
    const sampleNames = inventory.slice(0, 3).map(p => p.name).join(', ');
    const moreCount = inventory.length > 3 ? ` and ${inventory.length - 3} other items` : '';
    const itemList = sampleNames ? ` (including ${sampleNames}${moreCount})` : '';
    
    insights.push({
      title: "Critical Low Stock Alert",
      description: `Action Required: You have ${meta.outOfStockCount || 0} out-of-stock items and ${meta.lowStockCount || 0} items running below safe reorder thresholds${itemList}. We suggest placing a replenishment order to avoid disrupted order fulfillment.`,
      type: "stock",
      priority: "high"
    });
  } else if (meta.totalProducts > 0) {
    insights.push({
      title: "Inventory Stock Healthy",
      description: "Excellent! All tracked inventory items are at healthy volume margins and above minimum replenishment levels.",
      type: "stock",
      priority: "low"
    });
  }

  // 2. Sales trends
  const sales = data.sales || [];
  const totalSalesVal = sales.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);
  const pendingSales = sales.filter(inv => inv.status === 'pending');

  if (sales.length > 0) {
    const avgSale = (totalSalesVal / sales.length).toFixed(2);
    let desc = `Recent transaction analysis across ${sales.length} invoices shows a healthy average basket size of ₹${avgSale}. `;
    if (pendingSales.length > 0) {
      const pendingVal = pendingSales.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);
      desc += `${pendingSales.length} invoice(s) totalling ₹${pendingVal} remain in "pending" status. Prompt payment reminders can improve working capital.`;
      insights.push({
        title: "Accounts Receivable Action Plan",
        description: desc,
        type: "sale",
        priority: "medium"
      });
    } else {
      desc += `100% of analyzed invoices are fully paid. Customer payment compliance level is stellar, indicating minimal credit risk.`;
      insights.push({
        title: "High Cash Liquidity Profile",
        description: desc,
        type: "sale",
        priority: "medium"
      });
    }
  }

  // 3. Expenses Analysis
  const expenses = data.expenses || [];
  if (expenses.length > 0) {
    const totalExpVal = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    // Find biggest expense line
    let maxExpAmount = 0;
    let worstExp = null;
    expenses.forEach(e => {
      const amt = Number(e.amount || 0);
      if (amt > maxExpAmount) {
        maxExpAmount = amt;
        worstExp = e;
      }
    });

    let desc = `Operating expenditures totaled ₹${totalExpVal} across the latest logged vouchers. `;
    if (worstExp) {
      desc += `Checking indicates "${worstExp.description || worstExp.category || 'purchases'}" was your single highest outflow at ₹${maxExpAmount}. Review recurring costs to identify overhead reductions.`;
    }
    insights.push({
      title: "Operational Expenditure Audit",
      description: desc,
      type: "expense",
      priority: totalExpVal > (totalSalesVal * 0.4) ? "high" : "medium"
    });
  }

  // 4. Overall Health
  if (sales.length > 0 && expenses.length > 0) {
    const totalSalesVal = sales.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);
    const totalExpVal = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const ratio = totalSalesVal > 0 ? (totalExpVal / totalSalesVal) : 1;

    if (ratio < 0.3) {
      insights.push({
        title: "Exceptional Operating Margins",
        description: `Your expenses consume only ${(ratio * 100).toFixed(1)}% of your gross billing volume. Capital conversion rates are highly efficient, maintaining strong operating cash flow.`,
        type: "general",
        priority: "low"
      });
    } else if (ratio > 0.6) {
      insights.push({
        title: "Operational Cost Pressure Alert",
        description: `Operating expenses represent ${(ratio * 100).toFixed(1)}% of your latest invoice revenue. We recommend tracking fixed overheads and bulk procurement pricing to widen your gross margin.`,
        type: "general",
        priority: "high"
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      title: "Business Insights Generator Ready",
      description: "Start adding inventory, bills, and cash expenses to generate beautiful interactive smart business reports and visual intelligence dashboards here.",
      type: "general",
      priority: "low"
    });
  }

  return insights;
}

export const getBusinessInsights = async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: "Missing required business data" });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.log("[GEMINI] API Key missing, initiating highly descriptive rule-based insights locally.");
      const fallbackInsights = generateLocalInsights(data);
      // Prepend an advisory item notifying user they can connect keys
      return res.status(200).json([
        {
          title: "Advisory: Local Smart Insights Engine",
          description: "Currently rendering secure local calculations. To activate Gemini AI deep predictions, add a GEMINI_API_KEY.",
          type: "general",
          priority: "low"
        },
        ...fallbackInsights
      ]);
    }

    // Check sliding window backoff
    const timeSinceLastExhaustion = Date.now() - lastQuotaExhaustedTime;
    if (timeSinceLastExhaustion < QUOTA_BACKOFF_DURATION) {
      const remainingSeconds = Math.ceil((QUOTA_BACKOFF_DURATION - timeSinceLastExhaustion) / 1000);
      console.log(`[GEMINI BACKOFF ACTIVE] serving local insights immediately. Backoff remaining helper: ${remainingSeconds}s`);
      const fallbackInsights = generateLocalInsights(data);
      return res.status(200).json([
        {
          title: "API Limit: Local Calculations Active",
          description: "Your Gemini API service quota is currently exhausted/busy. Beautiful rule-based local calculations are being served instead.",
          type: "general",
          priority: "low"
        },
        ...fallbackInsights
      ]);
    }

    try {
      const ai = getAi();
      const prompt = `
        Analyze the following branch business metrics and provide 3 to 4 actionable, professional insights. Keep descriptions short, professional, and targeted.
        Sales (last 10 recent): ${JSON.stringify(data.sales || [])}
        Inventory Summary: ${JSON.stringify(data.inventorySummary || {})}
        Low Stock Sample: ${JSON.stringify(data.inventory || [])}
        Expenses (last 10 recent): ${JSON.stringify(data.expenses || [])}

        Target fields of response items:
        1. "title": descriptive title of the insight.
        2. "description": specific call to action or analysis statement.
        3. "type": "sale", "stock", "expense", or "general".
        4. "priority": "high", "medium", or "low".
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                type: { type: Type.STRING },
                priority: { type: Type.STRING }
              },
              required: ["title", "description", "type", "priority"]
            }
          }
        }
      });

      if (response && response.text) {
        const parsedInsights = JSON.parse(response.text);
        if (Array.isArray(parsedInsights) && parsedInsights.length > 0) {
          return res.json(parsedInsights);
        }
      }
      
      // Fallback if empty response
      return res.json(generateLocalInsights(data));
    } catch (apiError) {
      const errMsg = apiError.message || String(apiError);
      
      // Trip backoff window if we see any rate-limit or resource exhaustion identifiers
      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota_count") || errMsg.includes("requests")) {
        lastQuotaExhaustedTime = Date.now();
        console.warn(`[GEMINI API LIMIT] Quota exhausted (429). Commencing sliding-window backoff for ${QUOTA_BACKOFF_DURATION / 60000} mins.`);
      } else {
        console.warn("[GEMINI API ERROR] Model call failed:", errMsg);
      }
      
      const fallbackInsights = generateLocalInsights(data);
      // Add an indicator of rate-limiting/exhaustion so they know it fell back elegantly
      return res.status(200).json([
        {
          title: "API Limit: Local Calculations Active",
          description: "Your Gemini API service quota is currently exhausted/busy. Beautiful rule-based local calculations are being served instead.",
          type: "general",
          priority: "low"
        },
        ...fallbackInsights
      ]);
    }
  } catch (error) {
    console.error("Server Gemini Error:", error);
    try {
      const { data } = req.body;
      return res.status(200).json(generateLocalInsights(data || {}));
    } catch (innerErr) {
      return res.status(200).json([
        {
          title: "Analysis Offline",
          description: "Failed to generate business insights at this time.",
          type: "general",
          priority: "low"
        }
      ]);
    }
  }
};
