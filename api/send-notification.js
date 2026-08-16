const webpush = require('web-push');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'https://pourlaflamme.vercel.app';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Mêmes dates que sur le site (index.html)
const START_DATE = Date.UTC(2026, 7, 7); // 7 août 2026
const TOTAL_DAYS = 16;

function dayNumberToday() {
  const diffDays = Math.floor((Date.now() - START_DATE) / 86400000) + 1;
  return Math.min(Math.max(diffDays, 1), TOTAL_DAYS);
}

module.exports = async (req, res) => {
  // Sécurité : n'accepte que les appels du Cron Vercel lui-même
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const slot = req.query.slot === 'evening' ? 'evening' : 'morning';
  const day = dayNumberToday();

  // Récupère le contenu du défi du jour depuis Supabase (si déjà rempli)
  let challengeText = 'Un nouveau moment t\u2019attend \u2726';
  try {
    const chRes = await fetch(
      `${SUPABASE_URL}/rest/v1/challenges?day=eq.${day}&time_slot=eq.${slot}&select=content`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );
    const rows = await chRes.json();
    if (Array.isArray(rows) && rows.length > 0 && rows[0].content) {
      challengeText = rows[0].content;
    }
  } catch (e) {
    // on garde le texte par défaut si Supabase ne répond pas
  }

  // Récupère tous les abonnés
  const subRes = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=*`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const subscriptions = await subRes.json();

  const payload = JSON.stringify({
    title: 'La Flamme \uD83D\uDD25',
    body: challengeText,
    url: VAPID_SUBJECT
  });

  const results = await Promise.allSettled(
    (subscriptions || []).map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      };
      return webpush.sendNotification(pushSubscription, payload);
    })
  );

  res.status(200).json({ attempted: results.length, day, slot });
};
