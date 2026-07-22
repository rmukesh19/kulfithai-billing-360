function generateLocalInsightsFrontend(data) {
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
      title: "Critical Low Stock Alert (Offline Mode)",
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
      priority: "medium"
    });
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

export const GeminiService = {
  getBusinessInsights: async (data) => {
    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch insights from server (status: ${response.status})`);
      }

      const insights = await response.json();
      return insights;
    } catch (error) {
      console.warn("[GEMINI FRONTEND FALLBACK] Server analysis fetch failed, falling back to local calculation logic:", error.message || error);
      const fallbackInsights = generateLocalInsightsFrontend(data);
      return [
        {
          title: "Offline Sync: Local Smart Insights Active",
          description: "Could not sync with the Gemini engine. Rendered secure, local computations of key business metrics in real-time.",
          type: "general",
          priority: "low"
        },
        ...fallbackInsights
      ];
    }
  }
};
