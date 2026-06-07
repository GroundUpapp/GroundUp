import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

function money(n) {
  return '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
}

// A safe, deterministic one-liner if the AI is unavailable.
function fallbackInsight(d) {
  if (d.newlyOverdue?.length) {
    const i = d.newlyOverdue[0];
    return `${i.customer} just went ${i.daysOverdue} days overdue for ${money(i.amount)} — send a reminder today.`;
  }
  if (d.moneyOwed > 0) {
    return `You're owed ${money(d.moneyOwed)} across ${d.openInvoices} invoices. Chase the oldest one this week.`;
  }
  if (d.topJob) {
    return `${d.topJob.name} is your best earner right now (${money(d.topJob.cut)} your cut). Line up the next one like it.`;
  }
  return 'Cash and receivables look steady. Keep invoicing on time to stay ahead.';
}

const SYSTEM = `You are the money guy for a small South Jersey construction contractor (roofing, framing, concrete, HVAC, electrical). Given a JSON snapshot of their week, write ONE short action item in plain, blue-collar language. Dollars and days, not percentages. One or two sentences, direct, no preamble, no greeting. Example tone: "Pelham Build is 14 days overdue — send a reminder today."`;

export async function generateWeeklyInsight(d) {
  if (!process.env.ANTHROPIC_API_KEY) return fallbackInsight(d);
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim() });
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 150,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: JSON.stringify(d) }],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim();
    return text || fallbackInsight(d);
  } catch (e) {
    console.error('generateWeeklyInsight error:', e.message);
    return fallbackInsight(d);
  }
}

// Plain-English budget-vs-actual summary for one job (Job Cost feature).
export async function generateJobCostSummary(job) {
  const over = job.varianceDollars;
  const fallback =
    over > 0
      ? `${job.name}: you've spent ${money(job.actualCost)} against a ${money(job.estimatedCost)} budget — ${money(over)} (${job.variancePct}%) over on this job.`
      : `${job.name}: ${money(job.actualCost)} spent against a ${money(job.estimatedCost)} budget — ${money(Math.abs(over))} under. Looking good.`;

  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim() });
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 160,
      system: [
        {
          type: 'text',
          text: 'You explain a contractor job\'s budget vs. actuals in one or two plain, blue-collar sentences. Use the dollar figures given (estimated/actual revenue, estimated/actual cost, variance). Dollars, not percentages-only. Lead with whether they\'re over or under budget and by how much. Do NOT invent material/labor breakdowns that aren\'t in the data.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: JSON.stringify(job) }],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim();
    return text || fallback;
  } catch (e) {
    console.error('generateJobCostSummary error:', e.message);
    return fallback;
  }
}

// Plain-English quarterly expense summary a contractor can forward straight to
// their accountant. Groups are already totaled; the AI just narrates them.
const TAX_SUMMARY_SYSTEM =
  'You write a single plain-English paragraph summarizing a construction ' +
  "contractor's business expenses for a calendar quarter, so they can forward " +
  'it directly to their accountant. You are given the quarter, company name, the ' +
  'total spend, and a breakdown by category (materials, labor, subcontractors, ' +
  'equipment, fuel, other) in dollars. State the quarter, the total, and walk ' +
  'through each category that has spend with its dollar figure. Use the exact ' +
  'dollar figures given — never invent numbers or categories that are not in the ' +
  'data, and skip categories that are $0. Professional but approachable, no ' +
  'greeting, no sign-off, no bullet points — one flowing paragraph. End by noting ' +
  'these are unaudited figures pulled from QuickBooks for the accountant to review.';

export async function generateTaxSummary({ quarter, companyName, total, breakdown }) {
  const named = companyName || 'the business';
  const parts = Object.entries(breakdown || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, v]) => `${money(v)} on ${cat}`);
  const list = parts.length
    ? ` This breaks down into ${parts.join(', ')}.`
    : '';
  const fallback =
    `For ${quarter}, ${named} recorded ${money(total)} in deductible business ` +
    `expenses.${list} These are unaudited figures pulled from QuickBooks for your review.`;

  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim() });
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: [{ type: 'text', text: TAX_SUMMARY_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: JSON.stringify({ quarter, companyName, total, breakdown }),
        },
      ],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return text || fallback;
  } catch (e) {
    console.error('generateTaxSummary error:', e.message);
    return fallback;
  }
}

