export async function onRequest(context) {
  const { env } = context;

  const diagnostics = {
    ok: true,
    note: 'Safe diagnostic only for V53. Values are not exposed.',
    has_admin_key: Boolean(env.CTW_GAME_ADMIN_KEY),
    has_petbot_url: Boolean(env.PETBOT_APPS_SCRIPT_URL),
    has_petbot_key: Boolean(env.PETBOT_API_KEY),
    kv_bound_status: Boolean(env.CTW_GAME_LEVELS || env.CTW_LEVELS || env.LEVELS),
    admin_key_length: env.CTW_GAME_ADMIN_KEY ? String(env.CTW_GAME_ADMIN_KEY).length : 0,
    petbot_url_looks_like_url: env.PETBOT_APPS_SCRIPT_URL ? /^https?:\/\//.test(String(env.PETBOT_APPS_SCRIPT_URL)) : false,
    timestamp: new Date().toISOString()
  };

  return new Response(JSON.stringify(diagnostics, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}
