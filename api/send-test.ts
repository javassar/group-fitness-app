import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseServerClient } from './_lib/supabase.js';
import { sendWebPush, type PushTarget } from './_lib/push.js';

interface SendTestRequestBody {
  passcode?: string;
  memberId?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body as SendTestRequestBody;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Malformed request body' });
    }
  }

  const { passcode, memberId } = body || {};

  if (!passcode || typeof passcode !== 'string' || !memberId || typeof memberId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid passcode or memberId' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(500).json({ error: 'Server misconfiguration: CRON_SECRET is missing.' });
  }

  const supabase = getSupabaseServerClient();

  // 1. Verify passcode
  const { data: isValidPasscode, error: passcodeError } = await supabase.rpc('check_passcode', {
    p_passcode: passcode,
  });

  if (passcodeError || !isValidPasscode) {
    return res.status(401).json({ error: 'Invalid passcode' });
  }

  // 2. Fetch member's subscriptions
  const { data: subscriptions, error: subError } = await supabase.rpc(
    'get_member_subscriptions',
    {
      p_secret: cronSecret,
      p_member_id: memberId,
    }
  );

  if (subError) {
    return res.status(500).json({ error: subError.message });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return res.status(404).json({ error: 'No subscriptions found for this member.' });
  }

  // 3. Send test payload to each subscription
  const payload = {
    title: 'Group Fitness',
    body: 'Test notification. Reminders are working.',
    tag: 'test',
  };

  const results = await Promise.allSettled(
    (subscriptions as PushTarget[]).map((sub) => sendWebPush(sub, payload))
  );

  let sent = 0;
  let failed = 0;
  const goneEndpoints: string[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      if (result.value.status === 'sent') {
        sent++;
      } else if (result.value.status === 'gone') {
        goneEndpoints.push(result.value.endpoint);
        failed++;
      } else {
        failed++;
      }
    } else {
      failed++;
    }
  }

  // Delete dead subscriptions if any returned 404 or 410
  if (goneEndpoints.length > 0) {
    await supabase.rpc('delete_dead_subscriptions', {
      p_secret: cronSecret,
      p_endpoints: goneEndpoints,
    });
  }

  return res.status(200).json({ sent, failed });
}