// A warm, personal payment reminder draft for a single overdue invoice — sounds
// like the contractor wrote it themselves, not a billing department.
export async function generateReminderDraft({ customer, amount, daysOverdue, companyName, invoiceNumber }) {
  const fallback =
    `Hi ${customer},\n\nThis is a friendly reminder that invoice${invoiceNumber ? ` #${invoiceNumber}` : ''} for ` +
    `${money(amount)} is now ${daysOverdue} days past due. Please arrange payment at your earliest convenience, ` +
    `or reach out if there's any issue we can sort out.\n\nThanks,\n${companyName || 'The team'}`;

  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim() });
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: [
        {
          type: 'text',
          text: 'Write a short, friendly payment reminder for an overdue contractor invoice, in the contractor\'s own voice — like a quick text or note from the person who actually did the work, NOT from a billing department. Use plain, conversational language ("hey", "just a heads up", "no worries", "shoot me a text"). Address the customer by name (first name if it\'s a person), and work in the invoice number, the amount owed, and how many days overdue it is. Keep it easygoing and understanding — assume it just slipped their mind. If the data includes a pay link (e.g. payLink / viewAndPayUrl), add a "view and pay online" line with the real URL; if there is no link, leave it out. Sign off with the company name. Hard rules: 3 to 5 sentences max; no subject line; no placeholders in brackets — use the real details given; no formal or corporate language; never use phrases like "remit payment", "past due", or "at your earliest convenience". Example tone: "Hey Dave, just wanted to follow up on invoice #1038 for $106.92 — it was due 37 days ago and hasn\'t come through yet. No worries if it got lost in the shuffle, here\'s the link to pay online. Let me know if you have any questions. Thanks, Craig\'s Design and Landscaping".',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: JSON.stringify({ customer, amount, daysOverdue, companyName, invoiceNumber }),
        },
      ],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return text || fallback;
  } catch (e) {
    console.error('generateReminderDraft error:', e.message);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Late-payment risk (Pro)
// ---------------------------------------------------------------------------

const RISK_LEVELS = ['on_time', 'at_risk', 'likely_late'];

// Deterministic risk call from a customer's history, used as the fallback when
// the AI is unavailable and to keep the AI's output honest.
function fallbackPaymentRisk({ customer, daysOverdue, history }) {
  const { invoicesPaid, avgDaysToPay, latePaymentRate, lastFourLate, lastFourCount } = history;

  if (!invoicesPaid) {
    if (daysOverdue > 0) {
      return {
        risk: 'likely_late',
        reason: `${customer} is already ${daysOverdue} days overdue and has no prior payment history — send a reminder now.`,
      };
    }
    return {
      risk: 'at_risk',
      reason: `${customer} has no paid invoices on record yet, so there's no track record to go on — keep an eye on this one.`,
    };
  }

  const rate = latePaymentRate; // 0..1
  let risk = 'on_time';
  if (daysOverdue > 0 || rate >= 0.5) risk = 'likely_late';
  else if (rate >= 0.25 || (avgDaysToPay != null && avgDaysToPay > 3)) risk = 'at_risk';

  let reason;
  if (lastFourLate >= 2) {
    reason = `${customer} has paid late ${lastFourLate} of their last ${lastFourCount} invoices — consider sending a reminder now.`;
  } else if (daysOverdue > 0) {
    reason = `${customer} usually pays in about ${avgDaysToPay} days, but this invoice is already ${daysOverdue} days overdue — worth a nudge.`;
  } else if (risk === 'on_time') {
    reason = `${customer} has a clean record, paying in about ${avgDaysToPay} days on average — low risk.`;
  } else {
    reason = `${customer} averages about ${avgDaysToPay} days to pay and has been late on ${Math.round(rate * 100)}% of invoices — keep an eye on it.`;
  }
  return { risk, reason };
}

const PAYMENT_RISK_SYSTEM =
  'You assess how likely a small construction contractor\'s customer is to pay an ' +
  'OPEN invoice late. You are given the customer name, the open amount, how many ' +
  'days overdue it already is (0 = not yet due), and the customer\'s payment ' +
  'history: invoices paid, average days to pay, late-payment rate, and how many ' +
  'of their last few invoices were paid late. Respond with ONLY a JSON object: ' +
  '{"risk": "on_time" | "at_risk" | "likely_late", "reason": "<one sentence>"}. ' +
  'The reason must be one short, plain, blue-collar sentence in dollars and days ' +
  '(not percentages), citing the real history — e.g. "Jones Construction has paid ' +
  'late 3 of their last 4 invoices — consider sending a reminder now." Never invent ' +
  'numbers that are not in the data. If there is no history, say so plainly. JSON only, no preamble.';

export async function generatePaymentRisk({ customer, amount, daysOverdue, dueDate, history }) {
  const fallback = fallbackPaymentRisk({ customer, daysOverdue, history });
  if (!process.env.ANTHROPIC_API_KEY) return fallback;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim() });
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: [{ type: 'text', text: PAYMENT_RISK_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: JSON.stringify({ customer, amount, daysOverdue, dueDate, history }),
        },
      ],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    // Be defensive: pull the first JSON object out of the response.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]);
    const risk = RISK_LEVELS.includes(parsed.risk) ? parsed.risk : fallback.risk;
    const reason = typeof parsed.reason === 'string' && parsed.reason.trim()
      ? parsed.reason.trim()
      : fallback.reason;
    return { risk, reason };
  } catch (e) {
    console.error('generatePaymentRisk error:', e.message);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Monthly P&L comparison (Pro)
// ---------------------------------------------------------------------------

const MONTHLY_PL_SYSTEM =
  'You are the money guy for a small South Jersey construction contractor ' +
  '(roofing, framing, concrete, HVAC, electrical). You are given two months of ' +
  'profit & loss pulled from QuickBooks — "thisMonth" and "lastMonth" — each ' +
  'with total revenue, total expenses, net profit, and a breakdown of expenses ' +
  'by category. thisMonth is month-to-date and still in progress, so frame it as ' +
  '"so far this month" and do NOT alarm them that totals are lower simply ' +
  'because the month is not over yet. Write ONE plain-English paragraph of 3 to 5 ' +
  'short sentences comparing the two months: what went up, what went down, and ' +
  'which expense category or revenue swing drove the difference, then finish with ' +
  'ONE concrete, actionable observation. Use the exact dollar figures given — ' +
  'never invent numbers or categories, and ignore anything that is $0. Dollars ' +
  'and plain blue-collar language, not percentages or accounting jargon. No ' +
  'greeting, no sign-off, no bullet points — one flowing paragraph.';

// Plain-English paragraph comparing this month vs last month's P&L. `thisMonth`
// and `lastMonth` are the shapes from getMonthlyPL: { label, revenue, expenses,
// net, categories }.
export async function generateMonthlyPLSummary({ thisMonth, lastMonth }) {
  const dir = (now, prev) => (now >= prev ? 'up' : 'down');
  const fallback =
    `So far in ${thisMonth.label}, you've brought in ${money(thisMonth.revenue)} and spent ` +
    `${money(thisMonth.expenses)}, leaving ${money(thisMonth.net)} net. That's revenue ` +
    `${dir(thisMonth.revenue, lastMonth.revenue)} from ${money(lastMonth.revenue)} and expenses ` +
    `${dir(thisMonth.expenses, lastMonth.expenses)} from ${money(lastMonth.expenses)} compared with ` +
    `all of ${lastMonth.label}, so your net is ${dir(thisMonth.net, lastMonth.net)}. Keep invoicing ` +
    `on time and watch your biggest cost categories to hold the line on profit.`;

  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim() });
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: [{ type: 'text', text: MONTHLY_PL_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: JSON.stringify({ thisMonth, lastMonth }) }],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return text || fallback;
  } catch (e) {
    console.error('generateMonthlyPLSummary error:', e.message);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Customer scorecard (Pro)
// ---------------------------------------------------------------------------

const CUSTOMER_TIERS = ['top', 'average', 'problematic'];
const normName = (s) => String(s || '').trim().toLowerCase();

// One plain-English line about a customer — the per-row note when the AI is
// unavailable or leaves a note blank. The metrics (tier, score) are computed
// upstream in qboExtra; this just narrates the numbers it's handed.
function customerNote(c) {
  const pay =
    c.avgDaysToPay == null
      ? 'no fully-paid invoices on record yet'
      : `pays in about ${c.avgDaysToPay} days` +
        (c.latePaymentRate ? `, late on ${c.latePaymentRate}% of invoices` : ', rarely late');
  const margin = c.marginPct == null ? '' : `, ~${c.marginPct}% margin`;
  return `${money(c.revenue)} across ${c.jobs} ${c.jobs === 1 ? 'job' : 'jobs'} — ${pay}${margin}.`;
}

// Deterministic ranking + summary from each customer's precomputed score/tier.
// Used as the full fallback when the AI is unavailable, and as the base the AI's
// output is merged over so every customer always ends up with a tier and a note.
function fallbackScorecard(customers) {
  const ranked = [...customers].sort((a, b) => b.score - a.score || b.revenue - a.revenue);
  const ranking = ranked.map((c) => ({ name: c.name, tier: c.tier, note: customerNote(c) }));
  if (ranked.length === 0) {
    return { summary: 'No customer history yet — send some invoices to build your scorecard.', ranking };
  }
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  let summary = `Your best customer is ${best.name} — ${customerNote(best).replace(/\.$/, '')}.`;
  if (worst && worst.name !== best.name && worst.tier === 'problematic') {
    summary += ` Your toughest is ${worst.name}, who ${
      worst.latePaymentRate
        ? `has been late on ${worst.latePaymentRate}% of invoices`
        : 'drags out payment'
    }.`;
  }
  return { summary, ranking };
}

const CUSTOMER_SCORECARD_SYSTEM =
  'You are the money guy for a small South Jersey construction contractor ' +
  '(roofing, framing, concrete, HVAC, electrical). You are given a JSON array of ' +
  'their customers, each with: name, total revenue, average invoice size, average ' +
  'days to pay, late-payment rate (percent), number of jobs, and profit-margin ' +
  'percent (marginPct may be null when job costs are not tracked). Rank the ' +
  'customers from best to most difficult. A good customer pays on time (low days ' +
  'to pay, low late rate), is profitable (high margin), and brings steady revenue ' +
  'and jobs; a difficult one pays late, drags out payment, or runs thin or ' +
  'negative margins. Respond with ONLY a JSON object of the form {"summary": ' +
  '"...", "ranking": [{"name": "...", "tier": "top" | "average" | "problematic", ' +
  '"note": "..."}]}. Include EVERY customer in "ranking", best first, using their ' +
  'names EXACTLY as given. The summary is 2 to 4 sentences naming the single best ' +
  'customer and why, and the single most difficult and why, in plain blue-collar ' +
  'language with dollars and days. Each note is one short, plain sentence about ' +
  'that customer. Never invent numbers or names that are not in the data. Example ' +
  'summary tone: "Your best customer by margin is Bergen Builders — pays on time ' +
  'and jobs rarely run over. Your most difficult is Smith Residential — ' +
  'consistently late and jobs run over budget." JSON only, no preamble.';

/**
 * Rank a contractor's customers and write a plain-English summary. `customers`
 * are the scored metric rows from qboExtra (each carries a deterministic `score`
 * and `tier`). Returns { summary, ranking: [{ name, tier, note }] } where the
 * ranking covers every customer, best first — the AI's tier/note/order applied
 * on top of the deterministic fallback so nothing is ever missing.
 */
export async function generateCustomerScorecard(customers) {
  const fallback = fallbackScorecard(customers);
  if (!process.env.ANTHROPIC_API_KEY || customers.length === 0) return fallback;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim() });
    // Only send the fields the model should reason over — not internal scores.
    const payload = customers.map((c) => ({
      name: c.name,
      revenue: c.revenue,
      avgInvoice: c.avgInvoice,
      avgDaysToPay: c.avgDaysToPay,
      latePaymentRate: c.latePaymentRate,
      jobs: c.jobs,
      marginPct: c.marginPct,
    }));
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: [{ type: 'text', text: CUSTOMER_SCORECARD_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    // Be defensive: pull the first JSON object out of the response.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]);

    const summary =
      typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim()
        : fallback.summary;

    // Index the AI's entries by name, keeping the order it ranked them in.
    const aiByName = new Map();
    if (Array.isArray(parsed.ranking)) {
      parsed.ranking.forEach((r, i) => {
        if (!r || typeof r.name !== 'string') return;
        const key = normName(r.name);
        if (aiByName.has(key)) return;
        aiByName.set(key, {
          tier: CUSTOMER_TIERS.includes(r.tier) ? r.tier : null,
          note: typeof r.note === 'string' && r.note.trim() ? r.note.trim() : null,
          order: i,
        });
      });
    }
    if (aiByName.size === 0) return fallback;

    // Rebuild the ranking from our own customer list so it's always complete:
    // AI tier/note/order where given, deterministic tier/note otherwise.
    const ranking = customers
      .map((c) => {
        const ai = aiByName.get(normName(c.name));
        return {
          name: c.name,
          tier: (ai && ai.tier) || c.tier,
          note: (ai && ai.note) || customerNote(c),
          _order: ai ? ai.order : Number.MAX_SAFE_INTEGER,
          _score: c.score,
        };
      })
      .sort((a, b) => a._order - b._order || b._score - a._score)
      .map(({ _order, _score, ...r }) => r);

    return { summary, ranking };
  } catch (e) {
    console.error('generateCustomerScorecard error:', e.message);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Bid Estimator (Pro)
// ---------------------------------------------------------------------------

const BID_ESTIMATE_SYSTEM =
  'You are the money guy for a small South Jersey construction contractor ' +
  '(roofing, framing, concrete, HVAC, electrical). They are about to bid a new ' +
  'job and want to know what to charge to protect their usual profit. You are ' +
  'given JSON: the job type they typed, the contract value they have in mind, ' +
  'how many of their recent completed jobs this is based on, their usual margin ' +
  '(percent), their typical cost split as a percent of the job (materials, ' +
  'labor, subcontractors), a recommended minimum bid in dollars, and any cost ' +
  'categories that have been running high lately. Write 2 to 3 short, plain, ' +
  'blue-collar sentences. Lead with the recommendation in this exact shape: ' +
  '"Based on your last N jobs, to hit your usual M% margin you\'d need to bid at ' +
  'least $X." Then, if any category is flagged as running high, add one sentence ' +
  'naming it (e.g. "Watch your material costs — they\'ve been running high ' +
  'lately."). Use the exact dollar figures and percentages given — never invent ' +
  'numbers. Do NOT claim the past jobs are the same type of work; you only know ' +
  'they are their most recent completed jobs. No greeting, no sign-off, no bullet points.';

// Plain-English bid recommendation for a new job. Fields come from getBidEstimate:
// the entered job, the historical averages, the recommended bid, and any cost
// categories trending high. Falls back to a deterministic line if the AI is off.
export async function generateBidEstimate({
  jobType,
  contractValue,
  jobCount,
  usualMarginPct,
  materialPct,
  laborPct,
  subPct,
  recommendedBid,
  flags = [],
}) {
  const high = (flags || []).map((f) => f.category);
  const warn = high.length
    ? ` Watch your ${high.join(' and ')} cost${high.length > 1 ? 's' : ''} — ${
        high.length > 1 ? "they've" : "it's"
      } been running high lately.`
    : '';
  const fallback =
    `Based on your last ${jobCount} job${jobCount === 1 ? '' : 's'}, to hit your usual ` +
    `${usualMarginPct}% margin you'd need to bid at least ${money(recommendedBid)}.${warn}`;

  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim() });
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 220,
      system: [{ type: 'text', text: BID_ESTIMATE_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            jobType,
            contractValue,
            jobCount,
            usualMarginPct,
            materialPct,
            laborPct,
            subPct,
            recommendedBid,
            flags,
          }),
        },
      ],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim();
    return text || fallback;
  } catch (e) {
    console.error('generateBidEstimate error:', e.message);
    return fallback;
  }
}
