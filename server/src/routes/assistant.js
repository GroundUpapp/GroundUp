import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../middleware/auth.js';
import { requireQuickBooks } from '../middleware/quickbooks.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { getAssistantContext } from '../services/qboExtra.js';

const router = Router();

// Overridable so the model can be bumped without a code change.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

const SYSTEM_PROMPT = `You are the money guy for a small construction contractor in South Jersey — roofing, framing, concrete, HVAC, electrical. You sit on top of their QuickBooks and give them straight answers about their money.

Who you're talking to: a 2-10 person crew owner. On a job site at 6am, chasing invoices at 9pm. Smart, busy, not an accountant. Hates jargon.

How to talk:
- Blue collar and direct. Short. Like a sharp bookkeeper who's also a friend.
- Use plain words: "cash on hand" not "liquidity"; "money owed to you" not "accounts receivable"; "your cut" not "net margin"; "overdue" not "past due aging".
- Talk in dollars and days, NOT percentages and ratios. Say "$4,800, 45 days late" not "12% of AR aged 30+".
- Round to whole dollars. No cents.
- Lead with the answer. Keep it to a few sentences or a short list. No preamble like "Based on your data".
- If they ask you to draft a payment reminder, write a short, friendly-but-firm message they can copy/paste. Sign it with their company name if you know it.
- Only use the numbers in the provided data. If something isn't there, say you don't have it — don't make it up.
- It's fine to suggest one practical next step ("send a reminder", "follow up on the Maple St job").`;

// POST /api/assistant — body: { messages: [{ role:'user'|'assistant', content }] }
router.post(
  '/assistant',
  requireAuth,
  rateLimit({ name: 'assistant', max: 20, window: '1 m' }),
  requireQuickBooks,
  async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'Assistant is not configured yet.' });
    }

    const messages = (Array.isArray(req.body?.messages) ? req.body.messages : [])
      .filter(
        (m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
      )
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'Ask a question to get started.' });
    }

    const context = await getAssistantContext(req.qbo, req.quickbooks.realmId);

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        {
          type: 'text',
          text:
            `Here is the contractor's current QuickBooks data as JSON. ` +
            `All amounts are US dollars.\n\n${JSON.stringify(context)}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    });

    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    res.json({ reply: reply || "I couldn't pull that together — try asking another way." });
  } catch (err) {
    console.error('Assistant error:', err);
    res.status(500).json({ error: 'The assistant had trouble. Try again in a moment.' });
  }
});

export default router;
