const webpush = require('web-push');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'https://pourlaflamme.vercel.app';

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

module.exports = async (req, res) => {
  // Sécurité : n'accepte que les appels du Cron Vercel lui-même
  const authHeader = req.headers['authorization'];

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Récupère tous les abonnés
  const subRes = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?select=*`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  const subscriptions = await subRes.json();

  // Notification envoyée
  const payload = JSON.stringify({
    title: 'La Flamme 🔥',
    body: 'Nouveau défi débloqué ! Avoue que je te manque !',
    url: VAPID_SUBJECT
  });

  const results = await Promise.allSettled(
    (subscriptions || []).map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      return webpush.sendNotification(pushSubscription, payload);
    })
  );

  res.status(200).json({
    attempted: results.length
  });
};
