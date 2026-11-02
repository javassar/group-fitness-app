import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseServerClient } from './_lib/supabase.js';
import { sendWebPush } from './_lib/push.js';
import { buildReminderMessage } from './_lib/message.js';

interface ReminderTargetRow {
  member_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  logged_count: number;
  member_count: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(500).json({ error: 'Server misconfiguration: CRON_SECRET is missing.' });
  }

  // 1. Authorization header check
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. force query param
  const force = req.query.force === '1';

  const supabase = getSupabaseServerClient();

  // 3. Fetch reminder targets
  const { data: targets, error: targetsError } = await supabase.rpc(
    'get_reminder_targets',
    {
      p_secret: cronSecret,
      p_force: force,
    }
  );

  if (targetsError) {
    return res.status(500).json({ error: targetsError.message });
  }

  const targetList = (targets || []) as ReminderTargetRow[];

  // 4 & 5. Build messages and send in parallel
  const tasks = targetList.map(async (row) => {
    const message = buildReminderMessage(row.logged_count, row.member_count);
    const payload = {
      title: message.title,
      body: message.body,
      tag: 'daily-reminder',
    };
    const result = await sendWebPush(row, payload, 3600);
    return {
      memberId: row.member_id,
      ...result,
    };
  });

  const results = await Promise.allSettled(tasks);

  let sent = 0;
  let failed = 0;
  const sentMemberIds: string[] = [];
  const goneEndpoints: string[] = [];

  for (const item of results) {
    if (item.status === 'fulfilled') {
      const val = item.value;
      if (val.status === 'sent') {
        sent++;
        sentMemberIds.push(val.memberId);
      } else if (val.status === 'gone') {
        failed++;
        goneEndpoints.push(val.endpoint);
      } else {
        failed++;
      }
    } else {
      failed++;
    }
  }

  // 6. Unless force is true, mark members as reminded
  if (!force) {
    const uniqueMemberIds = Array.from(new Set(sentMemberIds));
    if (uniqueMemberIds.length > 0) {
      await supabase.rpc('mark_reminded', {
        p_secret: cronSecret,
        p_member_ids: uniqueMemberIds,
      });
    }
  }

  // 7. Call delete_dead_subscriptions for gone endpoints
  if (goneEndpoints.length > 0) {
    await supabase.rpc('delete_dead_subscriptions', {
      p_secret: cronSecret,
      p_endpoints: goneEndpoints,
    });
  }

  // 8. Respond with JSON counts only
  return res.status(200).json({
    targeted: targetList.length,
    sent,
    failed,
    removed: goneEndpoints.length,
  });
}
