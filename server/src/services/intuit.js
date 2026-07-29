const STATE_SECRET = process.env.OAUTH_STATE_SECRET;

function getStateSecret() {
  if (!STATE_SECRET) {
    throw new Error('OAUTH_STATE_SECRET is required to sign QuickBooks OAuth state.');
  }
  return STATE_SECRET;
}

export function signState(userId) {
  const secret = getStateSecret();
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${userId}.${nonce}`;
  const sig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function verifyState(state) {
  try {
    const secret = getStateSecret();
    const decoded = Buffer.from(String(state), 'base64url').toString('utf8');
    const [userId, nonce, sig] = decoded.split('.');
    if (!userId || !nonce || !sig) return null;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${userId}.${nonce}`)
      .digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return userId;
  } catch {
    return null;
  }
}