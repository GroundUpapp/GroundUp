// Dark amber branded HTML emails. Inline styles for email-client compatibility.

const COLORS = {
  bg: '#140f0a',
  card: '#1b140d',
  border: '#3a2a13',
  amber: '#f4a826',
  amberDeep: '#e8900d',
  cream: '#f6efe1',
  cream2: '#cbb89a',
  green: '#34d399',
  red: '#f87171',
};

function appUrl() {
  return (process.env.APP_BASE_URL?.trim() || 'https://project-06pgg.vercel.app').replace(/\/$/, '');
}

function money(n) {
  const v = Math.round(Number(n) || 0);
  return '$' + v.toLocaleString('en-US');
}

function button(label) {
  return `<a href="${appUrl()}/dashboard" style="display:inline-block;background:${COLORS.amber};color:${COLORS.bg};text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:10px;">${label}</a>`;
}

function shell(innerHtml) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:${COLORS.bg};">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${COLORS.cream};">
    <div style="margin-bottom:18px;">
      <span style="display:inline-block;background:${COLORS.amber};color:${COLORS.bg};font-weight:800;border-radius:8px;padding:4px 8px;font-size:14px;">▮▮</span>
      <span style="font-size:18px;font-weight:800;color:${COLORS.cream};vertical-align:middle;margin-left:6px;">Ground<span style="color:${COLORS.amber};">Up</span></span>
    </div>
    ${innerHtml}
    <p style="margin-top:28px;font-size:12px;color:${COLORS.cream2};">
      Raftas Financial Group · Ground Up<br/>
      You're getting this because you have a Ground Up account.
    </p>
  </div></body></html>`;
}

function statRow(label, value, sub, subColor) {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};">
      <div style="font-size:13px;color:${COLORS.cream2};">${label}</div>
      <div style="font-size:22px;font-weight:800;color:${COLORS.cream};">${value}${
        sub ? ` <span style="font-size:13px;font-weight:600;color:${subColor || COLORS.cream2};">${sub}</span>` : ''
      }</div>
    </td>
  </tr>`;
}

export function weeklyReportEmail(d) {
  const cashDelta = d.cashOnHand - d.cashLastWeek;
  const cashSub =
    d.cashLastWeek != null
      ? `${cashDelta >= 0 ? '▲' : '▼'} ${money(Math.abs(cashDelta))} vs last week`
      : '';
  const cashSubColor = cashDelta >= 0 ? COLORS.green : COLORS.red;

  const overdueList =
    d.newlyOverdue && d.newlyOverdue.length
      ? `<ul style="margin:6px 0 0;padding-left:18px;color:${COLORS.cream};font-size:14px;">${d.newlyOverdue
          .map((i) => `<li>${i.customer} — ${money(i.amount)} (${i.daysOverdue} days)</li>`)
          .join('')}</ul>`
      : `<div style="font-size:14px;color:${COLORS.cream2};margin-top:6px;">Nothing new went overdue this week. 👍</div>`;

  const topJob = d.topJob
    ? `<div style="font-size:18px;font-weight:800;color:${COLORS.cream};">${d.topJob.name}</div>
       <div style="font-size:14px;color:${COLORS.green};">${money(d.topJob.cut)} your cut · ${d.topJob.cutPct}% margin</div>`
    : `<div style="font-size:14px;color:${COLORS.cream2};">No job data yet.</div>`;

  const inner = `
    <h1 style="font-size:22px;margin:0 0 4px;color:${COLORS.cream};">Your week at a glance</h1>
    <p style="margin:0 0 18px;color:${COLORS.cream2};font-size:14px;">${d.companyName || 'Your business'} · week of ${d.weekOf}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:12px;padding:6px 16px;">
      ${statRow('Cash on hand', money(d.cashOnHand), cashSub, cashSubColor)}
      ${statRow('Money owed to you', money(d.moneyOwed), `${d.openInvoices} unpaid`, COLORS.amber)}
    </table>

    <div style="margin-top:18px;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:12px;padding:14px 16px;">
      <div style="font-size:13px;color:${COLORS.cream2};">Went overdue this week</div>
      ${overdueList}
    </div>

    <div style="margin-top:14px;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:12px;padding:14px 16px;">
      <div style="font-size:13px;color:${COLORS.cream2};">Top job this week</div>
      <div style="margin-top:4px;">${topJob}</div>
    </div>

    <div style="margin-top:14px;background:rgba(244,168,38,0.10);border:1px solid ${COLORS.amber};border-radius:12px;padding:14px 16px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:${COLORS.amber};">This week's move</div>
      <div style="margin-top:6px;font-size:15px;color:${COLORS.cream};line-height:1.5;">${d.insight}</div>
    </div>

    <div style="margin-top:22px;">${button('View Dashboard')}</div>
  `;
  return shell(inner);
}

export function alertEmail({ heading, message }) {
  const inner = `
    <h1 style="font-size:21px;margin:0 0 10px;color:${COLORS.cream};">${heading}</h1>
    <div style="background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:12px;padding:16px;font-size:15px;line-height:1.55;color:${COLORS.cream};">
      ${message}
    </div>
    <div style="margin-top:20px;">${button('View Dashboard')}</div>
  `;
  return shell(inner);
}
