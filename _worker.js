const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-callback-token, x-callback-signature, x-duitku-signature",
  "Access-Control-Max-Age": "86400",
};

const jsonRes = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const APP_NAME = "ybsmembermaster";
const APP_VERSION = "1.0.118";
const APP_RELEASE_DATE = "2026-11-07";
const DEFAULT_INSTALLATION_MODE = "master";
const D1_SCHEMA_VERSION = "2026-10-27-notivgo-dynamic-qris-v1";
const PUBLIC_ACTION_CACHE_TTL_SECONDS = 120;
const SOCIAL_PROOF_CACHE_TTL_SECONDS = 60;
const GLOBAL_SETTINGS_CACHE_MS = 30 * 1000;

const noCacheHtmlHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0"
};

function htmlHeaders(extra = {}) {
  return { "Content-Type": "text/html;charset=utf-8", ...noCacheHtmlHeaders, ...extra };
}

function isHtmlRoute(pathname = "/") {
  const cleanPath = pathname || "/";
  const lastSegment = cleanPath.split("/").pop() || "";
  return cleanPath === "/" || cleanPath.endsWith(".html") || !lastSegment.includes(".");
}

function withNoCacheHtml(request, response) {
  if (!response || response.status !== 200) return response;
  const contentType = String(response.headers.get("Content-Type") || "").toLowerCase();
  const pathname = new URL(request.url).pathname;
  if (!contentType.includes("text/html") && !isHtmlRoute(pathname)) return response;

  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(noCacheHtmlHeaders)) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function clearGlobalSettingsCache() {
  globalSettingsCache = { expiresAt: 0, value: null };
}

function buildPublicCacheRequest(request, action, parts = {}) {
  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = `/__cloudmember_cache/${encodeURIComponent(action)}`;
  const params = new URLSearchParams();
  params.set("v", APP_VERSION);
  for (const key of Object.keys(parts).sort()) {
    const value = parts[key];
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  cacheUrl.search = params.toString();
  return new Request(cacheUrl.toString(), { method: "GET" });
}

async function withPublicActionCache(request, action, parts, producer, ttlSeconds = PUBLIC_ACTION_CACHE_TTL_SECONDS) {
  let producedResponse = null;
  try {
    if (!globalThis.caches || !request) return await producer();
    const cache = caches.default;
    const cacheRequest = buildPublicCacheRequest(request, action, parts);
    const cached = await cache.match(cacheRequest);
    if (cached) {
      const hitHeaders = new Headers(cached.headers);
      hitHeaders.set("X-CloudMember-Cache", "HIT");
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: hitHeaders
      });
    }

    const response = await producer();
    producedResponse = response;
    if (!response || response.status !== 200) return response;

    const headers = new Headers(response.headers);
    headers.set("Cache-Control", `public, max-age=${ttlSeconds}`);
    headers.set("X-CloudMember-Cache", "MISS");
    const cacheableResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });

    const cacheCopy = cacheableResponse.clone();
    await cache.put(cacheRequest, cacheCopy);
    return cacheableResponse;
  } catch (e) {
    console.log("Public action cache skipped:", e.message);
    if (producedResponse) return producedResponse;
    return await producer();
  }
}

const ADMIN_ACTIONS = new Set([
  "get_notification_delivery",
  "retry_order_notifications",
  "test_notivgo",
  "get_admin_data",
  "update_order_status",
  "delete_order",
  "save_product",
  "bulk_save_products",
  "save_coupon",
  "delete_coupon",
  "delete_product",
  "bulk_delete_products",
  "save_page",
  "delete_page",
  "update_settings",
  "update_admin_access",
  "purge_cf_cache",
  "upload_payment_logo",
  "upload_drive_media",
  "takeover_domain",
  "get_ik_auth",
  "reset_commission",
  "save_lms_materi",
  "import_youtube_playlist",
  "reset_license_domain",
  "preview_blast_targets",
  "send_blast_batch",
  "test_wa_gateway",
  "test_meta_capi",
  "sync_meta_purchases",
  "get_system_backup_info",
  "trigger_cloudflare_update",
  "register_client_update_target",
  "get_registered_update_clients",
  "export_mysql_backup",
  "bulk_import_members",
  "bulk_import_orders",
  "bulk_import_license_stock",
  "generate_license_stock",
  "delete_member"
]);

const PRE_ACTIVATION_ACTIONS = new Set([
  "get_global_settings",
  "check_master_update",
  "activate_client_license",
  "check_client_license",
  "self_reset_client_domain",
  "register_update_client",
  "list_update_clients_for_deploy"
]);

const PUBLIC_SETTING_KEYS = new Set([
  "site_url",
  "site_name",
  "site_tagline",
  "site_headline",
  "site_address",
  "site_logo",
  "site_hero_image",
  "site_favicon",
  "asset_cdn_url",
  "theme_color",
  "theme_color_1",
  "theme_color_2",
  "wa_admin",
  "mail_sender_email",
  "ga_id",
  "meta_pixel_id",
  "tiktok_pixel_id",
  "meta_currency",
  "currency",
  "enable_social_proof",
  "is_manual_active",
  "auto_gateway",
  "duitku_enabled_channels",
  "tripay_enabled_channels",
  "xendit_enabled_channels",
  "midtrans_enabled_channels",
  "duitku_merchant_name",
  "duitku_env",
  "tripay_merchant_name",
  "tripay_env",
  "xendit_merchant_name",
  "midtrans_merchant_name",
  "midtrans_env",
  "bank_name",
  "bank_norek",
  "bank_owner",
  "bank_name_2",
  "bank_norek_2",
  "bank_owner_2",
  "bank_name_3",
  "bank_norek_3",
  "bank_owner_3",
  "qris_image_url",
  "qris_owner_name",
  "payment_logo_overrides",
  "shipping_enabled",
  "shipping_provider",
  "shipping_couriers",
  "shipping_origin_area_name",
  "shipping_origin_postal_code",
  "member_support_url",
  "member_group_wa_url",
  "member_group_telegram_url",
  "affiliate_marketing_kit_url"
]);

const PAYMENT_LOGO_SLUGS = new Set([
  "payment",
  "bca",
  "bni",
  "bri",
  "bsi",
  "btn",
  "cimb",
  "mandiri",
  "maybank",
  "permata",
  "qris",
  "ovo",
  "dana",
  "shopeepay",
  "gopay",
  "alfamart",
  "indomaret"
]);

const D1_SCHEMA = {
  settings: {
    create: `CREATE TABLE IF NOT EXISTS settings (
      kunci TEXT PRIMARY KEY,
      nilai TEXT
    )`,
    columns: [
      ["kunci", "TEXT"],
      ["nilai", "TEXT"]
    ]
  },
  users: {
    create: `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_user TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT,
      nama TEXT,
      role TEXT DEFAULT 'member',
      tanggal_daftar TEXT,
      whatsapp TEXT,
      affiliate TEXT,
      rekening TEXT,
      info_rekening TEXT,
      status TEXT DEFAULT 'Active',
      source TEXT,
      last_login TEXT
    )`,
    columns: [
      ["id", "INTEGER"],
      ["id_user", "TEXT"],
      ["email", "TEXT"],
      ["password", "TEXT"],
      ["nama", "TEXT"],
      ["role", "TEXT DEFAULT 'member'"],
      ["tanggal_daftar", "TEXT"],
      ["whatsapp", "TEXT"],
      ["affiliate", "TEXT"],
      ["rekening", "TEXT"],
      ["info_rekening", "TEXT"],
      ["status", "TEXT DEFAULT 'Active'"],
      ["source", "TEXT"],
      ["last_login", "TEXT"]
    ]
  },
  access_rules: {
    create: `CREATE TABLE IF NOT EXISTS access_rules (
      id_produk TEXT PRIMARY KEY,
      title TEXT,
      "desc" TEXT,
      deskripsi TEXT,
      url_akses TEXT,
      url TEXT,
      harga REAL DEFAULT 0,
      status TEXT DEFAULT 'Active',
      lp_url TEXT,
      komisi REAL DEFAULT 0,
      komisi_l2 REAL DEFAULT 0,
      komisi_l3 REAL DEFAULT 0,
      bump_status TEXT DEFAULT 'Inactive',
      bump_title TEXT,
      bump_price REAL DEFAULT 0,
      bump_desc TEXT,
      bump_url TEXT,
      bump_product_id TEXT,
      gambar TEXT,
      kategori TEXT DEFAULT 'Umum',
      harga_coret REAL DEFAULT 0,
      pdf_drive_id TEXT,
      ga_id TEXT,
      meta_pixel_id TEXT,
      tiktok_pixel_id TEXT,
      payment_methods TEXT,
      license_enabled TEXT,
      license_mode TEXT,
      billing_type TEXT DEFAULT 'one_time',
      subscription_days INTEGER DEFAULT 0,
      product_type TEXT DEFAULT 'digital',
      weight_grams INTEGER DEFAULT 0,
      length_cm REAL DEFAULT 0,
      width_cm REAL DEFAULT 0,
      height_cm REAL DEFAULT 0,
      stock_qty INTEGER DEFAULT 0,
      upgrade_to_products TEXT
    )`,
    columns: [
      ["id_produk", "TEXT"],
      ["title", "TEXT"],
      ['"desc"', "TEXT"],
      ["deskripsi", "TEXT"],
      ["url_akses", "TEXT"],
      ["url", "TEXT"],
      ["harga", "REAL DEFAULT 0"],
      ["status", "TEXT DEFAULT 'Active'"],
      ["lp_url", "TEXT"],
      ["komisi", "REAL DEFAULT 0"],
      ["komisi_l2", "REAL DEFAULT 0"],
      ["komisi_l3", "REAL DEFAULT 0"],
      ["bump_status", "TEXT DEFAULT 'Inactive'"],
      ["bump_title", "TEXT"],
      ["bump_price", "REAL DEFAULT 0"],
      ["bump_desc", "TEXT"],
      ["bump_url", "TEXT"],
      ["bump_product_id", "TEXT"],
      ["gambar", "TEXT"],
      ["kategori", "TEXT DEFAULT 'Umum'"],
      ["harga_coret", "REAL DEFAULT 0"],
      ["pdf_drive_id", "TEXT"],
      ["ga_id", "TEXT"],
      ["meta_pixel_id", "TEXT"],
      ["tiktok_pixel_id", "TEXT"],
      ["payment_methods", "TEXT"],
      ["license_enabled", "TEXT"],
      ["license_mode", "TEXT"],
      ["billing_type", "TEXT DEFAULT 'one_time'"],
      ["subscription_days", "INTEGER DEFAULT 0"],
      ["product_type", "TEXT DEFAULT 'digital'"],
      ["weight_grams", "INTEGER DEFAULT 0"],
      ["length_cm", "REAL DEFAULT 0"],
      ["width_cm", "REAL DEFAULT 0"],
      ["height_cm", "REAL DEFAULT 0"],
      ["stock_qty", "INTEGER DEFAULT 0"],
      ["upgrade_to_products", "TEXT"]
    ]
  },
  orders: {
    create: `CREATE TABLE IF NOT EXISTS orders (
      invoice TEXT PRIMARY KEY,
      email TEXT,
      nama TEXT,
      whatsapp TEXT,
      id_produk TEXT,
      nama_produk TEXT,
      harga_total REAL DEFAULT 0,
      quantity INTEGER DEFAULT 1,
      unit_price REAL DEFAULT 0,
      status TEXT DEFAULT 'Pending',
      tanggal_order TEXT,
      affiliate TEXT,
      komisi REAL DEFAULT 0,
      affiliate_l1 TEXT,
      affiliate_l2 TEXT,
      affiliate_l3 TEXT,
      komisi_l1 REAL DEFAULT 0,
      komisi_l2 REAL DEFAULT 0,
      komisi_l3 REAL DEFAULT 0,
      reminder_level INTEGER DEFAULT 0,
      take_bump TEXT,
      license_key TEXT,
      license_product_id TEXT,
      bump_product_id TEXT,
      bump_title_snapshot TEXT,
      bump_url_snapshot TEXT,
      bump_license_key TEXT,
      bump_license_product_id TEXT,
      payment_method TEXT,
      payment_channel TEXT,
      payment_name TEXT,
      payment_code TEXT,
      payment_owner TEXT,
      payment_url TEXT,
      payment_qr_url TEXT,
      payment_instruction TEXT,
      domain TEXT,
      meta_fbp TEXT,
      meta_fbc TEXT,
      meta_client_ip TEXT,
      meta_user_agent TEXT,
      meta_purchase_sent TEXT,
      meta_purchase_prod_sent TEXT,
      meta_purchase_test_sent TEXT,
      meta_purchase_last_error TEXT,
      meta_purchase_events_received INTEGER DEFAULT 0,
      meta_purchase_fbtrace_id TEXT,
      meta_purchase_last_attempt TEXT,
      billing_type TEXT,
      subscription_started_at TEXT,
      subscription_expires_at TEXT,
      subscription_reminder_level INTEGER DEFAULT 0,
      coupon_code TEXT,
      coupon_discount REAL DEFAULT 0,
      shipping_required TEXT DEFAULT 'No',
      shipping_provider TEXT,
      shipping_courier TEXT,
      shipping_service TEXT,
      shipping_service_name TEXT,
      shipping_fee REAL DEFAULT 0,
      shipping_eta TEXT,
      shipping_destination_area_id TEXT,
      shipping_destination_area_name TEXT,
      shipping_destination_postal_code TEXT,
      shipping_address TEXT,
      shipping_note TEXT,
      upgrade_from_product_id TEXT,
      upgrade_target_price REAL DEFAULT 0,
      upgrade_credit_amount REAL DEFAULT 0
    )`,
    columns: [
      ["invoice", "TEXT"],
      ["email", "TEXT"],
      ["nama", "TEXT"],
      ["whatsapp", "TEXT"],
      ["id_produk", "TEXT"],
      ["nama_produk", "TEXT"],
      ["harga_total", "REAL DEFAULT 0"],
      ["quantity", "INTEGER DEFAULT 1"],
      ["unit_price", "REAL DEFAULT 0"],
      ["status", "TEXT DEFAULT 'Pending'"],
      ["tanggal_order", "TEXT"],
      ["affiliate", "TEXT"],
      ["komisi", "REAL DEFAULT 0"],
      ["affiliate_l1", "TEXT"],
      ["affiliate_l2", "TEXT"],
      ["affiliate_l3", "TEXT"],
      ["komisi_l1", "REAL DEFAULT 0"],
      ["komisi_l2", "REAL DEFAULT 0"],
      ["komisi_l3", "REAL DEFAULT 0"],
      ["reminder_level", "INTEGER DEFAULT 0"],
      ["take_bump", "TEXT"],
      ["license_key", "TEXT"],
      ["license_product_id", "TEXT"],
      ["bump_product_id", "TEXT"],
      ["bump_title_snapshot", "TEXT"],
      ["bump_url_snapshot", "TEXT"],
      ["bump_license_key", "TEXT"],
      ["bump_license_product_id", "TEXT"],
      ["payment_method", "TEXT"],
      ["payment_channel", "TEXT"],
      ["payment_name", "TEXT"],
      ["payment_code", "TEXT"],
      ["payment_owner", "TEXT"],
      ["payment_url", "TEXT"],
      ["payment_qr_url", "TEXT"],
      ["payment_instruction", "TEXT"],
      ["payment_view_token", "TEXT"],
      ["notivgo_registered", "INTEGER DEFAULT 0"],
      ["notivgo_checked_at", "INTEGER DEFAULT 0"],
      ["notivgo_error", "TEXT"],
      ["notivgo_order_ref", "TEXT"],
      ["payment_expires_at", "INTEGER DEFAULT 0"],
      ["domain", "TEXT"],
      ["meta_fbp", "TEXT"],
      ["meta_fbc", "TEXT"],
      ["meta_client_ip", "TEXT"],
      ["meta_user_agent", "TEXT"],
      ["meta_purchase_sent", "TEXT"],
      ["meta_purchase_prod_sent", "TEXT"],
      ["meta_purchase_test_sent", "TEXT"],
      ["meta_purchase_last_error", "TEXT"],
      ["meta_purchase_events_received", "INTEGER DEFAULT 0"],
      ["meta_purchase_fbtrace_id", "TEXT"],
      ["meta_purchase_last_attempt", "TEXT"],
      ["billing_type", "TEXT"],
      ["subscription_started_at", "TEXT"],
      ["subscription_expires_at", "TEXT"],
      ["subscription_reminder_level", "INTEGER DEFAULT 0"],
      ["coupon_code", "TEXT"],
      ["coupon_discount", "REAL DEFAULT 0"],
      ["shipping_required", "TEXT DEFAULT 'No'"],
      ["shipping_provider", "TEXT"],
      ["shipping_courier", "TEXT"],
      ["shipping_service", "TEXT"],
      ["shipping_service_name", "TEXT"],
      ["shipping_fee", "REAL DEFAULT 0"],
      ["shipping_eta", "TEXT"],
      ["shipping_destination_area_id", "TEXT"],
      ["shipping_destination_area_name", "TEXT"],
      ["shipping_destination_postal_code", "TEXT"],
      ["shipping_address", "TEXT"],
      ["shipping_note", "TEXT"],
      ["upgrade_from_product_id", "TEXT"],
      ["upgrade_target_price", "REAL DEFAULT 0"],
      ["upgrade_credit_amount", "REAL DEFAULT 0"]
    ]
  },
  coupons: {
    create: `CREATE TABLE IF NOT EXISTS coupons (
      kode_promo TEXT PRIMARY KEY,
      tipe TEXT,
      nilai REAL DEFAULT 0,
      status TEXT DEFAULT 'Active',
      berlaku_untuk_prod TEXT DEFAULT 'All',
      usage_limit_total INTEGER DEFAULT 0,
      usage_limit_per_customer INTEGER DEFAULT 0,
      min_order_amount REAL DEFAULT 0,
      expires_at TEXT
    )`,
    columns: [
      ["kode_promo", "TEXT"],
      ["tipe", "TEXT"],
      ["nilai", "REAL DEFAULT 0"],
      ["status", "TEXT DEFAULT 'Active'"],
      ["berlaku_untuk_prod", "TEXT DEFAULT 'All'"],
      ["usage_limit_total", "INTEGER DEFAULT 0"],
      ["usage_limit_per_customer", "INTEGER DEFAULT 0"],
      ["min_order_amount", "REAL DEFAULT 0"],
      ["expires_at", "TEXT"]
    ]
  },
  pages: {
    create: `CREATE TABLE IF NOT EXISTS pages (
      id_page TEXT PRIMARY KEY,
      slug TEXT UNIQUE,
      title TEXT,
      content TEXT,
      seo_title TEXT,
      seo_description TEXT,
      seo_keywords TEXT,
      seo_image TEXT,
      category TEXT DEFAULT 'Umum',
      protect_products TEXT,
      ga_id TEXT,
      meta_pixel_id TEXT,
      tiktok_pixel_id TEXT,
      status TEXT DEFAULT 'Active',
      tanggal_buat TEXT,
      page_type TEXT DEFAULT 'page',
      canonical_url TEXT,
      author TEXT,
      published_at TEXT,
      updated_at TEXT,
      excerpt TEXT,
      structured_data TEXT
    )`,
    columns: [
      ["id_page", "TEXT"],
      ["slug", "TEXT"],
      ["title", "TEXT"],
      ["content", "TEXT"],
      ["seo_title", "TEXT"],
      ["seo_description", "TEXT"],
      ["seo_keywords", "TEXT"],
      ["seo_image", "TEXT"],
      ["category", "TEXT DEFAULT 'Umum'"],
      ["protect_products", "TEXT"],
      ["ga_id", "TEXT"],
      ["meta_pixel_id", "TEXT"],
      ["tiktok_pixel_id", "TEXT"],
      ["status", "TEXT DEFAULT 'Active'"],
      ["tanggal_buat", "TEXT"],
      ["page_type", "TEXT DEFAULT 'page'"],
      ["canonical_url", "TEXT"],
      ["author", "TEXT"],
      ["published_at", "TEXT"],
      ["updated_at", "TEXT"],
      ["excerpt", "TEXT"],
      ["structured_data", "TEXT"]
    ]
  },
  lms: {
    create: `CREATE TABLE IF NOT EXISTS lms (
      id_produk TEXT PRIMARY KEY,
      product_id TEXT,
      product_ids TEXT,
      target_category TEXT,
      videos TEXT DEFAULT '[]',
      deskripsi TEXT,
      "desc" TEXT,
      cert_leader1 TEXT,
      cert_role1 TEXT,
      cert_leader2 TEXT,
      cert_role2 TEXT,
      cert_stamp TEXT
    )`,
    columns: [
      ["id_produk", "TEXT"],
      ["product_id", "TEXT"],
      ["product_ids", "TEXT"],
      ["target_category", "TEXT"],
      ["videos", "TEXT DEFAULT '[]'"],
      ["deskripsi", "TEXT"],
      ['"desc"', "TEXT"],
      ["cert_leader1", "TEXT"],
      ["cert_role1", "TEXT"],
      ["cert_leader2", "TEXT"],
      ["cert_role2", "TEXT"],
      ["cert_stamp", "TEXT"]
    ]
  },
  license_stock: {
    create: `CREATE TABLE IF NOT EXISTS license_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT,
      license_key TEXT UNIQUE,
      status TEXT DEFAULT 'Available',
      assigned_invoice TEXT,
      assigned_email TEXT,
      assigned_at TEXT,
      created_at TEXT,
      note TEXT
    )`,
    columns: [
      ["id", "INTEGER"],
      ["product_id", "TEXT"],
      ["license_key", "TEXT"],
      ["status", "TEXT DEFAULT 'Available'"],
      ["assigned_invoice", "TEXT"],
      ["assigned_email", "TEXT"],
      ["assigned_at", "TEXT"],
      ["created_at", "TEXT"],
      ["note", "TEXT"]
    ]
  },
  member_otps: {
    create: `CREATE TABLE IF NOT EXISTS member_otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      whatsapp TEXT,
      email TEXT,
      otp_code TEXT,
      status TEXT DEFAULT 'Pending',
      expires_at TEXT,
      created_at TEXT,
      used_at TEXT
    )`,
    columns: [
      ["id", "INTEGER"],
      ["whatsapp", "TEXT"],
      ["email", "TEXT"],
      ["otp_code", "TEXT"],
      ["status", "TEXT DEFAULT 'Pending'"],
      ["expires_at", "TEXT"],
      ["created_at", "TEXT"],
      ["used_at", "TEXT"]
    ]
  },
  notification_outbox: {
    create: `CREATE TABLE IF NOT EXISTS notification_outbox (
      id TEXT PRIMARY KEY, invoice TEXT, event TEXT, channel TEXT, target TEXT,
      subject TEXT, content TEXT, status TEXT DEFAULT 'queued', attempts INTEGER DEFAULT 0,
      next_attempt INTEGER DEFAULT 0, lease_until INTEGER DEFAULT 0, last_error TEXT,
      created_at TEXT, updated_at TEXT
    )`,
    columns: []
  },
  update_clients: {
    create: `CREATE TABLE IF NOT EXISTS update_clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT,
      license_email TEXT,
      license_product TEXT,
      domain TEXT,
      name TEXT,
      account_id TEXT,
      project_name TEXT,
      api_token TEXT,
      branch TEXT,
      enabled TEXT DEFAULT 'true',
      site_url TEXT,
      client_version TEXT,
      created_at TEXT,
      updated_at TEXT,
      last_registered_at TEXT,
      note TEXT,
      UNIQUE(license_key, project_name)
    )`,
    columns: [
      ["id", "INTEGER"],
      ["license_key", "TEXT"],
      ["license_email", "TEXT"],
      ["license_product", "TEXT"],
      ["domain", "TEXT"],
      ["name", "TEXT"],
      ["account_id", "TEXT"],
      ["project_name", "TEXT"],
      ["api_token", "TEXT"],
      ["branch", "TEXT"],
      ["enabled", "TEXT DEFAULT 'true'"],
      ["site_url", "TEXT"],
      ["client_version", "TEXT"],
      ["created_at", "TEXT"],
      ["updated_at", "TEXT"],
      ["last_registered_at", "TEXT"],
      ["note", "TEXT"]
    ]
  }
};

const D1_INDEXES = [
  "CREATE INDEX IF NOT EXISTS idx_orders_email_lower ON orders(LOWER(email))",
  "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
  "CREATE INDEX IF NOT EXISTS idx_orders_status_total ON orders(status, harga_total)",
  "CREATE INDEX IF NOT EXISTS idx_orders_status_reminder ON orders(status, reminder_level)",
  "CREATE INDEX IF NOT EXISTS idx_orders_notivgo_pending ON orders(status, notivgo_registered, notivgo_checked_at)",
  "CREATE INDEX IF NOT EXISTS idx_notification_outbox_due ON notification_outbox(status, next_attempt, lease_until)",
  "CREATE INDEX IF NOT EXISTS idx_orders_affiliate ON orders(affiliate)",
  "CREATE INDEX IF NOT EXISTS idx_orders_affiliate_l1 ON orders(affiliate_l1)",
  "CREATE INDEX IF NOT EXISTS idx_orders_affiliate_l2 ON orders(affiliate_l2)",
  "CREATE INDEX IF NOT EXISTS idx_orders_affiliate_l3 ON orders(affiliate_l3)",
  "CREATE INDEX IF NOT EXISTS idx_orders_status_tanggal ON orders(status, tanggal_order)",
  "CREATE INDEX IF NOT EXISTS idx_orders_invoice ON orders(invoice)",
  "CREATE INDEX IF NOT EXISTS idx_orders_id_produk_status ON orders(id_produk, status)",
  "CREATE INDEX IF NOT EXISTS idx_orders_coupon_code ON orders(coupon_code)",
  "CREATE INDEX IF NOT EXISTS idx_orders_subscription_reminder ON orders(subscription_expires_at, subscription_reminder_level)",
  "CREATE INDEX IF NOT EXISTS idx_orders_license_key ON orders(license_key)",
  "CREATE INDEX IF NOT EXISTS idx_orders_bump_license_key ON orders(bump_license_key)",
  "CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email))",
  "CREATE INDEX IF NOT EXISTS idx_access_rules_upper_id ON access_rules(UPPER(id_produk))",
  "CREATE INDEX IF NOT EXISTS idx_access_rules_status ON access_rules(status)",
  "CREATE INDEX IF NOT EXISTS idx_access_rules_kategori ON access_rules(kategori)",
  "CREATE INDEX IF NOT EXISTS idx_access_rules_product_type ON access_rules(product_type)",
  "CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug)",
  "CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status)",
  "CREATE INDEX IF NOT EXISTS idx_pages_type_status ON pages(page_type, status)",
  "CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status)",
  "CREATE INDEX IF NOT EXISTS idx_lms_upper_id_produk ON lms(UPPER(id_produk))",
  "CREATE INDEX IF NOT EXISTS idx_lms_upper_product_id ON lms(UPPER(product_id))",
  "CREATE INDEX IF NOT EXISTS idx_users_whatsapp ON users(whatsapp)",
  "CREATE INDEX IF NOT EXISTS idx_license_stock_product_status ON license_stock(product_id, status)",
  "CREATE INDEX IF NOT EXISTS idx_license_stock_key ON license_stock(license_key)",
  "CREATE INDEX IF NOT EXISTS idx_member_otps_whatsapp_status ON member_otps(whatsapp, status)",
  "CREATE INDEX IF NOT EXISTS idx_member_otps_email_status ON member_otps(LOWER(email), status)",
  "CREATE INDEX IF NOT EXISTS idx_update_clients_enabled ON update_clients(enabled)",
  "CREATE INDEX IF NOT EXISTS idx_update_clients_project ON update_clients(project_name)",
  "CREATE INDEX IF NOT EXISTS idx_update_clients_license ON update_clients(license_key)"
];

let d1SchemaEnsuredAt = 0;
let d1SchemaPromise = null;
const D1_SCHEMA_CACHE_MS = 5 * 60 * 1000;
let globalSettingsCache = { expiresAt: 0, value: null };

async function runSchemaStatement(env, sql, binds = []) {
  try {
    const stmt = env.DB.prepare(sql);
    if (binds.length) await stmt.bind(...binds).run();
    else await stmt.run();
  } catch(e) {
    const message = String(e.message || "");
    if (!/duplicate column|already exists/i.test(message)) {
      console.log("D1 schema patch skipped:", message);
    }
  }
}

function normalizeSchemaColumnName(value) {
  return String(value || "").replace(/^"|"$/g, "").trim();
}

async function getExistingTableColumns(env, tableName) {
  try {
    const result = await env.DB.prepare(`PRAGMA table_info(${tableName})`).all();
    return new Set((result.results || []).map(row => String(row.name || "").toLowerCase()));
  } catch(e) {
    return new Set();
  }
}

async function runD1SchemaPatch(env) {
  try {
    const marker = await env.DB.prepare("SELECT nilai FROM settings WHERE kunci = ?").bind("__schema_patch_version").first();
    if (marker && marker.nilai === D1_SCHEMA_VERSION) return;
  } catch(e) {}

  for (const table of Object.values(D1_SCHEMA)) {
    await runSchemaStatement(env, table.create);
  }

  for (const [tableName, table] of Object.entries(D1_SCHEMA)) {
    const existingColumns = await getExistingTableColumns(env, tableName);
    for (const [columnName, columnType] of table.columns) {
      const cleanColumnName = normalizeSchemaColumnName(columnName).toLowerCase();
      if (existingColumns.has(cleanColumnName)) continue;
      await runSchemaStatement(env, `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
      existingColumns.add(cleanColumnName);
    }
  }

  for (const sql of D1_INDEXES) {
    await runSchemaStatement(env, sql);
  }

  await runSchemaStatement(env, "INSERT INTO users (id_user, email, password, nama, role, tanggal_daftar) SELECT ?, ?, ?, ?, ?, datetime('now') WHERE NOT EXISTS (SELECT 1 FROM users WHERE LOWER(email) = ?)", ["ADM-001", "admin@email.com", "admin123", "Admin", "Admin", "admin@email.com"]);

  const defaultSettings = [
    ["site_name", "Cloudmember"],
    ["site_tagline", "Member Area Digital"],
    ["site_url", "https://domain-anda.com"],
    ["site_hero_image", ""],
    ["theme_color", "#00AAE7"],
    ["is_manual_active", "true"],
    ["auto_gateway", "none"],
    ["enable_social_proof", "false"],
    ["midtrans_env", "sandbox"],
    ["midtrans_enabled_channels", "other_qris,gopay,shopeepay,bank_transfer"],
    ["midtrans_merchant_name", "Cloudmember"],
    ["shipping_enabled", "false"],
    ["shipping_provider", "rajaongkir"],
    ["shipping_couriers", "jne,jnt,sicepat,anteraja"],
    ["shipping_origin_area_id", ""],
    ["shipping_origin_area_name", ""],
    ["shipping_origin_postal_code", ""],
    ["shipping_rajaongkir_api_key", ""],
    ["shipping_rajaongkir_base_url", "https://rajaongkir.komerce.id/api/v1"],
    ["member_support_url", ""],
    ["member_group_wa_url", ""],
    ["member_group_telegram_url", ""],
    ["affiliate_marketing_kit_url", ""]
  ];
  for (const [key, value] of defaultSettings) {
    await runSchemaStatement(env, "INSERT INTO settings (kunci, nilai) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM settings WHERE kunci = ?)", [key, value, key]);
  }
  await runSchemaStatement(env, "INSERT OR REPLACE INTO settings (kunci, nilai) VALUES (?, ?)", ["__schema_patch_version", D1_SCHEMA_VERSION]);
  clearGlobalSettingsCache();
}

async function ensureD1Schema(env, force = false) {
  if (!env || !env.DB) return;
  const now = Date.now();
  if (!force && d1SchemaEnsuredAt && now - d1SchemaEnsuredAt < D1_SCHEMA_CACHE_MS) return;
  if (!d1SchemaPromise) {
    d1SchemaPromise = runD1SchemaPatch(env)
      .then(() => { d1SchemaEnsuredAt = Date.now(); })
      .finally(() => { d1SchemaPromise = null; });
  }
  await d1SchemaPromise;
}

function getPublicSettings(settings = {}) {
  const safe = {};
  for (const key of PUBLIC_SETTING_KEYS) {
    if (settings[key] !== undefined) safe[key] = settings[key];
  }
  safe.app_name = APP_NAME;
  safe.app_version = APP_VERSION;
  safe.app_release_date = APP_RELEASE_DATE;
  safe.notivgo_qris_enabled = isNotivgoQrisEnabled(settings) ? 'true' : 'false';
  return safe;
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizeDomainValue(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .trim();
}

function getInstallationMode(env, settings = {}) {
  return String(env.INSTALLATION_MODE || settings.installation_mode || DEFAULT_INSTALLATION_MODE).trim().toLowerCase();
}

function isBuyerInstallation(env, settings = {}) {
  return getInstallationMode(env, settings) === "buyer";
}

function isLicenseActive(settings = {}) {
  return String(settings.license_status || "").trim().toLowerCase() === "active" && String(settings.license_key || "").trim() !== "";
}

function isInstallAllowedPath(path) {
  const cleanPath = path || "";
  return cleanPath === "/install" ||
    cleanPath === "/install.html" ||
    cleanPath === "/config.js" ||
    cleanPath === "/version.json" ||
    cleanPath === "/favicon.ico" ||
    cleanPath === "/__cloudmember/health" ||
    cleanPath === "/__cloudmember/version";
}

function compareVersions(a, b) {
  const pa = String(a || "0").split(".").map(n => parseInt(n, 10) || 0);
  const pb = String(b || "0").split(".").map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

async function saveSettings(env, payload = {}) {
  for (const [key, value] of Object.entries(payload)) {
    await env.DB.prepare("INSERT OR REPLACE INTO settings (kunci, nilai) VALUES (?, ?)").bind(key, String(value || "")).run();
  }
  clearGlobalSettingsCache();
}

async function bumpPublicCacheVersion(env) {
  const version = String(Date.now());
  await env.DB.prepare("INSERT OR REPLACE INTO settings (kunci, nilai) VALUES (?, ?)").bind("__public_cache_version", version).run();
  clearGlobalSettingsCache();
  return version;
}

function normalizePaymentLogoSlug(value = "") {
  const slug = String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return PAYMENT_LOGO_SLUGS.has(slug) ? slug : "";
}

function parsePaymentLogoOverrides(settings = {}) {
  try {
    const parsed = JSON.parse(String(settings.payment_logo_overrides || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (e) {
    return {};
  }
}

function buildPaymentLogoUrl(request, slug, updatedAt = "") {
  const url = new URL(request.url);
  const logoUrl = new URL(`/__cloudmember/payment-logo/${encodeURIComponent(slug)}`, url.origin);
  if (updatedAt) logoUrl.searchParams.set("v", String(updatedAt));
  return logoUrl.pathname + logoUrl.search;
}

function getUploadMimeExtension(mime = "") {
  const clean = String(mime || "").toLowerCase().split(";")[0].trim();
  if (clean === "image/svg+xml") return "svg";
  if (clean === "image/png") return "png";
  if (clean === "image/jpeg" || clean === "image/jpg") return "jpg";
  if (clean === "image/webp") return "webp";
  if (clean === "image/gif") return "gif";
  return "bin";
}

function sanitizeUploadFileName(name = "", fallback = "upload") {
  const clean = String(name || "").trim().replace(/[^\w.\-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
  return clean || fallback;
}

function parseUploadedBase64(body = {}) {
  let mime = String(body.mime_type || body.mime || "").trim().toLowerCase();
  let base64 = String(body.content_base64 || body.base64 || "").trim();
  const dataUrl = String(body.data_url || body.dataUrl || "").trim();
  if (dataUrl) {
    const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/i);
    if (!match) throw new Error("Format file base64 tidak valid.");
    mime = String(match[1] || "").trim().toLowerCase();
    base64 = String(match[2] || "").trim();
  }
  if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/i.test(mime)) throw new Error("File harus berupa gambar PNG, JPG, WEBP, GIF, atau SVG.");
  if (!/^[A-Za-z0-9+/=\s]+$/.test(base64) || base64.length < 20) throw new Error("Data file tidak valid.");
  const normalizedBase64 = base64.replace(/\s+/g, "");
  const approxBytes = Math.ceil(normalizedBase64.length * 3 / 4);
  return { mime, base64: normalizedBase64, approxBytes };
}

function base64ToBytes(base64 = "") {
  const binary = atob(String(base64 || ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function handleUploadPaymentLogo(env, settings = {}, body = {}, request) {
  const slug = normalizePaymentLogoSlug(body.slug || body.payment_slug || body.logo_slug || "");
  if (!slug) return jsonRes({ status: "error", message: "Kode logo payment tidak valid." });
  let parsed;
  try { parsed = parseUploadedBase64(body); } catch (e) { return jsonRes({ status: "error", message: e.message }); }
  if (parsed.approxBytes > 768 * 1024) return jsonRes({ status: "error", message: "Ukuran logo maksimal 768 KB." });

  const updatedAt = String(Date.now());
  const fileName = sanitizeUploadFileName(body.file_name || body.name || `${slug}.${getUploadMimeExtension(parsed.mime)}`, `${slug}.${getUploadMimeExtension(parsed.mime)}`);
  await env.DB.batch([
    env.DB.prepare("INSERT OR REPLACE INTO settings (kunci, nilai) VALUES (?, ?)").bind(`payment_logo_${slug}_mime`, parsed.mime),
    env.DB.prepare("INSERT OR REPLACE INTO settings (kunci, nilai) VALUES (?, ?)").bind(`payment_logo_${slug}_base64`, parsed.base64),
    env.DB.prepare("INSERT OR REPLACE INTO settings (kunci, nilai) VALUES (?, ?)").bind(`payment_logo_${slug}_file_name`, fileName),
    env.DB.prepare("INSERT OR REPLACE INTO settings (kunci, nilai) VALUES (?, ?)").bind(`payment_logo_${slug}_updated_at`, updatedAt)
  ]);

  const overrides = parsePaymentLogoOverrides(settings);
  overrides[slug] = buildPaymentLogoUrl(request, slug, updatedAt);
  await env.DB.prepare("INSERT OR REPLACE INTO settings (kunci, nilai) VALUES (?, ?)").bind("payment_logo_overrides", JSON.stringify(overrides)).run();
  await bumpPublicCacheVersion(env);
  return jsonRes({ status: "success", url: overrides[slug], slug, file_name: fileName, mime_type: parsed.mime, message: "Logo payment berhasil diupload ke Cloudflare." });
}

async function servePaymentLogo(env, request, slugValue = "") {
  const slug = normalizePaymentLogoSlug(slugValue);
  if (!slug) return new Response("Logo not found", { status: 404, headers: corsHeaders });
  await ensureD1Schema(env);
  const rows = await env.DB.prepare("SELECT kunci, nilai FROM settings WHERE kunci IN (?, ?)").bind(`payment_logo_${slug}_mime`, `payment_logo_${slug}_base64`).all();
  const data = {};
  (rows.results || []).forEach(row => { data[row.kunci] = row.nilai; });
  const mime = data[`payment_logo_${slug}_mime`] || "image/png";
  const base64 = data[`payment_logo_${slug}_base64`] || "";
  if (!base64) return new Response("Logo not found", { status: 404, headers: corsHeaders });
  return new Response(base64ToBytes(base64), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}

function summarizePlainResponse(text = "", maxLength = 220) {
  return String(text || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function describeGoogleDriveUploadResponseError(res, text = "") {
  const contentType = String(res && res.headers ? res.headers.get("content-type") || "" : "").toLowerCase();
  const lower = String(text || "").toLowerCase();
  const parts = [`Google Drive Web App membalas ${res ? `HTTP ${res.status}` : "response"}${contentType ? ` (${contentType})` : ""}, bukan JSON.`];

  if (lower.includes("accounts.google.com") || lower.includes("sign in") || lower.includes("login")) {
    parts.push("Kemungkinan deployment Apps Script belum publik. Set Web App: Execute as Me, Who has access Anyone.");
  } else if (lower.includes("authorization is required") || lower.includes("not authorized") || lower.includes("permission")) {
    parts.push("Apps Script belum diberi izin Drive atau akses Web App belum Anyone.");
  } else if (lower.includes("script function not found") || lower.includes("dopost")) {
    parts.push("Pastikan kode Apps Script memiliki function doPost(e), lalu deploy ulang versi terbaru.");
  } else if (lower.includes("deployment") || lower.includes("not found")) {
    parts.push("Periksa lagi URL Web App. Gunakan URL deployment yang berakhiran /exec, bukan /dev atau URL editor.");
  } else {
    parts.push("Buka URL Web App di browser. Jika tidak muncul JSON, perbaiki deploy Apps Script lebih dulu.");
  }

  const preview = summarizePlainResponse(text);
  if (preview) parts.push(`Cuplikan balasan: ${preview}`);
  return parts.join(" ");
}

async function handleUploadDriveMedia(settings = {}, body = {}) {
  const webappUrl = String(settings.drive_upload_webapp_url || settings.google_drive_upload_url || settings.media_drive_upload_url || "").trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/i.test(webappUrl)) {
    return jsonRes({ status: "error", message: "URL Web App Google Drive belum diisi di Pengaturan API Lanjutan." });
  }
  let parsed;
  try { parsed = parseUploadedBase64(body); } catch (e) { return jsonRes({ status: "error", message: e.message }); }
  if (parsed.approxBytes > 8 * 1024 * 1024) return jsonRes({ status: "error", message: "Ukuran gambar maksimal 8 MB untuk upload Google Drive." });

  const fileName = sanitizeUploadFileName(body.file_name || body.name || `media-${Date.now()}.${getUploadMimeExtension(parsed.mime)}`);
  const payload = {
    folder_key: String(body.folder_key || "media"),
    name: fileName,
    mime_type: parsed.mime,
    content_base64: parsed.base64
  };
  const uploadToken = String(settings.drive_upload_token || settings.google_drive_upload_token || "").trim();
  if (uploadToken) payload.token = uploadToken;

  const res = await fetch(webappUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  let result = {};
  try { result = JSON.parse(text); } catch (e) {
    return jsonRes({ status: "error", message: describeGoogleDriveUploadResponseError(res, text) });
  }
  if (result.status && result.status !== "success") return jsonRes({ status: "error", message: result.message || "Upload Google Drive gagal." });
  const url = result.url || result.webViewLink || result.webContentLink || (result.id ? `https://drive.google.com/file/d/${result.id}/view` : "");
  if (!url) return jsonRes({ status: "error", message: "Upload berhasil tetapi link Google Drive tidak ditemukan." });
  return jsonRes({ status: "success", url, id: result.id || "", file_name: fileName, message: "Gambar berhasil diupload ke Google Drive." });
}

async function purgeCloudflareCache(settings = {}) {
  const zoneId = String(settings.cf_zone_id || "").trim();
  const apiToken = String(settings.cf_api_token || "").trim();
  if (!zoneId || !apiToken) return { skipped: true };

  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ purge_everything: true })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const message = data.errors && data.errors[0] && data.errors[0].message ? data.errors[0].message : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return { skipped: false };
}

async function createAdminToken(admin, settings, env) {
  const secret = String(env.ADMIN_SESSION_SECRET || settings.admin_session_secret || "cloudmember-admin-session").trim();
  return sha256Hex(`${String(admin.email || "").toLowerCase()}|${String(admin.password || "")}|${secret}`);
}

async function verifyAdminAuth(env, body, settings, request) {
  const reqEmail = String(body.admin_email || request.headers.get("x-admin-email") || "").trim().toLowerCase();
  const reqToken = String(body.admin_token || request.headers.get("x-admin-token") || "").trim();
  if (!reqEmail || !reqToken) return false;
  const adm = await env.DB.prepare("SELECT * FROM users WHERE LOWER(email) = ? AND (role = 'Admin' OR role = 'admin')").bind(reqEmail).first();
  if (!adm) return false;
  const expected = await createAdminToken(adm, settings, env);
  return reqToken === expected;
}

function normalizeManifestUrl(value = "") {
  const base = normalizeBaseUrl(value);
  if (!base) return "";
  return base.endsWith(".json") ? base : base + "/version.json";
}

function resolveMasterUpdateUrl(env, settings = {}) {
  return normalizeManifestUrl(settings.master_update_url || env.MASTER_UPDATE_URL || "") ||
    normalizeManifestUrl(settings.license_server_url || env.LICENSE_SERVER_URL || "");
}

async function getMasterUpdateManifest(env, settings) {
  const manifestUrl = resolveMasterUpdateUrl(env, settings);
  if (!manifestUrl) {
    return { ok: false, message: "URL pusat update belum diatur." };
  }

  const url = manifestUrl;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) return { ok: false, message: "Gagal membaca manifest update: HTTP " + res.status };
  const data = await res.json();
  return { ok: true, url, data };
}

async function getGlobalSettings(env, options = {}) {
  try {
    const now = Date.now();
    if (!options.force && globalSettingsCache.value && globalSettingsCache.expiresAt > now) {
      return { ...globalSettingsCache.value };
    }
    const { results } = await env.DB.prepare("SELECT * FROM settings").all();
    const sObj = {};
    if(results) results.forEach(s => sObj[s.kunci] = s.nilai);
    globalSettingsCache = { expiresAt: Date.now() + GLOBAL_SETTINGS_CACHE_MS, value: sObj };
    return { ...sObj };
  } catch(e) {
    if (globalSettingsCache.value) return { ...globalSettingsCache.value };
    return {};
  }
}

async function safeAll(env, query, params = []) {
  try {
    const { results } = await env.DB.prepare(query).bind(...params).all();
    return results || [];
  } catch (e) {
    console.log("safeAll Error:", e.message);
    return [];
  }
}

function quoteD1Identifier(value) {
  return `"${String(value || "").replace(/"/g, '""')}"`;
}

function quoteMysqlIdentifier(value) {
  return "`" + String(value || "").replace(/`/g, "``") + "`";
}

function mysqlColumnType(column = {}) {
  const rawType = String(column.type || "").trim().toUpperCase();
  if (rawType.includes("INT")) return "BIGINT";
  if (rawType.includes("REAL") || rawType.includes("FLOA") || rawType.includes("DOUB") || rawType.includes("NUM") || rawType.includes("DEC")) return "DECIMAL(18,2)";
  if (rawType.includes("BLOB")) return "LONGBLOB";
  return "LONGTEXT";
}

function mysqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  const text = String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\0/g, "\\0")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\x1a/g, "\\Z")
    .replace(/'/g, "\\'");
  return `'${text}'`;
}

function buildMysqlCreateTable(tableName, columns = []) {
  const primaryColumns = columns
    .filter(column => Number(column.pk || 0) > 0)
    .sort((a, b) => Number(a.pk || 0) - Number(b.pk || 0));
  const lines = columns.map(column => {
    const isIntegerPk = Number(column.pk || 0) > 0 && String(column.type || "").toUpperCase().includes("INT");
    const nullable = Number(column.notnull || 0) === 1 || Number(column.pk || 0) > 0 ? " NOT NULL" : " NULL";
    const autoIncrement = isIntegerPk && String(column.name || "").toLowerCase() === "id" ? " AUTO_INCREMENT" : "";
    return `  ${quoteMysqlIdentifier(column.name)} ${mysqlColumnType(column)}${nullable}${autoIncrement}`;
  });

  if (primaryColumns.length) {
    lines.push(`  PRIMARY KEY (${primaryColumns.map(column => quoteMysqlIdentifier(column.name)).join(", ")})`);
  }

  return [
    `DROP TABLE IF EXISTS ${quoteMysqlIdentifier(tableName)};`,
    `CREATE TABLE ${quoteMysqlIdentifier(tableName)} (`,
    lines.join(",\n"),
    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
  ].join("\n");
}

async function buildMysqlBackup(env, settings = {}) {
  const tableRows = await safeAll(env, "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const tableNames = tableRows.map(row => String(row.name || "").trim()).filter(Boolean);
  const generatedAt = new Date().toISOString();
  const siteName = String(settings.site_name || APP_NAME).replace(/\r?\n/g, " ").trim();
  const lines = [
    `-- ${APP_NAME} D1 to MySQL backup`,
    `-- Site: ${siteName}`,
    `-- Generated at: ${generatedAt}`,
    `-- App version: ${APP_VERSION}`,
    "",
    "SET NAMES utf8mb4;",
    "SET FOREIGN_KEY_CHECKS=0;",
    "START TRANSACTION;",
    ""
  ];

  for (const tableName of tableNames) {
    const columns = await safeAll(env, `PRAGMA table_info(${quoteD1Identifier(tableName)})`);
    if (!columns.length) continue;
    const columnNames = columns.map(column => String(column.name || "")).filter(Boolean);
    lines.push(`-- Table: ${tableName}`);
    lines.push(buildMysqlCreateTable(tableName, columns));
    lines.push("");

    const quotedColumns = columnNames.map(quoteMysqlIdentifier).join(", ");
    let offset = 0;
    const fetchLimit = 500;
    const insertChunkSize = 100;
    while (true) {
      const rows = await safeAll(env, `SELECT * FROM ${quoteD1Identifier(tableName)} LIMIT ? OFFSET ?`, [fetchLimit, offset]);
      if (!rows.length) break;
      for (let start = 0; start < rows.length; start += insertChunkSize) {
        const chunk = rows.slice(start, start + insertChunkSize);
        const values = chunk.map(row => `(${columnNames.map(columnName => mysqlValue(row[columnName])).join(", ")})`);
        lines.push(`INSERT INTO ${quoteMysqlIdentifier(tableName)} (${quotedColumns}) VALUES`);
        lines.push(values.join(",\n") + ";");
      }
      offset += rows.length;
      if (rows.length < fetchLimit) break;
    }
    lines.push("");
  }

  lines.push("COMMIT;");
  lines.push("SET FOREIGN_KEY_CHECKS=1;");
  lines.push("");
  return lines.join("\n");
}

async function buildSystemBackupInfo(env, settings = {}) {
  const tableRows = await safeAll(env, "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const tableNames = tableRows.map(row => String(row.name || "").trim()).filter(Boolean);
  const tables = [];
  let totalRows = 0;

  for (const tableName of tableNames) {
    const countRows = await safeAll(env, `SELECT COUNT(*) AS total FROM ${quoteD1Identifier(tableName)}`);
    const rowCount = Number(countRows[0] && countRows[0].total ? countRows[0].total : 0);
    totalRows += rowCount;
    tables.push({ name: tableName, rows: rowCount });
  }

  return {
    app_name: APP_NAME,
    app_version: APP_VERSION,
    release_date: APP_RELEASE_DATE,
    schema_version: D1_SCHEMA_VERSION,
    site_name: settings.site_name || APP_NAME,
    generated_at: new Date().toISOString(),
    total_tables: tables.length,
    total_rows: totalRows,
    tables,
    mysql_backup_available: true,
    recommendation: "Download backup MySQL sebelum menjalankan update, terutama saat update besar atau sebelum ganti paket file."
  };
}

function mergeSystemUpdateSettings(env, settings = {}, body = {}) {
  const override = body && body.settings_override && typeof body.settings_override === "object" ? body.settings_override : {};
  return {
    cf_update_mode: String(override.cf_update_mode || settings.cf_update_mode || env.CF_UPDATE_MODE || "pages_api").trim(),
    cf_update_account_id: String(override.cf_update_account_id || settings.cf_update_account_id || env.CF_UPDATE_ACCOUNT_ID || "").trim(),
    cf_update_project_name: String(override.cf_update_project_name || settings.cf_update_project_name || env.CF_UPDATE_PROJECT_NAME || "").trim(),
    cf_update_branch: String(override.cf_update_branch || settings.cf_update_branch || env.CF_UPDATE_BRANCH || "").trim(),
    cf_update_api_token: cleanGatewayToken(override.cf_update_api_token || settings.cf_update_api_token || env.CF_UPDATE_API_TOKEN || "")
  };
}

function readCloudflareApiError(data = {}, fallback = "Cloudflare API gagal diproses.") {
  if (Array.isArray(data.errors) && data.errors.length) {
    return data.errors.map(err => err.message || err.code || JSON.stringify(err)).filter(Boolean).join("; ");
  }
  if (Array.isArray(data.messages) && data.messages.length) {
    return data.messages.map(msg => msg.message || msg.code || JSON.stringify(msg)).filter(Boolean).join("; ");
  }
  return data.message || fallback;
}

async function triggerCloudflarePagesDeployment(env, settings = {}, body = {}) {
  const cfg = mergeSystemUpdateSettings(env, settings, body);
  if (cfg.cf_update_mode === "manual_zip") {
    throw new Error("Mode Direct Upload ZIP tidak bisa menimpa file otomatis dari panel. Upload paket ZIP terbaru secara manual di Cloudflare Pages.");
  }
  if (!cfg.cf_update_account_id) throw new Error("Account ID Cloudflare belum diisi.");
  if (!cfg.cf_update_project_name) throw new Error("Project Name Pages belum diisi.");
  if (!cfg.cf_update_api_token) throw new Error("Cloudflare API Token belum diisi.");

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cfg.cf_update_account_id)}/pages/projects/${encodeURIComponent(cfg.cf_update_project_name)}/deployments`;
  const payload = {};
  if (cfg.cf_update_branch) payload.branch = cfg.cf_update_branch;

  const init = {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${cfg.cf_update_api_token}`,
      "Content-Type": "application/json"
    }
  };
  if (Object.keys(payload).length) init.body = JSON.stringify(payload);

  const res = await fetch(endpoint, init);

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(readCloudflareApiError(data, `Cloudflare API gagal: HTTP ${res.status}`));
  }

  const result = data.result || {};
  return {
    id: result.id || "",
    url: result.url || result.deployment_url || "",
    environment: result.environment || "",
    latest_stage: result.latest_stage && result.latest_stage.name ? result.latest_stage.name : "",
    created_on: result.created_on || "",
    project_name: cfg.cf_update_project_name,
    branch: cfg.cf_update_branch || "",
    raw_success: data.success === true
  };
}

function getMasterDeployToken(env, settings = {}) {
  return cleanGatewayToken(env.MASTER_DEPLOY_TOKEN || settings.master_deploy_token || env.CRON_TOKEN || settings.cron_token || "");
}

function maskSecretValue(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= 10) return text.slice(0, 2) + "****";
  return text.slice(0, 6) + "..." + text.slice(-4);
}

function getMatchedOrderLicenseColumn(order = {}, licenseKey = "") {
  const key = normalizeLicenseKey(licenseKey);
  if (key && normalizeLicenseKey(order.bump_license_key || "") === key) return "bump_license_key";
  return "license_key";
}

function getMatchedOrderLicenseProductId(order = {}, licenseKey = "") {
  const column = getMatchedOrderLicenseColumn(order, licenseKey);
  if (column === "bump_license_key") {
    return cleanProductId(order.bump_license_product_id || order.bump_product_id || order.license_product_id || order.id_produk || "");
  }
  return cleanProductId(order.license_product_id || order.id_produk || "");
}

function getMatchedOrderLicenseProductLabel(order = {}, licenseKey = "") {
  const column = getMatchedOrderLicenseColumn(order, licenseKey);
  if (column === "bump_license_key") {
    return getMatchedOrderLicenseProductId(order, licenseKey) || order.bump_title_snapshot || order.nama_produk || order.id_produk || "";
  }
  return getMatchedOrderLicenseProductId(order, licenseKey) || order.nama_produk || order.id_produk || "";
}

function normalizeUpdateClientPayload(body = {}, settings = {}, request = null) {
  const override = body && body.settings_override && typeof body.settings_override === "object" ? body.settings_override : {};
  const host = request ? (request.headers.get("host") || "") : "";
  const domain = normalizeDomainValue(body.domain || settings.license_domain || host);
  const siteUrl = normalizeBaseUrl(body.site_url || settings.site_url || (domain ? `https://${domain}` : ""));
  const projectName = String(body.project_name || body.cf_update_project_name || override.cf_update_project_name || "").trim();
  const name = String(body.name || body.client_name || override.cf_update_client_name || settings.site_name || projectName || domain || "client").trim();
  return {
    name,
    account_id: String(body.account_id || body.cf_update_account_id || override.cf_update_account_id || "").trim(),
    project_name: projectName,
    api_token: cleanGatewayToken(body.api_token || body.cf_update_api_token || override.cf_update_api_token || ""),
    branch: String(body.branch || body.cf_update_branch || override.cf_update_branch || "").trim(),
    enabled: isTruthyBlastValue(body.enabled === undefined ? "true" : body.enabled) ? "true" : "false",
    license_key: normalizeLicenseKey(body.license_key || settings.license_key || ""),
    domain,
    site_url: siteUrl,
    client_version: String(body.client_version || APP_VERSION || "").trim(),
    note: String(body.note || "").trim()
  };
}

function normalizeMasterApiUrl(value = "") {
  const base = normalizeBaseUrl(value);
  if (!base) return "";
  return base.replace(/\/version\.json$/i, "");
}

async function findLicenseOwnerForUpdateClient(env, licenseKey = "", domain = "") {
  const reqKey = normalizeLicenseKey(licenseKey);
  const reqDomain = normalizeDomainValue(domain || "");
  if (!reqKey) return { ok: false, message: "License key client belum tersedia." };

  let licenseLookup = await findPaidOrderByLicenseKey(env, reqKey);
  if (!licenseLookup.order && licenseLookup.stock && /^available$/i.test(String(licenseLookup.stock.status || ""))) {
    const assignedOrder = await assignSpecificStockLicenseToPaidOrder(env, licenseLookup.stock);
    if (assignedOrder) licenseLookup = { order: assignedOrder, stock: licenseLookup.stock };
  }
  if (!licenseLookup.order) {
    await backfillPaidOrderLicenses(env, CLOUDMEMBER_PERSONAL_PRODUCT_ID);
    licenseLookup = await findPaidOrderByLicenseKey(env, reqKey);
  }

  const order = licenseLookup.order;
  if (!order) return { ok: false, message: "Lisensi client tidak ditemukan atau belum lunas." };
  const savedDomain = normalizeDomainValue(order.domain || "");
  if (savedDomain && reqDomain && savedDomain !== reqDomain && !savedDomain.includes(reqDomain) && !reqDomain.includes(savedDomain)) {
    return { ok: false, message: "Domain client tidak cocok dengan lisensi yang aktif." };
  }
  return { ok: true, order };
}

async function registerUpdateClientOnMaster(env, settings = {}, body = {}, request = null) {
  await ensureD1Schema(env, true);
  const client = normalizeUpdateClientPayload(body, settings, request);
  if (!client.account_id) throw new Error("Account ID Cloudflare client wajib diisi.");
  if (!client.project_name) throw new Error("Project Name Pages client wajib diisi.");
  if (!client.api_token) throw new Error("Cloudflare API Token client wajib diisi.");
  if (!client.license_key) throw new Error("License key client belum tersedia.");

  const license = await findLicenseOwnerForUpdateClient(env, client.license_key, client.domain);
  if (!license.ok) throw new Error(license.message);
  const order = license.order || {};
  const nowIso = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO update_clients (
      license_key, license_email, license_product, domain, name, account_id, project_name,
      api_token, branch, enabled, site_url, client_version, created_at, updated_at, last_registered_at, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(license_key, project_name) DO UPDATE SET
      license_email = excluded.license_email,
      license_product = excluded.license_product,
      domain = excluded.domain,
      name = excluded.name,
      account_id = excluded.account_id,
      api_token = excluded.api_token,
      branch = excluded.branch,
      enabled = excluded.enabled,
      site_url = excluded.site_url,
      client_version = excluded.client_version,
      updated_at = excluded.updated_at,
      last_registered_at = excluded.last_registered_at,
      note = excluded.note
  `).bind(
    client.license_key,
    String(order.email || "").toLowerCase(),
    String(getMatchedOrderLicenseProductLabel(order, client.license_key) || order.license_product_id || order.id_produk || order.nama_produk || ""),
    client.domain,
    client.name,
    client.account_id,
    client.project_name,
    client.api_token,
    client.branch,
    client.enabled,
    client.site_url,
    client.client_version,
    nowIso,
    nowIso,
    nowIso,
    client.note
  ).run();

  return {
    name: client.name,
    project_name: client.project_name,
    domain: client.domain,
    enabled: client.enabled === "true",
    client_version: client.client_version,
    registered_at: nowIso
  };
}

async function registerClientUpdateTargetToMaster(env, settings = {}, body = {}, request = null) {
  const client = normalizeUpdateClientPayload(body, settings, request);
  const masterUrl = normalizeMasterApiUrl(body.master_url || settings.license_server_url || env.LICENSE_SERVER_URL || settings.master_update_url || env.MASTER_UPDATE_URL || "");
  if (!masterUrl) throw new Error("URL master lisensi/update belum tersedia.");
  if (!client.license_key) throw new Error("Client belum memiliki license key aktif.");
  if (!client.account_id) throw new Error("Account ID Cloudflare wajib diisi.");
  if (!client.project_name) throw new Error("Project Name Pages wajib diisi.");
  if (!client.api_token) throw new Error("Cloudflare API Token wajib diisi.");

  const res = await fetch(masterUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "register_update_client",
      license_key: client.license_key,
      domain: client.domain,
      site_url: client.site_url,
      name: client.name,
      account_id: client.account_id,
      project_name: client.project_name,
      api_token: client.api_token,
      branch: client.branch,
      enabled: client.enabled,
      client_version: client.client_version,
      note: client.note
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status !== "success") {
    throw new Error(data.message || `Registrasi ke master gagal: HTTP ${res.status}`);
  }

  await saveSettings(env, {
    cf_update_mode: "pages_api",
    cf_update_client_name: client.name,
    cf_update_account_id: client.account_id,
    cf_update_project_name: client.project_name,
    cf_update_branch: client.branch,
    cf_update_api_token: client.api_token,
    cf_update_registered_at: new Date().toISOString()
  });

  return data.data || {};
}

async function listRegisteredUpdateClients(env, options = {}) {
  await ensureD1Schema(env);
  const onlyEnabled = options.onlyEnabled !== false;
  const where = onlyEnabled ? "WHERE enabled IS NULL OR LOWER(enabled) <> 'false'" : "";
  const rows = await safeAll(env, `
    SELECT * FROM update_clients
    ${where}
    ORDER BY COALESCE(updated_at, created_at, last_registered_at) DESC
  `);
  return rows.map(row => ({
    name: row.name || row.project_name || row.domain || "client",
    enabled: !/^false$/i.test(String(row.enabled || "true")),
    account_id: row.account_id || "",
    project_name: row.project_name || "",
    api_token: row.api_token || "",
    branch: row.branch || "",
    domain: row.domain || "",
    site_url: row.site_url || "",
    client_version: row.client_version || "",
    license_email: row.license_email || "",
    license_product: row.license_product || "",
    last_registered_at: row.last_registered_at || row.updated_at || row.created_at || "",
    token_masked: maskSecretValue(row.api_token || "")
  }));
}

async function listUpdateClientsForDeploy(env, settings = {}, body = {}, request = null) {
  const expectedToken = getMasterDeployToken(env, settings);
  const reqToken = cleanGatewayToken(body.token || body.deploy_token || request.headers.get("x-deploy-token") || "");
  if (!expectedToken) throw new Error("MASTER_DEPLOY_TOKEN belum diset di master.");
  if (!reqToken || reqToken !== expectedToken) throw new Error("Token deploy master tidak valid.");
  const clients = await listRegisteredUpdateClients(env, { onlyEnabled: true });
  return clients.map(client => ({
    name: client.name,
    enabled: client.enabled,
    account_id: client.account_id,
    project_name: client.project_name,
    api_token: client.api_token,
    branch: client.branch
  }));
}

function cleanAffiliateRef(value) {
  const ref = String(value || "").trim();
  const lower = ref.toLowerCase();
  if (!ref || ref === "-" || lower === "null" || lower === "undefined") return "";
  return ref;
}

function getAffiliateUserKey(user = {}) {
  return cleanAffiliateRef(user.id_user || user.id || user.email);
}

function getAffiliateUserRefs(user = {}, fallbackEmail = "") {
  return Array.from(new Set([user.id_user, user.id, user.email, fallbackEmail]
    .map(cleanAffiliateRef)
    .filter(Boolean)));
}

function affiliateRefMatchesUser(user = {}, ref = "") {
  const target = cleanAffiliateRef(ref).toLowerCase();
  if (!target) return false;
  return getAffiliateUserRefs(user).some(value => value.toLowerCase() === target);
}

const CLOUDMEMBER_PERSONAL_PRODUCT_ID = "CLOUDP";

function cleanProductId(value) {
  return String(value || "").trim().toUpperCase();
}

function buildCheckoutPathForProductId(productId) {
  const cleanId = cleanProductId(productId);
  return cleanId ? `/checkout?id=${encodeURIComponent(cleanId)}` : "/checkout";
}

function normalizeProductLandingInput(value, productId) {
  return String(value || "").trim() || buildCheckoutPathForProductId(productId);
}

function normalizeProductType(value = "") {
  const raw = String(value || "").trim().toLowerCase();
  if (/^(physical|fisik|barang|produk_fisik|produk-fisik)$/i.test(raw)) return "physical";
  return "digital";
}

function isPhysicalProduct(productRow = {}) {
  return normalizeProductType(productRow.product_type || productRow.tipe_produk || productRow.jenis_produk || "") === "physical";
}

function getProductWeightGrams(productRow = {}) {
  const weight = Math.max(0, Math.ceil(Number(productRow.weight_grams || productRow.berat_gram || productRow.berat || 0)));
  return weight > 0 ? weight : 1000;
}

function normalizeOrderQuantity(value, fallback = 1) {
  const qty = Math.floor(Number(value || fallback));
  if (!Number.isFinite(qty) || qty < 1) return 1;
  return Math.min(qty, 999);
}

function normalizePositiveNumber(value, fallback = 0) {
  const num = Number(value);
  if (!isFinite(num) || num < 0) return fallback;
  return num;
}

function normalizeProductPaymentToken(method = "", channel = "") {
  let gateway = String(method || "").trim().toLowerCase();
  let value = String(channel || "").trim();
  if (!gateway || gateway === "payment_gateway") gateway = "";
  if (gateway === "free") return "free";
  if (gateway.includes("manual")) gateway = "manual";
  else if (gateway.includes("duitku")) gateway = "duitku";
  else if (gateway.includes("tripay")) gateway = "tripay";
  else if (gateway.includes("xendit")) gateway = "xendit";
  else if (gateway.includes("midtrans")) gateway = "midtrans";
  else if (!gateway && ["bank1", "bank2", "bank3", "qris"].includes(value.toLowerCase())) gateway = "manual";
  if (!gateway || !value) return "";
  return `${gateway}:${value}`.toLowerCase();
}

function parseProductPaymentMethods(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw === "__none__") return [];
  return Array.from(new Set(raw.split(",").map(token => {
    const parts = String(token || "").split(":");
    return normalizeProductPaymentToken(parts[0], parts.slice(1).join(":"));
  }).filter(Boolean)));
}

function normalizeStoredProductPaymentMethods(value = "") {
  const parsed = parseProductPaymentMethods(value);
  if (parsed === null) return "";
  return parsed.length ? parsed.join(",") : "__none__";
}

function isProductPaymentAllowed(productRow = {}, method = "", channel = "") {
  const allowed = parseProductPaymentMethods(productRow.payment_methods || "");
  if (allowed === null) return true;
  if (String(method || "").toLowerCase() === "free") return true;
  const token = normalizeProductPaymentToken(method, channel);
  const gateway = String(method || "").trim().toLowerCase();
  if (["duitku", "xendit", "midtrans"].includes(gateway) && String(channel || "").trim().toLowerCase() === gateway) {
    return allowed.some(item => String(item || "").startsWith(gateway + ":"));
  }
  return token !== "" && allowed.includes(token);
}

function isTruthyOrderValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return value === true || value === 1 || normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function isPaidOrderStatus(value = "") {
  return /^(lunas|success|paid|settled)$/i.test(String(value || "").trim());
}

function normalizeBillingType(value = "") {
  const raw = String(value || "").trim().toLowerCase();
  if (/^(monthly|month|bulanan|bulan|perbulan|per_bulan)$/i.test(raw)) return "monthly";
  if (/^(yearly|annual|annually|year|tahunan|tahun|pertahun|per_tahun)$/i.test(raw)) return "yearly";
  return "one_time";
}

function getBillingLabel(value = "") {
  const type = normalizeBillingType(value);
  if (type === "monthly") return "Bulanan";
  if (type === "yearly") return "Tahunan";
  return "Sekali Bayar";
}

function getSubscriptionDaysForProduct(productRow = {}) {
  const explicitDays = Math.floor(Number(productRow.subscription_days || productRow.durasi_langganan || 0));
  if (explicitDays > 0) return explicitDays;
  const billingType = normalizeBillingType(productRow.billing_type || productRow.tipe_langganan || productRow.subscription_type || "");
  if (billingType === "monthly") return 30;
  if (billingType === "yearly") return 365;
  return 0;
}

function buildSubscriptionExpiry(startDateValue, productRow = {}) {
  const days = getSubscriptionDaysForProduct(productRow);
  if (days <= 0) return "";
  const startDate = new Date(startDateValue || Date.now());
  if (isNaN(startDate)) return "";
  const expiry = new Date(startDate.getTime());
  expiry.setUTCDate(expiry.getUTCDate() + days);
  return expiry.toISOString();
}

function isOrderSubscriptionEntitled(order = {}) {
  if (!isPaidOrderStatus(order.status)) return false;
  const expiresAt = String(order.subscription_expires_at || "").trim();
  if (!expiresAt) return true;
  const expiry = new Date(expiresAt);
  if (isNaN(expiry)) return true;
  return expiry.getTime() >= Date.now();
}

function formatDateId(value = "") {
  const date = new Date(value);
  if (isNaN(date)) return "-";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function buildRenewUrl(settings = {}, productId = "") {
  const baseUrl = String(settings.site_url || "").replace(/\/$/, "");
  const cleanId = cleanProductId(productId || "");
  if (!baseUrl) return cleanId ? `/checkout?id=${encodeURIComponent(cleanId)}` : "";
  return `${baseUrl}/checkout?id=${encodeURIComponent(cleanId)}`;
}

async function activateOrderSubscription(env, ord = {}) {
  if (!env || !env.DB || !ord || !ord.invoice) return ord;
  const invoice = String(ord.invoice || "").trim();
  let order = { ...ord, status: isPaidOrderStatus(ord.status) ? ord.status : "Lunas" };
  const productId = cleanProductId(order.id_produk || "");
  let productRow = null;
  try {
    productRow = await env.DB.prepare("SELECT billing_type, subscription_days FROM access_rules WHERE UPPER(id_produk) = ?").bind(productId).first();
  } catch(e) {}

  const productBillingType = normalizeBillingType(productRow && productRow.billing_type ? productRow.billing_type : "");
  const billingType = normalizeBillingType(order.billing_type || productBillingType);
  if (billingType === "one_time") return order;

  const startedAt = String(order.subscription_started_at || "").trim() || new Date().toISOString();
  const expiresAt = String(order.subscription_expires_at || "").trim() || buildSubscriptionExpiry(startedAt, { ...(productRow || {}), billing_type: billingType });
  if (!expiresAt) return order;

  try {
    await env.DB.prepare(`
      UPDATE orders
      SET billing_type = ?, subscription_started_at = ?, subscription_expires_at = ?,
          subscription_reminder_level = COALESCE(subscription_reminder_level, 0)
      WHERE invoice = ?
    `).bind(billingType, startedAt, expiresAt, invoice).run();
  } catch(e) {
    console.log("Subscription activation failed:", e.message);
  }

  return { ...order, billing_type: billingType, subscription_started_at: startedAt, subscription_expires_at: expiresAt };
}

function generateCloudMemberLicense() {
  return generateLicenseKey25();
}

function generateLicenseKey25() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(25);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes, byte => chars[byte % chars.length]).join("");
  return raw.match(/.{1,5}/g).join("-");
}

function normalizeLicenseKey(value = "") {
  const raw = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!raw) return "";
  if (raw.length === 25) return raw.match(/.{1,5}/g).join("-");
  return String(value || "").trim().toUpperCase();
}

function hasExplicitProductLicenseEnabled(value = "") {
  return String(value ?? "").trim() !== "";
}

function normalizeProductLicenseEnabled(value = "", fallback = "No") {
  const parseFlag = rawValue => {
    const raw = String(rawValue ?? "").trim().toLowerCase();
    if (!raw) return "";
    if (/^(yes|ya|y|true|1|active|aktif|on|berlisensi|licensed|license)$/i.test(raw)) return "Yes";
    if (/^(no|tidak|n|false|0|inactive|nonaktif|off|none|tanpa|unlicensed)$/i.test(raw)) return "No";
    return "";
  };
  return parseFlag(value) || parseFlag(fallback) || "No";
}

function isProductLicenseEnabled(value = "") {
  return normalizeProductLicenseEnabled(value, "No") === "Yes";
}

function normalizeProductLicenseMode(value = "", fallback = "auto") {
  const parseMode = rawValue => {
    const raw = String(rawValue ?? "").trim().toLowerCase();
    if (!raw) return "";
    if (/^(stock|stok|upload|uploaded|manual|excel|csv|prepaid|pre-generated)$/i.test(raw)) return "stock";
    if (/^(auto|generate|auto-generate|autogenerate|otomatis|generate_otomatis)$/i.test(raw)) return "auto";
    return "";
  };
  return parseMode(value) || parseMode(fallback) || "auto";
}

function normalizeLicenseClaimMode(value = "") {
  const raw = String(value ?? "").trim().toLowerCase();
  if (/^(stock|stok|upload|uploaded|manual|excel|csv|prepaid|pre-generated)$/i.test(raw)) return "stock";
  if (/^(auto|generate|auto-generate|autogenerate|otomatis|generate_otomatis)$/i.test(raw)) return "auto";
  return "stock_or_auto";
}

function isValidLicenseStockKey(value = "") {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").length === 25;
}

async function claimProductLicense(env, productId = "", order = {}, mode = "stock_or_auto") {
  const cleanProduct = cleanProductId(productId || CLOUDMEMBER_PERSONAL_PRODUCT_ID);
  const claimMode = normalizeLicenseClaimMode(mode);
  if (claimMode === "auto") return generateLicenseKey25();
  await ensureD1Schema(env);
  const stockRows = await safeAll(env, `
    SELECT id, license_key, product_id
    FROM license_stock
    WHERE LOWER(status) = 'available'
      AND (UPPER(product_id) = ? OR product_id IS NULL OR TRIM(product_id) = '' OR UPPER(product_id) = 'ALL')
    ORDER BY CASE WHEN UPPER(product_id) = ? THEN 0 ELSE 1 END, id ASC
    LIMIT 1
  `, [cleanProduct, cleanProduct]);

  if (stockRows.length) {
    const stock = stockRows[0];
    const key = normalizeLicenseKey(stock.license_key);
    const result = await env.DB.prepare(`
      UPDATE license_stock
      SET status = 'Assigned', assigned_invoice = ?, assigned_email = ?, assigned_at = ?
      WHERE id = ? AND LOWER(status) = 'available'
    `).bind(order.invoice || "", order.email || "", new Date().toISOString(), stock.id).run();
    if (!result.meta || result.meta.changes > 0) return key;
  }

  if (claimMode === "stock") return "";
  return generateLicenseKey25();
}

function looksLikeCloudMemberPersonal(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return false;
  return text.includes("cloudp") || text.includes("cloudmember") || text.includes("cloud member");
}

function extractBumpProductIdFromUrl(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  const direct = cleanProductId(text);
  if (/^[A-Z0-9_-]{2,50}$/.test(direct) && !/[/?#.:]/.test(text)) return direct;
  try {
    const parsed = new URL(text, "https://cloudmember.local");
    for (const key of ["id", "id_produk", "product_id", "produk_id", "bump_id"]) {
      const found = cleanProductId(parsed.searchParams.get(key) || "");
      if (found) return found;
    }
  } catch(e) {}
  const queryMatch = text.match(/[?&](?:id|id_produk|product_id|produk_id|bump_id)=([A-Za-z0-9_-]+)/i);
  if (queryMatch && queryMatch[1]) return cleanProductId(queryMatch[1]);
  return "";
}

async function resolveBumpProduct(env, body = {}, productRow = {}) {
  if (!isTruthyOrderValue(body.take_bump)) return { isCloudMember: false, title: "", url: "" };

  const bumpTitle = String(body.bump_title || productRow.bump_title || "Order Bump").trim();
  const bumpUrl = String(body.bump_url || productRow.bump_url || "").trim();
  let bumpProductId = cleanProductId(body.bump_product_id || body.bump_produk_id || body.bumpProductId || productRow.bump_product_id || "");
  const directIdKeys = ["bump_id", "bump_produk_id", "bump_product_id", "bumpProductId", "bumpProductID", "id_produk_bump"];

  for (const key of directIdKeys) {
    const directId = cleanProductId(body[key]);
    if (directId) bumpProductId = directId;
  }

  if (!bumpProductId) bumpProductId = extractBumpProductIdFromUrl(bumpUrl);

  let bumpProduct = null;
  if (env && env.DB && bumpProductId) {
    try {
      bumpProduct = await env.DB.prepare(`
        SELECT id_produk, title, url_akses, url, lp_url
        FROM access_rules
        WHERE UPPER(id_produk) = ?
        LIMIT 1
      `).bind(bumpProductId).first();
    } catch(e) {}
  }

  if (!bumpProduct && bumpUrl && env && env.DB) {
    try {
      bumpProduct = await env.DB.prepare(`
        SELECT id_produk, title, url_akses, url, lp_url
        FROM access_rules
        WHERE url_akses = ? OR url = ? OR lp_url = ?
        LIMIT 1
      `).bind(bumpUrl, bumpUrl, bumpUrl).first();
    } catch(e) {}
  }

  if (bumpProduct) bumpProductId = cleanProductId(bumpProduct.id_produk);
  const bumpProductText = [
    bumpProductId,
    bumpTitle,
    bumpUrl,
    bumpProduct && bumpProduct.title,
    bumpProduct && bumpProduct.url_akses,
    bumpProduct && bumpProduct.url,
    bumpProduct && bumpProduct.lp_url
  ].join(" ");

  return {
    id: bumpProductId,
    isCloudMember: bumpProductId === CLOUDMEMBER_PERSONAL_PRODUCT_ID || looksLikeCloudMemberPersonal(bumpProductText),
    title: bumpTitle || (bumpProduct && bumpProduct.title) || "Order Bump",
    url: bumpUrl || (bumpProduct && (bumpProduct.url_akses || bumpProduct.url || bumpProduct.lp_url)) || ""
  };
}

async function detectCloudMemberPersonalBump(env, body = {}, productRow = {}) {
  const resolved = await resolveBumpProduct(env, body, productRow);
  return { isCloudMember: resolved.isCloudMember, title: resolved.title, url: resolved.url, id: resolved.id || "" };
}

async function getOrderBumpProductInfo(env, ord = {}) {
  if (!isTruthyOrderValue(ord.take_bump)) return { id: "", title: "", url: "", isCloudMember: false };
  if (ord.bump_product_id || ord.bump_title_snapshot || ord.bump_url_snapshot) {
    const resolved = await resolveBumpProduct(env, {
      take_bump: true,
      bump_product_id: ord.bump_product_id,
      bump_title: ord.bump_title_snapshot,
      bump_url: ord.bump_url_snapshot
    }, {});
    if (resolved.id || resolved.title || resolved.url || resolved.isCloudMember) return resolved;
  }
  let productRow = {};
  try {
    productRow = await env.DB.prepare("SELECT bump_title, bump_url, bump_product_id FROM access_rules WHERE UPPER(id_produk) = ?").bind(cleanProductId(ord.id_produk)).first() || {};
  } catch(e) {}
  return resolveBumpProduct(env, {
    take_bump: true,
    bump_title: productRow.bump_title,
    bump_url: productRow.bump_url,
    bump_product_id: productRow.bump_product_id
  }, productRow);
}

function getOrderLicenseColumn(ord = {}, licenseProductId = "", bumpInfo = {}) {
  const targetProdId = cleanProductId(ord.id_produk);
  const cleanLicenseProduct = cleanProductId(licenseProductId);
  const bumpProductId = cleanProductId(bumpInfo.id || ord.bump_product_id || "");
  if (cleanLicenseProduct && targetProdId && cleanLicenseProduct !== targetProdId && bumpProductId === cleanLicenseProduct) return "bump_license_key";
  if (cleanLicenseProduct === CLOUDMEMBER_PERSONAL_PRODUCT_ID && targetProdId !== CLOUDMEMBER_PERSONAL_PRODUCT_ID && (bumpInfo.isCloudMember || bumpProductId === CLOUDMEMBER_PERSONAL_PRODUCT_ID || isTruthyOrderValue(ord.take_bump))) return "bump_license_key";
  return "license_key";
}

async function saveOrderLicenseKey(env, ord = {}, licenseProductId = "", licenseKey = "", column = "license_key") {
  const key = normalizeLicenseKey(licenseKey);
  const invoice = String(ord.invoice || "").trim();
  if (!invoice || !key) return "";
  await ensureD1Schema(env);
  const safeColumn = column === "bump_license_key" ? "bump_license_key" : "license_key";
  if (safeColumn === "bump_license_key") {
    await env.DB.prepare(`
      UPDATE orders
      SET bump_license_key = ?, bump_license_product_id = ?
      WHERE invoice = ? AND (bump_license_key IS NULL OR TRIM(bump_license_key) = '')
    `).bind(key, cleanProductId(licenseProductId), invoice).run();
    ord.bump_license_key = key;
    ord.bump_license_product_id = cleanProductId(licenseProductId);
  } else {
    await env.DB.prepare(`
      UPDATE orders
      SET license_key = ?, license_product_id = ?
      WHERE invoice = ? AND (license_key IS NULL OR TRIM(license_key) = '')
    `).bind(key, cleanProductId(licenseProductId), invoice).run();
    ord.license_key = key;
    ord.license_product_id = cleanProductId(licenseProductId);
  }
  return key;
}

async function getLicenseProductSettings(env, productId = "") {
  const cleanId = cleanProductId(productId);
  if (!cleanId) return {};
  try {
    return await env.DB.prepare("SELECT license_enabled, license_mode FROM access_rules WHERE UPPER(id_produk) = ?").bind(cleanId).first() || {};
  } catch(e) {
    return {};
  }
}

async function hasAvailableProductLicenseStock(env, productId = "") {
  const cleanId = cleanProductId(productId);
  if (!cleanId) return false;
  try {
    const stockRow = await env.DB.prepare(`
      SELECT id FROM license_stock
      WHERE LOWER(status) = 'available'
        AND (UPPER(product_id) = ? OR product_id IS NULL OR TRIM(product_id) = '' OR UPPER(product_id) = 'ALL')
      LIMIT 1
    `).bind(cleanId).first();
    return Boolean(stockRow);
  } catch(e) {
    return false;
  }
}

function orderLicenseProductMatches(stockProductId = "", item = {}) {
  const cleanStock = cleanProductId(stockProductId || "");
  if (!cleanStock || cleanStock === "ALL") return true;
  return cleanProductId(item.licenseProductId || "") === cleanStock || cleanProductId(item.productId || "") === cleanStock;
}

async function buildOrderLicenseItem(env, ord = {}, options = {}) {
  const licenseProductId = cleanProductId(options.licenseProductId || options.productId || "");
  if (!licenseProductId) return null;
  const existingKey = normalizeLicenseKey(options.existingKey || "");
  const isCloudMemberAppLicense = Boolean(options.isCloudMemberAppLicense || licenseProductId === CLOUDMEMBER_PERSONAL_PRODUCT_ID);
  const settingsRow = await getLicenseProductSettings(env, licenseProductId);
  const productHasLicenseStock = existingKey ? false : await hasAvailableProductLicenseStock(env, licenseProductId);
  const explicitProductLicense = !isCloudMemberAppLicense && hasExplicitProductLicenseEnabled(settingsRow.license_enabled);
  const productLicenseEnabled = explicitProductLicense ? isProductLicenseEnabled(settingsRow.license_enabled) : productHasLicenseStock;
  const shouldHaveLicense = isCloudMemberAppLicense || productLicenseEnabled || existingKey !== "";
  const licenseClaimMode = String(settingsRow.license_mode || "").trim()
    ? normalizeProductLicenseMode(settingsRow.license_mode, "auto")
    : "stock_or_auto";
  if (!shouldHaveLicense) return null;
  return {
    role: options.role || "main",
    licenseColumn: options.licenseColumn || "license_key",
    productId: cleanProductId(options.productId || licenseProductId),
    licenseProductId,
    title: String(options.title || licenseProductId || "Produk").trim(),
    existingKey,
    licenseClaimMode,
    isCloudMemberAppLicense,
    isBump: options.role === "bump"
  };
}

async function getOrderLicenseRequirements(env, ord = {}) {
  const items = [];
  const targetProdId = cleanProductId(ord.id_produk);
  const bumpInfo = await getOrderBumpProductInfo(env, ord);

  if (targetProdId) {
    const mainItem = await buildOrderLicenseItem(env, ord, {
      role: "main",
      licenseColumn: "license_key",
      productId: targetProdId,
      licenseProductId: targetProdId === CLOUDMEMBER_PERSONAL_PRODUCT_ID ? CLOUDMEMBER_PERSONAL_PRODUCT_ID : targetProdId,
      title: ord.nama_produk || targetProdId,
      existingKey: ord.license_key,
      isCloudMemberAppLicense: targetProdId === CLOUDMEMBER_PERSONAL_PRODUCT_ID
    });
    if (mainItem) items.push(mainItem);
  }

  if (isTruthyOrderValue(ord.take_bump)) {
    const bumpProductId = cleanProductId(bumpInfo.id || ord.bump_product_id || "");
    const bumpIsCloudMember = bumpInfo.isCloudMember || bumpProductId === CLOUDMEMBER_PERSONAL_PRODUCT_ID;
    const bumpLicenseProductId = bumpIsCloudMember ? CLOUDMEMBER_PERSONAL_PRODUCT_ID : cleanProductId(ord.bump_license_product_id || bumpProductId);
    if (bumpLicenseProductId) {
      const bumpItem = await buildOrderLicenseItem(env, ord, {
        role: "bump",
        licenseColumn: "bump_license_key",
        productId: bumpProductId || bumpLicenseProductId,
        licenseProductId: bumpLicenseProductId,
        title: bumpInfo.title || ord.bump_title_snapshot || bumpLicenseProductId,
        existingKey: ord.bump_license_key,
        isCloudMemberAppLicense: bumpIsCloudMember
      });
      if (bumpItem) items.push(bumpItem);
    }
  }

  return { items, bumpInfo };
}

async function getOrderLicenseRequirement(env, ord = {}) {
  const bundle = await getOrderLicenseRequirements(env, ord);
  const item = bundle.items.find(row => row.role === "bump" && row.isCloudMemberAppLicense)
    || bundle.items.find(row => row.isCloudMemberAppLicense)
    || bundle.items[0]
    || {};
  return {
    shouldHaveLicense: Boolean(item.licenseProductId),
    licenseProductId: item.licenseProductId || "",
    licenseColumn: item.licenseColumn || "license_key",
    existingKey: item.existingKey || "",
    licenseClaimMode: item.licenseClaimMode || "stock_or_auto",
    isCloudMemberAppLicense: Boolean(item.isCloudMemberAppLicense),
    bumpInfo: bundle.bumpInfo
  };
}

async function assignMissingOrderLicenseItems(env, ord = {}, modeOverride = "") {
  const bundle = await getOrderLicenseRequirements(env, ord);
  const results = [];
  for (const item of bundle.items) {
    let key = item.existingKey || "";
    if (!key && item.licenseProductId) {
      key = await claimProductLicense(env, item.licenseProductId, ord, modeOverride || item.licenseClaimMode);
      if (key) await saveOrderLicenseKey(env, ord, item.licenseProductId, key, item.licenseColumn);
    }
    results.push({ ...item, key: normalizeLicenseKey(key) });
  }
  return results;
}

async function assignMissingOrderLicense(env, ord = {}, modeOverride = "") {
  const items = await assignMissingOrderLicenseItems(env, ord, modeOverride);
  const preferred = items.find(item => item.key && item.role === "bump" && item.isCloudMemberAppLicense)
    || items.find(item => item.key && item.isCloudMemberAppLicense)
    || items.find(item => item.key);
  return preferred ? preferred.key : "";
}

async function backfillPaidOrderLicenses(env, preferredProductId = "") {
  await ensureD1Schema(env);
  const cleanPreferred = cleanProductId(preferredProductId || "");
  const orders = await safeAll(env, `
    SELECT *
    FROM orders
    WHERE status IN ('Lunas', 'Success')
      AND (
        license_key IS NULL OR TRIM(license_key) = ''
        OR (take_bump IS NOT NULL AND TRIM(COALESCE(take_bump, '')) <> '' AND (bump_license_key IS NULL OR TRIM(bump_license_key) = ''))
      )
    ORDER BY rowid ASC
    LIMIT 100
  `);
  let assigned = 0;
  for (const ord of orders) {
    const bundle = await getOrderLicenseRequirements(env, ord);
    for (const item of bundle.items) {
      if (!item.licenseProductId || item.existingKey) continue;
      if (cleanPreferred && cleanPreferred !== "ALL" && item.licenseProductId !== cleanPreferred) continue;
      const key = await claimProductLicense(env, item.licenseProductId, ord, "stock");
      if (!key) continue;
      await saveOrderLicenseKey(env, ord, item.licenseProductId, key, item.licenseColumn);
      assigned++;
    }
  }
  return assigned;
}

async function findPaidOrderByLicenseKey(env, licenseKey = "") {
  const key = normalizeLicenseKey(licenseKey);
  if (!key) return { order: null, stock: null };
  await ensureD1Schema(env);
  let order = await env.DB.prepare(`
    SELECT *
    FROM orders
    WHERE (license_key = ? OR bump_license_key = ?)
      AND status IN ('Lunas', 'Success')
    ORDER BY rowid DESC
    LIMIT 1
  `).bind(key, key).first();
  if (order) return { order, stock: null };

  const stock = await env.DB.prepare("SELECT * FROM license_stock WHERE license_key = ? LIMIT 1").bind(key).first();
  if (stock && String(stock.assigned_invoice || "").trim()) {
    order = await env.DB.prepare("SELECT * FROM orders WHERE invoice = ? AND status IN ('Lunas', 'Success') LIMIT 1").bind(stock.assigned_invoice).first();
    if (order) {
      const bundle = await getOrderLicenseRequirements(env, order);
      const req = bundle.items.find(item => !item.existingKey && orderLicenseProductMatches(stock.product_id, item))
        || bundle.items.find(item => orderLicenseProductMatches(stock.product_id, item))
        || bundle.items[0];
      await saveOrderLicenseKey(env, order, (req && req.licenseProductId) || stock.product_id || CLOUDMEMBER_PERSONAL_PRODUCT_ID, key, (req && req.licenseColumn) || "license_key");
      order = await env.DB.prepare("SELECT * FROM orders WHERE invoice = ? LIMIT 1").bind(stock.assigned_invoice).first();
      return { order, stock };
    }
  }
  return { order: null, stock: stock || null };
}

async function assignSpecificStockLicenseToPaidOrder(env, stock = {}) {
  const key = normalizeLicenseKey(stock.license_key || "");
  if (!key || !/^available$/i.test(String(stock.status || ""))) return null;
  const stockProductId = cleanProductId(stock.product_id || CLOUDMEMBER_PERSONAL_PRODUCT_ID);
  const orders = await safeAll(env, `
    SELECT *
    FROM orders
    WHERE status IN ('Lunas', 'Success')
      AND (
        license_key IS NULL OR TRIM(license_key) = ''
        OR (take_bump IS NOT NULL AND TRIM(COALESCE(take_bump, '')) <> '' AND (bump_license_key IS NULL OR TRIM(bump_license_key) = ''))
      )
    ORDER BY rowid ASC
    LIMIT 100
  `);
  for (const ord of orders) {
    const bundle = await getOrderLicenseRequirements(env, ord);
    const req = bundle.items.find(item => item.licenseProductId && !item.existingKey && orderLicenseProductMatches(stockProductId, item));
    if (!req) continue;
    const result = await env.DB.prepare(`
      UPDATE license_stock
      SET status = 'Assigned', assigned_invoice = ?, assigned_email = ?, assigned_at = ?
      WHERE id = ? AND LOWER(status) = 'available'
    `).bind(ord.invoice || "", ord.email || "", new Date().toISOString(), stock.id).run();
    if (result.meta && result.meta.changes === 0) return null;
    await saveOrderLicenseKey(env, ord, req.licenseProductId || stockProductId, key, req.licenseColumn);
    return await env.DB.prepare("SELECT * FROM orders WHERE invoice = ? LIMIT 1").bind(ord.invoice).first();
  }
  return null;
}

async function ensureAffiliateSchema(env) {
  await ensureD1Schema(env);
}

async function ensurePaymentSnapshotSchema(env) {
  await ensureD1Schema(env);
}

async function ensurePageSeoSchema(env) {
  await ensureD1Schema(env);
}

async function ensureLmsTargetSchema(env) {
  await ensureD1Schema(env);
}

function splitTargetList(value) {
  return String(value || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function splitProductTargets(value) {
  return Array.from(new Set(splitTargetList(value).map(item => String(item).toUpperCase()).filter(Boolean)));
}

function normalizeUpgradeProductTargets(value) {
  return splitProductTargets(value).map(cleanProductId).filter(Boolean);
}

function getProductDisplayPrice(productRow = {}) {
  return Math.max(0, Number(productRow.harga || productRow.price || productRow.harga_jual || 0));
}

function buildUpgradeOptionsForProduct(sourceRow = {}, ruleById = new Map(), ownedIds = new Set()) {
  const sourceId = cleanProductId(sourceRow.id_produk || sourceRow.id || "");
  const sourcePrice = getProductDisplayPrice(sourceRow);
  return normalizeUpgradeProductTargets(sourceRow.upgrade_to_products || "")
    .filter(targetId => targetId && targetId !== sourceId && !ownedIds.has(targetId))
    .map(targetId => {
      const target = ruleById.get(targetId);
      if (!target) return null;
      const targetPrice = getProductDisplayPrice(target);
      const upgradePrice = Math.max(0, targetPrice - sourcePrice);
      return {
        id: targetId,
        title: target.title || target.nama || targetId,
        harga: targetPrice,
        source_price: sourcePrice,
        upgrade_price: upgradePrice,
        credit_amount: Math.min(sourcePrice, targetPrice),
        gambar: target.gambar || "",
        lp_url: target.lp_url || "",
        desc: target.desc || target.deskripsi || ""
      };
    })
    .filter(Boolean);
}

async function resolveCheckoutUpgrade(env, { email = "", sourceProductId = "", targetProductId = "", targetProductRow = {} } = {}) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const sourceId = cleanProductId(sourceProductId);
  const targetId = cleanProductId(targetProductId || targetProductRow.id_produk || "");
  if (!sourceId) return { ok: true, active: false, basePrice: getProductDisplayPrice(targetProductRow), creditAmount: 0, sourceId: "" };
  if (!cleanEmail) return { ok: false, message: "Email wajib diisi untuk upgrade produk." };
  if (!targetId) return { ok: false, message: "Produk tujuan upgrade tidak valid." };
  if (sourceId === targetId) return { ok: false, message: "Produk asal dan tujuan upgrade tidak boleh sama." };

  const sourceRow = await env.DB.prepare("SELECT * FROM access_rules WHERE UPPER(id_produk) = ?").bind(sourceId).first();
  if (!sourceRow) return { ok: false, message: "Produk asal upgrade tidak ditemukan." };
  const allowedTargets = normalizeUpgradeProductTargets(sourceRow.upgrade_to_products || "");
  if (!allowedTargets.includes(targetId)) {
    return { ok: false, message: "Upgrade ke produk ini belum tersedia untuk produk yang Anda miliki." };
  }

  const sourceOrders = await safeAll(env, `
    SELECT invoice, status, billing_type, subscription_expires_at, id_produk, bump_product_id
    FROM orders
    WHERE LOWER(email) = ?
      AND (UPPER(id_produk) = ? OR UPPER(COALESCE(bump_product_id, '')) = ?)
  `, [cleanEmail, sourceId, sourceId]);
  const hasSourceAccess = sourceOrders.some(order => isOrderSubscriptionEntitled(order));
  if (!hasSourceAccess) {
    return { ok: false, message: "Upgrade hanya tersedia untuk member yang sudah memiliki produk asal dengan status lunas." };
  }

  const targetOrders = await safeAll(env, `
    SELECT invoice, status, billing_type, subscription_expires_at, id_produk, bump_product_id
    FROM orders
    WHERE LOWER(email) = ?
      AND (UPPER(id_produk) = ? OR UPPER(COALESCE(bump_product_id, '')) = ?)
  `, [cleanEmail, targetId, targetId]);
  if (targetOrders.some(order => isOrderSubscriptionEntitled(order))) {
    return { ok: false, message: "Akun ini sudah memiliki produk tujuan upgrade." };
  }

  const targetPrice = getProductDisplayPrice(targetProductRow);
  const sourcePrice = getProductDisplayPrice(sourceRow);
  return {
    ok: true,
    active: true,
    sourceId,
    targetId,
    sourceTitle: sourceRow.title || sourceId,
    targetTitle: targetProductRow.title || targetId,
    basePrice: Math.max(0, targetPrice - sourcePrice),
    targetPrice,
    sourcePrice,
    creditAmount: Math.min(sourcePrice, targetPrice)
  };
}

function slugifyLmsKey(value = "") {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 48) || "KATEGORI";
}

function createCategoryLmsId(category = "") {
  return `CAT-${slugifyLmsKey(category)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function splitCategoryTargets(value) {
  return Array.from(new Set(splitTargetList(value).map(item => String(item).trim()).filter(Boolean)));
}

function getCouponTargets(value) {
  return splitTargetList(value).map(item => {
    const clean = String(item || "").trim();
    if (/^(all|semua)$/i.test(clean)) return { type: "all", value: "All" };
    const categoryMatch = clean.match(/^(CAT|CATEGORY|KATEGORI):(.+)$/i);
    if (categoryMatch) return { type: "category", value: categoryMatch[2].trim().toLowerCase() };
    return { type: "product", value: clean.toUpperCase() };
  });
}

function normalizeCouponCode(value = "") {
  return String(value || "").trim().toUpperCase();
}

function normalizeCouponLimit(value = 0) {
  const numberValue = Math.floor(Number(value) || 0);
  return numberValue > 0 ? numberValue : 0;
}

function parseCouponExpiry(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T23:59:59.999+07:00` : raw;
  const date = new Date(normalized);
  return isNaN(date) ? null : date;
}

function isCouponExpired(coupon = {}) {
  const expiry = parseCouponExpiry(coupon.expires_at || coupon.expired_at || coupon.valid_until || "");
  return expiry ? expiry.getTime() < Date.now() : false;
}

function isCouponTargetAllowed(coupon = {}, productRow = {}, productId = "") {
  const targetsRaw = String(coupon.berlaku_untuk_prod || coupon.products || "All").trim();
  if (!targetsRaw || targetsRaw.toLowerCase() === "all") return true;
  const reqProdId = cleanProductId(productId || productRow.id_produk || "");
  const productCategory = String(productRow.kategori || productRow.category || "").trim().toLowerCase();
  return getCouponTargets(targetsRaw).some(target => {
    if (target.type === "all") return true;
    if (target.type === "product") return target.value === reqProdId;
    if (target.type === "category") return productCategory && target.value === productCategory;
    return false;
  });
}

function calculateCouponDiscount(coupon = {}, basePrice = 0) {
  const price = Math.max(0, Number(basePrice) || 0);
  const type = String(coupon.tipe || coupon.type || "").trim().toLowerCase();
  const value = Math.max(0, Number(coupon.nilai || coupon.val || 0));
  let discount = 0;
  if (type === "persen" || type === "percentage" || type === "%") discount = (price * value) / 100;
  else discount = value;
  if (discount > price) discount = price;
  return Math.max(0, Math.round(discount));
}

async function getCouponUsage(env, couponCode = "", email = "") {
  const code = normalizeCouponCode(couponCode);
  const cleanEmail = String(email || "").trim().toLowerCase();
  const result = { total: 0, customer: 0 };
  if (!code) return result;
  try {
    const totalRow = await env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM orders
      WHERE UPPER(COALESCE(coupon_code, '')) = ?
        AND status NOT IN ('Cancelled', 'Failed', 'Expired')
    `).bind(code).first();
    result.total = Number(totalRow && totalRow.total) || 0;
  } catch(e) {}
  if (cleanEmail) {
    try {
      const customerRow = await env.DB.prepare(`
        SELECT COUNT(*) AS total
        FROM orders
        WHERE UPPER(COALESCE(coupon_code, '')) = ?
          AND LOWER(COALESCE(email, '')) = ?
          AND status NOT IN ('Cancelled', 'Failed', 'Expired')
      `).bind(code, cleanEmail).first();
      result.customer = Number(customerRow && customerRow.total) || 0;
    } catch(e) {}
  }
  return result;
}

async function validateCouponForCheckout(env, body = {}) {
  const code = normalizeCouponCode(body.code || body.kode_promo || body.kupon || body.coupon_code || "");
  const productId = cleanProductId(body.id_produk || body.id || body.product_id || "");
  const email = String(body.email || "").trim().toLowerCase();
  if (!code) return { ok: false, status: "error", message: "Kode kupon kosong." };

  const coupon = await env.DB.prepare("SELECT * FROM coupons WHERE UPPER(kode_promo) = ? LIMIT 1").bind(code).first();
  if (!coupon || String(coupon.status || "").trim() !== "Active") {
    return { ok: false, status: "error", message: "Kupon tidak ditemukan / sudah kadaluarsa." };
  }
  if (isCouponExpired(coupon)) {
    return { ok: false, status: "error", message: "Kupon sudah melewati masa berlaku." };
  }

  let productRow = {};
  if (productId) {
    try {
      productRow = await env.DB.prepare("SELECT id_produk, kategori, harga FROM access_rules WHERE UPPER(id_produk) = ?").bind(productId).first() || {};
    } catch(e) {}
  }
  if (!isCouponTargetAllowed(coupon, productRow, productId)) {
    return { ok: false, status: "error", message: "Kupon ini tidak berlaku untuk produk ini." };
  }

  const basePrice = Math.max(0, Number(body.harga || body.price || productRow.harga || 0));
  const minOrderAmount = Math.max(0, Number(coupon.min_order_amount || 0));
  if (minOrderAmount > 0 && basePrice < minOrderAmount) {
    return { ok: false, status: "error", message: `Minimal transaksi kupon ini Rp ${minOrderAmount.toLocaleString("id-ID")}.` };
  }

  const totalLimit = normalizeCouponLimit(coupon.usage_limit_total);
  const customerLimit = normalizeCouponLimit(coupon.usage_limit_per_customer);
  if (customerLimit > 0 && !email) {
    return { ok: false, status: "error", message: "Isi email terlebih dahulu untuk memakai kupon ini." };
  }
  if (totalLimit > 0 || customerLimit > 0) {
    const usage = await getCouponUsage(env, code, email);
    if (totalLimit > 0 && usage.total >= totalLimit) {
      return { ok: false, status: "error", message: "Limit penggunaan kupon sudah habis." };
    }
    if (customerLimit > 0 && usage.customer >= customerLimit) {
      return { ok: false, status: "error", message: "Kupon ini sudah pernah digunakan oleh email tersebut." };
    }
  }

  const discount = calculateCouponDiscount(coupon, basePrice);
  return {
    ok: true,
    status: "success",
    message: "Kupon berhasil diterapkan!",
    code: coupon.kode_promo || code,
    discount,
    coupon
  };
}

function normalizeYoutubeVideoId(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/i,
    /[?&]v=([A-Za-z0-9_-]{11})/i,
    /\/embed\/([A-Za-z0-9_-]{11})/i,
    /\/shorts\/([A-Za-z0-9_-]{11})/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return match[1];
  }
  return /^[A-Za-z0-9_-]{11}$/.test(text) ? text : "";
}

function extractYoutubePlaylistId(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const parsed = new URL(text);
    const listId = String(parsed.searchParams.get("list") || "").trim();
    if (listId) return listId;
  } catch(e) {}
  const match = text.match(/(?:[?&]list=|youtube\.com\/playlist\/)([A-Za-z0-9_-]+)/i);
  return match && match[1] ? match[1] : (/^[A-Za-z0-9_-]{12,}$/.test(text) ? text : "");
}

async function fetchYoutubePlaylistItems(playlistId, apiKey, maxVideos = 500) {
  const videos = [];
  const seen = new Set();
  let skipped = 0;
  let totalItems = 0;
  let pageToken = "";
  let pageCount = 0;

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data && data.error && data.error.message ? data.error.message : `YouTube API HTTP ${res.status}`;
      throw new Error(message);
    }

    totalItems = Math.max(totalItems, Number(data.pageInfo && data.pageInfo.totalResults) || 0);
    for (const item of Array.isArray(data.items) ? data.items : []) {
      const snippet = item.snippet || {};
      const videoId = String((item.contentDetails && item.contentDetails.videoId) || (snippet.resourceId && snippet.resourceId.videoId) || "").trim();
      const title = String(snippet.title || "").trim();
      const unavailable = !videoId || /^(private|deleted) video$/i.test(title);
      if (unavailable) {
        skipped += 1;
        continue;
      }
      if (seen.has(videoId)) continue;
      seen.add(videoId);
      videos.push({ id: videoId, title: title || `Video ${videos.length + 1}`, desc: String(snippet.description || "") });
      if (videos.length >= maxVideos) break;
    }

    pageToken = String(data.nextPageToken || "").trim();
    pageCount += 1;
  } while (pageToken && videos.length < maxVideos && pageCount < 20);

  return { videos, skipped, totalItems: totalItems || videos.length + skipped, pageCount };
}

function decodeJsonStringFragment(value) {
  const text = String(value || "");
  try { return JSON.parse(`"${text.replace(/"/g, '\\"')}"`); } catch(e) { return text.replace(/\\u0026/g, "&"); }
}

function extractYoutubeVideosFromText(value) {
  const text = String(value || "");
  const found = [];
  const seen = new Set();
  const add = (id, title = "") => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    found.push({ id, title: title || `Video ${found.length + 1}` });
  };

  text.split(/\r?\n/).forEach(line => {
    const id = normalizeYoutubeVideoId(line);
    if (id) add(id, line.replace(/https?:\/\/\S+/g, "").trim());
  });

  const videoRegex = /"videoId":"([A-Za-z0-9_-]{11})"/g;
  let match;
  while ((match = videoRegex.exec(text)) && found.length < 200) {
    const id = match[1];
    const windowText = text.slice(match.index, match.index + 3000);
    const titleMatch = windowText.match(/"title":\{"runs":\[\{"text":"([^"]+)"/) || windowText.match(/"simpleText":"([^"]+)"/);
    add(id, titleMatch ? decodeJsonStringFragment(titleMatch[1]) : "");
  }

  return found.slice(0, 200);
}

async function handleImportYoutubePlaylist(body, settings = {}, env = {}) {
  const source = String(body.playlist_url || body.url || body.text || "").trim();
  if (!source) return jsonRes({ status: "error", message: "URL playlist atau daftar video kosong." }, 400);

  const playlistId = extractYoutubePlaylistId(source);
  const apiKey = String((env && env.YOUTUBE_API_KEY) || settings.youtube_api_key || "").trim();
  let apiWarning = "";
  if (playlistId && apiKey) {
    try {
      const imported = await fetchYoutubePlaylistItems(playlistId, apiKey);
      if (!imported.videos.length) return jsonRes({ status: "error", message: "Playlist tidak memiliki video publik yang dapat diputar." });
      return jsonRes({
        status: "success",
        videos: imported.videos,
        total_items: imported.totalItems,
        skipped_count: imported.skipped,
        pages_loaded: imported.pageCount,
        source: "youtube_data_api"
      });
    } catch(e) {
      apiWarning = `YouTube API gagal: ${e.message}`;
    }
  }

  let scrapeText = source;
  if (/^https?:\/\//i.test(source)) {
    const id = normalizeYoutubeVideoId(source);
    try {
      const res = await fetch(source, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (res.ok) scrapeText = await res.text();
    } catch(e) {}
    if (id) scrapeText += `\n${id}`;
  }

  const videos = extractYoutubeVideosFromText(scrapeText);
  if (!videos.length) return jsonRes({ status: "error", message: "Video playlist tidak ditemukan. Paste daftar URL video jika playlist tidak terbaca." });
  const warning = playlistId
    ? (apiWarning || "YouTube Data API Key belum diisi. Hasil fallback dapat tidak lengkap untuk playlist panjang.")
    : apiWarning;
  return jsonRes({ status: "success", videos, total_items: videos.length, skipped_count: 0, source: "html_fallback", warning });
}

async function findAffiliateUser(env, ref) {
  const key = cleanAffiliateRef(ref);
  if (!key) return null;
  try {
    return await env.DB.prepare("SELECT * FROM users WHERE id_user = ? OR CAST(id AS TEXT) = ? OR LOWER(email) = ? LIMIT 1")
      .bind(key, key, key.toLowerCase())
      .first();
  } catch(e) {
    return null;
  }
}

async function buildAffiliateChain(env, directAffiliate, buyerEmail = "", maxLevel = 3) {
  const chain = [];
  const seen = new Set();
  const buyerKey = cleanAffiliateRef(buyerEmail).toLowerCase();
  if (buyerKey) seen.add(buyerKey);

  let nextRef = cleanAffiliateRef(directAffiliate);
  for (let level = 1; level <= maxLevel && nextRef; level++) {
    const user = await findAffiliateUser(env, nextRef);
    const refKey = user ? getAffiliateUserKey(user) : nextRef;
    const normalizedRef = cleanAffiliateRef(refKey).toLowerCase();
    const normalizedEmail = user && user.email ? cleanAffiliateRef(user.email).toLowerCase() : "";
    if (!normalizedRef || seen.has(normalizedRef) || (normalizedEmail && seen.has(normalizedEmail))) break;

    chain.push({
      level,
      ref: cleanAffiliateRef(refKey),
      email: user && user.email ? String(user.email).toLowerCase() : "",
      name: user && user.nama ? String(user.nama) : ""
    });

    seen.add(normalizedRef);
    if (normalizedEmail) seen.add(normalizedEmail);
    if (!user) break;
    nextRef = cleanAffiliateRef(user.affiliate);
  }
  return chain;
}

function getOrderAffiliateCredits(order = {}) {
  const credits = [];
  for (let level = 1; level <= 3; level++) {
    const ref = cleanAffiliateRef(order[`affiliate_l${level}`] || (level === 1 ? order.affiliate : ""));
    if (!ref) continue;
    let amount = Number(order[`komisi_l${level}`]);
    if (!Number.isFinite(amount) || (level === 1 && amount === 0 && order.komisi !== undefined)) {
      amount = Number(order.komisi) || 0;
    }
    if (amount !== 0) credits.push({ level, ref, amount });
  }
  return credits;
}

function findAffiliateBucket(affMap, ref) {
  const cleanRef = cleanAffiliateRef(ref);
  if (!cleanRef) return null;
  if (affMap[cleanRef]) return affMap[cleanRef];
  const lowerRef = cleanRef.toLowerCase();
  for (const key of Object.keys(affMap)) {
    if ((affMap[key].aliases || []).some(alias => String(alias).toLowerCase() === lowerRef)) return affMap[key];
    if (String(affMap[key].email || "").toLowerCase() === lowerRef) return affMap[key];
  }
  return null;
}

function cleanGatewayToken(value) {
  return String(value || "").trim().replace(/^Bearer\s+/i, "").trim();
}

function normalizeStarSenderApi(value) {
  const fallback = "https://api.starsender.online/api/send";
  let endpoint = String(value || "").trim();
  if (!endpoint) return { url: fallback, mode: "v3" };
  if (!/^https?:\/\//i.test(endpoint)) endpoint = "https://" + endpoint;
  endpoint = endpoint.replace(/\/+$/, "");

  try {
    const parsed = new URL(endpoint);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (/sendtext|sendfile/.test(path) || host.includes("waapi.")) return { url: endpoint, mode: "legacy" };
    if ((host === "api.starsender.online" || host === "starsender.online" || host === "www.starsender.online") && (path === "/" || path === "/api")) return { url: fallback, mode: "v3" };
    if ((host === "starsender.online" || host === "www.starsender.online") && path === "/api/send") return { url: fallback, mode: "v3" };
    if (host === "api.starsender.online" && path === "/api/send") return { url: endpoint, mode: "v3" };
  } catch(e) {}

  return { url: endpoint, mode: /sendtext|sendfile/i.test(endpoint) ? "legacy" : "v3" };
}

function normalizeWaplusApiUrl(value) {
  let endpoint = String(value || "").trim();
  if (!endpoint) endpoint = "https://app.waplus.id/api/send-message";
  if (!/^https?:\/\//i.test(endpoint)) endpoint = "https://" + endpoint;
  endpoint = endpoint.replace(/\/+$/, "");
  if (/\/api\/(v\d+\/)?(messages|send|send-message|message\/send|wa\/send)$/i.test(endpoint)) return endpoint;
  if (/\/api$/i.test(endpoint)) return endpoint + "/send-message";
  return endpoint + "/api/send-message";
}

function normalizeMpediaApiUrl(value) {
  let endpoint = String(value || "").trim();
  if (!endpoint) endpoint = "https://m-pedia.my.id";
  if (!/^https?:\/\//i.test(endpoint)) endpoint = "https://" + endpoint;
  endpoint = endpoint.replace(/\/+$/, "");
  if (/\/send-message$/i.test(endpoint)) return endpoint;
  return endpoint + "/send-message";
}

function getGatewayResponseField(data, names = []) {
  if (!data || typeof data !== "object") return undefined;
  const lookup = {};
  for (const [key, value] of Object.entries(data)) {
    lookup[String(key || "").toLowerCase()] = value;
  }
  for (const name of names) {
    const value = lookup[String(name || "").toLowerCase()];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return undefined;
}

function extractGatewayMessage(data, text, fallback = "") {
  if (data && typeof data === "object") {
    const directMessage = getGatewayResponseField(data, ["message", "msg", "detail", "reason", "error", "description"]);
    if (directMessage !== undefined) return typeof directMessage === "string" ? directMessage : JSON.stringify(directMessage);
    if (Array.isArray(data.errors) && data.errors.length) {
      const first = data.errors[0];
      return typeof first === "string" ? first : String(first.message || JSON.stringify(first));
    }
  }
  return String(text || fallback || "").trim();
}

async function readGatewayResponse(res, provider) {
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch(e) {}
  const message = extractGatewayMessage(data, text, provider + " merespons tanpa pesan detail");
  const statusValue = getGatewayResponseField(data, ["status", "Status"]);
  const successValue = getGatewayResponseField(data, ["success", "Success", "ok", "OK"]);
  const statusText = statusValue !== undefined ? String(statusValue).toLowerCase() : "";
  const successText = successValue !== undefined ? String(successValue).toLowerCase() : "";
  const failedByBody = data && (
    successValue === false ||
    successText === "false" ||
    statusValue === false ||
    statusText === "false" ||
    statusText === "error" ||
    statusText === "failed" ||
    statusText === "fail"
  );
  if (!res.ok || failedByBody) {
    throw new Error(provider + " HTTP " + res.status + ": " + message.substring(0, 300));
  }
  return { ok: true, provider, http_status: res.status, message: message.substring(0, 300) };
}

function notificationFetch(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(12000) });
}

function safeNotificationError(settings, error) {
  let text = String(error && error.message ? error.message : error || 'Gateway tidak menerima pesan.');
  for (const key of ['wa_token', 'mail_api_key', 'notivgo_api_key', 'notivgo_webhook_secret']) {
    const secret = String(settings[key] || '').trim();
    if (secret) text = text.split(secret).join('[redacted]');
  }
  return text.slice(0, 500);
}

async function deliverOutboxNotification(env, settings, item) {
  const now = Math.floor(Date.now() / 1000);
  const claim = await env.DB.prepare("UPDATE notification_outbox SET status='sending', attempts=attempts+1, lease_until=?, updated_at=? WHERE id=? AND status <> 'sent' AND attempts < 5 AND COALESCE(lease_until,0) < ? AND next_attempt <= ?")
    .bind(now + 120, new Date().toISOString(), item.id, now, now).run();
  if (!claim.meta.changes) return;
  let result;
  try {
    result = item.channel === 'wa'
      ? await sendNotificationWA(settings, item.target, item.content, item.id)
      : await sendEmail(settings, item.target, item.subject, item.content, { detailed: true });
  } catch (error) { result = { ok: false, message: error.message }; }
  const ok = Boolean(result && result.ok);
  await env.DB.prepare("UPDATE notification_outbox SET status=?, lease_until=0, next_attempt=?, last_error=?, content=CASE WHEN ? THEN '' ELSE content END, updated_at=? WHERE id=?")
    .bind(ok ? 'sent' : 'failed', now + 300, ok ? '' : safeNotificationError(settings, result && result.message), ok ? 1 : 0, new Date().toISOString(), item.id).run();
  return result;
}

async function sendOrderNotifications(env, settings, invoice, event, messages) {
  // Persist both channels before network I/O so a failed WA request cannot suppress email.
  const queued = [];
  for (const message of messages) {
    const item = { ...message, id: `${event}:${invoice}:${message.channel}` };
    await env.DB.prepare("INSERT OR IGNORE INTO notification_outbox (id,invoice,event,channel,target,subject,content,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(item.id, invoice, event, item.channel, String(item.target || ''), item.subject || '', item.content || '', new Date().toISOString(), new Date().toISOString()).run();
    queued.push(item);
  }
  for (const item of queued) await deliverOutboxNotification(env, settings, item);
}

async function retryOrderNotifications(env, settings) {
  await env.DB.prepare("UPDATE notification_outbox SET status='failed',lease_until=0,last_error='Proses pengiriman terhenti. Periksa gateway sebelum mencoba ulang.' WHERE status='sending' AND attempts >= 5 AND lease_until < ?").bind(Math.floor(Date.now() / 1000)).run();
  const rows = await safeAll(env, "SELECT * FROM notification_outbox WHERE status <> 'sent' AND attempts < 5 AND next_attempt <= ? AND lease_until < ? ORDER BY next_attempt LIMIT 10", [Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]);
  for (const item of rows) {
    // Do not send an obsolete pending-payment reminder after an invoice was paid/cancelled.
    const order = await env.DB.prepare('SELECT status FROM orders WHERE invoice=?').bind(item.invoice).first();
    if (!order || (item.event === 'pending' && order.status !== 'Pending')) {
      await env.DB.prepare("UPDATE notification_outbox SET status='skipped', attempts=5, content='', last_error='Invoice tidak lagi menunggu pembayaran.' WHERE id=?").bind(item.id).run();
      continue;
    }
    await deliverOutboxNotification(env, settings, item);
  }
}

async function sendWA(settings, target, message, options = {}) {
  const detailed = options.detailed === true;
  const token = cleanGatewayToken(settings.wa_token);
  const num = normalizePhone(target);
  if (!num) return detailed ? { ok: false, message: "Nomor WhatsApp tujuan belum valid." } : false;
  if (!token) return detailed ? { ok: false, message: "API Token WhatsApp belum diisi." } : false;

  const gateway = String(settings.wa_gateway || "").toLowerCase();
  try {
    let result;
    if (gateway === "starsender") {
        const starApi = normalizeStarSenderApi(settings.wa_api_url || settings.starsender_api_url || "");
        const res = starApi.mode === "legacy"
          ? await notificationFetch(starApi.url, {
              method: 'POST',
              headers: { 'apikey': token, 'Authorization': token, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
              body: new URLSearchParams({ tujuan: num, to: num, target: num, message })
            })
          : await notificationFetch(starApi.url, {
              method: 'POST',
              headers: { 'Authorization': token, 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify({ messageType: "text", to: num, body: message })
            });
        result = await readGatewayResponse(res, "StarSender");
    } else if (gateway === "waplus") {
        const apiUrl = normalizeWaplusApiUrl(settings.wa_api_url || settings.waplus_api_url || "");
        const res = await notificationFetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'apikey': token,
            'x-api-key': token,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            recipient_type: "individual",
            to: num,
            phone: num,
            number: num,
            target: num,
            type: "text",
            message,
            text: message,
            body: message
          })
        });
        result = await readGatewayResponse(res, "Waplus");
    } else if (gateway === "mpedia" || gateway === "m-pedia" || gateway === "mpwa") {
        const sender = String(settings.wa_sender || settings.mpedia_sender || settings.mpwa_sender || "").trim();
        if (!sender) throw new Error("Sender M-Pedia/MPWA belum diisi.");
        const apiUrl = normalizeMpediaApiUrl(settings.wa_api_url || settings.mpedia_api_url || settings.mpwa_url || "");
        const fd = new FormData();
        fd.append("api_key", token);
        fd.append("sender", sender);
        fd.append("number", num);
        fd.append("message", message);
        const res = await notificationFetch(apiUrl, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: fd
        });
        result = await readGatewayResponse(res, "M-Pedia");
    } else if (gateway === "fonnte" || String(token).length < 25) {
        const fd = new FormData();
        fd.append('target', num);
        fd.append('message', message);
        fd.append('countryCode', '0');
        const res = await notificationFetch("https://api.fonnte.com/send", { method: 'POST', headers: { 'Authorization': token }, body: fd });
        result = await readGatewayResponse(res, "Fonnte");
    } else {
        const apiUrl = normalizeOneSenderApiUrl(settings.wa_api_url || settings.onesender_api_url || settings.wa_endpoint || "");
        const res = await notificationFetch(apiUrl, { method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ recipient_type: "individual", to: num, type: "text", text: { body: message } }) });
        result = await readGatewayResponse(res, "OneSender");
    }
    return detailed ? result : true;
  } catch (e) {
    const detail = safeNotificationError(settings, e);
    console.log("WA Error:", detail);
    return detailed ? { ok: false, message: detail } : false;
  }
}

function maskWaTarget(value = "") {
  const phone = normalizePhone(value);
  if (!phone) return "";
  return phone.replace(/(\d{4})\d+(\d{3})$/, "$1****$2");
}

async function sendNotificationWA(settings, target, message, context = "WhatsApp Notification") {
  if (!String(message || "").trim()) return { ok: false, skipped: true, message: "Isi pesan WhatsApp kosong." };
  const result = await sendWA(settings, target, message, { detailed: true });
  if (!result || !result.ok) {
    console.log("WA Notification Failed:", JSON.stringify({
      context,
      provider: String(settings.wa_gateway || "onesender"),
      target: maskWaTarget(target),
      message: safeNotificationError(settings, result && result.message ? result.message : "Gateway tidak mengirim detail error.")
    }));
    return result || { ok: false, message: "Gateway tidak mengirim detail error." };
  }
  return result;
}

async function sendEmail(settings, target, subject, bodyContent, options = {}) {
  const done = (ok, message = '') => options.detailed ? { ok, message } : ok;
  const provider = String(settings.mail_provider || '').toLowerCase();
  if (!target || !settings.mail_sender_email) return done(false, !target ? 'Email tujuan belum diisi.' : 'Email pengirim belum diisi.');
  const fullHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="background-color:#f1f5f9;margin:0;padding:20px;font-family:sans-serif;">${bodyContent}</body></html>`;
  const plainText = stripHtmlText(bodyContent || "");
  try {
    if (provider === 'resend' && settings.mail_api_key) {
      const res = await notificationFetch("https://api.resend.com/emails", { method: "POST", headers: { "Authorization": "Bearer " + settings.mail_api_key, "Content-Type": "application/json" }, body: JSON.stringify({ from: `${settings.mail_sender_name || "Admin"} <${settings.mail_sender_email}>`, to: [target], subject: subject, html: fullHTML }) });
      if (!res.ok) throw new Error("Resend HTTP " + res.status + ": " + (await res.text()).substring(0, 300));
      return done(true);
    } else if (provider === 'mailketing' && settings.mail_api_key) {
      const res = await notificationFetch("https://api.mailketing.co.id/api/v1/send", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ api_token: settings.mail_api_key, from_name: settings.mail_sender_name || "Admin", from_email: settings.mail_sender_email, subject: subject, content: fullHTML, recipient: target }) });
      await readGatewayResponse(res, 'Mailketing');
      return done(true);
    } else if (provider === 'kirimemail' || provider === 'kirim.email' || provider === 'kirim_email') {
      const username = String(settings.mail_username || "").trim();
      const apiKey = String(settings.mail_api_key || "").trim();
      if (!username || !apiKey) throw new Error("Username dan API Key Kirim.Email wajib diisi.");
      const senderEmail = String(settings.mail_sender_email || "").trim();
      const senderDomain = senderEmail.includes("@") ? senderEmail.split("@").pop().toLowerCase().trim() : "";
      const domain = String(settings.mail_domain || settings.kirimemail_domain || senderDomain || "").trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").toLowerCase();
      if (!domain) throw new Error("Domain Kirim.Email belum diisi dan tidak bisa dibaca dari Email Pengirim.");
      const authHeader = "Basic " + btoa(`${username}:${apiKey}`);
      const endpoint = `https://smtp-app.kirim.email/api/domains/${encodeURIComponent(domain)}/message`;
      const form = new FormData();
      form.append("from", senderEmail);
      form.append("from_name", settings.mail_sender_name || settings.site_name || "Admin");
      form.append("to", target);
      form.append("subject", subject);
      form.append("text", plainText || subject);
      form.append("html", fullHTML);
      form.append("reply_to", senderEmail);
      let res = await notificationFetch(endpoint, { method: "POST", headers: { "Authorization": authHeader }, body: form });
      if (!res.ok && (res.status === 404 || res.status === 405)) {
        const fallbackBody = new URLSearchParams({
          from: senderEmail,
          to: target,
          subject,
          body: plainText || subject,
          html: fullHTML
        });
        res = await notificationFetch(`https://smtp-app.kirim.email/api/domains/${encodeURIComponent(domain)}/send`, {
          method: "POST",
          headers: { "Authorization": authHeader, "Content-Type": "application/x-www-form-urlencoded" },
          body: fallbackBody
        });
      }
      await readGatewayResponse(res, "Kirim.Email");
      return done(true);
    } else if ((provider === 'google' || provider === 'gmail')) {
      const endpoint = pickSetting(settings, ["mail_api_url", "gmail_webapp_url", "google_mail_api_url"]);
      if (!endpoint) throw new Error("URL Web App Gmail belum diisi.");
      const res = await notificationFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          token: String(settings.mail_api_key || "").trim(),
          to: target,
          subject,
          html: fullHTML,
          text: plainText,
          from_name: settings.mail_sender_name || settings.site_name || "Admin",
          from_email: settings.mail_sender_email,
          reply_to: settings.mail_sender_email
        })
      });
      await readGatewayResponse(res, "Gmail Apps Script");
      return done(true);
    }
  } catch(e) { const detail = safeNotificationError(settings, e); console.log("Email Error:", detail); return done(false, detail); }
  return done(false, 'Provider email atau API key belum dikonfigurasi.');
}

function splitMailketingName(nama, email) {
  const fallback = String(email || "").split("@")[0] || "Member";
  const parts = String(nama || fallback).trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || fallback;
  return { firstName, lastName: parts.join(" ") };
}

async function addToAutoresponder(settings, nama, email, whatsapp = "") {
  const provider = String(settings.mail_provider || "").toLowerCase();
  const apiToken = String(settings.mail_api_key || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const listIds = String(settings.mailketing_list_id || "")
    .split(/[,\s]+/)
    .map(id => id.trim())
    .filter(Boolean);
  if (provider !== "mailketing" || !apiToken || !cleanEmail || listIds.length === 0) return false;

  const nameParts = splitMailketingName(nama, cleanEmail);
  const mobile = normalizePhone(whatsapp || "");
  let success = false;

  for (const listId of listIds) {
    const params = new URLSearchParams({
      api_token: apiToken,
      list_id: listId,
      email: cleanEmail,
      first_name: nameParts.firstName,
      last_name: nameParts.lastName
    });
    if (mobile) {
      params.set("mobile", mobile);
      params.set("phone", mobile);
    }
    try {
      const res = await fetch("https://api.mailketing.co.id/api/v1/addsubtolist", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
      });
      await readGatewayResponse(res, "Mailketing Autoresponder");
      success = true;
    } catch(e) {
      console.log("Mailketing Autoresponder Error:", e.message);
    }
  }
  return success;
}

function pickSetting(settings, keys) {
  for (const key of keys) {
    const value = String(settings[key] || "").trim();
    if (value) return value;
  }
  return "";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripHtmlText(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function limitSeoText(value, maxLength = 160) {
  const clean = stripHtmlText(value);
  if (clean.length <= maxLength) return clean;
  return clean.substring(0, maxLength).replace(/\s+\S*$/, "").trim();
}

function normalizeAbsoluteUrl(value, baseUrl = "") {
  const clean = String(value || "").trim();
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean)) return clean;
  if (clean.startsWith("//")) return "https:" + clean;
  if (clean.startsWith("/") && baseUrl) return String(baseUrl).replace(/\/$/, "") + clean;
  return clean;
}

function getFirstImageFromHtml(value) {
  const match = String(value || "").match(/<img[^>]+src=["']([^"']+)["']/i);
  return match && match[1] ? match[1].trim() : "";
}

function buildCmsSeoMeta(page = {}, settings = {}, requestUrl = "", content = "") {
  const currentUrl = new URL(requestUrl);
  const siteName = String(settings.site_name || APP_NAME).trim();
  const baseUrl = String(settings.site_url || currentUrl.origin).replace(/\/$/, "");
  const rawTitle = String(page.seo_title || page.meta_title || page.title || "Halaman CMS").trim();
  const title = siteName && !rawTitle.toLowerCase().includes(siteName.toLowerCase()) ? `${rawTitle} - ${siteName}` : rawTitle;
  const description = limitSeoText(page.seo_description || page.meta_description || page.excerpt || content || settings.site_tagline || siteName, 160);
  const keywords = limitSeoText(page.seo_keywords || page.keywords || "", 220);
  const canonicalUrl = normalizeAbsoluteUrl(page.canonical_url || currentUrl.pathname, baseUrl) || currentUrl.toString();
  const imageUrl = normalizeAbsoluteUrl(page.seo_image || page.og_image || getFirstImageFromHtml(content) || settings.site_logo || settings.site_favicon, baseUrl);
  const pageType = String(page.page_type || "").trim().toLowerCase() === "blog" ? "blog" : "page";
  const author = String(page.author || settings.site_name || APP_NAME).trim();
  const publishedAt = String(page.published_at || page.tanggal_buat || "").trim();
  const updatedAt = String(page.updated_at || page.published_at || page.tanggal_buat || "").trim();
  let structuredData = String(page.structured_data || "").trim();
  if (!structuredData && pageType === "blog") {
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: rawTitle,
      description,
      image: imageUrl ? [imageUrl] : undefined,
      datePublished: publishedAt || undefined,
      dateModified: updatedAt || publishedAt || undefined,
      author: { "@type": "Person", name: author },
      publisher: { "@type": "Organization", name: siteName },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl }
    };
    Object.keys(articleSchema).forEach(key => articleSchema[key] === undefined && delete articleSchema[key]);
    structuredData = JSON.stringify(articleSchema);
  }

  return {
    title,
    description,
    keywords,
    canonicalUrl,
    imageUrl,
    siteName,
    pageType,
    author,
    publishedAt,
    updatedAt,
    structuredData
  };
}

function renderCmsSeoTags(seo = {}) {
  const isArticle = seo.pageType === "blog";
  const tags = [
    `<title>${escapeHtml(seo.title || "Halaman CMS")}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description || "")}">`,
    `<link rel="canonical" href="${escapeHtml(seo.canonicalUrl || "")}">`,
    `<meta property="og:type" content="${isArticle ? "article" : "website"}">`,
    `<meta property="og:title" content="${escapeHtml(seo.title || "")}">`,
    `<meta property="og:description" content="${escapeHtml(seo.description || "")}">`,
    `<meta property="og:url" content="${escapeHtml(seo.canonicalUrl || "")}">`,
    `<meta property="og:site_name" content="${escapeHtml(seo.siteName || APP_NAME)}">`,
    `<meta name="twitter:card" content="${seo.imageUrl ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${escapeHtml(seo.title || "")}">`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description || "")}">`
  ];
  if (seo.keywords) tags.splice(2, 0, `<meta name="keywords" content="${escapeHtml(seo.keywords)}">`);
  if (seo.imageUrl) {
    tags.push(`<meta property="og:image" content="${escapeHtml(seo.imageUrl)}">`);
    tags.push(`<meta name="twitter:image" content="${escapeHtml(seo.imageUrl)}">`);
  }
  if (isArticle) {
    if (seo.publishedAt) tags.push(`<meta property="article:published_time" content="${escapeHtml(seo.publishedAt)}">`);
    if (seo.updatedAt) tags.push(`<meta property="article:modified_time" content="${escapeHtml(seo.updatedAt)}">`);
    if (seo.author) tags.push(`<meta property="article:author" content="${escapeHtml(seo.author)}">`);
  }
  if (seo.structuredData) {
    tags.push(`<script type="application/ld+json">${String(seo.structuredData).replace(/</g, "\\u003c")}</script>`);
  }
  return tags.join("\n    ");
}

function renderBlogListHtml(posts = [], settings = {}, requestUrl = "") {
  const url = new URL(requestUrl);
  const siteName = String(settings.site_name || APP_NAME).trim();
  const title = `Blog - ${siteName}`;
  const description = limitSeoText(settings.site_tagline || `Artikel terbaru dari ${siteName}`, 160);
  const canonicalUrl = normalizeAbsoluteUrl("/blog", String(settings.site_url || url.origin).replace(/\/$/, ""));
  const seoTags = renderCmsSeoTags({
    title,
    description,
    canonicalUrl,
    siteName,
    pageType: "page",
    structuredData: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Blog",
      name: title,
      url: canonicalUrl,
      description
    })
  });
  const cards = posts.map(post => {
    const slug = String(post.slug || "").replace(/^\/+/, "");
    const image = normalizeAbsoluteUrl(post.seo_image || getFirstImageFromHtml(post.content || ""), String(settings.site_url || url.origin).replace(/\/$/, ""));
    const excerpt = limitSeoText(post.excerpt || post.seo_description || post.content || "", 150);
    const date = String(post.published_at || post.tanggal_buat || "").trim();
    return `<article class="blog-card">
      ${image ? `<a href="/blog/${escapeHtml(slug)}" class="blog-image"><img src="${escapeHtml(image)}" alt="${escapeHtml(post.title || "")}"></a>` : ""}
      <div class="blog-card-body">
        <div class="blog-meta">${escapeHtml(date || "Artikel")}</div>
        <h2><a href="/blog/${escapeHtml(slug)}">${escapeHtml(post.title || "Artikel")}</a></h2>
        <p>${escapeHtml(excerpt)}</p>
        <a class="blog-read" href="/blog/${escapeHtml(slug)}">Baca Artikel</a>
      </div>
    </article>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${seoTags}
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body{font-family:'Plus Jakarta Sans',sans-serif;margin:0;background:#f8fafc;color:#0f172a}
    .blog-wrap{width:min(1120px,calc(100% - 32px));margin:0 auto;padding:56px 0 72px}
    .blog-head{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;margin-bottom:28px;border-bottom:1px solid #e2e8f0;padding-bottom:24px}
    .blog-head h1{font-size:clamp(2rem,4vw,3.5rem);line-height:1.05;margin:0;font-weight:900}
    .blog-head p{max-width:520px;color:#64748b;line-height:1.7;margin:0}
    .blog-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
    .blog-card{background:white;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;display:flex;flex-direction:column;min-height:100%;box-shadow:0 12px 30px rgba(15,23,42,.06)}
    .blog-image{display:block;aspect-ratio:16/9;background:#e2e8f0;overflow:hidden}.blog-image img{width:100%;height:100%;object-fit:cover;display:block}
    .blog-card-body{padding:20px}.blog-meta{font-size:.78rem;text-transform:uppercase;letter-spacing:.04em;color:#2563eb;font-weight:900;margin-bottom:10px}
    .blog-card h2{font-size:1.2rem;line-height:1.3;margin:0 0 10px;font-weight:900}.blog-card h2 a{color:#0f172a;text-decoration:none}
    .blog-card p{color:#64748b;line-height:1.65;margin:0 0 16px}.blog-read{color:#f97316;font-weight:900;text-decoration:none}
    .empty{background:white;border:1px dashed #cbd5e1;border-radius:8px;padding:32px;text-align:center;color:#64748b;font-weight:700}
    @media(max-width:720px){.blog-head{display:block}.blog-head p{margin-top:12px}.blog-wrap{padding-top:36px}}
  </style>
</head>
<body>
  <main class="blog-wrap">
    <header class="blog-head"><div><h1>Blog</h1></div><p>${escapeHtml(description)}</p></header>
    <section class="blog-grid">${cards || `<div class="empty">Belum ada artikel yang dipublish.</div>`}</section>
  </main>
</body>
</html>`;
}

function renderBlogArticleHtml(page = {}, seo = {}, content = "", settings = {}, requestUrl = "") {
  const url = new URL(requestUrl);
  const baseUrl = String(settings.site_url || url.origin).replace(/\/$/, "");
  const coverImage = normalizeAbsoluteUrl(page.seo_image || getFirstImageFromHtml(content), baseUrl);
  const dateText = String(seo.publishedAt || page.published_at || page.tanggal_buat || "").trim();
  const authorText = String(seo.author || page.author || settings.site_name || APP_NAME).trim();
  const excerpt = String(page.excerpt || seo.description || "").trim();
  const title = String(page.title || seo.title || "Artikel").trim();

  return `<article class="blog-article-shell">
    <header class="blog-article-header">
      <a class="blog-back-link" href="/blog">&larr; Kembali ke Blog</a>
      <div class="blog-article-meta">
        ${dateText ? `<span>${escapeHtml(dateText)}</span>` : ""}
        ${authorText ? `<span>${escapeHtml(authorText)}</span>` : ""}
      </div>
      <h1>${escapeHtml(title)}</h1>
      ${excerpt ? `<p class="blog-article-excerpt">${escapeHtml(excerpt)}</p>` : ""}
    </header>
    ${coverImage ? `<figure class="blog-article-cover"><img src="${escapeHtml(coverImage)}" alt="${escapeHtml(title)}"></figure>` : ""}
    <div class="blog-prose">${content}</div>
  </article>`;
}

function normalizeGoogleTrackingId(value) {
  const id = String(value || "").trim().toUpperCase();
  return /^(G|GT|GTM|UA|AW)-[A-Z0-9-]+$/.test(id) ? id : "";
}

function normalizeMetaPixelId(value) {
  const id = String(value || "").trim();
  return /^\d{8,20}$/.test(id) ? id : "";
}

function normalizeTikTokPixelId(value) {
  const id = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9]{8,40}$/.test(id) ? id : "";
}

function resolveTrackingIds(record = {}, settings = {}) {
  return {
    gaId: normalizeGoogleTrackingId(record.ga_id) || normalizeGoogleTrackingId(settings.ga_id),
    metaPixelId: normalizeMetaPixelId(record.meta_pixel_id) || normalizeMetaPixelId(settings.meta_pixel_id),
    tiktokPixelId: normalizeTikTokPixelId(record.tiktok_pixel_id) || normalizeTikTokPixelId(settings.tiktok_pixel_id)
  };
}

function renderTrackingTags(record = {}, settings = {}) {
  const tracking = resolveTrackingIds(record, settings);
  const tags = [];
  if (tracking.gaId) {
    const gaId = JSON.stringify(tracking.gaId).replace(/</g, "\\u003c");
    tags.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tracking.gaId)}"></script>`);
    tags.push(`<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config",${gaId});window.gaInjected=true;window.activeGaId=${gaId};</script>`);
  }
  if (tracking.metaPixelId) {
    const pixelId = JSON.stringify(tracking.metaPixelId).replace(/</g, "\\u003c");
    tags.push(`<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");fbq("init",${pixelId},{});fbq("track","PageView");window.pixelInjected=true;window.activeMetaPixelId=${pixelId};</script>`);
  }
  if (tracking.tiktokPixelId) {
    const pixelId = JSON.stringify(tracking.tiktokPixelId).replace(/</g, "\\u003c");
    tags.push(`<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){var e=ttq._i[t]||[];for(var n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var s=d.createElement("script");s.type="text/javascript";s.async=!0;s.src=r+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(s,a)};ttq.load(${pixelId});ttq.page();window.tiktokPixelInjected=true;window.activeTikTokPixelId=${pixelId};}(window,document,"ttq");</script>`);
  }
  return tags.join("\n    ");
}

function normalizeOneSenderApiUrl(value) {
  let endpoint = String(value || "").trim();
  if (!endpoint) endpoint = "https://wa4318.cloudwa.my.id/api/v1/messages";
  endpoint = endpoint.replace(/\/+$/, "");
  if (/\/api\/v1\/messages$/i.test(endpoint)) return endpoint;
  if (/\/api\/v1$/i.test(endpoint)) return endpoint + "/messages";
  if (/\/messages$/i.test(endpoint)) return endpoint;
  return endpoint + "/api/v1/messages";
}

function renderTemplate(template, data = {}) {
  return String(template || "").replace(/\{\{?\s*([a-zA-Z0-9_]+)\s*\}?\}/g, (match, key) => {
    return data[key] !== undefined && data[key] !== null ? String(data[key]) : "";
  });
}

function textToEmailHtml(value) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

async function sha256Hex(value) {
  const cleanValue = String(value || "").trim().toLowerCase();
  if (!cleanValue) return "";
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cleanValue));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha512HexRaw(value) {
  const hashBuffer = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(String(value || "")));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function normalizePhone(value) {
  let phone = String(value || "").replace(/\D/g, "");
  if (phone.startsWith("0")) phone = "62" + phone.substring(1);
  else if (phone.startsWith("8")) phone = "62" + phone;
  return phone;
}

async function findOtpMember(env, email, phone) {
  // Match legacy formatting without changing the saved member data.
  let cleaned = "COALESCE(whatsapp, '')";
  for (const separator of ["'+'", "'-'", "' '", "'.'", "'('", "')'", "char(9)", "char(10)", "char(13)", "char(160)"]) {
    cleaned = `REPLACE(${cleaned}, ${separator}, '')`;
  }
  const local = phone.startsWith('62') ? '0' + phone.slice(2) : phone;
  const bare = phone.startsWith('628') ? phone.slice(2) : phone;
  const result = email
    ? await env.DB.prepare('SELECT * FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 2').bind(email).all()
    : phone ? await env.DB.prepare(`SELECT * FROM users WHERE ${cleaned} IN (?, ?, ?) LIMIT 2`).bind(phone, local, bare).all() : { results: [] };
  const rows = result.results || [];
  return { user: rows.length === 1 ? rows[0] : null, ambiguous: rows.length > 1 };
}

function readImportField(row = {}, names = []) {
  const entries = Object.entries(row || {});
  for (const name of names) {
    const target = String(name || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
    const match = entries.find(([key]) => String(key || "").trim().toLowerCase().replace(/[\s_-]+/g, "") === target);
    if (match && match[1] !== undefined && match[1] !== null) return String(match[1]).trim();
  }
  return "";
}

function normalizeImportEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function normalizeImportStatus(value = "", fallback = "Pending") {
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();
  if (["lunas", "paid", "success", "settlement", "berhasil"].includes(lower)) return "Lunas";
  if (["cancel", "cancelled", "canceled", "batal", "expired"].includes(lower)) return "Cancelled";
  if (["failed", "gagal"].includes(lower)) return "Failed";
  if (!raw) return fallback;
  return raw;
}

function normalizeImportDate(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return new Date().toISOString();
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  return raw;
}

function getCookieValue(cookieHeader, name) {
  const cookies = String(cookieHeader || "").split(";");
  for (const cookie of cookies) {
    const parts = cookie.trim().split("=");
    if (parts.shift() === name) return decodeURIComponent(parts.join("="));
  }
  return "";
}

function resolveMetaAccessToken(settings = {}, env = {}) {
  return pickSetting(env, ["META_ACCESS_TOKEN", "FACEBOOK_ACCESS_TOKEN", "CAPI_ACCESS_TOKEN"]) ||
    pickSetting(settings, ["meta_access_token", "facebook_access_token", "fb_access_token", "conversion_api_token", "capi_access_token"]);
}

function resolveMetaGraphApiVersion(settings = {}, env = {}) {
  const raw = pickSetting(env, ["META_GRAPH_API_VERSION"]) || pickSetting(settings, ["meta_graph_api_version"]);
  return /^v\d+\.\d+$/.test(raw) ? raw : "v20.0";
}

function getMetaEventTime(order = {}) {
  const now = Date.now();
  const parsed = Date.parse(String(order.tanggal_order || order.created_at || ""));
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (Number.isFinite(parsed) && parsed <= now + (5 * 60 * 1000) && parsed >= now - sevenDays) {
    return Math.floor(parsed / 1000);
  }
  return Math.floor(now / 1000);
}

async function recordMetaPurchaseAttempt(env, invoice, values = {}) {
  if (!invoice) return;
  try {
    await env.DB.prepare(`UPDATE orders SET
      meta_purchase_last_error = ?,
      meta_purchase_events_received = ?,
      meta_purchase_fbtrace_id = ?,
      meta_purchase_last_attempt = ?
      WHERE invoice = ?`)
      .bind(
        String(values.error || ""),
        Number(values.eventsReceived || 0),
        String(values.fbtraceId || ""),
        new Date().toISOString(),
        invoice
      ).run();
  } catch(e) {}
}

async function sendMetaPurchase(ord, settings, env, options = {}) {
  await ensureD1Schema(env);
  let productTracking = {};
  if (ord && ord.id_produk) {
    try {
      productTracking = await env.DB.prepare("SELECT meta_pixel_id FROM access_rules WHERE UPPER(id_produk) = ? LIMIT 1").bind(String(ord.id_produk).toUpperCase()).first() || {};
    } catch(e) {}
  }
  const pixelId = normalizeMetaPixelId(productTracking.meta_pixel_id) || normalizeMetaPixelId(pickSetting(settings, ["meta_pixel_id", "facebook_pixel_id", "fb_pixel_id", "pixel_id"]));
  const accessToken = resolveMetaAccessToken(settings, env);
  if (!ord || !ord.invoice) return { sent: false, reason: "Data order Meta Purchase tidak lengkap" };
  if (!pixelId || !accessToken) {
    const reason = !pixelId ? "Meta Pixel ID belum diatur" : "Meta CAPI Access Token belum diatur";
    await recordMetaPurchaseAttempt(env, ord.invoice, { error: reason });
    return { sent: false, reason };
  }

  const testMode = options.testMode === true;
  const freshOrder = await env.DB.prepare("SELECT meta_purchase_prod_sent, meta_purchase_test_sent FROM orders WHERE invoice = ?").bind(ord.invoice).first();
  if (!options.force && freshOrder) {
    if (!testMode && freshOrder.meta_purchase_prod_sent) return { sent: false, reason: "Purchase production sudah pernah dikirim" };
    if (testMode && freshOrder.meta_purchase_test_sent) return { sent: false, reason: "Purchase test sudah pernah dikirim" };
  }

  const amount = Number(ord.harga_total) || 0;
  const eventId = "purchase_" + String(ord.invoice);
  const siteUrl = String(settings.site_url || "").replace(/\/$/, "");
  const userData = {};
  const emailHash = await sha256Hex(ord.email);
  const phoneHash = await sha256Hex(normalizePhone(ord.whatsapp || ord.wa || ord.no_wa));
  const nameParts = String(ord.nama || "").trim().split(/\s+/).filter(Boolean);

  if (emailHash) userData.em = [emailHash];
  if (phoneHash) userData.ph = [phoneHash];
  if (nameParts[0]) userData.fn = [await sha256Hex(nameParts[0])];
  if (nameParts.length > 1) userData.ln = [await sha256Hex(nameParts.slice(1).join(" "))];
  if (ord.meta_fbp) userData.fbp = String(ord.meta_fbp);
  if (ord.meta_fbc) userData.fbc = String(ord.meta_fbc);
  if (ord.meta_client_ip) userData.client_ip_address = String(ord.meta_client_ip);
  if (ord.meta_user_agent) userData.client_user_agent = String(ord.meta_user_agent);

  const payload = {
    data: [{
      event_name: "Purchase",
      event_time: getMetaEventTime(ord),
      event_id: eventId,
      action_source: "website",
      event_source_url: siteUrl ? siteUrl + "/checkout?id=" + encodeURIComponent(String(ord.id_produk || "")) : undefined,
      user_data: userData,
      custom_data: {
        currency: String(settings.meta_currency || settings.currency || "IDR").toUpperCase(),
        value: amount,
        order_id: String(ord.invoice),
        content_name: String(ord.nama_produk || "Produk Digital"),
        content_ids: [String(ord.id_produk || ord.invoice)],
        content_type: "product"
      }
    }]
  };

  const testEventCode = testMode ? pickSetting(settings, ["meta_test_event_code", "fb_test_event_code"]) : "";
  if (testMode && !testEventCode) {
    const reason = "Meta Test Event Code belum diatur";
    await recordMetaPurchaseAttempt(env, ord.invoice, { error: reason });
    return { sent: false, reason };
  }
  if (testEventCode) payload.test_event_code = testEventCode;

  const apiVersion = resolveMetaGraphApiVersion(settings, env);
  const res = await fetch(`https://graph.facebook.com/${apiVersion}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  const eventsReceived = Number(data.events_received || 0);
  const fbtraceId = String(data.fbtrace_id || (data.error && data.error.fbtrace_id) || "");
  if (!res.ok || data.error || eventsReceived < 1) {
    const errorMessage = data.error ? String(data.error.error_user_msg || data.error.message || "Meta CAPI menolak event") :
      (eventsReceived < 1 ? "Meta CAPI tidak menerima event Purchase" : "Meta CAPI HTTP " + res.status);
    await recordMetaPurchaseAttempt(env, ord.invoice, { error: errorMessage, eventsReceived, fbtraceId });
    throw new Error(errorMessage);
  }

  const sentValue = (testMode ? "test:" : "prod:") + eventId;
  if (testMode) {
    await env.DB.prepare("UPDATE orders SET meta_purchase_sent = ?, meta_purchase_test_sent = ?, meta_purchase_last_error = '', meta_purchase_events_received = ?, meta_purchase_fbtrace_id = ?, meta_purchase_last_attempt = ? WHERE invoice = ?").bind(sentValue, sentValue, eventsReceived, fbtraceId, new Date().toISOString(), ord.invoice).run();
  } else {
    await env.DB.prepare("UPDATE orders SET meta_purchase_sent = ?, meta_purchase_prod_sent = ?, meta_purchase_last_error = '', meta_purchase_events_received = ?, meta_purchase_fbtrace_id = ?, meta_purchase_last_attempt = ? WHERE invoice = ?").bind(sentValue, sentValue, eventsReceived, fbtraceId, new Date().toISOString(), ord.invoice).run();
  }
  return { sent: true, event_id: eventId, mode: testMode ? "test" : "production", events_received: eventsReceived, fbtrace_id: fbtraceId };
}

async function syncRecentMetaPurchases(env, settings, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit || 25), 100));
  if (!resolveMetaAccessToken(settings, env)) {
    return { sent: 0, failed: 0, skipped: 0, reason: "Meta CAPI Access Token belum diatur" };
  }

  const rows = await safeAll(env, `SELECT * FROM orders
    WHERE status IN ('Lunas', 'Success')
      AND COALESCE(meta_purchase_prod_sent, '') = ''
    ORDER BY rowid DESC LIMIT 100`);
  const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const eligible = rows.filter(order => {
    const orderTime = Date.parse(String(order.tanggal_order || order.created_at || ""));
    return Number.isFinite(orderTime) && orderTime >= cutoff;
  }).slice(0, limit);

  let sent = 0;
  let failed = 0;
  for (const order of eligible) {
    try {
      const result = await sendMetaPurchase(order, settings, env);
      if (result.sent) sent++;
      else if (!String(result.reason || "").includes("sudah pernah")) failed++;
    } catch(e) {
      failed++;
    }
  }
  return { sent, failed, skipped: Math.max(0, rows.length - eligible.length), checked: eligible.length };
}

async function createXendit(inv, amount, body, settings) {
  const amountInt = Math.round(Number(amount));
  const auth = btoa(settings.xendit_api_key + ":");
  
  // Tangkap nama produk untuk dimasukkan ke rincian item
  const prodName = String(body.nama_produk || "Produk Digital").substring(0, 50);
  
  const payload = { 
      external_id: inv, 
      amount: amountInt, 
      payer_email: String(body.email || "guest@email.com").trim(), 
      description: "Pesanan " + prodName, 
      customer: { 
          given_names: String(body.nama || "Customer").substring(0, 50), 
          email: String(body.email || "guest@email.com").trim(), 
          mobile_number: String(body.whatsapp || body.wa || "08000000000").trim() 
      }, 
      success_redirect_url: settings.site_url + "/member",
      
      //  FIX: WAJIB ADA UNTUK PAYLATER (AKULAKU) DI XENDIT
      items: [
          {
              name: prodName,
              quantity: 1,
              price: amountInt
          }
      ]
  };
  
  const pChannel = String(body.payment_channel || "").trim();
  if (pChannel !== "" && pChannel.toLowerCase() !== "xendit") { 
      payload.payment_methods = [pChannel]; 
  }
  
  const res = await fetch("https://api.xendit.co/v2/invoices", { 
      method: "POST", 
      headers: { "Authorization": "Basic " + auth, "Content-Type": "application/json" }, 
      body: JSON.stringify(payload) 
  });
  
  const data = await res.json(); 
  if (data.invoice_url) { return data.invoice_url; }
  throw new Error("Xendit Error: " + (data.message || JSON.stringify(data)));
}
async function createTripay(inv, amount, body, settings) {
  const amountInt = parseInt(amount) || 0;
  const url = settings.tripay_env === 'production' ? "https://tripay.co.id/api/transaction/create" : "https://tripay.co.id/api-sandbox/transaction/create";
  
  const sigStr = settings.tripay_merchant_code + inv + amountInt;
  const keyData = new TextEncoder().encode(settings.tripay_private_key);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(sigStr));
  const signature = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const returnUrlBase = String(settings.site_url || "").replace(/\/$/, "") || ".";
  const payload = { 
      method: String(body.payment_channel || ""), merchant_ref: inv, amount: amountInt, 
      customer_name: body.nama, customer_email: body.email, customer_phone: body.whatsapp,
      order_items: [{ name: body.nama_produk || "Digital", price: amountInt, quantity: 1 }],
      return_url: `${returnUrlBase}/checkout.html?status=success&invoice=${encodeURIComponent(inv)}`, signature 
  };
  if(payload.method === "") delete payload.method;
  
  const res = await fetch(url, { method: "POST", headers: { "Authorization": "Bearer " + settings.tripay_api_key, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json(); 
  
  if(data.success) {
      const method = String(payload.method || "").toUpperCase();
      const ewalletMethods = ["OVO", "DANA", "SHOPEEPAY", "LINKAJA"];
      const checkoutUrl = data.data.checkout_url || data.data.payment_url || data.data.pay_url || "";
      return {
        direct_payment: true,
        pay_code: data.data.pay_code,
        qr_url: data.data.qr_url,
        amount: data.data.amount,
        payment_name: data.data.payment_name,
        checkout_url: checkoutUrl,
        redirect_to_tripay: ewalletMethods.includes(method) && checkoutUrl !== ""
      };
  }
  throw new Error("Tripay Error: " + (data.message || JSON.stringify(data)));
}

async function createDuitku(inv, amount, body, settings) {
  const isProd = String(settings.duitku_env).toLowerCase() === 'production';
  const url = isProd ? "https://passport.duitku.com/webapi/api/merchant/v2/inquiry" : "https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry";
  
  const mCode = String(settings.duitku_merchant_code || "").trim();
  const apiKey = String(settings.duitku_api_key || "").trim();
  const pAmount = Math.round(Number(amount));
  
  const signatureStr = mCode + inv + pAmount + apiKey;
  const msgUint8 = new TextEncoder().encode(signatureStr);
  const hashBuffer = await crypto.subtle.digest('MD5', msgUint8);
  const signature = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  let pMethod = String(body.payment_channel || body.metode_pembayaran || "").trim();
  if (pMethod.toLowerCase() === 'duitku' || pMethod === 'vc' || pMethod === 'none') pMethod = "";
  
  const prodName = String(body.nama_produk || body.title || "Pesanan Digital").substring(0, 50);
  const baseUrl = String(settings.site_url || "https://domain-website.com").replace(/\/$/, "");

  const payload = { 
      merchantCode: mCode, paymentAmount: pAmount, paymentMethod: pMethod, merchantOrderId: inv, 
      productDetails: prodName, email: String(body.email || "guest@email.com").trim(), 
      phoneNumber: String(body.whatsapp || body.wa || "08000000000").trim().substring(0, 15), 
      customerVaName: String(body.nama || "Customer").substring(0, 50), 
      returnUrl: baseUrl + "/member", callbackUrl: baseUrl + "/callback", signature: signature, 
      itemDetails: [{ name: prodName, price: pAmount, quantity: 1 }] 
  };

  const res = await fetch(url, { method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json(); 
  if (data.paymentUrl) { return data.paymentUrl; }
  throw new Error("Duitku Error: " + (data.statusMessage || JSON.stringify(data)));
}

async function createMidtrans(inv, amount, body, settings) {
  const serverKey = String(settings.midtrans_server_key || "").trim();
  if (!serverKey) throw new Error("Midtrans Server Key belum diatur.");

  const amountInt = Math.round(Number(amount) || 0);
  if (amountInt <= 0) throw new Error("Nominal Midtrans tidak valid.");

  const isProd = String(settings.midtrans_env || "").trim().toLowerCase() === "production";
  const url = isProd
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
  const baseUrl = String(settings.site_url || "https://domain-website.com").replace(/\/$/, "");
  const prodName = String(body.nama_produk || body.title || "Pesanan Digital").substring(0, 50);
  const selectedPayment = String(body.payment_channel || "").trim().toLowerCase();
  const payload = {
    transaction_details: {
      order_id: inv,
      gross_amount: amountInt
    },
    item_details: [{
      id: String(body.id_produk || body.id || "PRODUK").substring(0, 50),
      price: amountInt,
      quantity: 1,
      name: prodName,
      merchant_name: String(settings.midtrans_merchant_name || settings.site_name || "Cloudmember").substring(0, 50)
    }],
    customer_details: {
      first_name: String(body.nama || "Customer").substring(0, 50),
      email: String(body.email || "guest@email.com").trim(),
      phone: String(body.whatsapp || body.wa || "08000000000").trim().substring(0, 20)
    },
    callbacks: {
      finish: baseUrl + "/member",
      unfinish: baseUrl + "/checkout.html?id=" + encodeURIComponent(String(body.id_produk || body.id || "")),
      error: baseUrl + "/checkout.html?id=" + encodeURIComponent(String(body.id_produk || body.id || ""))
    },
    custom_field1: String(body.id_produk || body.id || "").substring(0, 255),
    custom_field2: String(body.email || "").substring(0, 255)
  };

  if (selectedPayment && selectedPayment !== "midtrans" && selectedPayment !== "all") {
    payload.enabled_payments = [selectedPayment];
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": "Basic " + btoa(serverKey + ":")
    },
    body: JSON.stringify(payload)
  });

  let data = {};
  try { data = await res.json(); } catch(e) {}
  if (res.ok && data.redirect_url) return data.redirect_url;
  const errorText = Array.isArray(data.error_messages) ? data.error_messages.join("; ") : (data.error_messages || data.status_message || JSON.stringify(data));
  throw new Error("Midtrans Error: " + errorText);
}

function normalizeLandingUrl(rawUrl, settings) {
  const url = String(rawUrl || "").trim();
  const baseUrl = String(settings.site_url || "").trim().replace(/\/$/, "");
  if (!url) return baseUrl || "website kami";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/") && baseUrl) return baseUrl + url;
  return url;
}

function isShippingEnabled(settings = {}) {
  const enabled = String(settings.shipping_enabled || "").trim().toLowerCase();
  return enabled === "true" || enabled === "1" || enabled === "yes" || enabled === "aktif";
}

function normalizeShippingProvider(settings = {}) {
  const provider = String(settings.shipping_provider || "rajaongkir").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (provider === "biteship") return "biteship";
  if (provider === "komerce" || provider === "rajaongkir") return "rajaongkir";
  return "rajaongkir";
}

function getBiteshipApiKey(settings = {}, env = {}) {
  return String((env && env.BITESHIP_API_KEY) || settings.shipping_biteship_api_key || settings.biteship_api_key || "").trim();
}

function getBiteshipBaseUrl(settings = {}) {
  return String(settings.shipping_biteship_base_url || "https://api.biteship.com").trim().replace(/\/$/, "");
}

function getBiteshipHeaders(apiKey) {
  return {
    "Authorization": "Basic " + btoa(":" + apiKey),
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
}

function getRajaOngkirApiKey(settings = {}, env = {}) {
  return String((env && env.RAJAONGKIR_API_KEY) || settings.shipping_rajaongkir_api_key || settings.rajaongkir_api_key || "").trim();
}

function getRajaOngkirBaseUrl(settings = {}) {
  return String(settings.shipping_rajaongkir_base_url || "https://rajaongkir.komerce.id/api/v1").trim().replace(/\/$/, "");
}

function getRajaOngkirHeaders(apiKey, asForm = false) {
  const headers = {
    "key": apiKey,
    "Accept": "application/json"
  };
  if (asForm) headers["Content-Type"] = "application/x-www-form-urlencoded";
  return headers;
}

function normalizeShippingCourierList(value = "") {
  return String(value || "jne,jnt,sicepat,anteraja")
    .toLowerCase()
    .split(/[,\s|]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .join(",");
}

function normalizeBiteshipArea(area = {}) {
  return {
    id: String(area.id || area.area_id || "").trim(),
    name: String(area.name || area.area_name || "").trim(),
    postal_code: String(area.postal_code || "").trim(),
    province: String(area.administrative_division_level_1_name || area.province || "").trim(),
    city: String(area.administrative_division_level_2_name || area.city || "").trim(),
    district: String(area.administrative_division_level_3_name || area.district || "").trim()
  };
}

function normalizeRajaOngkirArea(area = {}) {
  const label = String(area.label || area.name || "").trim();
  const province = String(area.province_name || area.province || "").trim();
  const city = String(area.city_name || area.city || "").trim();
  const district = String(area.district_name || area.district || "").trim();
  const subdistrict = String(area.subdistrict_name || area.subdistrict || "").trim();
  return {
    id: String(area.id || area.destination_id || area.subdistrict_id || "").trim(),
    name: label || [subdistrict, district, city, province].filter(Boolean).join(", "),
    postal_code: String(area.zip_code || area.postal_code || "").trim(),
    province,
    city,
    district: [subdistrict, district].filter(Boolean).join(", ")
  };
}

function normalizeShippingRates(rawRates = []) {
  return rawRates.map(item => {
    const costValue = item.price ?? item.shipping_fee ?? item.cost ?? item.value ?? item.cost_value ?? 0;
    const courierCode = String(item.courier_code || item.code || item.company || "").trim().toLowerCase();
    const serviceCode = String(item.courier_service_code || item.service_code || item.service || item.type || item.service_type || "").trim().toLowerCase();
    const price = Math.max(0, Math.round(Number(costValue)));
    return {
      courier_code: courierCode,
      courier_name: String(item.courier_name || item.name || item.company || courierCode || "").trim(),
      service_code: serviceCode,
      service_name: String(item.courier_service_name || item.service_name || item.service || item.description || serviceCode || "").trim(),
      service_type: String(item.service_type || "").trim(),
      description: String(item.description || "").trim(),
      duration: String(item.duration || item.shipment_duration_range || item.etd || "").trim(),
      price,
      currency: String(item.currency || "IDR").trim()
    };
  }).filter(item => item.courier_code && item.service_code && item.price >= 0);
}

function buildShippingItemFromProduct(productRow = {}, quantity = 1) {
  const qty = normalizeOrderQuantity(quantity);
  return {
    name: String(productRow.title || productRow.nama || productRow.id_produk || "Produk").trim(),
    description: String(productRow.desc || productRow.deskripsi || "").trim(),
    value: Math.max(0, Math.round(Number(productRow.harga || 0))),
    quantity: qty,
    weight: getProductWeightGrams(productRow),
    length: Math.max(0, Math.round(Number(productRow.length_cm || 0))) || undefined,
    width: Math.max(0, Math.round(Number(productRow.width_cm || 0))) || undefined,
    height: Math.max(0, Math.round(Number(productRow.height_cm || 0))) || undefined
  };
}

function buildBiteshipRatesPayload(settings = {}, productRow = {}, body = {}) {
  const quantity = normalizeOrderQuantity(body.quantity || body.qty || body.jumlah_produk || body.jumlah || 1);
  const payload = {
    couriers: normalizeShippingCourierList(settings.shipping_couriers),
    items: [buildShippingItemFromProduct(productRow, quantity)]
  };
  const originAreaId = String(settings.shipping_origin_area_id || "").trim();
  const originPostalCode = String(settings.shipping_origin_postal_code || "").trim();
  const destinationAreaId = String(body.destination_area_id || body.shipping_destination_area_id || "").trim();
  const destinationPostalCode = String(body.destination_postal_code || body.shipping_destination_postal_code || "").trim();
  if (originAreaId) payload.origin_area_id = originAreaId;
  else if (originPostalCode) payload.origin_postal_code = Number(originPostalCode);
  if (destinationAreaId) payload.destination_area_id = destinationAreaId;
  else if (destinationPostalCode) payload.destination_postal_code = Number(destinationPostalCode);
  return payload;
}

async function searchBiteshipAreas(env, settings, input = "") {
  const apiKey = getBiteshipApiKey(settings, env);
  const keyword = String(input || "").trim();
  if (!apiKey) return { ok: false, message: "API Key Biteship belum diatur di Pengaturan > Ongkir." };
  if (keyword.length < 3) return { ok: false, message: "Ketik minimal 3 huruf lokasi." };
  const url = new URL(getBiteshipBaseUrl(settings) + "/v1/maps/areas");
  url.searchParams.set("countries", "ID");
  url.searchParams.set("input", keyword);
  url.searchParams.set("type", "single");
  const res = await fetch(url.toString(), { headers: getBiteshipHeaders(apiKey) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) return { ok: false, message: data.message || "Gagal mencari area Biteship." };
  return { ok: true, areas: (data.areas || data.data || []).map(normalizeBiteshipArea).filter(area => area.id) };
}

async function calculateBiteshipShipping(env, settings, productRow, body = {}) {
  if (!isShippingEnabled(settings)) return { ok: false, message: "Cek ongkir belum diaktifkan di panel admin." };
  const apiKey = getBiteshipApiKey(settings, env);
  if (!apiKey) return { ok: false, message: "API Key Biteship belum diatur di Pengaturan > Ongkir." };
  const payload = buildBiteshipRatesPayload(settings, productRow, body);
  if (!payload.origin_area_id && !payload.origin_postal_code) return { ok: false, message: "Area asal atau kode pos asal belum diatur di panel admin." };
  if (!payload.destination_area_id && !payload.destination_postal_code) return { ok: false, message: "Pilih area tujuan pengiriman terlebih dahulu." };
  const res = await fetch(getBiteshipBaseUrl(settings) + "/v1/rates/couriers", {
    method: "POST",
    headers: getBiteshipHeaders(apiKey),
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) return { ok: false, message: data.message || "Gagal mengambil ongkir dari Biteship." };
  const rates = normalizeShippingRates(data.pricing || data.rates || data.data || []);
  return { ok: true, provider: "biteship", rates, raw_origin: data.origin || {}, raw_destination: data.destination || {} };
}

async function searchRajaOngkirAreas(env, settings, input = "") {
  const apiKey = getRajaOngkirApiKey(settings, env);
  const keyword = String(input || "").trim();
  if (!apiKey) return { ok: false, message: "API Key RajaOngkir belum diatur di Pengaturan > Ongkir." };
  if (keyword.length < 3) return { ok: false, message: "Ketik minimal 3 huruf lokasi." };
  const url = new URL(getRajaOngkirBaseUrl(settings) + "/destination/domestic-destination");
  url.searchParams.set("search", keyword);
  url.searchParams.set("limit", "10");
  url.searchParams.set("offset", "0");
  const res = await fetch(url.toString(), { headers: getRajaOngkirHeaders(apiKey) });
  const data = await res.json().catch(() => ({}));
  const meta = data.meta || {};
  if (!res.ok || String(meta.status || "").toLowerCase() === "error") {
    if (Number(meta.code || res.status) === 404) return { ok: true, areas: [] };
    return { ok: false, message: meta.message || "Gagal mencari area RajaOngkir." };
  }
  return { ok: true, areas: (data.data || data.destinations || []).map(normalizeRajaOngkirArea).filter(area => area.id) };
}

async function calculateRajaOngkirShipping(env, settings, productRow, body = {}) {
  if (!isShippingEnabled(settings)) return { ok: false, message: "Cek ongkir belum diaktifkan di panel admin." };
  const apiKey = getRajaOngkirApiKey(settings, env);
  if (!apiKey) return { ok: false, message: "API Key RajaOngkir belum diatur di Pengaturan > Ongkir." };
  const originId = String(settings.shipping_origin_area_id || settings.shipping_rajaongkir_origin_id || "").trim();
  const destinationId = String(body.destination_area_id || body.shipping_destination_area_id || "").trim();
  if (!originId) return { ok: false, message: "Origin Area ID RajaOngkir belum diatur di panel admin." };
  if (!destinationId) return { ok: false, message: "Pilih area tujuan pengiriman terlebih dahulu." };
  const courierCodes = normalizeShippingCourierList(settings.shipping_couriers).split(",").filter(Boolean);
  if (!courierCodes.length) return { ok: false, message: "Kurir aktif belum diatur di panel admin." };
  const quantity = normalizeOrderQuantity(body.quantity || body.qty || body.jumlah_produk || body.jumlah || 1);
  const weight = getProductWeightGrams(productRow) * quantity;
  const baseUrl = getRajaOngkirBaseUrl(settings);
  const priceMode = String(settings.shipping_rajaongkir_price || "lowest").trim().toLowerCase() === "highest" ? "highest" : "lowest";

  const requests = courierCodes.map(async courier => {
    const form = new URLSearchParams();
    form.set("origin", originId);
    form.set("destination", destinationId);
    form.set("weight", String(weight));
    form.set("courier", courier);
    form.set("price", priceMode);
    const res = await fetch(baseUrl + "/calculate/domestic-cost", {
      method: "POST",
      headers: getRajaOngkirHeaders(apiKey, true),
      body: form.toString()
    });
    const data = await res.json().catch(() => ({}));
    const meta = data.meta || {};
    if (!res.ok || String(meta.status || "").toLowerCase() === "error") {
      return { ok: false, courier, message: meta.message || `Ongkir ${courier.toUpperCase()} belum tersedia.` };
    }
    return { ok: true, courier, rates: normalizeShippingRates(data.data || []).map(rate => ({
      ...rate,
      courier_code: rate.courier_code || courier,
      courier_name: rate.courier_name || courier.toUpperCase()
    })) };
  });

  const settled = await Promise.allSettled(requests);
  const rates = [];
  const errors = [];
  for (const item of settled) {
    if (item.status === "fulfilled" && item.value.ok) rates.push(...item.value.rates);
    else if (item.status === "fulfilled") errors.push(item.value.message);
    else errors.push(item.reason && item.reason.message ? item.reason.message : "Gagal mengambil ongkir.");
  }
  rates.sort((a, b) => a.price - b.price);
  if (!rates.length) return { ok: false, message: errors.find(Boolean) || "Belum ada layanan ongkir RajaOngkir tersedia." };
  return { ok: true, provider: "rajaongkir", rates };
}

async function searchShippingAreas(env, settings, input = "") {
  return normalizeShippingProvider(settings) === "biteship"
    ? searchBiteshipAreas(env, settings, input)
    : searchRajaOngkirAreas(env, settings, input);
}

async function calculateShipping(env, settings, productRow, body = {}) {
  return normalizeShippingProvider(settings) === "biteship"
    ? calculateBiteshipShipping(env, settings, productRow, body)
    : calculateRajaOngkirShipping(env, settings, productRow, body);
}

async function validateOrderShipping(env, settings, productRow, body = {}) {
  if (!isPhysicalProduct(productRow)) return { required: false, fee: 0 };
  const result = await calculateShipping(env, settings, productRow, body);
  if (!result.ok) return { required: true, ok: false, message: result.message };
  const selectedCourier = String(body.shipping_courier || "").trim().toLowerCase();
  const selectedService = String(body.shipping_service || body.shipping_service_code || "").trim().toLowerCase();
  const selected = result.rates.find(rate => rate.courier_code === selectedCourier && rate.service_code === selectedService);
  if (!selected) return { required: true, ok: false, message: "Pilih layanan ongkir yang tersedia." };
  return {
    required: true,
    ok: true,
    provider: result.provider || normalizeShippingProvider(settings),
    courier: selected.courier_code,
    service: selected.service_code,
    service_name: `${selected.courier_name} ${selected.service_name}`.trim(),
    fee: selected.price,
    eta: selected.duration,
    destination_area_id: String(body.shipping_destination_area_id || body.destination_area_id || "").trim(),
    destination_area_name: String(body.shipping_destination_area_name || body.destination_area_name || "").trim(),
    destination_postal_code: String(body.shipping_destination_postal_code || body.destination_postal_code || "").trim(),
    address: String(body.shipping_address || body.alamat || "").trim(),
    note: String(body.shipping_note || "").trim()
  };
}

function getManualPaymentDetails(settings = {}, channel = "") {
  const selected = String(channel || "bank1").trim().toLowerCase();
  if (selected === "bank2") {
    return {
      type: "bank",
      method: "Transfer " + (settings.bank_name_2 || "Bank"),
      account: settings.bank_norek_2 || "-",
      owner: settings.bank_owner_2 || "-",
      qrisUrl: ""
    };
  }
  if (selected === "bank3") {
    return {
      type: "bank",
      method: "Transfer " + (settings.bank_name_3 || "Bank"),
      account: settings.bank_norek_3 || "-",
      owner: settings.bank_owner_3 || "-",
      qrisUrl: ""
    };
  }
  if (selected === "qris") {
    return {
      type: "qris",
      method: "QRIS Manual",
      account: "Scan QRIS",
      owner: settings.qris_owner_name || settings.bank_owner || "-",
      qrisUrl: settings.qris_image_url || ""
    };
  }
  return {
    type: "bank",
    method: "Transfer " + (settings.bank_name || "Bank"),
    account: settings.bank_norek || "-",
    owner: settings.bank_owner || "-",
    qrisUrl: ""
  };
}

async function getOrderLandingUrl(env, settings, ord) {
  try {
    const prodId = String(ord.id_produk || "").trim().toUpperCase();
    if (prodId) {
      const row = await env.DB.prepare("SELECT lp_url FROM access_rules WHERE UPPER(id_produk) = ?").bind(prodId).first();
      if (row && String(row.lp_url || "").trim()) return normalizeLandingUrl(row.lp_url, settings);
    }
  } catch (e) {
    console.log("Landing URL Error:", e.message);
  }
  return normalizeLandingUrl("", settings);
}

function isUsablePaymentLink(value) {
  const url = String(value || "").trim();
  return url !== "" && url !== "#" && url.toUpperCase() !== "DIRECT" && /^(https?:\/\/|\/)/i.test(url);
}

function isGatewayPaymentSnapshot(paymentMethod = "", paymentChannel = "") {
  const method = String(paymentMethod || "").trim().toLowerCase();
  const channel = String(paymentChannel || "").trim().toLowerCase();
  if (method.includes("xendit") || method.includes("tripay") || method.includes("duitku") || method.includes("midtrans")) return true;
  if (method && method !== "manual") return true;
  const manualChannels = new Set(["", "bank1", "bank2", "bank3", "qris"]);
  return !method && channel !== "" && !manualChannels.has(channel);
}

function isManualPaymentSnapshot(paymentMethod = "", paymentChannel = "") {
  const method = String(paymentMethod || "").trim().toLowerCase();
  const channel = String(paymentChannel || "").trim().toLowerCase();
  if (method === "manual") return true;
  return method === "" && (channel === "" || ["bank1", "bank2", "bank3", "qris"].includes(channel));
}

function getGatewayPaymentLabel(paymentMethod = "", paymentChannel = "") {
  const method = String(paymentMethod || "").trim().toLowerCase();
  const channel = String(paymentChannel || "").trim().toUpperCase();
  if (method === 'notivgo') return 'QRIS NotivGo';
  if (method.includes("tripay")) return channel ? `Tripay ${channel}` : "Tripay";
  if (method.includes("xendit")) return channel ? `Xendit ${channel}` : "Xendit";
  if (method.includes("duitku")) return channel ? `Duitku ${channel}` : "Duitku";
  if (method.includes("midtrans")) {
    const rawChannel = String(paymentChannel || "").trim().toLowerCase();
    const midtransLabels = {
      other_qris: "QRIS",
      gopay: "GoPay",
      shopeepay: "ShopeePay",
      bank_transfer: "Bank Transfer",
      bca_va: "BCA VA",
      bni_va: "BNI VA",
      bri_va: "BRI VA",
      bsi_va: "BSI VA",
      cimb_va: "CIMB VA",
      permata_va: "Permata VA",
      echannel: "Mandiri Bill",
      credit_card: "Kartu Kredit",
      alfamart: "Alfamart",
      indomaret: "Indomaret"
    };
    return rawChannel ? `Midtrans ${midtransLabels[rawChannel] || channel}` : "Midtrans";
  }
  return channel || "Payment Gateway";
}

function getGatewayOwner(settings = {}, paymentMethod = "") {
  const method = String(paymentMethod || "").trim().toLowerCase();
  if (method.includes("tripay")) return String(settings.tripay_merchant_name || settings.site_name || settings.mail_sender_name || "Merchant Tripay").trim();
  if (method.includes("duitku")) return String(settings.duitku_merchant_name || settings.site_name || settings.mail_sender_name || "Merchant Duitku").trim();
  if (method.includes("xendit")) return String(settings.xendit_merchant_name || settings.site_name || settings.mail_sender_name || "Merchant Xendit").trim();
  if (method.includes("midtrans")) return String(settings.midtrans_merchant_name || settings.site_name || settings.mail_sender_name || "Merchant Midtrans").trim();
  return String(settings.site_name || settings.mail_sender_name || "Merchant").trim();
}

function buildManualPaymentInstruction(details = {}, nominalFormatted = "") {
  const method = String(details.method || "Transfer Bank").trim();
  const account = String(details.account || "-").trim();
  const owner = String(details.owner || "-").trim();
  const qrisUrl = String(details.qrisUrl || "").trim();
  const isQris = String(details.type || "").toLowerCase() === "qris" || String(details.channel || "").toLowerCase() === "qris" || qrisUrl !== "";

  if (isQris) {
    return `QRIS Manual
Atas Nama: ${owner}
Nominal: ${nominalFormatted}

Silakan scan QRIS berikut:
${qrisUrl || "-"}

PENTING: Harap bayar nominal TEPAT ${nominalFormatted} lalu kirim bukti pembayaran ke admin.`;
  }

  return `${method}
Rek / VA: ${account}
Atas Nama: ${owner}
Nominal: ${nominalFormatted}

PENTING: Harap bayar nominal TEPAT ${nominalFormatted} agar otomatis diverifikasi.`;
}

function buildGatewayPaymentInstruction(details = {}, nominalFormatted = "") {
  const method = String(details.method || "Payment Gateway").trim();
  const account = String(details.account || "").trim();
  const owner = String(details.owner || "Merchant").trim();
  const qrisUrl = String(details.qrisUrl || "").trim();
  const paymentLink = String(details.paymentLink || "").trim();

  if (isUsablePaymentLink(paymentLink)) {
    return `Link pembayaran ${method}:
${paymentLink}

Nominal: ${nominalFormatted}`;
  }

  if (qrisUrl) {
    return `Pembayaran via ${method}
Merchant: ${owner}
Nominal: ${nominalFormatted}

Silakan scan QRIS berikut:
${qrisUrl}

Pembayaran akan terverifikasi otomatis oleh payment gateway.`;
  }

  if (account && account !== "-") {
    return `Pembayaran via ${method}
Kode Bayar / VA: ${account}
Merchant: ${owner}
Nominal: ${nominalFormatted}

Pembayaran akan terverifikasi otomatis oleh payment gateway.`;
  }

  return `Pembayaran via ${method}
Nominal: ${nominalFormatted}

Silakan buka kembali halaman checkout atau hubungi admin jika link pembayaran sudah kedaluwarsa.`;
}

async function ensureOrderPaymentUrl(env, settings, ord) {
  const row = ord.payment_view_token ? ord : await env.DB.prepare("UPDATE orders SET payment_view_token = COALESCE(NULLIF(payment_view_token, ''), ?) WHERE invoice = ? RETURNING payment_view_token")
    .bind(crypto.randomUUID(), ord.invoice).first();
  ord.payment_view_token = row.payment_view_token;
  const link = new URL('/checkout', settings.site_url);
  link.searchParams.set('invoice', ord.invoice);
  link.searchParams.set('token', row.payment_view_token);
  ord.payment_view_url = link.toString();
  return ord.payment_view_url;
}

async function notivgoApi(settings, path, body) {
  const response = await fetch('https://portal.notivgo.com/v1/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer ' + String(settings.notivgo_api_key || '').trim(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12000)
  });
  let data;
  try { data = await response.json(); }
  catch (_) { throw new Error('NotivGo HTTP ' + response.status + ': invalid_response'); }
  if (!response.ok) {
    const error = new Error('NotivGo HTTP ' + response.status + ': ' + String(data.error || 'request_failed') + (typeof data.message === 'string' ? ' - ' + data.message : ''));
    error.providerCode = typeof data.error === 'string' ? data.error : '';
    throw error;
  }
  return data;
}

function notivgoCheckoutError(error, invoice) {
  const hints = {
    unauthorized: 'Koneksi QRIS toko belum valid. Hubungi admin untuk memeriksa API key NotivGo.',
    credit_limit_reached: 'QRIS toko sementara tidak tersedia karena batas tagihan NotivGo. Hubungi admin toko.',
    account_inactive: 'Akun QRIS toko belum aktif. Hubungi admin toko.',
    qris_not_found: 'QRIS toko belum tersedia. Hubungi admin untuk memeriksa QRIS ID di NotivGo.',
    webhook_required: 'Konfigurasi QRIS toko belum lengkap. Admin perlu mengatur tujuan kiriman di portal NotivGo.',
    rate_limited: 'Permintaan QRIS terlalu cepat. Tunggu beberapa saat sebelum mencoba lagi.',
    velocity_limit: 'Batas pembuatan QRIS toko tercapai. Tunggu atau hubungi admin toko.',
    invalid_amount: 'Nominal pembayaran tidak diterima oleh QRIS. Hubungi admin toko.'
  };
  const code = error && error.providerCode;
  const hint = Object.prototype.hasOwnProperty.call(hints, code) ? hints[code] : 'QRIS NotivGo belum berhasil dibuat. Hubungi admin untuk memeriksa catatan error pembayaran.';
  // Never expose raw provider responses or credentials to checkout visitors.
  return hint + ' Referensi: ' + invoice + '. Anda juga dapat memilih metode pembayaran lain.';
}

function isNotivgoQrisEnabled(settings = {}) {
  return settingFlag(settings.notivgo_qris_enabled, false) && Boolean(String(settings.notivgo_api_key || '').trim());
}

function notivgoExpirySeconds(settings = {}) {
  const hours = Number(settings.notivgo_expiry_hours);
  return Math.round(Math.max(1, Math.min(720, Number.isFinite(hours) && hours > 0 ? hours : 24)) * 3600);
}

function isNotivgoQrisExpired(ord = {}) {
  return ord.payment_method === 'notivgo' && Number(ord.payment_expires_at) > 0 && Number(ord.payment_expires_at) <= Math.floor(Date.now() / 1000);
}

function normalizeNotivgoPng(value) {
  const encoded = String(value || '').replace(/^data:image\/png;base64,/i, '').replace(/\s+/g, '');
  if (!encoded || encoded.length > 512000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('Gambar QRIS dari NotivGo tidak valid.');
  const decoded = atob(encoded);
  if (!decoded.startsWith('\x89PNG\r\n\x1a\n')) throw new Error('NotivGo tidak mengembalikan gambar PNG.');
  return 'data:image/png;base64,' + encoded;
}

async function createNotivgoQris(env, settings, invoice, amount) {
  if (!isNotivgoQrisEnabled(settings)) throw new Error('QRIS NotivGo belum aktif atau API key belum diisi.');
  const qrisIdText = String(settings.notivgo_qris_id || '').trim();
  const qrisId = qrisIdText ? Number(qrisIdText) : null;
  if (qrisIdText && (!/^\d+$/.test(qrisIdText) || !Number.isSafeInteger(qrisId) || qrisId <= 0)) throw new Error('QRIS ID NotivGo harus berupa angka ID untuk API dari portal, atau dikosongkan.');
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Nominal QRIS harus rupiah bulat lebih dari nol.');
  const existing = await env.DB.prepare('SELECT * FROM orders WHERE invoice=?').bind(invoice).first();
  if (!existing || Number(existing.harga_total) !== amount || existing.status !== 'Pending') throw new Error('Invoice QRIS tidak valid.');
  if (isNotivgoQrisExpired(existing)) throw new Error('Invoice QRIS sudah kedaluwarsa.');
  if (existing.payment_method === 'notivgo' && Number(existing.notivgo_registered) && existing.payment_qr_url) {
    return { qr_url: normalizeNotivgoPng(existing.payment_qr_url), expires_at: Number(existing.payment_expires_at) };
  }
  // Stable provider reference prevents cross-store collisions when one account serves several sites.
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(`UPDATE orders SET payment_method='notivgo', payment_channel='qris',
    notivgo_order_ref=COALESCE(NULLIF(notivgo_order_ref,''),?),
    payment_expires_at=CASE WHEN COALESCE(payment_expires_at,0)>0 THEN payment_expires_at ELSE ? END
    WHERE invoice=? RETURNING notivgo_order_ref,payment_expires_at`)
    .bind('CM-' + crypto.randomUUID().replace(/-/g, ''), now + notivgoExpirySeconds(settings), invoice).first();
  if (Number(row.payment_expires_at) <= now) throw new Error('Invoice QRIS sudah kedaluwarsa.');
  const payload = {
    order_ref: row.notivgo_order_ref, amount, currency: 'IDR', format: 'png', create_order: true,
    expires_in: Number(row.payment_expires_at) - now, note: 'CloudMember ' + invoice
  };
  if (qrisId !== null) payload.qris_id = qrisId;
  const generated = await notivgoApi(settings, 'generate', payload);
  if (generated.order_ref !== row.notivgo_order_ref) throw new Error('Referensi QRIS dari NotivGo tidak sesuai invoice.');
  const qrUrl = normalizeNotivgoPng(generated.qris_png_base64);
  const remoteOrder = await notivgoApi(settings, 'orders/' + encodeURIComponent(row.notivgo_order_ref));
  if (remoteOrder.order_ref !== row.notivgo_order_ref || Number(remoteOrder.amount) !== amount || !['open', 'paid'].includes(remoteOrder.status)) throw new Error('Pesanan QRIS NotivGo belum valid untuk pembayaran.');
  const remoteExpiry = Number(remoteOrder.expires_at);
  const expiresAt = Number.isSafeInteger(remoteExpiry) && remoteExpiry > 0 ? Math.min(remoteExpiry, Number(row.payment_expires_at)) : Number(row.payment_expires_at);
  if (expiresAt <= now) throw new Error('Invoice QRIS sudah kedaluwarsa.');
  await env.DB.prepare("UPDATE orders SET notivgo_registered=1,notivgo_error='',payment_qr_url=?,payment_expires_at=? WHERE invoice=?")
    .bind(qrUrl, expiresAt, invoice).run();
  return { qr_url: qrUrl, expires_at: expiresAt };
}

async function syncNotivgoOrder(env, settings, ord) {
  const dynamicQris = ord.payment_method === 'notivgo';
  const reconcilable = ord.status === 'Pending' || (dynamicQris && ord.status === 'Expired');
  if (!String(settings.notivgo_api_key || '').trim() || !Number(ord.notivgo_registered) || !reconcilable || (!dynamicQris && !isManualPaymentSnapshot(ord.payment_method, ord.payment_channel))) return ord;
  const now = Math.floor(Date.now() / 1000);
  const claim = await env.DB.prepare("UPDATE orders SET notivgo_checked_at = ? WHERE invoice = ? AND status IN ('Pending','Expired') AND COALESCE(notivgo_checked_at, 0) < ?")
    .bind(now, ord.invoice, now - 60).run();
  if (!claim.meta.changes) return ord;
  try {
    const reference = ord.notivgo_order_ref || ord.invoice;
    const data = await notivgoApi(settings, 'orders/' + encodeURIComponent(reference));
    if (data.order_ref !== reference || Number(data.amount) !== Number(ord.harga_total)) return ord;
    if (data.status !== 'paid') {
      if (dynamicQris && ord.status === 'Pending' && (data.status === 'expired' || isNotivgoQrisExpired(ord))) {
        await env.DB.prepare("UPDATE orders SET status='Expired' WHERE invoice=? AND status='Pending'").bind(ord.invoice).run();
        ord.status = 'Expired';
      }
      return ord;
    }
    const paid = await env.DB.prepare("UPDATE orders SET status = 'Lunas' WHERE invoice = ? AND status IN ('Pending','Expired')").bind(ord.invoice).run();
    if (paid.meta.changes) {
      ord.status = 'Lunas';
      await sendPaidNotification(ord, settings, env);
    }
    return await env.DB.prepare('SELECT * FROM orders WHERE invoice = ?').bind(ord.invoice).first();
  } catch (error) {
    console.error('NotivGo sync', ord.invoice, error.message);
    return ord;
  }
}

async function registerNotivgoOrder(env, settings, invoice, amount) {
  if (!String(settings.notivgo_api_key || '').trim()) throw new Error('API key belum diisi');
  const expiresIn = notivgoExpirySeconds(settings);
  const registered = await notivgoApi(settings, 'orders', { order_ref: invoice, amount, expires_in: expiresIn, note: invoice });
  if (registered.order_ref !== invoice || Number(registered.amount) !== Number(amount)) throw new Error('Balasan registrasi tidak sesuai invoice');
  await env.DB.prepare("UPDATE orders SET notivgo_registered = 1, notivgo_error = '' WHERE invoice = ?").bind(invoice).run();
}

async function setupOrderPaymentVerification(env, settings, invoice, amount) {
  if (!settingFlag(settings.notivgo_enabled, false)) return '';
  try {
    await registerNotivgoOrder(env, settings, invoice, amount);
    return '';
  } catch (error) {
    const detail = safeNotificationError(settings, error);
    console.error('NotivGo register', invoice, detail);
    await env.DB.prepare('UPDATE orders SET notivgo_error = ? WHERE invoice = ?').bind(detail, invoice).run();
    return 'Pengecekan otomatis belum tersedia untuk invoice ini. Setelah membayar, hubungi admin untuk konfirmasi manual.';
  }
}

async function syncNotivgoPending(env, settings) {
  if (!settings.notivgo_api_key) return;
  const now = Math.floor(Date.now() / 1000);
  const rows = await safeAll(env, "SELECT * FROM orders WHERE (status = 'Pending' OR (status='Expired' AND payment_method='notivgo' AND payment_expires_at > ?)) AND notivgo_registered = 1 AND COALESCE(notivgo_checked_at, 0) < ? ORDER BY COALESCE(notivgo_checked_at, 0) LIMIT 25", [now - 7 * 86400, now - 60]);
  for (const ord of rows) await syncNotivgoOrder(env, settings, ord);
}

async function renderInvoicePaymentPage(request, env, settings) {
  const url = new URL(request.url);
  let ord = await env.DB.prepare('SELECT * FROM orders WHERE invoice = ? AND payment_view_token = ?')
    .bind(url.searchParams.get('invoice') || '', url.searchParams.get('token') || '').first();
  if (!ord || !ord.payment_view_token) return new Response('Tautan pembayaran tidak valid.', { status: 404 });
  ord = await syncNotivgoOrder(env, settings, ord);
  const amount = 'Rp ' + Number(ord.harga_total || 0).toLocaleString('id-ID');
  const payment = getOrderPaymentSnapshot(settings, ord, amount);
  const expired = ['Pending', 'Expired'].includes(ord.status) && isNotivgoQrisExpired(ord);
  const pending = ord.status === 'Pending' && !expired;
  const qr = /^(https?:\/\/|data:image\/png;base64,)/i.test(payment.qrisUrl) ? `<img alt="QRIS pembayaran" src="${escapeHtml(payment.qrisUrl)}" style="display:block;width:260px;max-width:100%;height:auto;margin:24px auto">` : '';
  const gatewayLink = (isUsablePaymentLink(ord.payment_url) ? `<p><a href="${escapeHtml(ord.payment_url)}" rel="noreferrer">Lanjutkan pembayaran</a></p>` : '') + (ord.notivgo_error ? '<p>Verifikasi otomatis belum tersedia untuk invoice ini. Setelah membayar, hubungi admin untuk konfirmasi manual.</p>' : '');
  const expiryText = Number(ord.payment_expires_at) > 0 ? `<p>Batas pembayaran: <strong>${escapeHtml(new Date(Number(ord.payment_expires_at) * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }))} WIB</strong></p>` : '';
  const qrDownload = ord.payment_method === 'notivgo' && qr ? `<p style="text-align:center"><a download="qris-${escapeHtml(ord.invoice)}.png" href="${escapeHtml(payment.qrisUrl)}">Unduh QRIS</a></p>` : '';
  const title = expired || ord.status === 'Expired' ? 'Waktu Pembayaran Habis' : (pending ? 'Selesaikan Pembayaran' : ord.status);
  return new Response(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Pembayaran ${escapeHtml(ord.invoice)}</title>
    ${pending || expired ? '<meta http-equiv="refresh" content="60">' : ''}
    <style>*{box-sizing:border-box}body{margin:0;padding:32px 16px;background:#f4f6f8;color:#17212b;font:16px/1.6 system-ui}main{max-width:680px;margin:auto;background:white;padding:32px;border:1px solid #dfe4e8;border-radius:8px}h1{font-size:24px;margin:0 0 16px}strong{overflow-wrap:anywhere}a{color:#087a61}dt{color:#65717b}dd{margin:0 0 16px}button{padding:10px 18px;border:0;border-radius:4px;background:#087a61;color:white;cursor:pointer}@media(max-width:480px){main{padding:22px}}</style></head>
    <body><main><h1>${escapeHtml(title)}</h1><p>Invoice <strong>${escapeHtml(ord.invoice)}</strong><br>${escapeHtml(ord.nama_produk)}</p><h2>${amount}</h2>
    ${pending ? `<dl><dt>Metode pembayaran</dt><dd>${escapeHtml(payment.methodName)}</dd><dt>Atas nama</dt><dd>${escapeHtml(payment.owner)}</dd>${!qr ? `<dt>Rekening / VA</dt><dd><strong>${escapeHtml(payment.account || '-')}</strong></dd>` : ''}</dl>${qr}${qrDownload}${expiryText}${gatewayLink}<p>Bayar sesuai nominal invoice. Status akan berubah setelah pembayaran terkonfirmasi.</p><button onclick="location.reload()">Cek Status Pembayaran</button>` : (expired || ord.status === 'Expired' ? '<p>Jangan membayar QRIS ini lagi. Jika sudah membayar sebelum batas waktu, tunggu konfirmasi atau hubungi admin.</p><button onclick="location.reload()">Cek Status Pembayaran</button>' : '<p>Invoice ini tidak lagi menunggu pembayaran.</p><a href="/member">Masuk Member</a>')}
    </main></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}

function getOrderPaymentSnapshot(settings = {}, ord = {}, nominalFormatted = "", landingUrl = "") {
  const storedInstruction = String(ord.payment_instruction || "").trim();
  const storedLink = String(ord.payment_url || "").trim();
  const paymentMethod = String(ord.payment_method || "").trim().toLowerCase();
  const paymentChannel = String(ord.payment_channel || "").trim().toLowerCase();
  const paymentLink = isUsablePaymentLink(storedLink) ? storedLink : "";
  const looksGateway = isGatewayPaymentSnapshot(paymentMethod, paymentChannel);
  const looksManual = isManualPaymentSnapshot(paymentMethod, paymentChannel);
  const fallbackManual = looksManual ? getManualPaymentDetails(settings, paymentChannel || "bank1") : {};
  const methodName = String(ord.payment_name || (looksGateway ? getGatewayPaymentLabel(paymentMethod, paymentChannel) : fallbackManual.method) || "Payment Gateway").trim();
  const account = String(ord.payment_code || (looksManual ? fallbackManual.account : "") || "").trim();
  const owner = String(ord.payment_owner || (looksGateway ? getGatewayOwner(settings, paymentMethod) : fallbackManual.owner) || "-").trim();
  const qrisUrl = String(ord.payment_qr_url || (looksManual ? fallbackManual.qrisUrl : "") || "").trim();

  let instruction = storedInstruction;
  if (looksGateway) {
    if (paymentLink && !isUsablePaymentLink(instruction)) {
      instruction = buildGatewayPaymentInstruction({ method: methodName, owner, paymentLink }, nominalFormatted);
    } else if (!paymentLink) {
      instruction = buildGatewayPaymentInstruction({
        method: methodName,
        account,
        owner,
        qrisUrl
      }, nominalFormatted);
    }
  } else if (!instruction) {
    if (paymentLink) {
      instruction = buildGatewayPaymentInstruction({ method: methodName, owner, paymentLink }, nominalFormatted);
    } else if (looksManual) {
      instruction = buildManualPaymentInstruction({
        type: paymentChannel === "qris" || qrisUrl ? "qris" : "bank",
        channel: paymentChannel,
        method: methodName,
        account,
        owner,
        qrisUrl
      }, nominalFormatted);
    } else {
      instruction = "Silakan cek kembali halaman checkout atau hubungi admin untuk instruksi pembayaran.";
    }
  }

  return {
    methodName,
    account,
    owner,
    qrisUrl,
    instruction: ord.payment_view_url ? `Pembayaran ${methodName}\nNominal: ${nominalFormatted}\n\nLihat rekening / QRIS dan status pembayaran:\n${ord.payment_view_url}` : instruction,
    paymentLink: ord.payment_view_url || paymentLink
  };
}

const DEFAULT_REMINDER_WA_TEMPLATES = {
  1: ` *Menunggu Pembayaran*

Halo Kak *{nama}*,

Pesanan Kakak masih tersimpan dan menunggu pembayaran.


 *Invoice:* #{invoice}
 *Produk:* {produk}
 *Total:* *{total}*


Akses member akan terbuka otomatis setelah pembayaran terkonfirmasi.

Instruksi pembayaran:
{instruksi_pembayaran}

Jika ada kendala, balas pesan ini ya Kak. Tim kami siap bantu. `,
  2: ` *Akses Kakak Sudah Siap*

Halo Kak *{nama}*,

Tinggal satu langkah lagi untuk membuka akses ke *{produk}*.


 *Invoice:* #{invoice}
 *Tagihan:* *{total}*


Yuk selesaikan pembayaran sebelum invoice direset otomatis oleh sistem.

Instruksi pembayaran:
{instruksi_pembayaran}

Ditunggu konfirmasinya ya Kak.`,
  3: `️ *Pengingat Terakhir*

Halo Kak *{nama}*,

Invoice untuk *{produk}* masih berstatus *Pending* dan akan segera kedaluwarsa.


 *Invoice:* #{invoice}
 *Tagihan:* *{total}*


Mohon selesaikan pembayaran hari ini agar pesanan Kakak tetap aktif.

Instruksi pembayaran:
{instruksi_pembayaran}

Terima kasih ya Kak. `,
  4: ` *Pesanan Dibatalkan Otomatis*

Halo Kak *{nama}*,

Mohon maaf, invoice Kakak sudah melewati batas waktu 24 jam dan telah dibatalkan otomatis.


 *Invoice:* #{invoice}
 *Produk:* {produk}
 *Tagihan:* *{total}*


Kalau Kakak masih berminat, silakan pesan ulang lewat halaman produk berikut:

{landing_url}

Terima kasih sudah berkunjung. `
};

const DEFAULT_REMINDER_EMAIL_TEMPLATES = {
  1: `Halo {nama},

Pesanan {produk} dengan invoice #{invoice} masih menunggu pembayaran sebesar {total}.

Instruksi pembayaran:
{instruksi_pembayaran}

Setelah pembayaran terkonfirmasi, akses member akan aktif otomatis.`,
  2: `Halo {nama},

Akses untuk {produk} sudah siap. Tinggal selesaikan pembayaran invoice #{invoice} sebesar {total}.

Instruksi pembayaran:
{instruksi_pembayaran}`,
  3: `Halo {nama},

Ini pengingat terakhir untuk invoice #{invoice}. Pesanan {produk} masih berstatus pending dengan tagihan {total}.

Instruksi pembayaran:
{instruksi_pembayaran}`,
  4: `Halo {nama},

Invoice #{invoice} untuk {produk} sudah melewati batas waktu dan dibatalkan otomatis.

Jika masih berminat, silakan pesan ulang melalui halaman berikut:
{landing_url}`
};

const DEFAULT_SUBSCRIPTION_WA_TEMPLATES = {
  before: `Halo Kak *{nama}*

Masa aktif langganan *{produk}* akan berakhir pada *{tanggal_berakhir}*.
Sisa waktu: *{sisa_hari} hari*.

Perpanjang akses dari link berikut:
{renew_url}`,
  expired: `Halo Kak *{nama}*

Masa aktif langganan *{produk}* sudah berakhir pada *{tanggal_berakhir}*.

Untuk membuka akses kembali, silakan perpanjang melalui link:
{renew_url}`
};

const DEFAULT_SUBSCRIPTION_EMAIL_TEMPLATES = {
  before: `Halo {nama},

Masa aktif langganan {produk} akan berakhir pada {tanggal_berakhir}.
Sisa waktu: {sisa_hari} hari.

Silakan perpanjang akses melalui:
{renew_url}`,
  expired: `Halo {nama},

Masa aktif langganan {produk} sudah berakhir pada {tanggal_berakhir}.

Silakan perpanjang akses melalui:
{renew_url}`
};

function normalizePendingReminderTemplate(template, level) {
  let normalized = String(template || "");
  const reminderLevel = Number(level) || 0;
  if (reminderLevel < 1 || reminderLevel > 3) return normalized;

  const paymentInstructionBlock = "Instruksi pembayaran:\n{instruksi_pembayaran}";
  const oldLandingBlocks = [
    /.*Lanjutkan dari halaman produk:\*?\s*\r?\n\s*\{landing_url\}/gi,
    /Selesaikan pembayaran melalui halaman berikut:\s*\r?\n\s*\{landing_url\}/gi,
    /.*Selesaikan di sini:\*?\s*\r?\n\s*\{landing_url\}/gi,
    /Silakan lanjutkan pembayaran dari halaman berikut:\s*\r?\n\s*\{landing_url\}/gi,
    /.*Cek halaman produk:\*?\s*\r?\n\s*\{landing_url\}/gi,
    /Mohon selesaikan pembayaran hari ini agar pesanan tetap aktif:\s*\r?\n\s*\{landing_url\}/gi
  ];

  for (const pattern of oldLandingBlocks) {
    normalized = normalized.replace(pattern, paymentInstructionBlock);
  }

  return normalized.replace(/\{landing_url\}/gi, "{instruksi_pembayaran}");
}

function normalizeReminderSettings(settings = {}) {
  const normalized = { ...settings };
  for (const level of [1, 2, 3]) {
    for (const channel of ["wa", "email"]) {
      const key = `notif_reminder_${channel}_${level}`;
      if (normalized[key] !== undefined && normalized[key] !== null) {
        normalized[key] = normalizePendingReminderTemplate(normalized[key], level);
      }
    }
  }
  return normalized;
}

function settingFlag(value, fallback = true) {
  if (value === undefined || value === null || String(value).trim() === "") return fallback;
  const raw = String(value).trim().toLowerCase();
  if (["false", "0", "off", "no", "nonaktif", "disabled", "disable", "mati"].includes(raw)) return false;
  if (["true", "1", "on", "yes", "aktif", "enabled", "enable", "hidup"].includes(raw)) return true;
  return fallback;
}

function settingNumber(value, fallback, min = 0, max = 720) {
  const num = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function normalizePendingReminderUnit(value, fallback = "hours") {
  const raw = String(value || fallback || "hours").trim().toLowerCase();
  if (["day", "days", "hari", "harian", "daily"].includes(raw)) return "days";
  return "hours";
}

function settingReminderDurationHours(value, unit, fallbackHours, minHours = 0, maxHours = 720) {
  const normalizedUnit = normalizePendingReminderUnit(unit);
  const fallbackValue = normalizedUnit === "days" ? fallbackHours / 24 : fallbackHours;
  const amount = settingNumber(value, fallbackValue, 0, normalizedUnit === "days" ? maxHours / 24 : maxHours);
  const hours = normalizedUnit === "days" ? amount * 24 : amount;
  return Math.min(maxHours, Math.max(minHours, hours));
}

function normalizePendingReminderChannel(value) {
  const raw = String(value || "both").trim().toLowerCase();
  if (["wa", "whatsapp"].includes(raw)) return "wa";
  if (["email", "mail"].includes(raw)) return "email";
  return "both";
}

function getPendingReminderConfig(settings = {}) {
  return {
    enabled: settingFlag(settings.pending_reminder_enabled, true),
    channel: normalizePendingReminderChannel(settings.pending_reminder_channel),
    levelEnabled: {
      1: settingFlag(settings.pending_reminder_level_1_enabled, true),
      2: settingFlag(settings.pending_reminder_level_2_enabled, true),
      3: settingFlag(settings.pending_reminder_level_3_enabled, true)
    },
    autoCancel: settingFlag(settings.pending_reminder_auto_cancel, true),
    hours: {
      1: settingReminderDurationHours(settings.pending_reminder_hours_1, settings.pending_reminder_unit_1, 2, 0, 720),
      2: settingReminderDurationHours(settings.pending_reminder_hours_2, settings.pending_reminder_unit_2, 6, 0, 720),
      3: settingReminderDurationHours(settings.pending_reminder_hours_3, settings.pending_reminder_unit_3, 12, 0, 720),
      4: settingReminderDurationHours(settings.pending_reminder_cancel_hours, settings.pending_reminder_cancel_unit, 24, 0, 720)
    }
  };
}

function getDuePendingReminderStage(diffHours, currentLevel, config) {
  if (!config || !config.enabled) return null;
  const stages = [
    { level: 1, hours: config.hours[1], enabled: config.levelEnabled[1], cancel: false },
    { level: 2, hours: config.hours[2], enabled: config.levelEnabled[2], cancel: false },
    { level: 3, hours: config.hours[3], enabled: config.levelEnabled[3], cancel: false },
    { level: 4, hours: config.hours[4], enabled: config.autoCancel, cancel: true }
  ];
  for (const stage of stages) {
    if (currentLevel < stage.level && diffHours >= stage.hours) {
      if (!stage.enabled) continue;
      return stage;
    }
  }
  return null;
}

function buildPaymentReminderVars(ord, nominalFormatted, landingUrl, level, settings = {}) {
  const nama = String(ord.nama || "Kak").trim();
  const produk = String(ord.nama_produk || "Pesanan Kakak").trim();
  const invoice = String(ord.invoice || "-").trim();
  const loginUrl = (settings.site_url || "").replace(/\/$/, "") + "/member";
  const payment = getOrderPaymentSnapshot(settings, ord, nominalFormatted, landingUrl);

  return {
    nama: nama,
    email: ord.email || "",
    whatsapp: ord.whatsapp || ord.wa || ord.no_wa || "",
    invoice: invoice,
    produk: produk,
    total: nominalFormatted,
    landing_url: landingUrl,
    link_produk: landingUrl,
    login_url: loginUrl,
    metode: payment.methodName,
    rekening: payment.account,
    atas_nama: payment.owner,
    qris_url: ord.payment_view_url || payment.qrisUrl,
    instruksi_pembayaran: payment.instruction,
    link_pembayaran: payment.paymentLink,
    level: level
  };
}

function buildPaymentReminderMessage(ord, nominalFormatted, landingUrl, level, settings = {}) {
  const templateKey = "notif_reminder_wa_" + String(level);
  const savedTemplate = settings[templateKey];
  let templateStr = savedTemplate === undefined || savedTemplate === null ? "" : String(savedTemplate);
  if (!templateStr.trim()) templateStr = DEFAULT_REMINDER_WA_TEMPLATES[level] || "";
  templateStr = normalizePendingReminderTemplate(templateStr, level);

  return renderTemplate(templateStr, buildPaymentReminderVars(ord, nominalFormatted, landingUrl, level, settings));
}

function buildPaymentReminderEmail(ord, nominalFormatted, landingUrl, level, settings = {}) {
  const templateKey = "notif_reminder_email_" + String(level);
  const savedTemplate = settings[templateKey];
  let templateStr = savedTemplate === undefined || savedTemplate === null ? "" : String(savedTemplate);
  if (!templateStr.trim()) templateStr = DEFAULT_REMINDER_EMAIL_TEMPLATES[level] || "";
  templateStr = normalizePendingReminderTemplate(templateStr, level);

  const vars = buildPaymentReminderVars(ord, nominalFormatted, landingUrl, level, settings);
  const copyHtml = textToEmailHtml(renderTemplate(templateStr, vars));
  const isCancelled = Number(level) === 4;
  const headerColor = isCancelled ? "#dc2626" : "#f59e0b";
  const title = isCancelled ? "Pesanan Dibatalkan" : "Pengingat Pembayaran";
  const subject = isCancelled ? `Pesanan Dibatalkan: #${vars.invoice}` : `Pengingat Pembayaran: #${vars.invoice}`;
  const actionUrl = isCancelled ? landingUrl : vars.link_pembayaran;
  const actionHtml = actionUrl ? `<div style="margin-top: 28px; text-align: center;"><a href="${escapeHtml(actionUrl)}" style="background: ${headerColor}; color: white; padding: 14px 26px; text-decoration: none; border-radius: 999px; font-weight: bold; display: inline-block;">${isCancelled ? "PESAN ULANG" : "LANJUTKAN PEMBAYARAN"}</a></div>` : "";
  const html = `<div style="max-width:600px;margin:auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;font-family:Arial,sans-serif;"><div style="background:${headerColor};padding:28px;text-align:center;color:white;"><h1 style="margin:0;font-size:24px;">${title}</h1></div><div style="padding:28px;color:#1e293b;line-height:1.6;"><p>${copyHtml}</p><table style="width:100%;background:#f8fafc;border-radius:8px;margin-top:18px;border-collapse:collapse;"><tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;">${escapeHtml(vars.produk)}</td><td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold;">${escapeHtml(vars.total)}</td></tr><tr><td style="padding:12px;color:#64748b;">Invoice</td><td style="padding:12px;text-align:right;font-weight:bold;">#${escapeHtml(vars.invoice)}</td></tr></table>${actionHtml}</div></div>`;
  return { subject, html };
}

async function sendPaymentReminderNotification(settings, ord, nominalFormatted, landingUrl, level) {
  const reminderConfig = getPendingReminderConfig(settings);
  const channel = reminderConfig.channel;
  let waAttempted = false;
  const message = buildPaymentReminderMessage(ord, nominalFormatted, landingUrl, level, settings);
  if ((channel === "both" || channel === "wa") && message) {
    try {
      const waResult = await sendNotificationWA(settings, ord.whatsapp, message, `pending-reminder:${ord.invoice || ""}:level-${level}`);
      waAttempted = Boolean(waResult && waResult.ok);
    } catch(e){}
  }

  let emailAttempted = false;
  const targetEmail = String(ord.email || "").trim();
  if ((channel === "both" || channel === "email") && targetEmail && String(settings.mail_sender_email || "").trim()) {
    const emailReminder = buildPaymentReminderEmail(ord, nominalFormatted, landingUrl, level, settings);
    try {
      await sendEmail(settings, targetEmail, emailReminder.subject, emailReminder.html);
      emailAttempted = true;
    } catch(e) {}
  }

  return { waAttempted, emailAttempted };
}

async function processPendingOrderReminders(env, settings = {}) {
  const config = getPendingReminderConfig(settings);
  const summary = { pending: 0, sent: 0, wa: 0, email: 0, cancelled: 0, skipped: !config.enabled };
  if (!config.enabled) return summary;

  await syncNotivgoPending(env, settings);
  const pOrders = await safeAll(env, "SELECT * FROM orders WHERE status = 'Pending' AND (reminder_level IS NULL OR reminder_level < 4)");
  summary.pending = pOrders.length;
  const nowCron = new Date();

  for (const ord of pOrders) {
    if (ord.payment_method === 'notivgo' && isNotivgoQrisExpired(ord)) {
      await env.DB.prepare("UPDATE orders SET status='Expired' WHERE invoice=? AND status='Pending'").bind(ord.invoice).run();
      continue;
    }
    let orderDate = new Date(ord.tanggal_order);
    if (isNaN(orderDate)) {
       const parts = String(ord.tanggal_order).split(/[\s/:-]+/);
       if(parts.length >= 3) {
         const yy = parts[2].length === 4 ? parts[2] : parts[0]; const dd = parts[2].length === 4 ? parts[0] : parts[2]; const mm = parts[1];
         orderDate = new Date(`${yy}-${mm}-${dd}T00:00:00Z`);
       }
    }
    if (isNaN(orderDate)) continue;

    const diffHours = (nowCron - orderDate) / (1000 * 60 * 60);
    const currentLevel = Number(ord.reminder_level) || 0;
    const stage = getDuePendingReminderStage(diffHours, currentLevel, config);
    if (!stage) continue;
    if (ord.payment_method === 'notivgo' && stage.cancel) continue;

    const hrgTotal = Number(ord.harga_total) || 0; const nominalFormatted = 'Rp ' + hrgTotal.toLocaleString('id-ID');
    const landingUrl = await getOrderLandingUrl(env, settings, ord);

    if (stage.cancel) {
      await env.DB.prepare("UPDATE orders SET status = 'Cancelled' WHERE invoice = ?").bind(ord.invoice).run();
      summary.cancelled++;
    }

    await ensureOrderPaymentUrl(env, settings, ord);
    const sent = await sendPaymentReminderNotification(settings, ord, nominalFormatted, landingUrl, stage.level);
    await env.DB.prepare("UPDATE orders SET reminder_level = ? WHERE invoice = ?").bind(stage.level, ord.invoice).run();
    summary.sent++;
    if (sent.waAttempted) summary.wa++;
    if (sent.emailAttempted) summary.email++;
  }

  return summary;
}

function buildSubscriptionReminderVars(settings = {}, ord = {}, level = 1) {
  const expiresAt = String(ord.subscription_expires_at || "").trim();
  const expiry = new Date(expiresAt);
  const now = new Date();
  const daysLeftRaw = isNaN(expiry) ? 0 : Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(0, daysLeftRaw);
  const renewUrl = buildRenewUrl(settings, ord.id_produk || "");
  return {
    nama: String(ord.nama || "Kak").trim(),
    email: ord.email || "",
    whatsapp: ord.whatsapp || ord.wa || ord.no_wa || "",
    invoice: ord.invoice || "",
    produk: ord.nama_produk || "Langganan",
    tanggal_berakhir: formatDateId(expiresAt),
    sisa_hari: daysLeft,
    renew_url: renewUrl,
    checkout_url: renewUrl,
    level: level,
    tipe_langganan: getBillingLabel(ord.billing_type)
  };
}

function buildSubscriptionReminderContent(settings = {}, ord = {}, level = 1) {
  const vars = buildSubscriptionReminderVars(settings, ord, level);
  const isExpired = Number(level) >= 3;
  const waKey = isExpired ? "notif_subscription_expired_wa" : "notif_subscription_before_wa";
  const emailKey = isExpired ? "notif_subscription_expired_email" : "notif_subscription_before_email";
  const waTemplate = String(settings[waKey] || (isExpired ? DEFAULT_SUBSCRIPTION_WA_TEMPLATES.expired : DEFAULT_SUBSCRIPTION_WA_TEMPLATES.before));
  const emailTemplate = String(settings[emailKey] || (isExpired ? DEFAULT_SUBSCRIPTION_EMAIL_TEMPLATES.expired : DEFAULT_SUBSCRIPTION_EMAIL_TEMPLATES.before));
  const subject = isExpired
    ? `Langganan Berakhir: ${vars.produk}`
    : `Pengingat Langganan: ${vars.produk}`;
  const headerColor = isExpired ? "#dc2626" : "#2563eb";
  const title = isExpired ? "Langganan Berakhir" : "Pengingat Langganan";
  const copyHtml = textToEmailHtml(renderTemplate(emailTemplate, vars));
  const actionHtml = vars.renew_url ? `<div style="margin-top:28px;text-align:center;"><a href="${escapeHtml(vars.renew_url)}" style="background:${headerColor};color:white;padding:14px 26px;text-decoration:none;border-radius:999px;font-weight:bold;display:inline-block;">PERPANJANG SEKARANG</a></div>` : "";
  const html = `<div style="max-width:600px;margin:auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;font-family:Arial,sans-serif;"><div style="background:${headerColor};padding:28px;text-align:center;color:white;"><h1 style="margin:0;font-size:24px;">${title}</h1></div><div style="padding:28px;color:#1e293b;line-height:1.6;"><p>${copyHtml}</p><table style="width:100%;background:#f8fafc;border-radius:8px;margin-top:18px;border-collapse:collapse;"><tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;">${escapeHtml(vars.produk)}</td><td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold;">${escapeHtml(vars.tanggal_berakhir)}</td></tr><tr><td style="padding:12px;color:#64748b;">Invoice</td><td style="padding:12px;text-align:right;font-weight:bold;">#${escapeHtml(vars.invoice)}</td></tr></table>${actionHtml}</div></div>`;
  return { vars, wa: renderTemplate(waTemplate, vars), subject, html };
}

async function sendSubscriptionReminderNotification(settings = {}, ord = {}, level = 1) {
  const content = buildSubscriptionReminderContent(settings, ord, level);
  let waAttempted = false;
  let emailAttempted = false;
  if (content.wa) {
    try {
      const waResult = await sendNotificationWA(settings, ord.whatsapp || ord.wa || ord.no_wa, content.wa, `subscription-reminder:${ord.invoice || ""}:level-${level}`);
      waAttempted = Boolean(waResult && waResult.ok);
    } catch(e) {}
  }
  const targetEmail = String(ord.email || "").trim();
  if (targetEmail && String(settings.mail_sender_email || "").trim()) {
    try { await sendEmail(settings, targetEmail, content.subject, content.html); emailAttempted = true; } catch(e) {}
  }
  return { waAttempted, emailAttempted };
}

async function runSubscriptionReminderCron(env, settings = {}) {
  const orders = await safeAll(env, `
    SELECT *
    FROM orders
    WHERE status IN ('Lunas', 'Success')
      AND subscription_expires_at IS NOT NULL
      AND TRIM(subscription_expires_at) <> ''
      AND (subscription_reminder_level IS NULL OR subscription_reminder_level < 3)
    ORDER BY subscription_expires_at ASC
    LIMIT 100
  `);

  const now = new Date();
  let sent = 0;
  let emailSent = 0;
  for (const ord of orders) {
    const expiry = new Date(ord.subscription_expires_at);
    if (isNaN(expiry)) continue;
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const currentLevel = Number(ord.subscription_reminder_level) || 0;
    let nextLevel = 0;
    if (daysLeft <= 0 && currentLevel < 3) nextLevel = 3;
    else if (daysLeft <= 1 && currentLevel < 2) nextLevel = 2;
    else if (daysLeft <= 7 && currentLevel < 1) nextLevel = 1;
    if (!nextLevel) continue;

    const result = await sendSubscriptionReminderNotification(settings, ord, nextLevel);
    await env.DB.prepare("UPDATE orders SET subscription_reminder_level = ? WHERE invoice = ?").bind(nextLevel, ord.invoice).run();
    sent++;
    if (result.emailAttempted) emailSent++;
  }

  return { sent, email: emailSent };
}

const DEFAULT_AFFILIATE_TEMPLATES = {
  order_wa: `Halo Kak *{nama_affiliate}*,

Ada order baru dari link affiliate Kakak.
Level: {level}
Pembeli: {pembeli}
Produk: {produk}
Invoice: #{invoice}
Total Order: {total}
Potensi Komisi: {komisi}
Status: {status}`,
  order_email: `Halo {nama_affiliate},

Ada order baru dari link affiliate Anda.

Level: {level}
Pembeli: {pembeli}
Produk: {produk}
Invoice: #{invoice}
Total Order: {total}
Potensi Komisi: {komisi}
Status: {status}`,
  paid_wa: `Halo Kak *{nama_affiliate}*,

Order affiliate sudah dibayar.
Level: {level}
Pembeli: {pembeli}
Produk: {produk}
Invoice: #{invoice}
Komisi Masuk: {komisi}`,
  paid_email: `Halo {nama_affiliate},

Order affiliate sudah dibayar.

Level: {level}
Pembeli: {pembeli}
Produk: {produk}
Invoice: #{invoice}
Komisi Masuk: {komisi}`,
  payout_wa: `Halo Kak *{nama_affiliate}*,

Komisi affiliate Kakak sudah diproses pencairannya.
Nominal Cair: {komisi}
Jumlah Order: {jumlah_order}
Rincian: {rincian_level}
Website: {site_url}`,
  payout_email: `Halo {nama_affiliate},

Komisi affiliate Anda sudah diproses pencairannya.

Nominal Cair: {komisi}
Jumlah Order: {jumlah_order}
Rincian: {rincian_level}
Website: {site_url}`
};

function formatCurrency(value) {
  return "Rp " + (Number(value) || 0).toLocaleString("id-ID");
}

function buildAffiliateEmailHtml(title, copy, vars, color = "#2563eb") {
  const copyHtml = textToEmailHtml(copy);
  return `<div style="max-width:600px;margin:auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;font-family:Arial,sans-serif;"><div style="background:${color};padding:28px;text-align:center;color:white;"><h1 style="margin:0;font-size:24px;">${escapeHtml(title)}</h1></div><div style="padding:28px;color:#1e293b;line-height:1.6;"><p>${copyHtml}</p><table style="width:100%;background:#f8fafc;border-radius:8px;margin-top:18px;border-collapse:collapse;"><tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#64748b;">Produk</td><td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold;">${escapeHtml(vars.produk || "-")}</td></tr><tr><td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#64748b;">Invoice</td><td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold;">${escapeHtml(vars.invoice ? "#" + vars.invoice : "-")}</td></tr><tr><td style="padding:12px;color:#64748b;">Komisi</td><td style="padding:12px;text-align:right;font-weight:bold;">${escapeHtml(vars.komisi || "-")}</td></tr></table></div></div>`;
}

function ensureAffiliatePayoutSiteUrl(template) {
  const cleanTemplate = String(template || "");
  if (/\{site_url\}/i.test(cleanTemplate)) return cleanTemplate;
  return cleanTemplate.trimEnd() + "\nWebsite: {site_url}";
}

async function notifyAffiliateUser(settings, affiliateUser, type, vars) {
  if (!affiliateUser) return;
  const eventMap = {
    order: { wa: "notif_affiliate_order_wa", email: "notif_affiliate_order_email", defaultWa: "order_wa", defaultEmail: "order_email", subject: `Order affiliate masuk: #${vars.invoice}`, title: "Order Affiliate Masuk", color: "#f59e0b" },
    paid: { wa: "notif_affiliate_paid_wa", email: "notif_affiliate_paid_email", defaultWa: "paid_wa", defaultEmail: "paid_email", subject: `Komisi affiliate masuk: #${vars.invoice}`, title: "Komisi Affiliate Masuk", color: "#16a34a" },
    payout: { wa: "notif_affiliate_payout_wa", email: "notif_affiliate_payout_email", defaultWa: "payout_wa", defaultEmail: "payout_email", subject: "Komisi affiliate dicairkan", title: "Komisi Affiliate Dicairkan", color: "#2563eb" }
  };
  const cfg = eventMap[type];
  if (!cfg) return;

  let waTemplate = String(settings[cfg.wa] || DEFAULT_AFFILIATE_TEMPLATES[cfg.defaultWa] || "");
  let emailTemplate = String(settings[cfg.email] || DEFAULT_AFFILIATE_TEMPLATES[cfg.defaultEmail] || "");
  if (type === "payout") {
    waTemplate = ensureAffiliatePayoutSiteUrl(waTemplate);
    emailTemplate = ensureAffiliatePayoutSiteUrl(emailTemplate);
  }
  const waText = renderTemplate(waTemplate, vars);
  const emailCopy = renderTemplate(emailTemplate, vars);

  const phone = affiliateUser.whatsapp || affiliateUser.wa || affiliateUser.no_wa || "";
  if (phone && waText.trim()) {
    try { await sendNotificationWA(settings, phone, waText, `affiliate-${type}:${vars.invoice || ""}`); } catch(e) {}
  }
  if (affiliateUser.email && emailCopy.trim()) {
    try { await sendEmail(settings, affiliateUser.email, cfg.subject, buildAffiliateEmailHtml(cfg.title, emailCopy, vars, cfg.color)); } catch(e) {}
  }
}

async function sendAffiliateOrderNotification(env, settings, ord, type) {
  const total = Number(ord.harga_total) || 0;
  const statusText = type === "paid" ? "Lunas" : (ord.status || "Pending");
  for (const credit of getOrderAffiliateCredits(ord)) {
    const amount = Number(credit.amount) || 0;
    if (amount <= 0) continue;
    const affiliateUser = await findAffiliateUser(env, credit.ref);
    if (!affiliateUser) continue;
    const vars = {
      nama_affiliate: affiliateUser.nama || "Kak",
      affiliate_email: affiliateUser.email || "",
      pembeli: ord.nama || "-",
      email_pembeli: ord.email || "",
      whatsapp_pembeli: ord.whatsapp || ord.wa || ord.no_wa || "",
      invoice: ord.invoice || "",
      produk: ord.nama_produk || "Pesanan Digital",
      total: formatCurrency(total),
      komisi: formatCurrency(amount),
      level: String(credit.level),
      status: statusText
    };
    await notifyAffiliateUser(settings, affiliateUser, type, vars);
  }
}

async function getAffiliatePayoutSummary(env, affId, usr) {
  const refs = getAffiliateUserRefs(usr || {}, affId);
  if (!refs.length) return null;
  const affiliateFields = ["affiliate", "affiliate_l1", "affiliate_l2", "affiliate_l3"];
  const clauses = [];
  const params = [];
  affiliateFields.forEach(field => {
    refs.forEach(ref => {
      clauses.push(`${field} = ?`);
      params.push(ref);
      clauses.push(`LOWER(${field}) = ?`);
      params.push(ref.toLowerCase());
    });
  });
  const orders = clauses.length ? await safeAll(env, `SELECT * FROM orders WHERE (${clauses.join(" OR ")}) AND (status = 'Lunas' OR status = 'Success') ORDER BY rowid DESC`, params) : [];
  const refSet = new Set(refs.map(ref => ref.toLowerCase()));
  const levelTotals = { 1: 0, 2: 0, 3: 0 };
  let total = 0;
  let count = 0;

  orders.forEach(ord => {
    getOrderAffiliateCredits(ord).forEach(credit => {
      const amount = Number(credit.amount) || 0;
      if (amount <= 0 || !refSet.has(cleanAffiliateRef(credit.ref).toLowerCase())) return;
      total += amount;
      levelTotals[credit.level] = (levelTotals[credit.level] || 0) + amount;
      count++;
    });
  });

  return { user: usr, refs, total, count, levelTotals };
}

function getAffiliateDisplayName(item = {}) {
  const name = String(item.name || item.nama || "").trim();
  if (name) return name;
  const email = String(item.email || "").trim();
  if (!email) return "Affiliate";
  const [prefix, domain] = email.split("@");
  if (!domain) return email;
  return `${prefix.slice(0, 3)}***@${domain}`;
}

function buildAffiliateLeaderboardItem(item = {}, rank = null, currentRefs = new Set()) {
  const aliases = item.aliases || [];
  const isCurrent = aliases.some(alias => currentRefs.has(String(alias).toLowerCase())) || currentRefs.has(String(item.email || "").toLowerCase());
  const name = getAffiliateDisplayName(item);
  return {
    rank,
    id: item.id || "",
    name,
    initial: name.trim().charAt(0).toUpperCase() || "A",
    total_komisi: Math.round(Number(item.total_komisi || 0)),
    total_sales: Number(item.total_sales || 0),
    total_omset: Math.round(Number(item.total_omset || 0)),
    komisi_l1: Math.round(Number(item.komisi_l1 || 0)),
    komisi_l2: Math.round(Number(item.komisi_l2 || 0)),
    komisi_l3: Math.round(Number(item.komisi_l3 || 0)),
    is_current: isCurrent
  };
}

async function buildAffiliateLeaderboard(env, currentUser = null, limit = 20) {
  const users = await safeAll(env, "SELECT id, id_user, email, nama, whatsapp, affiliate FROM users ORDER BY rowid DESC");
  const leaderboardMap = {};

  users.forEach(u => {
    const aliases = getAffiliateUserRefs(u);
    const uid = aliases[0] || String(u.id_user || u.id || u.email || "");
    if (!uid) return;
    leaderboardMap[uid] = {
      id: uid,
      aliases,
      name: u.nama || "",
      email: u.email || "",
      total_komisi: 0,
      total_sales: 0,
      total_omset: 0,
      komisi_l1: 0,
      komisi_l2: 0,
      komisi_l3: 0
    };
  });

  const affiliateOrders = await safeAll(env, `
    SELECT invoice, id_produk, nama_produk, harga_total, status, affiliate, affiliate_l1, affiliate_l2, affiliate_l3, komisi, komisi_l1, komisi_l2, komisi_l3
    FROM orders
    WHERE status IN ('Lunas', 'Success')
    ORDER BY rowid DESC
    LIMIT 10000
  `);

  affiliateOrders.forEach(order => {
    const orderTotal = Number(order.harga_total || 0);
    getOrderAffiliateCredits(order).forEach(credit => {
      const rawAmount = Number(credit.amount) || 0;
      const amount = Math.abs(rawAmount);
      if (amount <= 0) return;
      let bucket = findAffiliateBucket(leaderboardMap, credit.ref);
      if (!bucket) {
        const ref = cleanAffiliateRef(credit.ref);
        if (!ref) return;
        leaderboardMap[ref] = {
          id: ref,
          aliases: [ref],
          name: ref.includes("@") ? "" : ref,
          email: ref.includes("@") ? ref : "",
          total_komisi: 0,
          total_sales: 0,
          total_omset: 0,
          komisi_l1: 0,
          komisi_l2: 0,
          komisi_l3: 0
        };
        bucket = leaderboardMap[ref];
      }
      bucket.total_komisi += amount;
      bucket.total_sales += 1;
      bucket.total_omset += orderTotal;
      bucket[`komisi_l${credit.level}`] = (Number(bucket[`komisi_l${credit.level}`]) || 0) + amount;
    });
  });

  const currentRefs = new Set(getAffiliateUserRefs(currentUser || {}).map(ref => String(ref).toLowerCase()));
  const ranked = Object.values(leaderboardMap)
    .filter(item => Number(item.total_komisi || 0) > 0 || Number(item.total_sales || 0) > 0)
    .sort((a, b) => {
      const komisiDiff = Number(b.total_komisi || 0) - Number(a.total_komisi || 0);
      if (komisiDiff !== 0) return komisiDiff;
      const salesDiff = Number(b.total_sales || 0) - Number(a.total_sales || 0);
      if (salesDiff !== 0) return salesDiff;
      return getAffiliateDisplayName(a).localeCompare(getAffiliateDisplayName(b));
    });

  const top = ranked.slice(0, limit).map((item, index) => buildAffiliateLeaderboardItem(item, index + 1, currentRefs));
  const currentIndex = ranked.findIndex(item => {
    const aliases = item.aliases || [];
    return aliases.some(alias => currentRefs.has(String(alias).toLowerCase())) || currentRefs.has(String(item.email || "").toLowerCase());
  });
  let current = null;
  if (currentIndex >= 0) {
    current = buildAffiliateLeaderboardItem(ranked[currentIndex], currentIndex + 1, currentRefs);
  } else if (currentUser) {
    current = buildAffiliateLeaderboardItem({
      id: getAffiliateUserKey(currentUser),
      aliases: getAffiliateUserRefs(currentUser),
      name: currentUser.nama || "",
      email: currentUser.email || "",
      total_komisi: 0,
      total_sales: 0,
      total_omset: 0,
      komisi_l1: 0,
      komisi_l2: 0,
      komisi_l3: 0
    }, null, currentRefs);
  }

  return {
    top,
    current,
    total_affiliates: ranked.length,
    updated_at: new Date().toISOString()
  };
}

async function sendAffiliatePayoutNotification(settings, summary) {
  if (!summary || !summary.user || summary.total <= 0) return;
  const rincianLevel = `L1 ${formatCurrency(summary.levelTotals[1] || 0)} | L2 ${formatCurrency(summary.levelTotals[2] || 0)} | L3 ${formatCurrency(summary.levelTotals[3] || 0)}`;
  const siteUrl = String(settings.site_url || "").trim().replace(/\/+$/, "");
  const siteName = String(settings.site_name || APP_NAME).trim();
  const vars = {
    nama_affiliate: summary.user.nama || "Kak",
    affiliate_email: summary.user.email || "",
    invoice: "",
    produk: "Pencairan Komisi Affiliate",
    total: formatCurrency(summary.total),
    komisi: formatCurrency(summary.total),
    jumlah_order: String(summary.count || 0),
    rincian_level: rincianLevel,
    level: "-",
    status: "Komisi Cair",
    site_name: siteName,
    site_url: siteUrl,
    login_url: siteUrl ? `${siteUrl}/member` : "/member"
  };
  await notifyAffiliateUser(settings, summary.user, "payout", vars);
}

function normalizeBlastStatus(value) {
  const status = String(value || "all").trim().toLowerCase();
  if (["paid", "lunas", "success", "berhasil"].includes(status)) return "paid";
  if (["pending", "menunggu", "menunggu_pembayaran", "unpaid", "belum_bayar"].includes(status)) return "pending";
  if (["cancel", "cancelled", "canceled", "batal", "dibatalkan", "expired", "failed"].includes(status)) return "cancelled";
  return "all";
}

function getBlastStatusLabel(status) {
  if (status === "paid") return "Order Lunas";
  if (status === "pending") return "Order Pending";
  if (status === "cancelled") return "Order Cancel";
  return "Semua Order";
}

function getBlastStatusWhere(status) {
  if (status === "paid") return "WHERE LOWER(COALESCE(status, '')) IN ('lunas', 'success', 'paid', 'berhasil')";
  if (status === "pending") return "WHERE LOWER(COALESCE(status, '')) IN ('pending', 'menunggu pembayaran', 'waiting payment', 'waiting_payment', 'unpaid', 'belum bayar')";
  if (status === "cancelled") return "WHERE LOWER(COALESCE(status, '')) IN ('cancel', 'cancelled', 'canceled', 'batal', 'dibatalkan', 'expired', 'failed', 'gagal')";
  return "";
}

function getBlastProductTargets(body = {}) {
  const raw = Array.isArray(body.product_ids)
    ? body.product_ids.join(",")
    : String(body.product_ids || body.product_id || body.id_produk || body.product_filter || "");
  return splitProductTargets(raw).filter(id => id && id !== "ALL" && id !== "SEMUA");
}

async function getBlastProductLabel(env, productIds = []) {
  if (!productIds.length) return "semua produk";
  const labels = [];
  for (const id of productIds.slice(0, 5)) {
    let title = "";
    try {
      const row = await env.DB.prepare("SELECT title FROM access_rules WHERE UPPER(id_produk) = ?").bind(id).first();
      title = String(row && row.title || "").trim();
    } catch(e) {}
    labels.push(title ? `${id} - ${title}` : id);
  }
  if (productIds.length > labels.length) labels.push(`+${productIds.length - labels.length} produk`);
  return labels.join(", ");
}

function normalizeBlastChannel(value) {
  const channel = String(value || "both").trim().toLowerCase();
  if (channel === "wa" || channel === "whatsapp") return "wa";
  if (channel === "email" || channel === "mail") return "email";
  return "both";
}

function isBlastWhatsAppChannel(channel) {
  return channel === "wa" || channel === "both";
}

function isTruthyBlastValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return value === true || value === 1 || normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function hashBlastSeed(value = "") {
  let hash = 2166136261;
  const text = String(value || "blast");
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededBlastRandom(seed) {
  let state = hashBlastSeed(seed) || 123456789;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return ((state >>> 0) / 4294967296);
  };
}

function shuffleBlastTargets(targets = [], seed = "") {
  const arr = targets.slice();
  const random = seededBlastRandom(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderBlastText(message = "", vars = {}, seed = "") {
  const random = seededBlastRandom(seed);
  const varied = String(message || "").replace(/\{([^{}\n|]+(?:\|[^{}\n|]+)+)\}/g, (match, content) => {
    const choices = String(content || "").split("|").map(item => item.trim()).filter(Boolean);
    if (!choices.length) return match;
    return choices[Math.floor(random() * choices.length)] || choices[0] || "";
  });
  return renderTemplate(varied, vars);
}

function parseBlastWaRotaryDevices(settings = {}, body = {}) {
  const raw = String(body.wa_rotary || body.wa_rotary_devices || body.blast_wa_rotary || settings.blast_wa_rotary || "").trim();
  if (!raw) return [];
  return raw.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith("#")).map(line => {
    const parts = line.includes("|")
      ? line.split("|").map(part => part.trim())
      : line.split(",").map(part => part.trim());
    let provider = "";
    let apiUrl = "";
    let token = "";
    let sender = "";
    if (parts.length >= 3) {
      provider = parts[0];
      apiUrl = parts[1];
      token = parts[2];
      sender = parts.length >= 4 ? parts.slice(3).join("|").trim() : "";
    } else if (parts.length === 2) {
      provider = parts[0];
      token = parts[1];
    } else {
      provider = settings.wa_gateway || "onesender";
      token = parts[0];
    }
    provider = String(provider || settings.wa_gateway || "onesender").trim().toLowerCase();
    if (!["onesender", "fonnte", "starsender", "waplus", "mpedia", "m-pedia", "mpwa"].includes(provider)) provider = String(settings.wa_gateway || "onesender").trim().toLowerCase();
    token = cleanGatewayToken(token);
    if (!token) return null;
    return {
      wa_gateway: provider,
      wa_api_url: apiUrl || settings.wa_api_url || "",
      wa_token: token,
      wa_sender: sender || settings.wa_sender || ""
    };
  }).filter(Boolean);
}

function pickBlastWaSettings(settings = {}, devices = [], index = 0) {
  if (!devices.length) return settings;
  const device = devices[Math.abs(Number(index) || 0) % devices.length];
  return { ...settings, ...device };
}

function getBlastTargetKey(order) {
  const email = String(order.email || "").trim().toLowerCase();
  const phone = normalizePhone(order.whatsapp || "");
  if (email) return "email:" + email;
  if (phone) return "wa:" + phone;
  return "invoice:" + String(order.invoice || "").trim();
}

function mapBlastOrderTarget(order = {}) {
  return {
    invoice: String(order.invoice || "").trim(),
    name: String(order.nama || order.name || "Kak").trim() || "Kak",
    email: String(order.email || "").trim().toLowerCase(),
    whatsapp: String(order.whatsapp || order.wa || "").trim(),
    product: String(order.nama_produk || order.product || "Produk Digital").trim(),
    product_id: String(order.id_produk || "").trim(),
    total: Number(order.harga_total || 0),
    status: String(order.status || "").trim() || "Pending",
    date: String(order.tanggal_order || "").trim()
  };
}

async function getBlastTargets(env, body = {}) {
  const status = normalizeBlastStatus(body.status || body.target_status);
  const whereParts = [];
  const params = [];
  const statusWhere = getBlastStatusWhere(status).replace(/^WHERE\s+/i, "").trim();
  if (statusWhere) whereParts.push(`(${statusWhere})`);
  const productIds = getBlastProductTargets(body);
  if (productIds.length) {
    whereParts.push(`UPPER(COALESCE(id_produk, '')) IN (${productIds.map(() => "?").join(",")})`);
    params.push(...productIds);
  }
  const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
  const rows = await safeAll(env, `
    SELECT invoice, email, nama, whatsapp, id_produk, nama_produk, harga_total, status, tanggal_order
    FROM orders
    ${whereClause}
    ORDER BY rowid DESC
    LIMIT 10000
  `, params);
  const targetMap = new Map();
  const targets = [];

  for (const row of rows) {
    const target = mapBlastOrderTarget(row);
    const key = getBlastTargetKey(target);
    if (!key) continue;
    if (targetMap.has(key)) {
      const existing = targetMap.get(key);
      if (!existing.email && target.email) existing.email = target.email;
      if (!existing.whatsapp && target.whatsapp) existing.whatsapp = target.whatsapp;
      continue;
    }
    targetMap.set(key, target);
    targets.push(target);
  }

  const channel = normalizeBlastChannel(body.channel);
  const shouldRandomize = isTruthyBlastValue(body.randomize_order || body.randomize || body.acak_target);
  const campaignSeed = String(body.campaign_id || body.campaign_key || body.blast_id || `${status}:${productIds.join(",")}`).trim();
  const finalTargets = shouldRandomize ? shuffleBlastTargets(targets, campaignSeed) : targets;
  const offset = Math.max(0, Number(body.offset) || 0);
  const maxLimit = isBlastWhatsAppChannel(channel) ? 10 : 50;
  const limit = Math.min(maxLimit, Math.max(1, Number(body.limit) || (isBlastWhatsAppChannel(channel) ? 5 : 25)));
  const productLabel = await getBlastProductLabel(env, productIds);
  return {
    status,
    product_ids: productIds,
    product_label: productLabel,
    label: `${getBlastStatusLabel(status)} - ${productLabel}`,
    total: finalTargets.length,
    offset,
    limit,
    targets: finalTargets,
    batch: finalTargets.slice(offset, offset + limit)
  };
}

function buildBlastVars(target = {}, settings = {}) {
  const siteUrl = String(settings.site_url || "").replace(/\/+$/, "");
  const siteName = String(settings.site_name || settings.mail_sender_name || "CloudMember").trim();
  return {
    nama: target.name || "Kak",
    email: target.email || "",
    whatsapp: target.whatsapp || "",
    invoice: target.invoice || "",
    produk: target.product || "",
    id_produk: target.product_id || "",
    total: formatCurrency(target.total || 0),
    status: target.status || "",
    tanggal_order: target.date || "",
    site_name: siteName,
    site_url: siteUrl,
    login_url: siteUrl ? `${siteUrl}/member` : "/member",
    checkout_url: siteUrl && target.product_id ? `${siteUrl}/checkout?id=${encodeURIComponent(target.product_id)}` : ""
  };
}

function buildBlastEmailHtml(message, vars) {
  const rendered = textToEmailHtml(renderTemplate(message, vars));
  const siteName = escapeHtml(vars.site_name || "CloudMember");
  return `<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;"><div style="background:#0f172a;color:#ffffff;padding:24px 28px;"><div style="font-size:18px;font-weight:800;">${siteName}</div></div><div style="padding:28px;color:#1e293b;font-size:15px;line-height:1.7;">${rendered}</div></div>`;
}

async function handlePreviewBlastTargets(env, body) {
  const data = await getBlastTargets(env, body);
  return jsonRes({
    status: "success",
    target_status: data.status,
    product_ids: data.product_ids,
    product_label: data.product_label,
    label: data.label,
    total: data.total,
    wa_ready: data.targets.filter(t => normalizePhone(t.whatsapp)).length,
    email_ready: data.targets.filter(t => t.email && t.email.includes("@")).length,
    sample: data.targets.slice(0, 5).map(t => ({
      nama: t.name,
      email: t.email,
      whatsapp: t.whatsapp,
      produk: t.product,
      status: t.status
    }))
  });
}

async function handleSendBlastBatch(env, settings, body) {
  const channel = normalizeBlastChannel(body.channel);
  const waMessage = String(body.message || body.wa_message || "").trim();
  const emailMessage = String(body.email_message || body.message || "").trim();
  const subjectTemplate = String(body.subject || "Informasi dari {site_name}").trim() || "Informasi dari {site_name}";
  const rotaryDevices = parseBlastWaRotaryDevices(settings, body);

  if ((channel === "wa" || channel === "both") && !waMessage) {
    return jsonRes({ status: "error", message: "Isi pesan WhatsApp wajib diisi." }, 400);
  }
  if ((channel === "email" || channel === "both") && !emailMessage) {
    return jsonRes({ status: "error", message: "Isi pesan email wajib diisi." }, 400);
  }

  const data = await getBlastTargets(env, body);
  let sentWa = 0;
  let sentEmail = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < data.batch.length; i++) {
    const target = data.batch[i];
    const absoluteIndex = data.offset + i;
    const vars = buildBlastVars(target, settings);

    if (channel === "wa" || channel === "both") {
      const waSettings = pickBlastWaSettings(settings, rotaryDevices, absoluteIndex);
      const result = await sendWA(waSettings, target.whatsapp, renderBlastText(waMessage, vars, `${body.campaign_id || ""}:${absoluteIndex}:${target.invoice}`), { detailed: true });
      if (result && result.ok) sentWa++;
      else {
        failed++;
        if (errors.length < 10) errors.push(`${target.name}: WhatsApp gagal${result && result.message ? " - " + result.message : ""}`);
      }
    }

    if (channel === "email" || channel === "both") {
      const subject = renderBlastText(subjectTemplate, vars, `${body.campaign_id || ""}:subject:${absoluteIndex}:${target.invoice}`);
      const ok = await sendEmail(settings, target.email, subject, buildBlastEmailHtml(renderBlastText(emailMessage, vars, `${body.campaign_id || ""}:email:${absoluteIndex}:${target.invoice}`), vars));
      if (ok) sentEmail++;
      else {
        failed++;
        if (errors.length < 10) errors.push(`${target.name}: Email gagal`);
      }
    }
  }

  const nextOffset = data.offset + data.batch.length;
  return jsonRes({
    status: "success",
    target_status: data.status,
    product_ids: data.product_ids,
    product_label: data.product_label,
    label: data.label,
    total: data.total,
    processed: data.batch.length,
    sent_wa: sentWa,
    sent_email: sentEmail,
    failed,
    errors,
    rotary_count: rotaryDevices.length,
    next_offset: nextOffset,
    done: nextOffset >= data.total
  });
}

async function handleGetAdminData(env, settings) {
  await ensureAffiliateSchema(env);
  await ensurePageSeoSchema(env);
  await ensureLmsTargetSchema(env);
  const displaySettings = normalizeReminderSettings(settings);
  for (const key of ['notivgo_api_key', 'notivgo_webhook_secret']) {
    displaySettings[key + '_configured'] = Boolean(String(settings[key] || '').trim());
    displaySettings[key] = '';
  }
  const installationMode = getInstallationMode(env, settings);
  displaySettings.installation_mode = installationMode;
  displaySettings.__installation_mode = installationMode;
  displaySettings.app_version = APP_VERSION;
  displaySettings.app_release_date = APP_RELEASE_DATE;
  const statsRow = await env.DB.prepare("SELECT COUNT(*) AS orders_count, COALESCE(SUM(CASE WHEN status IN ('Lunas', 'Success') THEN CAST(harga_total AS REAL) ELSE 0 END), 0) AS total_rev FROM orders").first().catch(() => ({ orders_count: 0, total_rev: 0 }));
  const usersCountRow = await env.DB.prepare("SELECT COUNT(*) AS users_count FROM users").first().catch(() => ({ users_count: 0 }));
  const orders = await safeAll(env, "SELECT invoice, email, nama, whatsapp, id_produk, nama_produk, harga_total, status, tanggal_order, affiliate, komisi, domain, shipping_required, shipping_service_name, shipping_fee, shipping_destination_area_name, shipping_address, quantity, unit_price FROM orders ORDER BY rowid DESC LIMIT 500");
  const affiliateOrders = await safeAll(env, "SELECT affiliate, affiliate_l1, affiliate_l2, affiliate_l3, komisi, komisi_l1, komisi_l2, komisi_l3, status, harga_total FROM orders WHERE status IN ('Lunas', 'Success')");
  const products = await safeAll(env, "SELECT id_produk, title, \"desc\", deskripsi, url_akses, url, harga, status, lp_url, komisi, bump_status, bump_title, bump_price, bump_desc, bump_url, gambar, kategori, harga_coret, pdf_drive_id, komisi_l2, komisi_l3, ga_id, meta_pixel_id, tiktok_pixel_id, payment_methods, license_enabled, license_mode, bump_product_id, billing_type, subscription_days, product_type, weight_grams, length_cm, width_cm, height_cm, stock_qty, upgrade_to_products FROM access_rules");
  const users = await safeAll(env, "SELECT id, id_user, email, nama, whatsapp, affiliate, rekening, info_rekening, role, tanggal_daftar, status, source, last_login FROM users ORDER BY rowid DESC");
  const lms = await safeAll(env, "SELECT id_produk, product_id, product_ids, target_category, videos, deskripsi, \"desc\", cert_leader1, cert_role1, cert_leader2, cert_role2, cert_stamp FROM lms ORDER BY rowid DESC");
  const coupons = await safeAll(env, "SELECT kode_promo, tipe, nilai, status, berlaku_untuk_prod, usage_limit_total, usage_limit_per_customer, min_order_amount, expires_at FROM coupons ORDER BY rowid DESC");
  const pages = await safeAll(env, "SELECT id_page, slug, title, content, status, tanggal_buat, seo_title, seo_description, seo_keywords, seo_image, category, protect_products, ga_id, meta_pixel_id, tiktok_pixel_id, page_type, canonical_url, author, published_at, excerpt, structured_data FROM pages ORDER BY rowid DESC");
  const licenseStock = await safeAll(env, "SELECT id, product_id, license_key, status, assigned_invoice, assigned_email, assigned_at, created_at, note FROM license_stock ORDER BY id DESC LIMIT 1000");

  const affMap = {};

  users.forEach(u => {
      const aliases = getAffiliateUserRefs(u);
      const uid = aliases[0] || String(u.id_user || u.id || "");
      affMap[uid] = { id: uid, aliases, name: u.nama || '', email: u.email || '', wa: u.whatsapp || '', rekening: u.rekening || u.info_rekening || '', komisi: 0, komisi_l1: 0, komisi_l2: 0, komisi_l3: 0 };
  });

  affiliateOrders.forEach(o => {
      for (const credit of getOrderAffiliateCredits(o)) {
          if (credit.amount <= 0) continue;
          const bucket = findAffiliateBucket(affMap, credit.ref);
          if (bucket) {
              bucket.komisi += credit.amount;
              bucket[`komisi_l${credit.level}`] = (Number(bucket[`komisi_l${credit.level}`]) || 0) + credit.amount;
          }
      }
  });

  return jsonRes({
    status: 'success',
    installation_mode: installationMode,
    app_version: APP_VERSION,
    app_release_date: APP_RELEASE_DATE,
    stats: { users: Number(usersCountRow.users_count || users.length || 0), orders: Number(statsRow.orders_count || orders.length || 0), rev: Number(statsRow.total_rev || 0) },
    orders: orders.map(o => [o.invoice, o.email, o.nama, o.whatsapp, o.id_produk, o.nama_produk, o.harga_total, o.status, o.tanggal_order, o.affiliate, o.komisi, o.domain || "", o.shipping_required || "No", o.shipping_service_name || "", o.shipping_fee || 0, o.shipping_destination_area_name || "", o.shipping_address || "", o.quantity || 1, o.unit_price || 0]),
    // INJEKSI HARGA CORET DI SINI BOS (Data ke-16 / Index 15):
    products: products.map(p => [p.id_produk, p.title, p.desc || p.deskripsi, p.url_akses || p.url, p.harga, p.status, p.lp_url, p.komisi, p.bump_status, p.bump_title, p.bump_price, p.bump_desc, p.bump_url, p.gambar, p.kategori || 'Umum', p.harga_coret || "", p.pdf_drive_id || "", p.komisi_l2 || 0, p.komisi_l3 || 0, p.ga_id || "", p.meta_pixel_id || "", p.tiktok_pixel_id || "", p.payment_methods || "", p.license_enabled || "", p.license_mode || "", p.bump_product_id || "", p.billing_type || "one_time", p.subscription_days || 0, p.product_type || "digital", p.weight_grams || 0, p.length_cm || 0, p.width_cm || 0, p.height_cm || 0, p.stock_qty || 0, p.upgrade_to_products || ""]),
    lms: lms.map(l => [l.id_produk || l.product_id, l.videos, l.deskripsi || l.desc, l.cert_leader1, l.cert_role1, l.cert_leader2, l.cert_role2, l.cert_stamp, l.product_ids || l.id_produk || l.product_id || "", l.target_category || ""]),
    coupons: coupons.map(c => [c.kode_promo || c.code || "", c.tipe || "", c.nilai || 0, c.status || "Active", c.berlaku_untuk_prod || "All", c.usage_limit_total || 0, c.usage_limit_per_customer || 0, c.min_order_amount || 0, c.expires_at || ""]),
    pages: pages.map(pg => [pg.id_page || "", pg.slug || "", pg.title || "", pg.content || "", pg.status || "Active", pg.tanggal_buat || "", pg.seo_title || "", pg.seo_description || "", pg.seo_keywords || "", pg.seo_image || "", pg.category || "Umum", pg.protect_products || "", pg.ga_id || "", pg.meta_pixel_id || "", pg.tiktok_pixel_id || "", pg.page_type || "page", pg.canonical_url || "", pg.author || "", pg.published_at || "", pg.excerpt || "", pg.structured_data || ""]),
    members: users.map(u => [u.id || "", u.id_user || "", u.email || "", u.nama || "", u.whatsapp || "", u.affiliate || "", u.rekening || "", u.info_rekening || "", u.role || "member", u.tanggal_daftar || "", u.status || "Active", u.source || "", u.last_login || ""]),
    license_stock: licenseStock.map(l => [l.id || "", l.product_id || "", l.license_key || "", l.status || "Available", l.assigned_invoice || "", l.assigned_email || "", l.assigned_at || "", l.created_at || "", l.note || ""]),
    affiliates: Object.values(affMap).filter(a => a.komisi > 0),
    settings: displaySettings
  });
}

async function handleGetMemberProducts(env, body, settings) {
  const email = String(body.email || "").trim().toLowerCase();
  const rules = await safeAll(env, "SELECT id_produk, title, \"desc\", deskripsi, url_akses, url, harga, status, lp_url, gambar, komisi, bump_url, bump_product_id, kategori, harga_coret, bump_status, billing_type, subscription_days, product_type, weight_grams, length_cm, width_cm, height_cm, stock_qty, upgrade_to_products FROM access_rules");
  const publicSettings = getPublicSettings(settings);
  const emptyLeaderboard = { top: [], current: null, total_affiliates: 0, updated_at: new Date().toISOString() };

  if (!email) {
    const available = rules
      .filter(r => String(r.status || "").trim() === "Active")
      .map(r => ({
        id: String(r.id_produk).toUpperCase(),
        title: r.title,
        desc: r.desc || r.deskripsi,
        url: '#',
        harga: r.harga,
        access: false,
        status: r.status || "Active",
        lp_url: r.lp_url || "",
        gambar: r.gambar || "",
        komisi: r.komisi,
        bump_access: false,
        bump_url: r.bump_url || "",
        bump_product_id: r.bump_product_id || "",
        kategori: r.kategori || 'Umum',
        harga_coret: r.harga_coret || 0,
        billing_type: r.billing_type || "one_time",
        subscription_days: r.subscription_days || 0,
        product_type: r.product_type || "digital",
        weight_grams: r.weight_grams || 0,
        length_cm: r.length_cm || 0,
        width_cm: r.width_cm || 0,
        height_cm: r.height_cm || 0,
        stock_qty: r.stock_qty || 0,
        upgrade_to_products: r.upgrade_to_products || ""
      }));
    return jsonRes({ status: 'success', data: publicSettings, owned: [], available, prospek: [], total_komisi: 0, leaderboard: emptyLeaderboard });
  }

  await ensureAffiliateSchema(env);
  const orders = await safeAll(env, "SELECT invoice, email, nama, whatsapp, id_produk, nama_produk, harga_total, status, tanggal_order, affiliate, affiliate_l1, affiliate_l2, affiliate_l3, komisi, komisi_l1, komisi_l2, komisi_l3, take_bump, bump_product_id, bump_title_snapshot, bump_url_snapshot, bump_license_key, billing_type, subscription_started_at, subscription_expires_at FROM orders WHERE LOWER(email) = ?", [email]);

  let lunasMap = {};
  let bumpMap = {}; // <-- Tambahan: Map khusus untuk mencatat siapa yang beli Bump
  const ruleById = new Map(rules.map(r => [String(r.id_produk || "").toUpperCase(), r]));
  const findRuleByUrl = (targetUrl = "") => {
    const cleanUrl = String(targetUrl || "").trim();
    if (!cleanUrl) return null;
    return rules.find(r => [r.url_akses, r.url, r.lp_url].map(v => String(v || "").trim()).includes(cleanUrl)) || null;
  };

  orders.forEach(r => {
      if (isOrderSubscriptionEntitled(r)) {
          const pIdStr = String(r.id_produk).toUpperCase();
          lunasMap[pIdStr] = r;

          // Cek apakah order bump benar-benar dipilih saat checkout
          // (Mengakomodasi format boolean, string 'true', atau angka 1)
          if (r.take_bump === true || String(r.take_bump).toLowerCase() === 'true' || r.take_bump === 1) {
              bumpMap[pIdStr] = true;
              const mainRule = ruleById.get(pIdStr) || {};
              const bumpUrl = String(r.bump_url_snapshot || mainRule.bump_url || "").trim();
              const bumpRule = findRuleByUrl(bumpUrl);
              const bumpId = cleanProductId(r.bump_product_id || mainRule.bump_product_id || (bumpRule && bumpRule.id_produk) || extractBumpProductIdFromUrl(bumpUrl));
              if (bumpId) {
                  lunasMap[bumpId] = r;
                  bumpMap[bumpId] = true;
              }
          }
      }
  });
  
  let owned = [], available = [];
  const ownedIds = new Set(Object.keys(lunasMap));
  rules.forEach(r => {
    const pId = String(r.id_produk).toUpperCase();
    const isActiveProduct = String(r.status || "").trim() === "Active";
    const accessOrder = lunasMap[pId] || null;
    const hasPaidAccess = Boolean(accessOrder);
    const hasAccess = hasPaidAccess || Number(r.harga) === 0;

    const pObj = {
        id: pId,
        title: r.title,
        desc: r.desc || r.deskripsi,
        url: hasAccess ? (r.url_akses || r.url) : '#',
        harga: r.harga,
        access: hasAccess,
        status: r.status || "Active",
        lp_url: r.lp_url || "",
        gambar: r.gambar || "",
        komisi: r.komisi,
        bump_access: bumpMap[pId] || false,
        bump_url: r.bump_url || "",
        bump_product_id: r.bump_product_id || "",
        kategori: r.kategori || 'Umum',
        harga_coret: r.harga_coret || 0,
        billing_type: r.billing_type || "one_time",
        subscription_days: r.subscription_days || 0,
        product_type: r.product_type || "digital",
        weight_grams: r.weight_grams || 0,
        length_cm: r.length_cm || 0,
        width_cm: r.width_cm || 0,
        height_cm: r.height_cm || 0,
        stock_qty: r.stock_qty || 0,
        subscription_expires_at: accessOrder ? (accessOrder.subscription_expires_at || "") : "",
        upgrade_to_products: r.upgrade_to_products || "",
        upgrade_options: []
    };

    if (hasAccess && email) {
        pObj.upgrade_options = buildUpgradeOptionsForProduct(r, ruleById, ownedIds);
        owned.push(pObj);
    } else if (isActiveProduct) {
        available.push(pObj);
    }
  });

  let prospek = []; let total_komisi = 0; let currentUser = null;
  if (email !== "") {
      try { currentUser = await env.DB.prepare("SELECT * FROM users WHERE LOWER(email) = ?").bind(email).first(); } catch(e){}

      if (currentUser) {
          const userRefs = getAffiliateUserRefs(currentUser, email);
          const affiliateFields = ["affiliate", "affiliate_l1", "affiliate_l2", "affiliate_l3"];
          const clauses = [];
          const params = [];
          affiliateFields.forEach(field => {
              userRefs.forEach(ref => {
                  clauses.push(`${field} = ?`);
                  params.push(ref);
                  clauses.push(`LOWER(${field}) = ?`);
                  params.push(ref.toLowerCase());
              });
          });
          const listProspek = clauses.length ? await safeAll(env, `SELECT * FROM orders WHERE ${clauses.join(" OR ")} ORDER BY rowid DESC`, params) : [];

          prospek = listProspek.flatMap(o => {
              return getOrderAffiliateCredits(o)
                .filter(credit => affiliateRefMatchesUser(currentUser, credit.ref))
                .map(credit => {
                  let komisiNominal = Number(credit.amount) || 0;
                  let isPaid = false;
                  if (komisiNominal < 0) { isPaid = true; komisiNominal = Math.abs(komisiNominal); }
                  if ((o.status === 'Lunas' || o.status === 'Success') && !isPaid && komisiNominal > 0) { total_komisi += komisiNominal; }
                  let statusTampil = isPaid ? 'Komisi Cair' : o.status;
                  return { tanggal: o.tanggal_order ? new Date(o.tanggal_order).toLocaleDateString('id-ID') : '-', produk: o.nama_produk || '-', nama: o.nama || '-', komisi: komisiNominal, status: statusTampil, harga_produk: o.harga_total || 0, level: credit.level };
                });
          });
      }
  }
  let leaderboard = emptyLeaderboard;
  try {
      leaderboard = await buildAffiliateLeaderboard(env, currentUser, 20);
  } catch (e) {
      console.log("Leaderboard build failed:", e.message);
  }
  return jsonRes({ status: 'success', data: publicSettings, owned, available, prospek, total_komisi, leaderboard });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, ""); // Menghapus garis miring di akhir jika ada
    
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (request.method === "GET" && (path === "/__cloudmember/health" || path === "/__cloudmember/version")) {
      await ensureD1Schema(env);
      let debugSettings = {};
      try { debugSettings = await getGlobalSettings(env); } catch(e) {}
      return jsonRes({
        status: "success",
        app: APP_NAME,
        version: APP_VERSION,
        release_date: APP_RELEASE_DATE,
        domain: normalizeDomainValue(request.headers.get("host") || url.hostname),
        installation_mode: getInstallationMode(env, debugSettings),
        license_active: isLicenseActive(debugSettings)
      });
    }

    if (request.method === "GET" && path.startsWith("/__cloudmember/payment-logo/")) {
      const slug = decodeURIComponent(path.split("/").pop() || "");
      return await servePaymentLogo(env, request, slug);
    }

    if (request.method === "GET") {
      const settings = await getGlobalSettings(env);
      if (isBuyerInstallation(env, settings) && !isLicenseActive(settings) && !isInstallAllowedPath(path)) {
        const installUrl = new URL("/install.html", url.origin);
        if (url.pathname !== "/" && url.pathname !== "/install.html") installUrl.searchParams.set("next", url.pathname);
        return Response.redirect(installUrl.toString(), 302);
      }
    }
    
    // ==========================================
    //  PINTU CALLBACK SUPER UNIVERSAL (ALL GATEWAY)
    // Menangani: Duitku, Tripay, Xendit, & Moota (Mutasi)
    // ==========================================
    if (path === '/notivgo' && request.method === 'POST') {
      const settings = await getGlobalSettings(env);
      const secret = String(settings.notivgo_webhook_secret || '').trim();
      const ts = request.headers.get('X-Timestamp') || '';
      const nonce = request.headers.get('X-Nonce') || '';
      const sig = request.headers.get('X-Signature') || '';
      if (!secret || !/^\d+$/.test(ts) || !nonce || !/^sha256=[a-f0-9]{64}$/.test(sig)) return jsonRes({ error: 'invalid_signature' }, 401);
      if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return jsonRes({ error: 'clock_skew', server_time: Math.floor(Date.now() / 1000) }, 401);
      const raw = await request.text();
      if (raw.length > 131072) return jsonRes({ error: 'too_large' }, 413);
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
      const bytes = Uint8Array.from(sig.slice(7).match(/../g), hex => parseInt(hex, 16));
      if (!await crypto.subtle.verify('HMAC', key, bytes, encoder.encode(`${ts}.${nonce}.${raw}`))) return jsonRes({ error: 'invalid_signature' }, 401);
      await ensureD1Schema(env);
      // Notification data is only a trigger; the authenticated Orders API decides payment status.
      await syncNotivgoPending(env, settings);
      return jsonRes({ ok: true });
    }
    if (path === '/callback' && request.method === 'POST') {
        try {
            await ensureD1Schema(env);
            const contentType = (request.headers.get("content-type") || "").toLowerCase();
            const settings = await getGlobalSettings(env);

            // 1. GATEWAY DUITKU (Format Form Data)
            if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
                const formData = await request.formData();
                const merchantOrderId = formData.get('merchantOrderId');
                const resultCode = formData.get('resultCode');
                
                if (resultCode === '00' && merchantOrderId) {
                    const order = await env.DB.prepare("SELECT * FROM orders WHERE invoice = ?").bind(merchantOrderId).first();
                    if (order && order.status !== 'Lunas') {
                        await env.DB.prepare("UPDATE orders SET status = 'Lunas' WHERE invoice = ?").bind(merchantOrderId).run();
                        try { await sendPaidNotification(order, settings, env); } catch(e){}
                    }
                }
                return new Response("OK", { status: 200 });
            }
            
            // 2. GATEWAY TRIPAY, XENDIT, & MOOTA (Format JSON)
            else if (contentType.includes("application/json")) {
                const rawText = await request.text();
                const body = JSON.parse(rawText);

                // A. Deteksi MOOTA (Mutasi Rekening Bank Otomatis - Bentuknya Array)
                if (Array.isArray(body)) {
                    for (const mut of body) {
                        if (mut.type === 'CR') {
                            const order = await env.DB.prepare("SELECT * FROM orders WHERE status = 'Pending' AND harga_total = ?").bind(mut.amount).first();
                            if (order) {
                                await env.DB.prepare("UPDATE orders SET status = 'Lunas' WHERE invoice = ?").bind(order.invoice).run();
                                try { await sendPaidNotification(order, settings, env); } catch(e){}
                            }
                        }
                    }
                    return new Response("OK", { status: 200 });
                }

                // B. Deteksi MIDTRANS SNAP
                if (body.order_id && body.transaction_status && body.signature_key) {
                    const serverKey = String(settings.midtrans_server_key || "").trim();
                    if (!serverKey) return new Response("Midtrans Server Key Missing", { status: 403 });

                    const signaturePayload = String(body.order_id || "") + String(body.status_code || "") + String(body.gross_amount || "") + serverKey;
                    const expectedSignature = await sha512HexRaw(signaturePayload);
                    const receivedSignature = String(body.signature_key || "").trim().toLowerCase();
                    if (expectedSignature !== receivedSignature) return new Response("Invalid Midtrans Signature", { status: 403 });

                    const transactionStatus = String(body.transaction_status || "").trim().toLowerCase();
                    const fraudStatus = String(body.fraud_status || "").trim().toLowerCase();
                    const isPaid = transactionStatus === "settlement" || (transactionStatus === "capture" && (!fraudStatus || fraudStatus === "accept"));
                    const isCancelled = ["cancel", "deny", "expire", "failure"].includes(transactionStatus);

                    if (isPaid) {
                        const order = await env.DB.prepare("SELECT * FROM orders WHERE invoice = ?").bind(body.order_id).first();
                        if (order && order.status !== 'Lunas') {
                            await env.DB.prepare("UPDATE orders SET status = 'Lunas' WHERE invoice = ?").bind(body.order_id).run();
                            try {
                                const paidOrder = await env.DB.prepare("SELECT * FROM orders WHERE invoice = ?").bind(body.order_id).first();
                                await sendPaidNotification(paidOrder || order, settings, env);
                            } catch(e){}
                        }
                        return new Response(JSON.stringify({ success: true }), { headers: {'Content-Type': 'application/json'}, status: 200 });
                    }

                    if (isCancelled) {
                        await env.DB.prepare("UPDATE orders SET status = 'Cancelled' WHERE invoice = ? AND status = 'Pending'").bind(body.order_id).run();
                        return new Response(JSON.stringify({ success: true }), { headers: {'Content-Type': 'application/json'}, status: 200 });
                    }

                    return new Response("OK", { status: 200 });
                }

                // C. Deteksi TRIPAY
                if (body.merchant_ref && (body.status === 'PAID' || body.status === 'SETTLED' || body.status === 'PAID_UNVERIFIED')) {
                    const order = await env.DB.prepare("SELECT * FROM orders WHERE invoice = ?").bind(body.merchant_ref).first();
                    if (order && order.status !== 'Lunas') {
                        await env.DB.prepare("UPDATE orders SET status = 'Lunas' WHERE invoice = ?").bind(body.merchant_ref).run();
                        try { await sendPaidNotification(order, settings, env); } catch(e){}
                    }
                    return new Response(JSON.stringify({ success: true }), { headers: {'Content-Type': 'application/json'}, status: 200 });
                }

                // D. Deteksi XENDIT
                if (body.external_id && (body.status === 'PAID' || body.status === 'SETTLED')) {
                    const order = await env.DB.prepare("SELECT * FROM orders WHERE invoice = ?").bind(body.external_id).first();
                    if (order && order.status !== 'Lunas') {
                        await env.DB.prepare("UPDATE orders SET status = 'Lunas' WHERE invoice = ?").bind(body.external_id).run();
                        try { await sendPaidNotification(order, settings, env); } catch(e){}
                    }
                    return new Response(JSON.stringify({ success: true }), { headers: {'Content-Type': 'application/json'}, status: 200 });
                }

                return new Response("Ignored", { status: 200 });
            }
            
            return new Response("Ignored", { status: 200 });
        } catch (err) {
            console.error("Fatal Error Callback: ", err.message);
            return new Response("Error: " + err.message, { status: 500 });
        }
    }
    if (request.method === "GET") {
        if ((path === '/checkout' || path === '/checkout.html') && url.searchParams.has('invoice') && url.searchParams.has('token')) {
            await ensureD1Schema(env);
            const settings = await getGlobalSettings(env);
            return await renderInvoicePaymentPage(request, env, settings);
        }
        if (path === "/daftar") {
            const memberUrl = new URL("/member.html", url.origin);
            const memberReq = new Request(memberUrl.toString(), { method: "GET", headers: request.headers });
            let memberRes = await env.ASSETS.fetch(memberReq);
            if (memberRes.status !== 404) {
                let html = await memberRes.text();
                if (!html.trim()) {
                    try {
                        const fallbackRes = await fetch(memberUrl.toString(), { method: "GET", headers: request.headers });
                        html = await fallbackRes.text();
                    } catch(e) {}
                }
                if (!html.trim()) {
                    const redirectUrl = new URL("/member.html", url.origin);
                    redirectUrl.searchParams.set("mode", "register");
                    return Response.redirect(redirectUrl.toString(), 302);
                }
                html = html.replace("</head>", `<script>window.CLOUDMEMBER_AUTH_MODE="register";</script></head>`);
                return new Response(html, {
                    status: 200,
                    headers: { ...noCacheHtmlHeaders, "Content-Type": "text/html; charset=utf-8" }
                });
            }
        }

        let response = await env.ASSETS.fetch(request);
        
        if (response.status !== 404) return withNoCacheHtml(request, response);

        if (response.status === 404) {
            const slug = url.pathname.replace(/^\/|\/$/g, '').toLowerCase(); 
            
            if (slug !== '') {
                try {
                    await ensureD1Schema(env);
                    if (slug === "blog") {
                        const cmsSettings = await getGlobalSettings(env);
                        const posts = await safeAll(env, "SELECT * FROM pages WHERE page_type = 'blog' AND status = 'Active' ORDER BY COALESCE(published_at, tanggal_buat) DESC, rowid DESC LIMIT 100");
                        return new Response(renderBlogListHtml(posts, cmsSettings, request.url), {
                            status: 200,
                            headers: { ...noCacheHtmlHeaders, "Content-Type": "text/html; charset=utf-8" }
                        });
                    }

                    const isBlogPath = slug.startsWith("blog/");
                    const pageSlug = isBlogPath ? slug.replace(/^blog\/+/, "") : slug;
                    let targetPage = isBlogPath
                        ? await env.DB.prepare("SELECT * FROM pages WHERE slug = ? AND page_type = 'blog'").bind(pageSlug).first()
                        : await env.DB.prepare("SELECT * FROM pages WHERE slug = ?").bind(pageSlug).first();
                    if (isBlogPath && (!targetPage || !targetPage.content)) {
                        targetPage = await env.DB.prepare("SELECT * FROM pages WHERE slug = ?").bind(pageSlug).first();
                    }
                    
                    if (targetPage && targetPage.content) {
                        let content = targetPage.content;
                        let protectId = String(targetPage.protect_products || "").trim();

                        const protectMatch = content.match(/\[PROTECT:(.*?)\]/i);
                        if (!protectId && protectMatch) {
                            protectId = protectMatch[1].trim();
                            content = content.replace(/\[PROTECT:.*?\]/gi, '');
                        } else if (!protectId && content.includes('data-lock="')) {
                            const lockMatch = content.match(/data-lock="(.*?)"/i);
                            if (lockMatch) protectId = lockMatch[1].trim();
                        }
                        content = content.replace(/\[PROTECT:.*?\]/gi, '');

                        content = content.replace(/<img[^>]+onload[^>]+>/gi, ''); 
                        const cmsSettings = await getGlobalSettings(env);
                        const seo = buildCmsSeoMeta(targetPage, cmsSettings, request.url, content);
                        const seoTags = renderCmsSeoTags(seo);
                        const trackingTags = renderTrackingTags(targetPage, cmsSettings);
                        const isBlogArticle = seo.pageType === "blog";
                        const renderedContent = isBlogArticle ? renderBlogArticleHtml(targetPage, seo, content, cmsSettings, request.url) : content;

                        const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${seoTags}
    ${trackingTags}
    <script src="/config.js?v=2026"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/lite-youtube-embed/0.3.3/lite-yt-embed.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/lite-youtube-embed/0.3.3/lite-yt-embed.min.js" defer></script>
    
    ${protectId !== '' ? `
    <script>
        function getSysEmail() {
            var e = null;
            try {
                e = sessionStorage.getItem('user_email') || localStorage.getItem('member_email') || localStorage.getItem('email') || sessionStorage.getItem('email');
                if (!e && window.opener) {
                    try { e = window.opener.sessionStorage.getItem('user_email'); if (!e) e = window.opener.localStorage.getItem('user_email'); if (e) sessionStorage.setItem('user_email', e); } catch(err) {}
                }
                if(!e) {
                    for(var i=0; i<localStorage.length; i++) {
                        var v = localStorage.getItem(localStorage.key(i));
                        if(v && v.includes('email') && v.includes('@') && v.includes('{')) { try { var p = JSON.parse(v); if(p.email) return p.email; }catch(err){} }
                    }
                }
            } catch(err) {} return e;
        }

        function getSysAdmin() {
            var adm = false;
            try {
                adm = sessionStorage.getItem('adm_v10') === 'true';
                if (!adm && window.opener) { try { adm = window.opener.sessionStorage.getItem('adm_v10') === 'true'; if (adm) sessionStorage.setItem('adm_v10', 'true'); } catch(err) {} }
            } catch(e) {} return adm;
        }
        
        var em = getSysEmail();
        var isAdmin = getSysAdmin();
        if (!em && !isAdmin) { window.location.replace('/member'); }
    </script>` : ''}

    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; margin: 0; padding: 0; background-color: #ffffff; color: #0f172a; overflow-x: hidden; }
        #cms-wrapper { padding: 0; min-height: 100vh; width: 100%; display: flex; flex-direction: column; }
        #cms-content { width: 100%; max-width: 100%; margin: 0; padding: 0; background: transparent; }
        #cms-content .canvas-breakout, #cms-content .sf-page { width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; overflow-x: hidden !important; }
        #cms-content .sf-page .sf-section { padding-left: clamp(1rem, 4vw, 2rem) !important; padding-right: clamp(1rem, 4vw, 2rem) !important; box-sizing: border-box !important; }
        #cms-content .sf-page .sf-container { width: 100% !important; margin-left: auto !important; margin-right: auto !important; box-sizing: border-box !important; min-width: 0 !important; }
        #cms-content .sf-page .sf-container.sf-width-wide { max-width: 1120px !important; }
        #cms-content .sf-page .sf-container.sf-width-normal { max-width: 960px !important; }
        #cms-content .sf-page .sf-container.sf-width-narrow { max-width: 760px !important; }
        .judul-halaman { font-size: 2.25rem; font-weight: 900; margin: 0; color: #0f172a; line-height: 1.2; padding: 3rem 1.5rem 1rem; text-align: center; }
        @keyframes sf-spin{to{transform:rotate(360deg)}}
        div[id^="sf-loading-lock"], div[id^="sf-loading-state"], div[id^="sf-error-state"], div[id^="sf-debug-box"] { display: none !important; }
        div[id^="sf-secret-wrapper"] { display: block !important; }
        #master-sf-spinner { text-align:center; padding: 5rem 1rem; }
        #master-sf-error { display:none; text-align:center; padding: 5rem 1rem; }
        #master-sf-content { display:none; width: 100%; }
        body.cms-blog-article { background: #ffffff; color: #0f172a; }
        body.cms-blog-article #cms-wrapper { background: #ffffff; }
        body.cms-blog-article #cms-content { padding: 0; }
        .blog-article-shell { width: min(100%, 1120px); margin: 0 auto; padding: 3.5rem 1.25rem 5rem; box-sizing: border-box; overflow-x: hidden; }
        .blog-article-header { max-width: 820px; margin: 0 auto 2.5rem; }
        .blog-back-link { display: inline-flex; align-items: center; gap: 0.35rem; margin-bottom: 1.5rem; color: #2563eb; text-decoration: none; font-size: 0.9rem; font-weight: 800; }
        .blog-back-link:hover { text-decoration: underline; }
        .blog-article-meta { display: flex; flex-wrap: wrap; gap: 0.55rem 1rem; margin-bottom: 1rem; color: #64748b; font-size: 0.82rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
        .blog-article-meta span { display: inline-flex; align-items: center; }
        .blog-article-meta span + span::before { content: ""; width: 0.35rem; height: 0.35rem; margin-right: 1rem; border-radius: 999px; background: #cbd5e1; }
        .blog-article-header h1 { margin: 0; color: #0f172a; font-size: clamp(2.1rem, 5vw, 4rem); line-height: 1.08; font-weight: 900; letter-spacing: 0; }
        .blog-article-excerpt { margin: 1.25rem 0 0; color: #475569; font-size: clamp(1.05rem, 2vw, 1.22rem); line-height: 1.75; }
        .blog-article-cover { width: min(100%, 860px); aspect-ratio: 16 / 9; margin: 0 auto 3rem; border-radius: 10px; overflow: hidden; background: #f1f5f9; border: 1px solid #e2e8f0; box-sizing: border-box; }
        .blog-article-cover img { display: block; width: 100%; height: 100%; object-fit: cover; }
        .blog-prose { max-width: 760px; margin: 0 auto; color: #334155; font-size: 1.0625rem; line-height: 1.85; overflow-wrap: anywhere; }
        .blog-prose > :first-child { margin-top: 0 !important; }
        .blog-prose p { margin: 0 0 1.35rem; }
        .blog-prose h1, .blog-prose h2, .blog-prose h3, .blog-prose h4 { color: #0f172a; font-weight: 900; letter-spacing: 0; }
        .blog-prose h1 { font-size: 2.15rem; line-height: 1.15; margin: 2.75rem 0 1rem; }
        .blog-prose h2 { font-size: 1.75rem; line-height: 1.22; margin: 3rem 0 1rem; }
        .blog-prose h3 { font-size: 1.35rem; line-height: 1.3; margin: 2.25rem 0 0.85rem; }
        .blog-prose h4 { font-size: 1.1rem; line-height: 1.35; margin: 1.75rem 0 0.75rem; }
        .blog-prose ul, .blog-prose ol { margin: 0 0 1.45rem 1.25rem; padding-left: 1.15rem; }
        .blog-prose li { margin: 0.45rem 0; padding-left: 0.15rem; }
        .blog-prose li > p { margin: 0.4rem 0; }
        .blog-prose a { color: #2563eb; font-weight: 800; text-decoration: underline; text-underline-offset: 0.18em; }
        .blog-prose strong, .blog-prose b { color: #0f172a; font-weight: 900; }
        .blog-prose blockquote { margin: 2rem 0; padding: 1.25rem 1.5rem; border-left: 4px solid #2563eb; background: #f8fafc; color: #1e293b; border-radius: 0 8px 8px 0; }
        .blog-prose img { display: block; width: auto; max-width: min(100%, 680px); max-height: 520px; height: auto; object-fit: contain; margin: 2rem auto; border-radius: 8px; box-sizing: border-box; }
        .blog-prose figure { margin: 2rem 0; text-align: center; }
        .blog-prose figure img { margin-bottom: 0; }
        .blog-prose iframe, .blog-prose video, .blog-prose embed { display: block; width: 100%; max-width: 760px; margin: 2rem auto; border: 0; border-radius: 8px; }
        .blog-prose figcaption { margin-top: 0.7rem; color: #64748b; font-size: 0.9rem; text-align: center; }
        .blog-prose table { width: 100%; margin: 2rem 0; border-collapse: collapse; display: block; overflow-x: auto; }
        .blog-prose th, .blog-prose td { padding: 0.85rem 1rem; border: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
        .blog-prose th { background: #f8fafc; color: #0f172a; font-weight: 900; }
        .blog-prose pre { margin: 2rem 0; padding: 1rem; overflow-x: auto; border-radius: 8px; background: #0f172a; color: #e2e8f0; }
        .blog-prose code { padding: 0.15rem 0.35rem; border-radius: 4px; background: #f1f5f9; color: #0f172a; font-size: 0.92em; }
        .blog-prose pre code { padding: 0; background: transparent; color: inherit; }
        .blog-prose hr { margin: 2.75rem 0; border: 0; border-top: 1px solid #e2e8f0; }
        @media (max-width: 720px) {
            .blog-article-shell { padding: 2rem 1rem 3.5rem; }
            .blog-article-header { margin-bottom: 1.75rem; }
            .blog-article-meta { display: block; line-height: 1.7; }
            .blog-article-meta span { display: block; }
            .blog-article-meta span + span::before { display: none; }
            .blog-article-cover { margin-bottom: 2rem; border-radius: 8px; aspect-ratio: 16 / 10; }
            .blog-prose { font-size: 1rem; line-height: 1.78; }
            .blog-prose img { max-width: 100%; max-height: 420px; }
            .blog-prose h1 { font-size: 1.8rem; }
            .blog-prose h2 { font-size: 1.5rem; margin-top: 2.25rem; }
            .blog-prose h3 { font-size: 1.22rem; }
        }
    </style>
</head>
<body class="${isBlogArticle ? "cms-blog-article" : ""}">
    <div id="social-proof-toast" onclick="if(this.dataset.url) window.location.href = this.dataset.url;" style="position: fixed; bottom: -120px; left: 20px; background: white; padding: 12px 16px; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 12px; z-index: 99999; transition: bottom 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); max-width: 320px; opacity: 0; pointer-events: auto; cursor: pointer;">
        <div style="background: #1e3a8a; color: white; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="#cbd5e1"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#f59e0b" fill="#f59e0b"></path>
            </svg>
        </div>
        <div>
            <p id="sp-name" style="margin: 0; font-size: 0.85rem; font-weight: 800; color: #0f172a;">...</p>
            <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: #475569;">Sukses membeli <span id="sp-prod" style="font-weight: 700; color: #00AAE7;">...</span></p>
            <p id="sp-time" style="margin: 2px 0 0 0; font-size: 0.65rem; font-weight: 600; color: #94a3b8;">...</p>
        </div>
    </div>

    <div id="cms-wrapper">
        <div id="cms-content">
            ${protectId !== '' ? `
                <div id="master-sf-spinner">
                    <div style="width:3rem;height:3rem;border:4px solid #e0f7ff;border-top-color:#00AAE7;border-radius:50%;animation:sf-spin 1s linear infinite;margin: 0 auto 1.5rem;"></div>
                    <h2 style="font-size:1.5rem;font-weight:800;color:#0f172a;font-family:sans-serif;">Memverifikasi Akses...</h2>
                </div>
                <div id="master-sf-error">
                    <svg style="width:5rem;height:5rem;color:#e11d48;margin:0 auto 1.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    <h2 style="font-size:1.75rem; font-weight:900; color:#e11d48; margin-bottom:1rem;">Akses Terkunci</h2>
                    <p id="master-sf-error-msg" style="color:#475569; margin-bottom:1.5rem; line-height:1.6;">Anda belum memiliki akses ke produk ini.</p>
                    <a href="/member" style="background:#0f172a; color:white; padding:0.75rem 2rem; border-radius:0.5rem; text-decoration:none; font-weight:bold; display:inline-block;">Kembali ke Dashboard</a>
                </div>
                <div id="master-sf-content">${renderedContent}</div>
            ` : `<div>${renderedContent}</div>`}
        </div>
    </div>

    <script>
        async function initSocialProof() {
            try {
                const targetUrl = window.location.origin;
                const res = await fetch(targetUrl, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'get_social_proof' }) 
                });
                const r = await res.json();
                if(r.status === 'success' && r.data && r.data.length > 0) {
                    const proofs = r.data;
                    let currentIndex = 0;
                    const toast = document.getElementById('social-proof-toast');
                    const showToast = () => {
                        const p = proofs[currentIndex];
                        document.getElementById('sp-name').innerText = p.name;
                        document.getElementById('sp-prod').innerText = p.product;
                        document.getElementById('sp-time').innerText = p.time;
                        
                        // SET URL UNTUK KLIK
                        if(p.url && p.url !== "") {
                            toast.dataset.url = p.url;
                        } else {
                            toast.removeAttribute('data-url');
                        }
                        
                        toast.style.bottom = '20px'; toast.style.opacity = '1';
                        setTimeout(() => { toast.style.bottom = '-120px'; toast.style.opacity = '0'; }, 5000);
                        currentIndex = (currentIndex + 1) % proofs.length;
                    };
                    setTimeout(() => { showToast(); setInterval(showToast, 12000); }, 3000);
                }
            } catch(e) {}
        }
        initSocialProof();
    </script>

    ${protectId !== '' ? `
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            var lock = document.getElementById('master-sf-spinner');
            var errState = document.getElementById('master-sf-error');
            var errMsg = document.getElementById('master-sf-error-msg');
            var wrapper = document.getElementById('master-sf-content');
            var protectId = ${JSON.stringify(protectId)};
            var protectIds = String(protectId || '').split(',').map(function(id){ return id.trim().toUpperCase(); }).filter(Boolean);

            function showError(msg) {
                if(lock) lock.style.display = 'none';
                if(wrapper) wrapper.style.display = 'none';
                if(errState) errState.style.display = 'block';
                if(errMsg && msg) errMsg.innerHTML = msg;
            }

            if (typeof isAdmin !== 'undefined' && isAdmin) {
                if(lock) lock.style.display = 'none';
                if(wrapper) wrapper.style.display = 'block';
                return;
            }

            if (typeof em !== 'undefined' && em) {
                var targetUrl = window.location.origin;
                fetch(targetUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_products', email: em }) })
                .then(function(r){ return r.json(); })
                .then(function(data){
                    if (data.status === 'success') {
                        var pass = (data.owned || []).some(function(p){ return protectIds.indexOf(String(p.id).toUpperCase()) !== -1; });
                        if (pass) {
                            if(lock) lock.style.display = 'none';
                            if(wrapper) wrapper.style.display = 'block';
                        } else {
                            showError('Akun <b>' + em + '</b> belum memiliki akses ke produk ini (ID: ' + protectIds.join(', ') + ') atau tagihan belum LUNAS.');
                        }
                    } else { showError('Gagal memverifikasi status Anda. (' + (data.message||'Server Error') + ')'); }
                })
                .catch(function(err){ showError('Gagal menghubungi Database. Pastikan internet stabil.'); });
            }
        });
    </script>` : ''}
</body>
</html>`;
                        return new Response(fullHtml, { headers: htmlHeaders() });
                    }
                } catch(e) { console.log("DB Rescue Error:", e.message); }
            }
        }
        return response;
    }
    try {
      const bodyText = await request.text();
      if (!bodyText) return jsonRes({ status: 'error', message: 'Body request is empty' }, 400);

      let body;
      try { body = JSON.parse(bodyText); } catch(e) { return jsonRes({ status: 'error', message: 'Invalid JSON payload' }, 400); }

      await ensureD1Schema(env);
      const settings = await getGlobalSettings(env);
      const action = String(body.action || "");

      if (isBuyerInstallation(env, settings) && !isLicenseActive(settings) && !PRE_ACTIVATION_ACTIONS.has(action)) {
        return jsonRes({
          status: "license_required",
          message: "Instalasi belum diaktivasi. Buka /install.html untuk memasukkan kode lisensi."
        }, 403);
      }

      if (ADMIN_ACTIONS.has(action)) {
        const isAdmin = await verifyAdminAuth(env, body, settings, request);
        if (!isAdmin) return jsonRes({ status: "error", message: "Akses admin tidak valid. Silakan login ulang." }, 401);
      }
      
      switch (action) {
        case 'get_notification_delivery': {
          const deliveries = await safeAll(env, 'SELECT id,invoice,event,channel,status,attempts,last_error,updated_at FROM notification_outbox ORDER BY created_at DESC LIMIT 30');
          const verification = await safeAll(env, "SELECT invoice,notivgo_error FROM orders WHERE COALESCE(notivgo_error,'') <> '' ORDER BY rowid DESC LIMIT 10");
          return jsonRes({ status: 'success', deliveries, verification });
        }
        case 'retry_order_notifications': {
          const row = await env.DB.prepare("SELECT * FROM notification_outbox WHERE id=? AND status='failed'").bind(String(body.id || '')).first();
          if (!row) return jsonRes({ status: 'error', message: 'Notifikasi gagal tidak ditemukan.' });
          await env.DB.prepare("UPDATE notification_outbox SET attempts=0,next_attempt=0 WHERE id=? AND status='failed'").bind(row.id).run();
          await retryOrderNotifications(env, settings);
          return jsonRes({ status: 'success', message: 'Percobaan ulang diproses. Periksa status terbaru.' });
        }
        case 'test_notivgo': {
          try {
            if (!String(settings.notivgo_api_key || '').trim()) return jsonRes({ status: 'error', message: 'API key NotivGo belum diisi.' });
            await notivgoApi(settings, 'orders?limit=1');
            return jsonRes({ status: 'success', message: 'Koneksi API NotivGo berhasil. Pencocokan pembayaran di HP tetap harus diaktifkan.' });
          } catch (error) { return jsonRes({ status: 'error', message: safeNotificationError(settings, error) }); }
        }
          case 'check_payment_status': {
          const invReq = String(body.invoice || "").trim();
          if (!invReq) return jsonRes({ status: 'error', message: 'Invoice kosong' });
          
          let cekOrder = await env.DB.prepare("SELECT * FROM orders WHERE invoice = ?").bind(invReq).first();
          if (!cekOrder) return jsonRes({ status: 'error', message: 'Order tidak ditemukan' });
          cekOrder = await syncNotivgoOrder(env, settings, cekOrder);
          
          return jsonRes({ 
              status: 'success', 
              payment_status: cekOrder.status,
              harga_total: cekOrder.harga_total,
              nama_produk: cekOrder.nama_produk,
              id_produk: cekOrder.id_produk,
              payment_expired: ['Pending', 'Expired'].includes(cekOrder.status) && isNotivgoQrisExpired(cekOrder),
              payment_expires_at: Number(cekOrder.payment_expires_at) || 0
          });
        }
        case 'get_admin_data': { return await handleGetAdminData(env, settings); }
        case 'preview_blast_targets': { return await handlePreviewBlastTargets(env, body); }
        case 'send_blast_batch': { return await handleSendBlastBatch(env, settings, body); }
        case 'import_youtube_playlist': { return await handleImportYoutubePlaylist(body, settings, env); }
        case 'get_products': {
          if (!String(body.email || "").trim()) {
            return await withPublicActionCache(request, "get_products_public", { cv: settings.__public_cache_version || "" }, () => handleGetMemberProducts(env, body, settings));
          }
          return await handleGetMemberProducts(env, body, settings);
        }
        case 'get_global_settings': {
          return await withPublicActionCache(request, "get_global_settings", { cv: settings.__public_cache_version || "" }, async () => jsonRes({ status: 'success', data: getPublicSettings(settings) }));
        }
        case 'check_master_update': {
          const updateSettings = {
            ...settings,
            master_update_url: body.master_update_url || settings.master_update_url || "",
            license_server_url: body.license_server_url || settings.license_server_url || ""
          };
          const manifest = await getMasterUpdateManifest(env, updateSettings);
          if (!manifest.ok) return jsonRes({ status: 'error', message: manifest.message, current_version: APP_VERSION });
          const latestVersion = String(manifest.data.version || "0.0.0");
          return jsonRes({
            status: 'success',
            current_version: APP_VERSION,
            latest_version: latestVersion,
            update_available: compareVersions(latestVersion, APP_VERSION) > 0,
            manifest_url: manifest.url,
            release_date: manifest.data.release_date || "",
            download_url: manifest.data.download_url || "",
            repository_url: manifest.data.repository_url || "",
            notes: manifest.data.notes || manifest.data.update_notes || []
          });
        }
        case 'register_update_client': {
          try {
            const data = await registerUpdateClientOnMaster(env, settings, body, request);
            return jsonRes({ status: 'success', message: 'Client berhasil terdaftar ke master update.', data });
          } catch (e) {
            return jsonRes({ status: 'error', message: e.message || 'Registrasi client gagal.' }, 400);
          }
        }
        case 'list_update_clients_for_deploy': {
          try {
            const clients = await listUpdateClientsForDeploy(env, settings, body, request);
            return jsonRes({ status: 'success', clients, total: clients.length });
          } catch (e) {
            return jsonRes({ status: 'error', message: e.message || 'Gagal membaca daftar client update.' }, 403);
          }
        }
        case 'activate_client_license': {
          const licenseKey = String(body.license_key || settings.license_key || "").trim();
          const licenseServer = normalizeBaseUrl(body.license_server_url || settings.license_server_url || env.LICENSE_SERVER_URL || "");
          const domain = normalizeDomainValue(body.domain || request.headers.get("host") || url.hostname);
          const fallbackUpdateUrl = normalizeManifestUrl(licenseServer);

          if (!licenseKey) return jsonRes({ status: 'error', message: 'Kode lisensi wajib diisi.' });
          if (!licenseServer) return jsonRes({ status: 'error', message: 'URL pusat lisensi wajib diisi.' });
          if (String(settings.license_status || "").toLowerCase() === "active" && String(settings.license_key || "").trim()) {
            return jsonRes({
              status: 'success',
              message: 'Lisensi sudah aktif untuk domain ini.',
              data: {
                domain: settings.license_domain || domain,
                produk: settings.license_product || '',
                email: settings.license_email || '',
                current_version: APP_VERSION
              }
            });
          }

          const verifyRes = await fetch(licenseServer, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify_license', license_key: licenseKey, domain })
          });
          const verifyData = await verifyRes.json().catch(() => ({}));
          if (!verifyRes.ok || verifyData.valid !== true) {
            return jsonRes({ status: 'error', message: verifyData.message || 'Lisensi tidak valid.' });
          }

          await saveSettings(env, {
            license_key: licenseKey,
            license_server_url: licenseServer,
            license_domain: domain,
            license_status: 'active',
            license_email: verifyData.data && verifyData.data.email ? verifyData.data.email : '',
            license_product: verifyData.data && verifyData.data.produk ? verifyData.data.produk : '',
            license_activated_at: new Date().toISOString(),
            master_update_url: normalizeManifestUrl((verifyData.data && verifyData.data.update_url) || settings.master_update_url || env.MASTER_UPDATE_URL || fallbackUpdateUrl)
          });

          return jsonRes({
            status: 'success',
            message: 'Lisensi aktif untuk domain ini.',
            data: {
              domain,
              produk: verifyData.data && verifyData.data.produk ? verifyData.data.produk : '',
              email: verifyData.data && verifyData.data.email ? verifyData.data.email : '',
              current_version: APP_VERSION
            }
          });
        }
        case 'check_client_license': {
          const licenseKey = String(settings.license_key || body.license_key || "").trim();
          const licenseServer = normalizeBaseUrl(settings.license_server_url || body.license_server_url || env.LICENSE_SERVER_URL || "");
          const domain = normalizeDomainValue(settings.license_domain || body.domain || request.headers.get("host") || url.hostname);

          if (!licenseKey || !licenseServer) {
            return jsonRes({ status: 'error', valid: false, message: 'Instalasi belum diaktivasi.' });
          }

          const verifyRes = await fetch(licenseServer, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify_license', license_key: licenseKey, domain })
          });
          const verifyData = await verifyRes.json().catch(() => ({}));
          return jsonRes({
            status: verifyData.valid === true ? 'success' : 'error',
            valid: verifyData.valid === true,
            message: verifyData.message || '',
            domain,
            current_version: APP_VERSION
          });
        }
        //  FITUR BARU: SOCIAL PROOF POP-UP
        case 'self_reset_client_domain': {
          const licenseKey = String(body.license_key || settings.license_key || "").trim();
          const email = String(body.email || settings.license_email || "").trim().toLowerCase();
          const licenseServer = normalizeBaseUrl(body.license_server_url || settings.license_server_url || env.LICENSE_SERVER_URL || "");

          if (!licenseKey) return jsonRes({ status: 'error', message: 'Kode lisensi wajib diisi.' });
          if (!email || !email.includes("@")) return jsonRes({ status: 'error', message: 'Email terdaftar wajib diisi.' });
          if (!licenseServer) return jsonRes({ status: 'error', message: 'URL pusat lisensi belum diatur.' });

          const resetRes = await fetch(licenseServer, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'self_reset_domain', license_key: licenseKey, email })
          });
          const resetData = await resetRes.json().catch(() => ({}));
          if (!resetRes.ok || resetData.status !== 'success') {
            return jsonRes({ status: 'error', message: resetData.message || 'Reset domain gagal.' });
          }

          await saveSettings(env, {
            license_key: licenseKey,
            license_server_url: licenseServer,
            license_domain: '',
            license_status: '',
            license_email: email,
            license_product: '',
            license_activated_at: '',
            master_update_url: resolveMasterUpdateUrl(env, { ...settings, license_server_url: licenseServer }) || normalizeManifestUrl(licenseServer)
          });

          return jsonRes({
            status: 'success',
            message: 'Domain lama berhasil direset. Silakan aktivasi lisensi di domain baru ini.',
            data: { license_key: licenseKey, email }
          });
        }
        case 'get_social_proof': {
          return await withPublicActionCache(request, "get_social_proof", { cv: settings.__public_cache_version || "", enabled: settings.enable_social_proof || "" }, async () => {
            // Perbaikan: Cek berbagai format nilai boolean (true, True, 1)
            const isEnabled = String(settings.enable_social_proof).trim().toLowerCase();
            if (isEnabled !== 'true' && isEnabled !== '1') {
               return jsonRes({ status: 'success', data: [] });
            }

            // Menggabungkan tabel orders dengan access_rules untuk mengambil lp_url (Landing Page)
            const recentOrders = await safeAll(env, "SELECT o.nama, o.nama_produk, o.tanggal_order, a.lp_url FROM orders o LEFT JOIN access_rules a ON UPPER(o.id_produk) = UPPER(a.id_produk) WHERE o.status IN ('Lunas', 'Success') ORDER BY o.tanggal_order DESC LIMIT 10");

            const proofData = recentOrders.map(o => {
                let orderDate = new Date(o.tanggal_order);
                if (isNaN(orderDate)) {
                   const parts = String(o.tanggal_order).split(/[\s/:-]+/);
                   if(parts.length >= 3) {
                     const yy = parts[2].length === 4 ? parts[2] : parts[0];
                     const dd = parts[2].length === 4 ? parts[0] : parts[2];
                     const mm = parts[1];
                     orderDate = new Date(`${yy}-${mm}-${dd}T00:00:00Z`);
                   }
                }
                if (isNaN(orderDate)) orderDate = new Date();

                const diffMins = Math.floor((new Date() - orderDate) / 60000);
                let timeStr = "Baru saja";
                if(diffMins > 0 && diffMins < 60) timeStr = `${diffMins} menit yang lalu`;
                else if(diffMins >= 60 && diffMins < 1440) timeStr = `${Math.floor(diffMins/60)} jam yang lalu`;
                else if(diffMins >= 1440) timeStr = `${Math.floor(diffMins/1440)} hari yang lalu`;

                let fName = String(o.nama).split(' ')[0];
                fName = fName.substring(0, 4) + "***"; // Menyamarkan nama demi privasi

                // Menyusun URL lengkap jika lp_url berawalan "/" (misal: /produk-1)
                let urlTujuan = o.lp_url || "";
                if (urlTujuan.startsWith("/")) {
                    urlTujuan = String(settings.site_url || "").replace(/\/$/, "") + urlTujuan;
                }

                return { name: fName, product: o.nama_produk, time: timeStr, url: urlTujuan };
            });

            return jsonRes({ status: 'success', data: proofData });
          }, SOCIAL_PROOF_CACHE_TTL_SECONDS);
        }
        case 'get_product': {
          const gpId = String(body.id || body.id_produk || "").toUpperCase();
          const affIdReq = String(body.aff_id || "");
          const loadProduct = async () => {
            const pRow = await env.DB.prepare("SELECT * FROM access_rules WHERE UPPER(id_produk) = ?").bind(gpId).first();
            if (!pRow) return jsonRes({ status: 'error', message: 'Produk tidak ditemukan' });
            // Status produk hanya mengatur visibilitas katalog, bukan akses checkout langsung.
            let affName = "";
            if (affIdReq !== "" && affIdReq !== "GUEST" && affIdReq !== "-") {
              const affUser = await env.DB.prepare("SELECT nama FROM users WHERE id_user = ?").bind(affIdReq).first();
              if(affUser) affName = affUser.nama;
            }
            pRow.nama = pRow.title;
            return jsonRes({ status: 'success', data: pRow, payment: getPublicSettings(settings), aff_name: affName });
          };
          if (gpId && (affIdReq === "" || affIdReq === "GUEST" || affIdReq === "-")) {
            return await withPublicActionCache(request, "get_product", { cv: settings.__public_cache_version || "", id: gpId }, loadProduct);
          }
          return await loadProduct();
        }

        case 'search_shipping_area': {
          const result = await searchShippingAreas(env, settings, body.input || body.keyword || body.q || "");
          if (!result.ok) return jsonRes({ status: 'error', message: result.message }, 400);
          return jsonRes({ status: 'success', provider: normalizeShippingProvider(settings), areas: result.areas });
        }

        case 'calculate_shipping': {
          const shipProdId = cleanProductId(body.id_produk || body.id || body.product_id || "");
          if (!shipProdId) return jsonRes({ status: 'error', message: 'Produk wajib dipilih.' }, 400);
          const productRow = await env.DB.prepare("SELECT * FROM access_rules WHERE UPPER(id_produk) = ?").bind(shipProdId).first();
          if (!productRow) return jsonRes({ status: 'error', message: 'Produk tidak ditemukan.' }, 404);
          if (!isPhysicalProduct(productRow)) return jsonRes({ status: 'success', required: false, rates: [] });
          const result = await calculateShipping(env, settings, productRow, body);
          if (!result.ok) return jsonRes({ status: 'error', message: result.message }, 400);
          return jsonRes({ status: 'success', provider: result.provider || normalizeShippingProvider(settings), required: true, rates: result.rates });
        }

        case 'validate_coupon': {
          const couponResult = await validateCouponForCheckout(env, body);
          if (!couponResult.ok) return jsonRes({ status: 'error', message: couponResult.message });
          return jsonRes({ status: 'success', message: couponResult.message, code: couponResult.code, discount: couponResult.discount });
        }

        case 'request_member_otp': {
          await ensureD1Schema(env);
          const email = normalizeImportEmail(body.email || "");
          const phone = normalizePhone(body.whatsapp || body.wa || body.phone || "");
          if (!email && !phone) return jsonRes({ status: 'error', message: 'Isi email atau nomor WhatsApp.' }, 400);
          const match = await findOtpMember(env, email, phone);
          if (match.ambiguous) return jsonRes({ status: 'error', message: 'Nomor atau email terhubung ke beberapa akun. Hubungi admin untuk memeriksa data member.' }, 409);
          const user = match.user;
          if (!user) return jsonRes({ status: 'error', message: 'Akun member tidak ditemukan.' }, 404);
          const targetPhone = normalizePhone(user.whatsapp);
          if (!targetPhone) return jsonRes({ status: 'error', message: 'Nomor WhatsApp akun belum valid.' }, 400);
          const otp = String(Math.floor(100000 + Math.random() * 900000));
          const now = new Date();
          const expires = new Date(now.getTime() + 10 * 60 * 1000);
          await env.DB.prepare("UPDATE member_otps SET status = 'Expired' WHERE (whatsapp = ? OR LOWER(email) = ?) AND status = 'Pending'").bind(targetPhone, String(user.email || "").toLowerCase()).run();
          await env.DB.prepare("INSERT INTO member_otps (whatsapp, email, otp_code, status, expires_at, created_at) VALUES (?, ?, ?, 'Pending', ?, ?)")
            .bind(targetPhone, String(user.email || "").toLowerCase(), otp, expires.toISOString(), now.toISOString()).run();
          const siteName = settings.site_name || APP_NAME;
          const ok = await sendNotificationWA(settings, targetPhone, `Kode OTP ${siteName}: ${otp}\nBerlaku 10 menit. Abaikan jika bukan Anda.`, "member-otp");
          if (!ok || !ok.ok) return jsonRes({ status: 'error', message: 'OTP gagal dikirim. Cek gateway WhatsApp di pengaturan.' }, 500);
          return jsonRes({ status: 'success', message: 'OTP berhasil dikirim ke WhatsApp terdaftar.', data: { whatsapp: targetPhone.replace(/(\d{4})\d+(\d{3})$/, "$1****$2") } });
        }

        case 'verify_member_otp': {
          await ensureD1Schema(env);
          const email = normalizeImportEmail(body.email || "");
          const phone = normalizePhone(body.whatsapp || body.wa || body.phone || "");
          const otp = String(body.otp || body.code || "").replace(/\D/g, "");
          if (!otp || otp.length !== 6) return jsonRes({ status: 'error', message: 'Kode OTP tidak valid.' }, 400);
          const nowIso = new Date().toISOString();
          const otpRow = await env.DB.prepare(`
            SELECT * FROM member_otps
            WHERE otp_code = ?
              AND status = 'Pending'
              AND expires_at > ?
              AND ((? <> '' AND LOWER(TRIM(email)) = ?) OR (? <> '' AND whatsapp = ?))
            ORDER BY id DESC
            LIMIT 1
          `).bind(otp, nowIso, email, email, phone, phone).first();
          if (!otpRow) return jsonRes({ status: 'error', message: 'OTP salah atau sudah kedaluwarsa.' }, 400);
          const match = await findOtpMember(env, normalizeImportEmail(otpRow.email || ''), normalizePhone(otpRow.whatsapp));
          const user = match.user;
          if (!user) return jsonRes({ status: 'error', message: 'Akun member tidak ditemukan.' }, 404);
          if (normalizePhone(user.whatsapp) !== otpRow.whatsapp) return jsonRes({ status: 'error', message: 'Nomor WhatsApp akun berubah. Silakan minta OTP baru.' }, 400);
          const consumed = await env.DB.prepare("UPDATE member_otps SET status = 'Used', used_at = ? WHERE id = ? AND status = 'Pending' AND expires_at > ?").bind(nowIso, otpRow.id, nowIso).run();
          if (!consumed.meta.changes) return jsonRes({ status: 'error', message: 'OTP sudah digunakan. Silakan minta OTP baru.' }, 400);
          await env.DB.prepare("UPDATE users SET last_login = ? WHERE id = ?").bind(nowIso, user.id).run();
          return jsonRes({ status: 'success', data: { id: user.id_user || user.id, nama: user.nama, email: user.email, role: user.role, wa: user.whatsapp } });
        }

        case 'login': {
          const u = await env.DB.prepare("SELECT * FROM users WHERE LOWER(email) = ? AND password = ?").bind(String(body.email).toLowerCase(), body.password).first();
          if (!u) return jsonRes({ status: 'error', message: 'Email/Password Salah' });
          try { await env.DB.prepare("UPDATE users SET last_login = ? WHERE id = ?").bind(new Date().toISOString(), u.id).run(); } catch(e) {}
          return jsonRes({ status: 'success', data: { id: u.id_user || u.id, nama: u.nama, email: u.email, role: u.role, wa: u.whatsapp } });
        }

        case 'admin_login': {
          const adm = await env.DB.prepare("SELECT * FROM users WHERE LOWER(email) = ? AND password = ? AND (role = 'Admin' OR role = 'admin')").bind(String(body.email).toLowerCase(), body.password).first();
          if (!adm) return jsonRes({ status: 'error', message: 'Akses Ditolak' });
          const adminToken = await createAdminToken(adm, settings, env);
          return jsonRes({ status: 'success', data: { id: adm.id_user || adm.id, nama: adm.nama, email: adm.email, admin_token: adminToken } });
        }

        case 'update_admin_access': {
          const currentEmail = String(body.admin_email || "").trim().toLowerCase();
          const currentPassword = String(body.current_password || "");
          const nextName = String(body.nama || "Admin").trim() || "Admin";
          const nextEmail = String(body.new_email || "").trim().toLowerCase();
          const nextPassword = String(body.new_password || "");

          if (!currentEmail || !currentPassword) return jsonRes({ status: 'error', message: 'Email admin dan password lama wajib diisi.' });
          if (!nextEmail || !nextEmail.includes("@")) return jsonRes({ status: 'error', message: 'Email admin baru tidak valid.' });
          if (nextPassword && nextPassword.length < 6) return jsonRes({ status: 'error', message: 'Password baru minimal 6 karakter.' });

          const adm = await env.DB.prepare("SELECT * FROM users WHERE LOWER(email) = ? AND password = ? AND (role = 'Admin' OR role = 'admin')").bind(currentEmail, currentPassword).first();
          if (!adm) return jsonRes({ status: 'error', message: 'Password lama admin salah.' });

          const usedEmail = await env.DB.prepare("SELECT email FROM users WHERE LOWER(email) = ? AND LOWER(email) <> ?").bind(nextEmail, currentEmail).first();
          if (usedEmail) return jsonRes({ status: 'error', message: 'Email baru sudah dipakai akun lain.' });

          const finalPassword = nextPassword || adm.password;
          await env.DB.prepare("UPDATE users SET nama = ?, email = ?, password = ? WHERE LOWER(email) = ? AND (role = 'Admin' OR role = 'admin')")
            .bind(nextName, nextEmail, finalPassword, currentEmail)
            .run();

          const updatedAdmin = { email: nextEmail, password: finalPassword };
          const adminToken = await createAdminToken(updatedAdmin, settings, env);
          return jsonRes({
            status: 'success',
            message: 'Akses admin berhasil diperbarui.',
            data: { nama: nextName, email: nextEmail, admin_token: adminToken }
          });
        }

        case 'create_order': {
          const coEmail = String(body.email || "").toLowerCase().trim();
          const coNama = String(body.nama || "");
          const coWa = String(body.whatsapp || "");
          let total = 0;
          const cookieHeader = request.headers.get("cookie") || "";
          const metaFbp = String(body.fbp || body._fbp || getCookieValue(cookieHeader, "_fbp") || "").trim();
          let metaFbc = String(body.fbc || body._fbc || getCookieValue(cookieHeader, "_fbc") || "").trim();
          const fbclid = String(body.fbclid || "").trim();
          if (!metaFbc && fbclid) metaFbc = "fb.1." + Date.now() + "." + fbclid;
          const metaClientIp = String(request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "").split(",")[0].trim();
          const metaUserAgent = String(body.user_agent || request.headers.get("user-agent") || "").trim();
          
          let rawId = body.id || body.id_produk || body.product_id || body.produk_id || "";
          if (String(rawId).toLowerCase() === "undefined" || String(rawId).toLowerCase() === "null") rawId = "";
          const coProdId = String(rawId).toUpperCase();
          const productCheckoutRow = await env.DB.prepare("SELECT * FROM access_rules WHERE UPPER(id_produk) = ?").bind(coProdId).first();
          if (!productCheckoutRow) return jsonRes({ status: 'error', message: 'Produk tidak ditemukan.' });
          const pRowData = productCheckoutRow;
          const takeBumpVal = String(body.take_bump || "false").toLowerCase();
          const isBump = isTruthyOrderValue(takeBumpVal);
          const activeBumpPrice = isBump && String(pRowData.bump_status || "").trim() === "Active" ? (Number(pRowData.bump_price) || 0) : 0;
          const productBillingType = normalizeBillingType(pRowData.billing_type || "");
          const productQuantity = isPhysicalProduct(productCheckoutRow) ? normalizeOrderQuantity(body.quantity || body.qty || body.jumlah_produk || body.jumlah || 1) : 1;
          const stockQtyAvailable = Math.max(0, Math.floor(Number(pRowData.stock_qty || 0)));
          if (isPhysicalProduct(productCheckoutRow) && stockQtyAvailable > 0 && productQuantity > stockQtyAvailable) {
            return jsonRes({ status: 'error', message: `Stok produk hanya tersedia ${stockQtyAvailable} pcs.` }, 400);
          }
          const upgradeFromProductId = cleanProductId(body.upgrade_from_product_id || body.upgrade_from || body.source_product_id || "");
          const upgradeInfo = await resolveCheckoutUpgrade(env, {
            email: coEmail,
            sourceProductId: upgradeFromProductId,
            targetProductId: coProdId,
            targetProductRow: productCheckoutRow
          });
          if (!upgradeInfo.ok) return jsonRes({ status: 'error', message: upgradeInfo.message }, 400);
          const checkoutUnitPrice = upgradeInfo.active ? upgradeInfo.basePrice : (Number(pRowData.harga) || 0);
          const checkoutBasePrice = checkoutUnitPrice * productQuantity;
          const couponCode = normalizeCouponCode(body.kupon || body.coupon_code || body.kode_promo || "");
          let couponDiscount = 0;
          if (couponCode) {
            const couponResult = await validateCouponForCheckout(env, { ...body, code: couponCode, id_produk: coProdId, harga: checkoutBasePrice, email: coEmail });
            if (!couponResult.ok) return jsonRes({ status: 'error', message: couponResult.message }, 400);
            couponDiscount = Number(couponResult.discount) || 0;
          }
          const productSubtotal = Math.max(0, checkoutBasePrice - couponDiscount + activeBumpPrice);
          const shippingSnapshot = await validateOrderShipping(env, settings, productCheckoutRow, body);
          if (shippingSnapshot.required && !shippingSnapshot.ok) {
            return jsonRes({ status: 'error', message: shippingSnapshot.message || 'Ongkir wajib dipilih untuk produk fisik.' }, 400);
          }
          total = productSubtotal + (Number(shippingSnapshot.fee) || 0);
          const isFreeOrder = total <= 0;
          const payMethod = isFreeOrder ? "free" : String(body.metode_pembayaran || body.payment_channel || "manual").toLowerCase();
          const paymentChannel = isFreeOrder ? "free" : String(body.payment_channel || "bank1").toLowerCase();
          if (!isFreeOrder && !isProductPaymentAllowed(productCheckoutRow, payMethod, paymentChannel)) {
            return jsonRes({ status: 'error', message: 'Metode pembayaran ini tidak tersedia untuk produk tersebut. Silakan pilih metode lain.' }, 400);
          }
          const isNotivgoQris = !isFreeOrder && payMethod === 'notivgo';
          if (isNotivgoQris && (paymentChannel !== 'qris' || !isNotivgoQrisEnabled(settings))) {
            return jsonRes({ status: 'error', message: 'QRIS NotivGo tidak tersedia. Silakan pilih metode lain.' }, 400);
          }
          const isManualPayment = !isFreeOrder && !isNotivgoQris && !payMethod.includes('xendit') && !payMethod.includes('tripay') && !payMethod.includes('duitku') && !payMethod.includes('midtrans');
          const rawAffiliate = cleanAffiliateRef(body.affiliate || body.aff_id);
          const finalAffiliate = rawAffiliate || "-";
          await ensureAffiliateSchema(env);
          await ensurePaymentSnapshotSchema(env);

          if (isManualPayment || (isNotivgoQris && settingFlag(settings.notivgo_qris_unique_code, true))) {
              const kodeUnik = Math.floor(Math.random() * 899) + 100;
              total = total + kodeUnik;
          }

          let passAccount = "";
          let isNewUser = false;
          const existUsr = await env.DB.prepare("SELECT * FROM users WHERE LOWER(email) = ?").bind(coEmail).first();
          if (existUsr) {
            passAccount = existUsr.password;
            if (rawAffiliate && !cleanAffiliateRef(existUsr.affiliate) && !affiliateRefMatchesUser(existUsr, rawAffiliate)) {
              try { await env.DB.prepare("UPDATE users SET affiliate = ? WHERE LOWER(email) = ?").bind(rawAffiliate, coEmail).run(); } catch(e) {}
            }
          } else {
            isNewUser = true;
            passAccount = Math.random().toString(36).slice(-6);
            await env.DB.prepare("INSERT INTO users (id_user, email, password, nama, role, tanggal_daftar, whatsapp, affiliate) VALUES (?,?,?,?,'member',?,?,?)")
                  .bind('USR-'+Date.now(), coEmail, passAccount, coNama, new Date().toISOString(), coWa, finalAffiliate).run();
          }

          const bumpProductInfo = isBump ? await resolveBumpProduct(env, { ...body, take_bump: takeBumpVal }, pRowData || {}) : { id: "", title: "", url: "", isCloudMember: false };
          const affiliateChain = await buildAffiliateChain(env, rawAffiliate, coEmail, 3);
          const komisiRates = [Number(pRowData && pRowData.komisi) || 0, Number(pRowData && pRowData.komisi_l2) || 0, Number(pRowData && pRowData.komisi_l3) || 0];
          const affiliateRefs = [affiliateChain[0]?.ref || "", affiliateChain[1]?.ref || "", affiliateChain[2]?.ref || ""];
          const komisiLevels = affiliateRefs.map((ref, idx) => ref && komisiRates[idx] > 0 ? (total * komisiRates[idx]) / 100 : 0);
          let nilaiKomisi = komisiLevels[0] || 0;

          const inv = 'INV-' + Math.floor(10000 + Math.random() * 90000);
          //  TUKANG BANGUNAN OTOMATIS: Tambah kolom license_key jika belum ada
          await ensureD1Schema(env);

          // Lisensi CLOUDP diklaim dari stok saat order lunas agar stok manual tidak terpakai untuk order pending.
          let genLicense = "";
         // INJEKSI KOLOM take_bump & license_key KE DATABASE D1
          await env.DB.prepare("INSERT INTO orders (invoice, email, nama, whatsapp, id_produk, nama_produk, harga_total, quantity, unit_price, status, tanggal_order, affiliate, komisi, reminder_level, take_bump, license_key, meta_fbp, meta_fbc, meta_client_ip, meta_user_agent, affiliate_l1, affiliate_l2, affiliate_l3, komisi_l1, komisi_l2, komisi_l3, billing_type, subscription_started_at, subscription_expires_at, subscription_reminder_level, coupon_code, coupon_discount, upgrade_from_product_id, upgrade_target_price, upgrade_credit_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
                 .bind(inv, coEmail, coNama, coWa, coProdId, body.nama_produk, total, productQuantity, checkoutUnitPrice, isFreeOrder ? 'Lunas' : 'Pending', new Date().toISOString(), finalAffiliate, nilaiKomisi, 0, takeBumpVal, genLicense, metaFbp, metaFbc, metaClientIp, metaUserAgent, affiliateRefs[0], affiliateRefs[1] || "", affiliateRefs[2] || "", komisiLevels[0] || 0, komisiLevels[1] || 0, komisiLevels[2] || 0, productBillingType, "", "", 0, couponCode, couponDiscount, upgradeInfo.active ? upgradeInfo.sourceId : "", upgradeInfo.active ? upgradeInfo.targetPrice : 0, upgradeInfo.active ? upgradeInfo.creditAmount : 0).run();
          if (shippingSnapshot.required) {
            try {
              await env.DB.prepare(`
                UPDATE orders
                SET shipping_required = 'Yes', shipping_provider = ?, shipping_courier = ?, shipping_service = ?,
                    shipping_service_name = ?, shipping_fee = ?, shipping_eta = ?,
                    shipping_destination_area_id = ?, shipping_destination_area_name = ?, shipping_destination_postal_code = ?,
                    shipping_address = ?, shipping_note = ?
                WHERE invoice = ?
              `).bind(
                shippingSnapshot.provider || normalizeShippingProvider(settings),
                shippingSnapshot.courier || "",
                shippingSnapshot.service || "",
                shippingSnapshot.service_name || "",
                Number(shippingSnapshot.fee) || 0,
                shippingSnapshot.eta || "",
                shippingSnapshot.destination_area_id || "",
                shippingSnapshot.destination_area_name || "",
                shippingSnapshot.destination_postal_code || "",
                shippingSnapshot.address || "",
                shippingSnapshot.note || "",
                inv
              ).run();
            } catch(e) {
              console.log("Shipping snapshot save failed:", e.message);
            }
          }
          if (isBump) {
            try {
              await env.DB.prepare(`
                UPDATE orders
                SET bump_product_id = ?, bump_title_snapshot = ?, bump_url_snapshot = ?
                WHERE invoice = ?
              `).bind(bumpProductInfo.id || "", bumpProductInfo.title || "", bumpProductInfo.url || "", inv).run();
            } catch(e) {}
          }
          try { await addToAutoresponder(settings, coNama, coEmail, coWa); } catch(e){}

          if (isFreeOrder) {
            try {
              await env.DB.prepare(`
                UPDATE orders
                SET payment_method = 'free', payment_channel = 'free', payment_name = 'Gratis',
                    payment_code = '', payment_owner = '', payment_url = '', payment_qr_url = '',
                    payment_instruction = 'Akses produk dibuka tanpa pembayaran.'
                WHERE invoice = ?
              `).bind(inv).run();
            } catch(e) {
              console.log("Free order payment snapshot save failed:", e.message);
            }

            try {
              const freeOrder = await env.DB.prepare("SELECT * FROM orders WHERE invoice = ?").bind(inv).first();
              if (freeOrder) await sendPaidNotification(freeOrder, settings, env);
            } catch(e) {
              console.log("Free order notification error:", e.message);
            }

            return jsonRes({
              status: 'success',
              invoice: inv,
              tagihan: 0,
              payment_url: '',
              metode_pembayaran: 'free',
              payment_channel: 'free',
              is_new_user: isNewUser,
              password: passAccount
            });
          }

          let pUrl = "#";
          let tripayData = null;
          let notivgoQrisData = null;
          
          try {
            if (payMethod.includes('xendit')) pUrl = await createXendit(inv, total, body, settings);
            else if (payMethod.includes('tripay')) {
                const tRes = await createTripay(inv, total, body, settings);
                if (typeof tRes === 'object' && tRes.direct_payment) { tripayData = tRes; pUrl = "DIRECT"; } else { pUrl = tRes; }
            }
            else if (payMethod.includes('duitku')) pUrl = await createDuitku(inv, total, body, settings);
            else if (payMethod.includes('midtrans')) pUrl = await createMidtrans(inv, total, body, settings);
            else if (isNotivgoQris) notivgoQrisData = await createNotivgoQris(env, settings, inv, total);
          } catch (e) {
            const gatewayError = safeNotificationError(settings, e);
            console.error('create_order gateway error', { invoice: inv, gateway: payMethod, error: gatewayError });
            try {
              await env.DB.prepare("UPDATE orders SET status = 'Failed', payment_instruction = ? WHERE invoice = ? AND status = 'Pending'")
                .bind('Gateway error: ' + gatewayError, inv).run();
            } catch (statusError) {
              console.error('create_order failed to mark invoice as Failed', { invoice: inv, error: String(statusError && statusError.message ? statusError.message : statusError) });
            }
            if (isNotivgoQris) await env.DB.prepare('UPDATE orders SET notivgo_error=? WHERE invoice=?').bind(gatewayError, inv).run();
            return jsonRes({ status: 'error', invoice: inv, message: isNotivgoQris ? notivgoCheckoutError(e, inv) : 'Metode pembayaran sedang bermasalah. Hubungi admin dengan referensi ' + inv + ', atau pilih metode pembayaran lain.' });
          }

          const loginUrl = (settings.site_url || "") + "/member";
          const manualPayment = isManualPayment ? getManualPaymentDetails(settings, paymentChannel) : null;
          const gatewayPaymentName = getGatewayPaymentLabel(payMethod, paymentChannel);
          const bankName = tripayData ? (tripayData.payment_name || gatewayPaymentName) : (manualPayment ? manualPayment.method : gatewayPaymentName);
          const bankNorek = tripayData ? (tripayData.pay_code || "") : (manualPayment ? manualPayment.account : "");
          const tripayMerchantName = String(settings.tripay_merchant_name || settings.site_name || settings.mail_sender_name || "Merchant Tripay").trim();
          let gatewayMerchantName = String(settings.bank_owner || settings.site_name || settings.mail_sender_name || "Merchant").trim();
          if (payMethod.includes('duitku')) gatewayMerchantName = String(settings.duitku_merchant_name || settings.site_name || settings.mail_sender_name || "Merchant Duitku").trim();
          else if (payMethod.includes('xendit')) gatewayMerchantName = String(settings.xendit_merchant_name || settings.site_name || settings.mail_sender_name || "Merchant Xendit").trim();
          else if (payMethod.includes('midtrans')) gatewayMerchantName = String(settings.midtrans_merchant_name || settings.site_name || settings.mail_sender_name || "Merchant Midtrans").trim();
          else if (isNotivgoQris) gatewayMerchantName = String(settings.notivgo_merchant_name || settings.site_name || 'Toko').trim();
          const bankOwner = tripayData ? tripayMerchantName : (manualPayment ? manualPayment.owner : gatewayMerchantName);
          const tagihanAkhir = tripayData ? tripayData.amount : total;
          const formattedTotal = "Rp " + Number(tagihanAkhir).toLocaleString('id-ID');
          const tripayCheckoutUrl = tripayData && tripayData.checkout_url ? String(tripayData.checkout_url) : "";
          const qrisImageUrl = notivgoQrisData ? notivgoQrisData.qr_url : ((tripayData && tripayData.qr_url) ? String(tripayData.qr_url) : (manualPayment && manualPayment.type === "qris" ? String(manualPayment.qrisUrl || "") : ""));
          
          const txtManualWA = manualPayment && manualPayment.type === "qris"
            ? ` *QRIS Manual*\n Atas Nama: *${bankOwner}*\n Nominal: *${formattedTotal}*\n\nSilakan scan QRIS berikut:\n${qrisImageUrl || "-"}\n\n️ _PENTING: Harap bayar nominal *TEPAT ${formattedTotal}* lalu kirim bukti pembayaran ke admin._`
            : ` *${bankName}*\n Rek / VA: *${bankNorek}*\n Atas Nama: *${bankOwner}*\n\n️ _PENTING: Harap bayar nominal *TEPAT ${formattedTotal}* agar otomatis diverifikasi._`;
          
          //  CEK ORDER BUMP UNTUK NOTIFIKASI PENDING 
          const bumpTitle = String((bumpProductInfo && bumpProductInfo.title) || body.bump_title || (pRowData && pRowData.bump_title) || "Order Bump").trim();
          const textBumpWA = isBump ? `\n *Order Tambahan:* ${bumpTitle}` : "";
          const textBumpEmail = isBump ? `<br><small style="color:#d97706; font-weight:bold;">+ ${escapeHtml(bumpTitle)}</small>` : "";
          const infoBumpText = isBump ? `Order Tambahan: ${bumpTitle}` : "";
          const quantityInfoText = productQuantity > 1 ? `Jumlah: ${productQuantity} pcs` : "";
          const quantityInfoEmail = productQuantity > 1 ? `<br><small style="color:#475569; font-weight:bold;">Jumlah: ${productQuantity} pcs</small>` : "";
          const shippingInfoText = shippingSnapshot.required
            ? `Kurir: ${shippingSnapshot.service_name || "-"}\nOngkir: Rp ${Number(shippingSnapshot.fee || 0).toLocaleString('id-ID')}\nTujuan: ${shippingSnapshot.destination_area_name || "-"}\nAlamat: ${shippingSnapshot.address || "-"}`
            : "";
          const shippingInfoEmail = shippingSnapshot.required
            ? `<br><small style="color:#0369a1; font-weight:bold;">Ongkir: Rp ${Number(shippingSnapshot.fee || 0).toLocaleString('id-ID')} - ${escapeHtml(shippingSnapshot.service_name || '')}</small>`
            : "";
          const gatewayRedirectUrl = tripayData && tripayData.redirect_to_tripay ? tripayCheckoutUrl : "";
          const paymentDetailInstruction = isManualPayment
            ? buildManualPaymentInstruction({
                type: qrisImageUrl ? "qris" : "bank",
                method: bankName,
                account: bankNorek,
                owner: bankOwner,
                qrisUrl: qrisImageUrl
              }, formattedTotal)
            : buildGatewayPaymentInstruction({
                method: bankName || getGatewayPaymentLabel(payMethod, paymentChannel),
                account: bankNorek,
                owner: bankOwner || getGatewayOwner(settings, payMethod),
                qrisUrl: qrisImageUrl,
                paymentLink: gatewayRedirectUrl
              }, formattedTotal);
          const instruksiPembayaran = isNotivgoQris ? `Pembayaran QRIS NotivGo sebesar ${formattedTotal}. Buka tautan pembayaran invoice untuk melihat QRIS.` : (isUsablePaymentLink(pUrl) ? pUrl : (gatewayRedirectUrl || paymentDetailInstruction || txtManualWA));
          const linkPembayaran = isUsablePaymentLink(pUrl) ? pUrl : gatewayRedirectUrl;
          try {
            await env.DB.prepare(`
              UPDATE orders
              SET payment_method = ?, payment_channel = ?, payment_name = ?, payment_code = ?,
                  payment_owner = ?, payment_url = ?, payment_qr_url = ?, payment_instruction = ?
              WHERE invoice = ?
            `).bind(
              isManualPayment ? "manual" : payMethod,
              paymentChannel,
              bankName,
              bankNorek,
              bankOwner,
              linkPembayaran,
              qrisImageUrl,
              instruksiPembayaran,
              inv
            ).run();
          } catch(e) {
            console.log("Payment snapshot save failed:", e.message);
          }
          const paymentOrder = { invoice: inv };
          const invoicePaymentUrl = await ensureOrderPaymentUrl(env, { ...settings, site_url: url.origin }, paymentOrder);
          const paymentVerificationWarning = isManualPayment ? await setupOrderPaymentVerification(env, settings, inv, tagihanAkhir) : '';
          const templateVars = {
            nama: coNama,
            email: coEmail,
            whatsapp: coWa,
            invoice: inv,
            produk: body.nama_produk || "Pesanan Digital",
            total: formattedTotal,
            metode: bankName,
            rekening: bankNorek,
            atas_nama: bankOwner,
            qris_url: invoicePaymentUrl,
            login_url: loginUrl,
            password: passAccount,
            instruksi_pembayaran: `Pembayaran ${bankName}\nNominal: ${formattedTotal}\n\nLihat rekening / QRIS dan status pembayaran:\n${invoicePaymentUrl}`,
            link_pembayaran: invoicePaymentUrl,
            jumlah_produk: String(productQuantity),
            unit_price: "Rp " + Number(checkoutUnitPrice).toLocaleString('id-ID'),
            info_bump: infoBumpText,
            info_pengiriman: [quantityInfoText, shippingInfoText].filter(Boolean).join("\n"),
            ongkir: shippingSnapshot.required ? "Rp " + Number(shippingSnapshot.fee || 0).toLocaleString('id-ID') : "",
            kurir: shippingSnapshot.service_name || "",
            alamat_pengiriman: shippingSnapshot.address || "",
            area_pengiriman: shippingSnapshot.destination_area_name || ""
          };
          if (paymentVerificationWarning) templateVars.instruksi_pembayaran += '\n\n' + paymentVerificationWarning;
          const defaultPendingWA = `Halo Kak *{nama}*\n\nTerima kasih, pesanan Anda telah kami terima:\nProduk: *{produk}*${textBumpWA}\nInvoice: *#{invoice}*\nTotal Tagihan: *{total}*\n\nINSTRUKSI PEMBAYARAN:\n{instruksi_pembayaran}\n\nDETAIL LOGIN\nURL: {login_url}\nEmail: {email}\nPass: {password}`;
          
          const msgPending = `Halo Kak *${coNama}* \n\nTerima kasih pesanan Anda telah kami terima:\n *Produk:* ${body.nama_produk}${textBumpWA}\n *Invoice:* #${inv}\n *Total Tagihan:* Rp ${tagihanAkhir.toLocaleString('id-ID')}\n\n *INSTRUKSI PEMBAYARAN:* \n${(pUrl !== "#" && pUrl !== "DIRECT") ? pUrl : txtManualWA}\n\n---\n *DETAIL LOGIN*\n *URL:* ${loginUrl}\n️ *Email:* ${coEmail}\n *Pass:* ${passAccount}`;
          
          const finalMsgPending = renderTemplate(settings.notif_pending_wa || defaultPendingWA, templateVars);
          const manualPaymentEmailBody = qrisImageUrl
            ? `<p style="margin:0; font-size:16px; font-weight:bold; color:#2563eb;">${escapeHtml(bankName)}</p><img src="${escapeHtml(qrisImageUrl)}" alt="QRIS Pembayaran" style="width:220px;max-width:100%;margin:12px auto 8px;display:block;border-radius:8px;border:1px solid #e2e8f0;"><p style="margin:0; color:#64748b; font-size:14px;">a.n ${escapeHtml(bankOwner)}</p>`
            : `<p style="margin:0; font-size:16px; font-weight:bold; color:#2563eb;">${escapeHtml(bankName)}</p><p style="margin:5px 0; font-size:24px; font-weight:900; letter-spacing:2px; color:#1e293b;">${escapeHtml(bankNorek)}</p><p style="margin:0; color:#64748b; font-size:14px;">a.n ${escapeHtml(bankOwner)}</p>`;
          const htmlManualEmail = `<div style="background:#f1f5f9; padding:20px; border-radius:8px; text-align:center; border: 2px dashed #cbd5e1; margin-top:20px;"><p style="margin:0 0 10px 0; color:#475569; font-size:14px;">Silakan bayar <strong>TEPAT</strong> sesuai nominal:</p><h2 style="margin:0 0 15px 0; color:#dc2626; font-size:28px;">${escapeHtml(formattedTotal)}</h2>${manualPaymentEmailBody}</div>`;
          const btnBayarEmail = `<div style="margin-top: 30px; text-align: center;"><a href="${templateVars.link_pembayaran}" style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 999px; font-weight: bold; display: inline-block;">BAYAR SEKARANG</a></div>`;
          const actionEmailHTML = (templateVars.link_pembayaran ? btnBayarEmail : htmlManualEmail) + (paymentVerificationWarning ? `<p>${escapeHtml(paymentVerificationWarning)}</p>` : '');
          const defaultPendingEmail = `Halo {nama},\n\nPesanan Anda telah dicatat dengan invoice #{invoice}. Silakan selesaikan pembayaran sebesar {total}.`;
          const pendingEmailCopy = textToEmailHtml(renderTemplate(settings.notif_pending_email || defaultPendingEmail, templateVars));
          
          const emailPendingHTML = `<div style="max-width: 600px; margin: auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;"><div style="background: #f59e0b; padding: 30px; text-align: center; color: white;"><h1 style="margin: 0; font-size: 24px;">Menunggu Pembayaran ⏳</h1></div><div style="padding: 30px; color: #1e293b;"><p>Halo <strong>${coNama}</strong>,</p><p>Pesanan Anda telah dicatat dengan invoice <strong>#${inv}</strong>.</p><table style="width: 100%; background: #f8fafc; border-radius: 8px; margin-top: 10px; border-collapse: collapse;"><tr><td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${body.nama_produk || "Pesanan Digital"}${quantityInfoEmail}${textBumpEmail}${shippingInfoEmail}</td><td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">Rp${Number(tagihanAkhir).toLocaleString('id-ID')}</td></tr></table>${actionEmailHTML}<h3 style="color: #64748b; margin-top: 40px; border-bottom: 1px solid #e2e8f0; padding-bottom:10px;"> Detail Akun Anda</h3><p><strong>Email Login:</strong> ${coEmail}<br><strong>Password:</strong> ${passAccount}<br><strong>URL Login:</strong> <a href="${loginUrl}" style="color: #2563eb;">Klik Disini</a></p></div></div>`;

          const finalEmailPendingHTML = `<div style="max-width: 600px; margin: auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;"><div style="background: #f59e0b; padding: 30px; text-align: center; color: white;"><h1 style="margin: 0; font-size: 24px;">Menunggu Pembayaran</h1></div><div style="padding: 30px; color: #1e293b;"><p>${pendingEmailCopy}</p><table style="width: 100%; background: #f8fafc; border-radius: 8px; margin-top: 10px; border-collapse: collapse;"><tr><td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${body.nama_produk || "Pesanan Digital"}${quantityInfoEmail}${textBumpEmail}${shippingInfoEmail}</td><td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">Rp${Number(tagihanAkhir).toLocaleString('id-ID')}</td></tr></table>${actionEmailHTML}<h3 style="color: #64748b; margin-top: 40px; border-bottom: 1px solid #e2e8f0; padding-bottom:10px;">Detail Akun Anda</h3><p><strong>Email Login:</strong> ${coEmail}<br><strong>Password:</strong> ${passAccount}<br><strong>URL Login:</strong> <a href="${loginUrl}" style="color: #2563eb;">Klik Disini</a></p></div></div>`;
          await sendOrderNotifications(env, settings, inv, 'pending', [
            { channel: 'wa', target: coWa, content: finalMsgPending },
            { channel: 'email', target: coEmail, subject: 'Menunggu Pembayaran: #' + inv, content: finalEmailPendingHTML }
          ]);
          try { const affiliateOrder = await env.DB.prepare("SELECT * FROM orders WHERE invoice = ?").bind(inv).first(); if (affiliateOrder) await sendAffiliateOrderNotification(env, settings, affiliateOrder, "order"); } catch(e) {}

          if (tripayData) { return jsonRes({ status: 'success', invoice: inv, tagihan: tripayData.amount, pay_code: tripayData.pay_code, qr_url: tripayData.qr_url, payment_name: tripayData.payment_name, payment_url: tripayData.redirect_to_tripay ? tripayData.checkout_url : undefined, tripay_redirect: tripayData.redirect_to_tripay, bank_owner: bankOwner, is_new_user: isNewUser, password: passAccount }); }
          return jsonRes({ status: 'success', invoice: inv, payment_url: pUrl, tagihan: total, bank_name: bankName, bank_norek: bankNorek, bank_owner: bankOwner, qr_url: qrisImageUrl, metode_pembayaran: isManualPayment ? "manual" : payMethod, is_new_user: isNewUser, password: passAccount, payment_verification_warning: paymentVerificationWarning, payment_expires_at: notivgoQrisData ? notivgoQrisData.expires_at : 0 });
        }
        case 'update_order_status': {
          const orderSebelumnya = await env.DB.prepare("SELECT * FROM orders WHERE invoice = ?").bind(body.id).first();
          if (!orderSebelumnya) return jsonRes({ status: 'error', message: 'Order tidak ditemukan' });
          if (orderSebelumnya.status === 'Lunas') return jsonRes({ status: 'success', message: 'Order sudah Lunas' });
          await env.DB.prepare("UPDATE orders SET status = 'Lunas' WHERE invoice = ?").bind(body.id).run();
          try { const orderTerbaru = await env.DB.prepare("SELECT * FROM orders WHERE invoice = ?").bind(body.id).first(); if (orderTerbaru) await sendPaidNotification(orderTerbaru, settings, env); } catch(err) {}
          return jsonRes({ status: 'success' });
        }

        case 'delete_order': {
          const invoice = String(body.invoice || body.id || "").trim();
          if (!invoice) return jsonRes({ status: 'error', message: 'Invoice wajib diisi.' }, 400);
          const existingOrder = await env.DB.prepare("SELECT invoice FROM orders WHERE invoice = ?").bind(invoice).first();
          if (!existingOrder) return jsonRes({ status: 'error', message: 'Order tidak ditemukan.' }, 404);
          await env.DB.prepare("DELETE FROM orders WHERE invoice = ?").bind(invoice).run();
          return jsonRes({ status: 'success', message: 'Order berhasil dihapus.' });
        }


        case 'save_product': {
          const p = body;
          const saveId = String(p.id || p.id_produk || "").toUpperCase();
          const productPaymentMethods = normalizeStoredProductPaymentMethods(p.payment_methods || "");
          const bumpProductId = cleanProductId(p.bump_product_id || p.bump_id || p.bump_produk_id || extractBumpProductIdFromUrl(p.bump_url || ""));
          let existingProductLicense = null;
          if (String(p.is_edit) === "true" && saveId) {
            try {
              existingProductLicense = await env.DB.prepare("SELECT license_enabled, license_mode FROM access_rules WHERE UPPER(id_produk) = ?").bind(saveId).first();
            } catch(e) {}
          }
          const fallbackLicenseEnabled = existingProductLicense && hasExplicitProductLicenseEnabled(existingProductLicense.license_enabled)
            ? existingProductLicense.license_enabled
            : (saveId === CLOUDMEMBER_PERSONAL_PRODUCT_ID ? "Yes" : "No");
          const productLicenseEnabled = normalizeProductLicenseEnabled(p.license_enabled, fallbackLicenseEnabled);
          const productLicenseMode = normalizeProductLicenseMode(p.license_mode, existingProductLicense && existingProductLicense.license_mode ? existingProductLicense.license_mode : "auto");
          const productBillingType = normalizeBillingType(p.billing_type || p.tipe_langganan || p.subscription_type || "");
          const productSubscriptionDays = Math.max(0, Math.floor(Number(p.subscription_days || p.durasi_langganan || 0)));
          const productLandingUrl = normalizeProductLandingInput(p.lp_url || p.url_landing_page || p.landing_page || p.url_lp || "", saveId);
          const productType = normalizeProductType(p.product_type || p.tipe_produk || p.jenis_produk || "");
          const weightGrams = Math.max(0, Math.ceil(Number(p.weight_grams || p.berat_gram || p.berat || 0)));
          const lengthCm = normalizePositiveNumber(p.length_cm || p.panjang_cm || p.panjang, 0);
          const widthCm = normalizePositiveNumber(p.width_cm || p.lebar_cm || p.lebar, 0);
          const heightCm = normalizePositiveNumber(p.height_cm || p.tinggi_cm || p.tinggi, 0);
          const stockQty = Math.max(0, Math.floor(Number(p.stock_qty || p.stok || p.stock || 0)));
          const upgradeToProducts = normalizeUpgradeProductTargets(p.upgrade_to_products || p.upgrade_products || p.upgrade_to || p.produk_upgrade || "")
            .filter(id => id && id !== saveId)
            .join(",");
          await ensureAffiliateSchema(env);

          // Kita bungkus semua proses database di dalam try agar jika error, catch menangkapnya
          try {
              if (String(p.is_edit) === "true") {
                  await env.DB.prepare(`
                      UPDATE access_rules
                      SET title=?, "desc"=?, url_akses=?, harga=?, status=?, lp_url=?, komisi=?, komisi_l2=?, komisi_l3=?,
                          bump_status=?, bump_title=?, bump_price=?, bump_desc=?, bump_url=?, bump_product_id=?,
                          gambar=?, kategori=?, harga_coret=?, pdf_drive_id=?, ga_id=?, meta_pixel_id=?, tiktok_pixel_id=?, payment_methods=?,
                          license_enabled=?, license_mode=?, billing_type=?, subscription_days=?,
                          product_type=?, weight_grams=?, length_cm=?, width_cm=?, height_cm=?, stock_qty=?, upgrade_to_products=?
                      WHERE UPPER(id_produk)=?
                  `)
                  .bind(p.title, p.desc, p.url, p.harga, p.status, productLandingUrl, p.komisi, p.komisi_l2 || 0, p.komisi_l3 || 0,
                        p.bump_status, p.bump_title, p.bump_price, p.bump_desc, p.bump_url, bumpProductId,
                        p.gambar, p.kategori || 'Umum', p.harga_coret || '', p.pdf_drive_id || '',
                        String(p.ga_id || '').trim(), String(p.meta_pixel_id || '').trim(), String(p.tiktok_pixel_id || '').trim(), productPaymentMethods,
                        productLicenseEnabled, productLicenseMode, productBillingType, productSubscriptionDays,
                        productType, weightGrams, lengthCm, widthCm, heightCm, stockQty, upgradeToProducts, saveId)
                  .run();
              } else {
                  await env.DB.prepare(`
                      INSERT INTO access_rules
                      (id_produk, title, "desc", url_akses, harga, status, lp_url, komisi, komisi_l2, komisi_l3,
                       bump_status, bump_title, bump_price, bump_desc, bump_url, bump_product_id, gambar,
                       kategori, harga_coret, pdf_drive_id, ga_id, meta_pixel_id, tiktok_pixel_id, payment_methods,
                        license_enabled, license_mode, billing_type, subscription_days,
                        product_type, weight_grams, length_cm, width_cm, height_cm, stock_qty, upgrade_to_products)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                  `)
                  .bind(saveId, p.title, p.desc, p.url, p.harga, p.status, productLandingUrl, p.komisi, p.komisi_l2 || 0, p.komisi_l3 || 0,
                        p.bump_status, p.bump_title, p.bump_price, p.bump_desc, p.bump_url, bumpProductId,
                        p.gambar, p.kategori || 'Umum', p.harga_coret || '', p.pdf_drive_id || '',
                        String(p.ga_id || '').trim(), String(p.meta_pixel_id || '').trim(), String(p.tiktok_pixel_id || '').trim(), productPaymentMethods,
                         productLicenseEnabled, productLicenseMode, productBillingType, productSubscriptionDays,
                         productType, weightGrams, lengthCm, widthCm, heightCm, stockQty, upgradeToProducts)
                  .run();
              }
              await bumpPublicCacheVersion(env);
              return jsonRes({ status: 'success' });
          } catch (e) {
              return jsonRes({ status: 'error', message: e.message });
          }
        }
        case 'bulk_save_products': {
          const products = Array.isArray(body.products) ? body.products : [];
          if (!products.length) return jsonRes({ status: 'error', message: 'Data produk kosong.' });
          if (products.length > 500) return jsonRes({ status: 'error', message: 'Maksimal 500 produk per import.' });

          await ensureAffiliateSchema(env);

          let imported = 0;
          let skipped = 0;
          const errors = [];

          for (let i = 0; i < products.length; i++) {
            const p = products[i] || {};
            const saveId = String(p.id || p.id_produk || "").trim().toUpperCase();
            const title = String(p.title || p.nama_produk || p.nama || "").trim();

            if (!saveId || !title) {
              skipped++;
              if (errors.length < 20) errors.push(`Baris ${i + 1}: ID produk atau nama produk kosong.`);
              continue;
            }

            const statusRaw = String(p.status || "Active").trim();
            const status = /^(inactive|nonaktif|draft|off)$/i.test(statusRaw) ? "Inactive" : "Active";
            const urlAkses = String(p.url || p.url_akses || "").trim() || `/akses-pdf.html?id=${encodeURIComponent(saveId)}`;
            const productPaymentMethods = normalizeStoredProductPaymentMethods(p.payment_methods || p.metode_pembayaran || "");
            const productLicenseEnabled = normalizeProductLicenseEnabled(p.license_enabled || p.berlisensi || p.produk_berlisensi || p.lisensi_produk || "", saveId === CLOUDMEMBER_PERSONAL_PRODUCT_ID ? "Yes" : "No");
            const productLicenseMode = normalizeProductLicenseMode(p.license_mode || p.mode_lisensi || p.sumber_lisensi || "", "auto");
            const bumpProductId = cleanProductId(p.bump_product_id || p.bump_id || p.bump_produk_id || extractBumpProductIdFromUrl(p.bump_url || ""));
            const productBillingType = normalizeBillingType(p.billing_type || p.tipe_langganan || p.subscription_type || p.langganan || "");
            const productSubscriptionDays = Math.max(0, Math.floor(Number(p.subscription_days || p.durasi_langganan || p.subscription_duration || 0)));
            const productLandingUrl = normalizeProductLandingInput(p.lp_url || p.url_landing_page || p.landing_page || p.url_lp || "", saveId);
            const productType = normalizeProductType(p.product_type || p.tipe_produk || p.jenis_produk || "");
            const weightGrams = Math.max(0, Math.ceil(Number(p.weight_grams || p.berat_gram || p.berat || 0)));
            const lengthCm = normalizePositiveNumber(p.length_cm || p.panjang_cm || p.panjang, 0);
            const widthCm = normalizePositiveNumber(p.width_cm || p.lebar_cm || p.lebar, 0);
            const heightCm = normalizePositiveNumber(p.height_cm || p.tinggi_cm || p.tinggi, 0);
            const stockQty = Math.max(0, Math.floor(Number(p.stock_qty || p.stok || p.stock || 0)));
            const upgradeToProducts = normalizeUpgradeProductTargets(p.upgrade_to_products || p.upgrade_products || p.upgrade_to || p.produk_upgrade || "")
              .filter(id => id && id !== saveId)
              .join(",");

            try {
              await env.DB.prepare(`
                INSERT INTO access_rules
                (id_produk, title, "desc", url_akses, harga, status, lp_url, komisi, komisi_l2, komisi_l3,
                 bump_status, bump_title, bump_price, bump_desc, bump_url, bump_product_id, gambar,
                 kategori, harga_coret, pdf_drive_id, ga_id, meta_pixel_id, tiktok_pixel_id, payment_methods,
                  license_enabled, license_mode, billing_type, subscription_days,
                  product_type, weight_grams, length_cm, width_cm, height_cm, stock_qty, upgrade_to_products)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(id_produk) DO UPDATE SET
                  title=excluded.title,
                  "desc"=excluded."desc",
                  url_akses=excluded.url_akses,
                  harga=excluded.harga,
                  status=excluded.status,
                  lp_url=excluded.lp_url,
                  komisi=excluded.komisi,
                  komisi_l2=excluded.komisi_l2,
                  komisi_l3=excluded.komisi_l3,
                  bump_status=excluded.bump_status,
                  bump_title=excluded.bump_title,
                  bump_price=excluded.bump_price,
                  bump_desc=excluded.bump_desc,
                  bump_url=excluded.bump_url,
                  bump_product_id=excluded.bump_product_id,
                  gambar=excluded.gambar,
                  kategori=excluded.kategori,
                  harga_coret=excluded.harga_coret,
                  pdf_drive_id=excluded.pdf_drive_id,
                  ga_id=excluded.ga_id,
                  meta_pixel_id=excluded.meta_pixel_id,
                  tiktok_pixel_id=excluded.tiktok_pixel_id,
                  payment_methods=excluded.payment_methods,
                  license_enabled=excluded.license_enabled,
                  license_mode=excluded.license_mode,
                  billing_type=excluded.billing_type,
                  subscription_days=excluded.subscription_days,
                  product_type=excluded.product_type,
                  weight_grams=excluded.weight_grams,
                  length_cm=excluded.length_cm,
                  width_cm=excluded.width_cm,
                  height_cm=excluded.height_cm,
                  stock_qty=excluded.stock_qty,
                  upgrade_to_products=excluded.upgrade_to_products
              `)
              .bind(
                saveId,
                title,
                String(p.desc || p.deskripsi || "").trim(),
                urlAkses,
                Number(p.harga) || 0,
                status,
                productLandingUrl,
                Number(p.komisi) || 0,
                Number(p.komisi_l2) || 0,
                Number(p.komisi_l3) || 0,
                String(p.bump_status || "Inactive").trim() || "Inactive",
                String(p.bump_title || "").trim(),
                Number(p.bump_price) || 0,
                String(p.bump_desc || "").trim(),
                String(p.bump_url || "").trim(),
                bumpProductId,
                String(p.gambar || p.url_gambar || "").trim(),
                String(p.kategori || "Ebook").trim() || "Ebook",
                Number(p.harga_coret) || 0,
                String(p.pdf_drive_id || "").trim(),
                String(p.ga_id || p.google_analytics_id || "").trim(),
                String(p.meta_pixel_id || p.facebook_pixel_id || "").trim(),
                String(p.tiktok_pixel_id || p.tiktok_pixel || p.tiktok_pixelid || p.tiktok_pixel_code || p.tt_pixel_id || "").trim(),
                productPaymentMethods,
                productLicenseEnabled,
                productLicenseMode,
                productBillingType,
                productSubscriptionDays,
                productType,
                weightGrams,
                lengthCm,
                widthCm,
                heightCm,
                stockQty,
                upgradeToProducts
              )
              .run();
              imported++;
            } catch(e) {
              skipped++;
              if (errors.length < 20) errors.push(`Baris ${i + 1}: ${e.message}`);
            }
          }

          await bumpPublicCacheVersion(env);
          return jsonRes({ status: 'success', imported, skipped, errors });
        }
        case 'save_coupon': {
          const code = normalizeCouponCode(body.code || body.kode_promo || "");
          if (!code) return jsonRes({ status: 'error', message: 'Kode kupon wajib diisi.' }, 400);
          const oldCode = normalizeCouponCode(body.old_code || "");
          if (oldCode && oldCode !== code) {
            try { await env.DB.prepare("DELETE FROM coupons WHERE UPPER(kode_promo) = ?").bind(oldCode).run(); } catch(e) {}
          }
          await env.DB.prepare(`
            INSERT OR REPLACE INTO coupons
            (kode_promo, tipe, nilai, status, berlaku_untuk_prod, usage_limit_total, usage_limit_per_customer, min_order_amount, expires_at)
            VALUES (?,?,?,?,?,?,?,?,?)
          `).bind(
            code,
            body.type || body.tipe,
            Number(body.val || body.nilai || 0),
            body.status || "Active",
            body.products || body.berlaku_untuk_prod || "All",
            normalizeCouponLimit(body.usage_limit_total || body.limit_total),
            normalizeCouponLimit(body.usage_limit_per_customer || body.limit_per_customer),
            Math.max(0, Number(body.min_order_amount || body.min_transaksi || 0)),
            String(body.expires_at || body.berlaku_sampai || "").trim()
          ).run();
          return jsonRes({ status: 'success' });
        }

        case 'delete_coupon': {
          await env.DB.prepare("DELETE FROM coupons WHERE kode_promo = ?").bind((body.code || body.kode_promo || "").toUpperCase()).run();
          return jsonRes({ status: 'success', message: 'Kupon dihapus' });
        }
case 'delete_product': {
          await env.DB.prepare("DELETE FROM access_rules WHERE UPPER(id_produk) = ?").bind(String(body.id || "").toUpperCase()).run();
          await bumpPublicCacheVersion(env);
          return jsonRes({ status: 'success', message: 'Produk dihapus' });
        }
        case 'bulk_delete_products': {
          const ids = Array.isArray(body.ids) ? body.ids : String(body.ids || "").split(",");
          const cleanIds = Array.from(new Set(ids.map(id => String(id || "").trim().toUpperCase()).filter(Boolean)));
          if (!cleanIds.length) return jsonRes({ status: 'error', message: 'Tidak ada produk yang dipilih.' });
          let deleted = 0;
          for (const id of cleanIds) {
            try {
              const result = await env.DB.prepare("DELETE FROM access_rules WHERE UPPER(id_produk) = ?").bind(id).run();
              deleted += Number(result.meta && result.meta.changes ? result.meta.changes : 0);
            } catch(e) {}
          }
          await bumpPublicCacheVersion(env);
          return jsonRes({ status: 'success', deleted, ids: cleanIds });
        }
        case 'save_page': {
          await ensurePageSeoSchema(env);
          let rawSlug = String(body.slug || body.title || "page-baru").trim().toLowerCase(); let cleanSlug = rawSlug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          const isEditMode = String(body.is_edit) === "true"; let reqId = String(body.id || body.id_page || "").trim();
          const seoTitle = String(body.seo_title || "").trim();
          const seoDescription = String(body.seo_description || "").trim();
          const seoKeywords = String(body.seo_keywords || "").trim();
          const seoImage = String(body.seo_image || "").trim();
          const pageGaId = String(body.ga_id || "").trim();
          const pageMetaPixelId = String(body.meta_pixel_id || "").trim();
          const pageTikTokPixelId = String(body.tiktok_pixel_id || "").trim();
          const pageCategory = String(body.category || body.kategori || "Umum").trim() || "Umum";
          const protectProducts = splitProductTargets(body.protect_products || body.protect_id || body.protect || "").join(",");
          const pageType = String(body.page_type || "page").trim().toLowerCase() === "blog" ? "blog" : "page";
          const canonicalUrl = String(body.canonical_url || "").trim();
          const author = String(body.author || "").trim();
          const publishedAt = String(body.published_at || "").trim();
          const excerpt = String(body.excerpt || "").trim();
          const structuredData = String(body.structured_data || "").trim();
          const updatedAt = new Date().toISOString();

          if (isEditMode && reqId !== "" && reqId.toLowerCase() !== "undefined" && reqId.toLowerCase() !== "null") {
              await env.DB.prepare("UPDATE pages SET slug=?, title=?, content=?, status=?, seo_title=?, seo_description=?, seo_keywords=?, seo_image=?, category=?, protect_products=?, ga_id=?, meta_pixel_id=?, tiktok_pixel_id=?, page_type=?, canonical_url=?, author=?, published_at=?, updated_at=?, excerpt=?, structured_data=? WHERE id_page=?").bind(cleanSlug, body.title, body.content, body.status || "Active", seoTitle, seoDescription, seoKeywords, seoImage, pageCategory, protectProducts, pageGaId, pageMetaPixelId, pageTikTokPixelId, pageType, canonicalUrl, author, publishedAt, updatedAt, excerpt, structuredData, reqId).run();
          } else {
              let newId = 'PG-' + Date.now() + Math.floor(Math.random() * 1000);
              const cekSlug = await env.DB.prepare("SELECT id_page FROM pages WHERE slug = ?").bind(cleanSlug).first();
              if (cekSlug) { cleanSlug = cleanSlug + '-' + Math.floor(Math.random() * 1000); }
              await env.DB.prepare("INSERT INTO pages (id_page, slug, title, content, status, tanggal_buat, seo_title, seo_description, seo_keywords, seo_image, category, protect_products, ga_id, meta_pixel_id, tiktok_pixel_id, page_type, canonical_url, author, published_at, updated_at, excerpt, structured_data) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(newId, cleanSlug, body.title, body.content, body.status || "Active", new Date().toLocaleDateString(), seoTitle, seoDescription, seoKeywords, seoImage, pageCategory, protectProducts, pageGaId, pageMetaPixelId, pageTikTokPixelId, pageType, canonicalUrl, author, publishedAt || updatedAt, updatedAt, excerpt, structuredData).run();
          }
          let cacheMessage = "";
          try {
            const purgeResult = await purgeCloudflareCache(settings);
            if (!purgeResult.skipped) cacheMessage = " Cache Cloudflare dibersihkan.";
          } catch (e) {
            console.log("Purge cache after save_page failed:", e.message);
          }
          await bumpPublicCacheVersion(env);
          return jsonRes({ status: 'success', message: `Halaman disimpan.${cacheMessage}` });
        }

        case 'delete_page': {
          await env.DB.prepare("DELETE FROM pages WHERE id_page = ?").bind(body.id).run();
          await bumpPublicCacheVersion(env);
          return jsonRes({ status: 'success', message: 'Halaman dihapus' });
        }

        case 'update_settings': {
          for (const [k, v] of Object.entries(body.payload || {})) { 
              if (['notivgo_api_key', 'notivgo_webhook_secret'].includes(k) && !String(v || '').trim()) continue;
              const reminderMatch = String(k).match(/^notif_reminder_(wa|email)_([123])$/);
              const value = reminderMatch ? normalizePendingReminderTemplate(v, reminderMatch[2]) : v;
              await env.DB.prepare("INSERT OR REPLACE INTO settings (kunci, nilai) VALUES (?, ?)").bind(k, String(value)).run();
          }
          await bumpPublicCacheVersion(env);
          return jsonRes({ status: 'success' });
        }

        case 'get_system_backup_info': {
          const data = await buildSystemBackupInfo(env, settings);
          return jsonRes({ status: 'success', data });
        }

        case 'trigger_cloudflare_update': {
          try {
            const deployment = await triggerCloudflarePagesDeployment(env, settings, body);
            return jsonRes({
              status: 'success',
              message: 'Deployment Cloudflare Pages berhasil dikirim.',
              data: deployment
            });
          } catch (e) {
            return jsonRes({ status: 'error', message: e.message || 'Update Cloudflare gagal diproses.' }, 400);
          }
        }

        case 'register_client_update_target': {
          try {
            const data = await registerClientUpdateTargetToMaster(env, settings, body, request);
            return jsonRes({ status: 'success', message: 'Website ini berhasil didaftarkan ke master update.', data });
          } catch (e) {
            return jsonRes({ status: 'error', message: e.message || 'Registrasi ke master update gagal.' }, 400);
          }
        }

        case 'get_registered_update_clients': {
          const clients = await listRegisteredUpdateClients(env, { onlyEnabled: false });
          return jsonRes({
            status: 'success',
            clients: clients.map(client => ({
              name: client.name,
              enabled: client.enabled,
              account_id: client.account_id,
              project_name: client.project_name,
              branch: client.branch,
              domain: client.domain,
              site_url: client.site_url,
              client_version: client.client_version,
              license_email: client.license_email,
              license_product: client.license_product,
              last_registered_at: client.last_registered_at,
              token_masked: client.token_masked
            })),
            total: clients.length
          });
        }

        case 'export_mysql_backup': {
          const sql = await buildMysqlBackup(env, settings);
          const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
          const fileName = `${APP_NAME}-d1-mysql-backup-${stamp}.sql`;
          return new Response(sql, {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/sql; charset=utf-8",
              "Content-Disposition": `attachment; filename="${fileName}"`,
              "Cache-Control": "no-store"
            }
          });
        }

        case 'bulk_import_members': {
          await ensureD1Schema(env);
          const rows = Array.isArray(body.rows || body.members) ? (body.rows || body.members) : [];
          let imported = 0;
          let skipped = 0;
          const errors = [];
          for (const row of rows) {
            const email = normalizeImportEmail(readImportField(row, ["email", "alamat_email", "user_email"]));
            const nama = readImportField(row, ["nama", "name", "nama_lengkap", "customer"]);
            if (!email || !email.includes("@")) {
              skipped++;
              continue;
            }
            const whatsapp = readImportField(row, ["whatsapp", "wa", "no_wa", "phone", "telepon"]);
            const password = readImportField(row, ["password", "pass", "kata_sandi"]) || Math.random().toString(36).slice(-8);
            const affiliate = readImportField(row, ["affiliate", "ref", "sponsor"]) || "-";
            const role = readImportField(row, ["role", "peran"]) || "member";
            const status = normalizeImportStatus(readImportField(row, ["status"]), "Active");
            const tanggal = normalizeImportDate(readImportField(row, ["tanggal_daftar", "tanggal", "created_at"]));
            try {
              await env.DB.prepare(`
                INSERT INTO users (id_user, email, password, nama, role, tanggal_daftar, whatsapp, affiliate, status, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'import')
                ON CONFLICT(email) DO UPDATE SET
                  password = COALESCE(NULLIF(excluded.password, ''), users.password),
                  nama = COALESCE(NULLIF(excluded.nama, ''), users.nama),
                  whatsapp = COALESCE(NULLIF(excluded.whatsapp, ''), users.whatsapp),
                  affiliate = COALESCE(NULLIF(excluded.affiliate, ''), users.affiliate),
                  status = COALESCE(NULLIF(excluded.status, ''), users.status)
              `).bind("USR-" + Date.now() + "-" + imported, email, password, nama || email.split("@")[0], role, tanggal, whatsapp, affiliate, status).run();
              imported++;
            } catch(e) {
              skipped++;
              if (errors.length < 10) errors.push(`${email}: ${e.message}`);
            }
          }
          let assigned = 0;
          try { assigned = await backfillPaidOrderLicenses(env, body.product_id || ""); } catch(e) {}
          return jsonRes({ status: "success", imported, skipped, assigned, errors });
        }

        case 'bulk_import_orders': {
          await ensureD1Schema(env);
          const rows = Array.isArray(body.rows || body.orders) ? (body.rows || body.orders) : [];
          let imported = 0;
          let skipped = 0;
          const errors = [];
          for (const row of rows) {
            const email = normalizeImportEmail(readImportField(row, ["email", "customer_email", "alamat_email"]));
            const invoice = readImportField(row, ["invoice", "id_order", "order_id"]) || `INV-IMPORT-${Date.now()}-${imported + 1}`;
            if (!email || !invoice) {
              skipped++;
              continue;
            }
            const idProduk = cleanProductId(readImportField(row, ["id_produk", "product_id", "produk_id", "kode_produk"]));
            const namaProduk = readImportField(row, ["nama_produk", "produk", "product_name", "title"]);
            const harga = Number(String(readImportField(row, ["harga_total", "total", "nominal", "amount"]) || "0").replace(/[^\d.-]/g, "")) || 0;
            const licenseKey = normalizeLicenseKey(readImportField(row, ["license_key", "lisensi", "kode_lisensi"]));
            try {
              await env.DB.prepare(`
                INSERT OR REPLACE INTO orders (invoice, email, nama, whatsapp, id_produk, nama_produk, harga_total, status, tanggal_order, affiliate, komisi, reminder_level, license_key, payment_method, payment_channel)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                invoice,
                email,
                readImportField(row, ["nama", "customer", "name"]) || email.split("@")[0],
                readImportField(row, ["whatsapp", "wa", "phone"]),
                idProduk,
                namaProduk || idProduk,
                harga,
                normalizeImportStatus(readImportField(row, ["status"]), "Pending"),
                normalizeImportDate(readImportField(row, ["tanggal_order", "tanggal", "created_at"])),
                readImportField(row, ["affiliate", "ref"]) || "-",
                Number(readImportField(row, ["komisi", "commission"]) || 0) || 0,
                Number(readImportField(row, ["reminder_level"]) || 0) || 0,
                licenseKey,
                readImportField(row, ["payment_method", "metode_pembayaran"]) || "import",
                readImportField(row, ["payment_channel", "channel"]) || ""
              ).run();
              imported++;
            } catch(e) {
              skipped++;
              if (errors.length < 10) errors.push(`${invoice}: ${e.message}`);
            }
          }
          return jsonRes({ status: "success", imported, skipped, errors });
        }

        case 'bulk_import_license_stock': {
          await ensureD1Schema(env);
          const rows = Array.isArray(body.rows || body.licenses) ? (body.rows || body.licenses) : [];
          let imported = 0;
          let skipped = 0;
          const errors = [];
          for (const row of rows) {
            const productId = cleanProductId(readImportField(row, ["product_id", "id_produk", "produk", "kode_produk"]) || body.product_id || "ALL");
            const key = normalizeLicenseKey(readImportField(row, ["license_key", "lisensi", "kode_lisensi", "license"]));
            if (!isValidLicenseStockKey(key)) {
              skipped++;
              continue;
            }
            try {
              const result = await env.DB.prepare("INSERT OR IGNORE INTO license_stock (product_id, license_key, status, created_at, note) VALUES (?, ?, 'Available', ?, ?)")
                .bind(productId || "ALL", key, new Date().toISOString(), readImportField(row, ["note", "catatan"]) || "").run();
              if (result.meta && result.meta.changes === 0) skipped++;
              else imported++;
            } catch(e) {
              skipped++;
              if (errors.length < 10) errors.push(`${key}: ${e.message}`);
            }
          }
          return jsonRes({ status: "success", imported, skipped, errors });
        }

        case 'generate_license_stock': {
          await ensureD1Schema(env);
          const productId = cleanProductId(body.product_id || "ALL") || "ALL";
          const count = Math.min(500, Math.max(1, Number(body.count || 1) || 1));
          let imported = 0;
          for (let i = 0; i < count; i++) {
            let inserted = false;
            for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
              const key = generateLicenseKey25();
              const result = await env.DB.prepare("INSERT OR IGNORE INTO license_stock (product_id, license_key, status, created_at, note) VALUES (?, ?, 'Available', ?, 'auto-generate')")
                .bind(productId, key, new Date().toISOString()).run();
              inserted = !(result.meta && result.meta.changes === 0);
              if (inserted) imported++;
            }
          }
          let assigned = 0;
          try { assigned = await backfillPaidOrderLicenses(env, productId); } catch(e) {}
          return jsonRes({ status: "success", imported, assigned, product_id: productId });
        }

        case 'delete_member': {
          const email = normalizeImportEmail(body.email || "");
          const idUser = String(body.id_user || body.id || "").trim();
          if (!email && !idUser) return jsonRes({ status: "error", message: "Member belum dipilih." }, 400);
          const user = email
            ? await env.DB.prepare("SELECT * FROM users WHERE LOWER(email) = ?").bind(email).first()
            : await env.DB.prepare("SELECT * FROM users WHERE id_user = ? OR id = ?").bind(idUser, idUser).first();
          if (!user) return jsonRes({ status: "error", message: "Member tidak ditemukan." }, 404);
          if (String(user.role || "").toLowerCase() === "admin") return jsonRes({ status: "error", message: "Akun admin tidak boleh dihapus dari menu member." }, 400);
          await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(user.id).run();
          return jsonRes({ status: "success", message: "Member dihapus." });
        }

        case 'test_wa_gateway': {
          const allowedOverrideKeys = ["wa_gateway", "wa_api_url", "wa_token", "wa_sender", "wa_admin"];
          const overrides = {};
          const rawOverrides = body.settings_override && typeof body.settings_override === "object" ? body.settings_override : {};
          for (const key of allowedOverrideKeys) {
            if (rawOverrides[key] !== undefined) overrides[key] = String(rawOverrides[key] || "");
          }
          const testSettings = { ...settings, ...overrides };
          const targetWa = normalizePhone(body.target || testSettings.wa_admin || "");
          if (!targetWa) return jsonRes({ status: 'error', message: 'Nomor WA Admin belum diisi atau belum valid.' });

          const providerName = String(testSettings.wa_gateway || "onesender").trim() || "onesender";
          const testMessage = `Tes notifikasi CloudMember via ${providerName} berhasil. Waktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`;
          const result = await sendWA(testSettings, targetWa, testMessage, { detailed: true });
          if (result.ok) {
            return jsonRes({ status: 'success', message: `Tes WhatsApp berhasil dikirim via ${result.provider || providerName}.` });
          }
          return jsonRes({ status: 'error', message: result.message || 'Tes WhatsApp gagal. Periksa token, endpoint, dan status device gateway.' });
        }

        case 'test_meta_capi': {
          const allowedOverrideKeys = ["meta_pixel_id", "meta_access_token", "meta_test_event_code", "meta_currency", "currency", "site_url", "meta_graph_api_version"];
          const overrides = {};
          const rawOverrides = body.settings_override && typeof body.settings_override === "object" ? body.settings_override : {};
          for (const key of allowedOverrideKeys) {
            if (rawOverrides[key] !== undefined) overrides[key] = String(rawOverrides[key] || "");
          }
          const testSettings = { ...settings, ...overrides };
          const latestPaidOrder = await env.DB.prepare("SELECT * FROM orders WHERE status IN ('Lunas', 'Success') ORDER BY rowid DESC LIMIT 1").first();
          if (!latestPaidOrder) return jsonRes({ status: 'error', message: 'Belum ada order lunas untuk pengujian Meta CAPI.' });

          try {
            const result = await sendMetaPurchase(latestPaidOrder, testSettings, env, { testMode: true, force: true });
            if (!result.sent) return jsonRes({ status: 'error', message: result.reason || 'Meta CAPI tidak menerima event test.' });
            return jsonRes({
              status: 'success',
              message: `Meta menerima ${result.events_received} event Purchase test. Event ID: ${result.event_id}`,
              data: result
            });
          } catch(e) {
            return jsonRes({ status: 'error', message: `Meta CAPI gagal: ${e.message}` });
          }
        }

        case 'sync_meta_purchases': {
          const allowedOverrideKeys = ["meta_pixel_id", "meta_access_token", "meta_currency", "currency", "site_url", "meta_graph_api_version"];
          const overrides = {};
          const rawOverrides = body.settings_override && typeof body.settings_override === "object" ? body.settings_override : {};
          for (const key of allowedOverrideKeys) {
            if (rawOverrides[key] !== undefined) overrides[key] = String(rawOverrides[key] || "");
          }
          const syncSettings = { ...settings, ...overrides };
          const result = await syncRecentMetaPurchases(env, syncSettings, { limit: body.limit || 50 });
          if (result.reason) return jsonRes({ status: 'error', message: result.reason, data: result });
          return jsonRes({
            status: result.failed > 0 && result.sent === 0 ? 'error' : 'success',
            message: `Sinkronisasi Meta selesai: ${result.sent} terkirim, ${result.failed} gagal dari ${result.checked || 0} order terbaru.`,
            data: result
          });
        }

        case 'update_rekening': {
          const rekDetail = `${String(body.bank || "")} - ${String(body.norek || "")} (a.n ${String(body.nama || "")})`;
          await env.DB.prepare("UPDATE users SET rekening = ? WHERE LOWER(email) = ?").bind(rekDetail, String(body.email).toLowerCase()).run();
          return jsonRes({ status: 'success', message: 'Data rekening berhasil disimpan!' });
        }

        case 'change_password': {
          const pwdEmail = String(body.email || "").trim().toLowerCase();
          const checkPwd = await env.DB.prepare("SELECT email FROM users WHERE LOWER(email) = ? AND password = ?").bind(pwdEmail, String(body.old_password || "")).first();
          if(!checkPwd) return jsonRes({status: 'error', message: 'Password lama salah!'});
          await env.DB.prepare("UPDATE users SET password = ? WHERE LOWER(email) = ?").bind(String(body.new_password || ""), pwdEmail).run();
          return jsonRes({ status: 'success', message: 'Password berhasil diubah' });
        }
          
        case 'purge_cf_cache': {
          try {
            const purgeResult = await purgeCloudflareCache(settings);
            if (purgeResult.skipped) return jsonRes({ status: 'error', message: 'Zone ID dan API Token Cloudflare belum diatur.' });
            return jsonRes({ status: 'success', message: 'Cache Cloudflare berhasil dibersihkan.' });
          } catch (e) {
            return jsonRes({ status: 'error', message: 'Gagal membersihkan cache Cloudflare: ' + e.message });
          }
        }

        case 'upload_payment_logo': {
          return await handleUploadPaymentLogo(env, settings, body, request);
        }

        case 'upload_drive_media': {
          return await handleUploadDriveMedia(settings, body);
        }

        case 'takeover_domain': {
          await env.DB.prepare("UPDATE orders SET domain = ? WHERE LOWER(email) = ? AND id_produk = 'SF1D' AND status = 'Lunas'").bind(body.domain, String(body.email).toLowerCase()).run();
          return jsonRes({ status: 'success', message: 'Domain dipindahkan' });
        }
          
        case 'get_ik_auth': {
          const privateKey = settings.ik_private_key;
          if (!privateKey) return jsonRes({ status: 'error', message: 'Private Key ImageKit belum diisi di Pengaturan.' });
          const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
          const expire = Math.floor(Date.now() / 1000) + 1800;
          const enc = new TextEncoder();
          const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(privateKey), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
          const signatureBuffer = await crypto.subtle.sign("HMAC", keyMaterial, enc.encode(token + expire));
          const signatureHex = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
          return jsonRes({ status: 'success', token: token, expire: expire, signature: signatureHex });
        }

        case 'reset_commission': {
          await ensureAffiliateSchema(env);
          let usr = null;
          try { usr = await env.DB.prepare("SELECT * FROM users WHERE id_user = ?").bind(body.aff_id).first(); } catch(e) {}
          if(!usr) { try { usr = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(body.aff_id).first(); } catch(e) {} }
          if(!usr) { try { usr = await env.DB.prepare("SELECT * FROM users WHERE LOWER(email) = ?").bind(String(body.aff_id || "").toLowerCase()).first(); } catch(e) {} }
          const affEmail = usr && usr.email ? String(usr.email).toLowerCase() : "UNKNOWN";
          const payoutSummary = await getAffiliatePayoutSummary(env, body.aff_id, usr);
          const payoutRefs = payoutSummary && payoutSummary.refs && payoutSummary.refs.length ? payoutSummary.refs : [body.aff_id, affEmail].filter(Boolean);
          for (const ref of payoutRefs) {
            const refLower = String(ref || "").toLowerCase();
            await env.DB.prepare("UPDATE orders SET komisi = CASE WHEN komisi > 0 THEN (komisi * -1) ELSE komisi END, komisi_l1 = CASE WHEN komisi_l1 > 0 THEN (komisi_l1 * -1) ELSE komisi_l1 END WHERE (affiliate = ? OR LOWER(affiliate) = ? OR affiliate_l1 = ? OR LOWER(affiliate_l1) = ?) AND (status = 'Lunas' OR status = 'Success') AND (komisi > 0 OR komisi_l1 > 0)").bind(ref, refLower, ref, refLower).run();
            await env.DB.prepare("UPDATE orders SET komisi_l2 = (komisi_l2 * -1) WHERE (affiliate_l2 = ? OR LOWER(affiliate_l2) = ?) AND (status = 'Lunas' OR status = 'Success') AND komisi_l2 > 0").bind(ref, refLower).run();
            await env.DB.prepare("UPDATE orders SET komisi_l3 = (komisi_l3 * -1) WHERE (affiliate_l3 = ? OR LOWER(affiliate_l3) = ?) AND (status = 'Lunas' OR status = 'Success') AND komisi_l3 > 0").bind(ref, refLower).run();
          }
          try { await sendAffiliatePayoutNotification(settings, payoutSummary); } catch(e) {}
          return jsonRes({ status: 'success' });
        }
          
       case 'save_lms_materi': {
          await ensureLmsTargetSchema(env);
          const targetCategory = String(body.target_category || body.category || "").trim();
          let productIds = splitProductTargets(body.product_ids || "");
          if (!productIds.length && body.product_id && !String(body.product_id).startsWith("CAT:")) {
            productIds = splitProductTargets(body.product_id);
          }
          const explicitLmsId = String(body.id || body.lms_id || body.id_lms || "").trim();
          const isCategoryOnlyTarget = targetCategory && productIds.length === 0;
          const rawLmsId = String(explicitLmsId || (isCategoryOnlyTarget ? createCategoryLmsId(targetCategory) : (body.product_id || productIds[0] || "")) || "").trim();
          const lmsId = rawLmsId.toUpperCase();
          if (!lmsId) return jsonRes({ status: 'error', message: 'Pilih minimal 1 produk atau kategori LMS.' });
          const productIdsText = productIds.join(",");

          const vVideos = String(body.videos || "[]");
          const vDesc = String(body.desc || "");
          const cL1 = String(body.cert_leader1 || "");
          const cR1 = String(body.cert_role1 || "");
          const cL2 = String(body.cert_leader2 || "");
          const cR2 = String(body.cert_role2 || "");
          const cS = String(body.cert_stamp || "");

          // ==============================================================
          //  TUKANG BANGUNAN OTOMATIS (AUTO-PATCH DATABASE D1)
          // Menambahkan kolom yang kurang secara otomatis jika belum ada
          // ==============================================================
          // ==============================================================
          //  JALANKAN PENYIMPANAN
          // ==============================================================
          try {
              let checkLms = await env.DB.prepare("SELECT * FROM lms WHERE UPPER(id_produk) = ? OR UPPER(product_id) = ?").bind(lmsId, lmsId).first();
              if (!checkLms && !explicitLmsId && !isCategoryOnlyTarget && productIdsText) {
                checkLms = await env.DB.prepare("SELECT * FROM lms WHERE product_ids = ?").bind(productIdsText).first();
              }

              if (checkLms) {
                  // Isi semua variasi kolom agar 100% masuk
                  await env.DB.prepare(`UPDATE lms SET id_produk=?, product_id=?, product_ids=?, target_category=?, videos=?, deskripsi=?, "desc"=?, cert_leader1=?, cert_role1=?, cert_leader2=?, cert_role2=?, cert_stamp=? WHERE UPPER(id_produk)=? OR UPPER(product_id)=?`)
                        .bind(lmsId, lmsId, productIdsText, targetCategory, vVideos, vDesc, vDesc, cL1, cR1, cL2, cR2, cS, String(checkLms.id_produk || lmsId).toUpperCase(), String(checkLms.product_id || lmsId).toUpperCase()).run();
              } else {
                  await env.DB.prepare(`INSERT INTO lms (id_produk, product_id, product_ids, target_category, videos, deskripsi, "desc", cert_leader1, cert_role1, cert_leader2, cert_role2, cert_stamp) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
                        .bind(lmsId, lmsId, productIdsText, targetCategory, vVideos, vDesc, vDesc, cL1, cR1, cL2, cR2, cS).run();
              }
              return jsonRes({ status: 'success' });
          } catch (err) {
              console.log(" Error Real DB LMS: ", err.message);
              return jsonRes({ status: 'error', message: 'Error DB LMS: ' + err.message });
          }
        }

        case 'get_lms_materi': {
          const lmsId = String(body.product_id || body.id || "").trim().toUpperCase();
          try {
            await ensureLmsTargetSchema(env);
            let resLms = await env.DB.prepare("SELECT * FROM lms WHERE UPPER(id_produk) = ?").bind(lmsId).first();
            if(!resLms) { resLms = await env.DB.prepare("SELECT * FROM lms WHERE UPPER(product_id) = ?").bind(lmsId).first(); }
            if(!resLms) {
              const allLms = await safeAll(env, "SELECT * FROM lms ORDER BY rowid DESC");
              resLms = allLms.find(item => splitProductTargets(item.product_ids || "").includes(lmsId));
              if(!resLms) {
                let prodCategory = "";
                try {
                  const prod = await env.DB.prepare("SELECT kategori FROM access_rules WHERE UPPER(id_produk) = ?").bind(lmsId).first();
                  prodCategory = String(prod && prod.kategori || "").trim().toLowerCase();
                } catch(e) {}
                if (prodCategory) {
                  resLms = allLms.find(item => String(item.target_category || "").trim().toLowerCase() === prodCategory);
                }
              }
            }
            return jsonRes({
              status: 'success',
              data: {
                id_produk: lmsId, product_id: lmsId, product_ids: resLms ? (resLms.product_ids || '') : '', target_category: resLms ? (resLms.target_category || '') : '', videos: resLms ? (resLms.videos || '[]') : '[]', deskripsi: resLms ? (resLms.deskripsi || resLms.desc || '') : '',
                cert_leader1: resLms ? (resLms.cert_leader1 || '') : '', cert_role1: resLms ? (resLms.cert_role1 || '') : '', cert_leader2: resLms ? (resLms.cert_leader2 || '') : '', cert_role2: resLms ? (resLms.cert_role2 || '') : '', cert_stamp: resLms ? (resLms.cert_stamp || '') : ''
              }
            });
          } catch (e) { return jsonRes({ status: 'success', data: { id_produk: lmsId, videos: '[]', deskripsi: 'Materi belum tersedia.' } }); }
        }

        case 'run_cron': {
          const cronToken = String(env.CRON_TOKEN || settings.cron_token || "").trim();
          if (!cronToken || body.token !== cronToken) return jsonRes({ status: 'error', message: 'Akses Ditolak' });
          await retryOrderNotifications(env, settings);
          await syncNotivgoPending(env, settings);
          const pendingSync = await processPendingOrderReminders(env, settings);
          const subscriptionSync = await runSubscriptionReminderCron(env, settings);
          const metaSync = await syncRecentMetaPurchases(env, settings, { limit: 25 });
          const metaMessage = metaSync.reason ? ` Meta: ${metaSync.reason}.` : ` Meta Purchase: ${metaSync.sent} terkirim, ${metaSync.failed} gagal.`;
          const pendingMessage = pendingSync.skipped
            ? "Pengingat pending order nonaktif."
            : `Pengingat pending order ${pendingSync.sent} proses, ${pendingSync.wa} WA, ${pendingSync.email} email, ${pendingSync.cancelled} dibatalkan.`;
          return jsonRes({ status: 'success', message: `Cron berhasil. ${pendingMessage} Pengingat langganan ${subscriptionSync.sent} WA dan ${subscriptionSync.email} email.${metaMessage}`, pending: pendingSync, meta: metaSync, subscription: subscriptionSync });
        }

        case 'get_home_page': { return jsonRes({ status: 'success', data: null, message: 'Katalog Default' }); }

        case 'register_member': {
          const existReg = await env.DB.prepare("SELECT email FROM users WHERE LOWER(email) = ?").bind(String(body.email).toLowerCase()).first();
          if(existReg) return jsonRes({ status: 'error', message: 'Email sudah terdaftar!' });
          const passReg = body.password || Math.random().toString(36).slice(-6);
          await env.DB.prepare(`INSERT INTO users (id_user, email, password, nama, role, tanggal_daftar, whatsapp, affiliate) VALUES (?, ?, ?, ?, 'member', ?, ?, ?)`).bind('USR-'+Date.now(), body.email, passReg, body.nama, new Date().toISOString(), body.whatsapp, body.affiliate || "-").run();
          try { await addToAutoresponder(settings, body.nama, body.email, body.whatsapp); } catch(e){}
          try { await sendEmail(settings, body.email, "Selamat Datang!", `<h2>Halo ${body.nama}</h2><p>Akun Anda aktif. Pass: ${passReg}</p>`); } catch(e){}
          return jsonRes({ status: 'success', message: 'Akun berhasil dibuat' });
        }

        case 'forgot_password': {
          const fEmail = String(body.email || "").trim().toLowerCase();
          if (!fEmail) return jsonRes({ status: 'error', message: 'Email tidak boleh kosong!' });
          try {
              const fUser = await env.DB.prepare("SELECT * FROM users WHERE LOWER(email) = ?").bind(fEmail).first();
              if (!fUser) return jsonRes({ status: 'error', message: 'Email tidak terdaftar di sistem kami.' });
              const fUserPassword = fUser.password; const fUserName = fUser.nama || 'Member';
              const emailHtml = `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #334155; line-height: 1.5;"><h2 style="color: #0f172a;">Halo, ${fUserName}!</h2><p>Kami menerima permintaan pengingat akses login untuk akun Anda.</p><p>Berikut adalah informasi login Anda yang tersimpan di sistem kami:</p><div style="background: #f8fafc; padding: 15px; border-left: 4px solid #00AAE7; margin: 20px 0; border-radius: 4px;"><strong>Alamat Email:</strong> ${fEmail}<br><br><strong>Password Anda:</strong> <span style="font-family: monospace; font-size: 1.1em; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${fUserPassword}</span></div><p>Silakan login kembali menggunakan informasi di atas dan pastikan Anda menjaga kerahasiaan password ini.</p><br><p>Salam Sukses,<br><strong>Tim Admin</strong></p></div>`;
              await sendEmail(settings, fEmail, " Informasi Password Akun Member Anda", emailHtml);
              return jsonRes({ status: 'success', message: 'Sistem telah mengirim informasi password ke email Anda!' });
          } catch (error) { return jsonRes({ status: 'error', message: 'Sistem error: ' + error.message }); }
        }
        // ==========================================
        // API UNTUK PANTAU STATUS PEMBAYARAN LIVE
        // ==========================================
        case 'check_payment_status': {
          const invReq = String(body.invoice || "").trim();
          if (!invReq) return jsonRes({ status: 'error' });
          
          const cekOrder = await env.DB.prepare("SELECT status, harga_total, nama_produk, id_produk FROM orders WHERE invoice = ?").bind(invReq).first();
          if (!cekOrder) return jsonRes({ status: 'error' });
          
          return jsonRes({ 
              status: 'success', 
              payment_status: cekOrder.status,
              harga_total: cekOrder.harga_total,
              nama_produk: cekOrder.nama_produk,
              id_produk: cekOrder.id_produk
          });
        }

        // ==========================================
        //  SISTEM LISENSI: AUTO-LOCK & VERIFY
        // ==========================================
        case 'verify_license': {
            const reqKey = normalizeLicenseKey(body.license_key || "");
            const reqDomain = normalizeDomainValue(body.domain || request.headers.get("host") || "");
            const updateUrl = resolveMasterUpdateUrl(env, settings) || normalizeManifestUrl(url.origin);

            if (!reqKey || !reqDomain) {
                return jsonRes({ status: 'error', valid: false, message: 'Lisensi atau Domain tidak terdeteksi.' });
            }

            let licenseLookup = await findPaidOrderByLicenseKey(env, reqKey);
            if (!licenseLookup.order && licenseLookup.stock && /^available$/i.test(String(licenseLookup.stock.status || ""))) {
                const assignedOrder = await assignSpecificStockLicenseToPaidOrder(env, licenseLookup.stock);
                if (assignedOrder) licenseLookup = { order: assignedOrder, stock: licenseLookup.stock };
            }
            if (!licenseLookup.order) {
                await backfillPaidOrderLicenses(env, CLOUDMEMBER_PERSONAL_PRODUCT_ID);
                licenseLookup = await findPaidOrderByLicenseKey(env, reqKey);
            }
            const check = licenseLookup.order;

            if (!check) {
                if (licenseLookup.stock) {
                    const stockStatus = String(licenseLookup.stock.status || "Available");
                    return jsonRes({ status: 'error', valid: false, message: `Lisensi masih berstatus ${stockStatus} dan belum terhubung ke order lunas.` });
                }
                return jsonRes({ status: 'error', valid: false, message: 'Lisensi tidak ditemukan atau belum berstatus Lunas.' });
            }

            // SKENARIO 1: AKTIVASI PERTAMA KALI (KOLOM DOMAIN MASIH KOSONG)
            if (!check.domain || check.domain.trim() === '') {
                await env.DB.prepare("UPDATE orders SET domain = ? WHERE license_key = ? OR bump_license_key = ?").bind(reqDomain, reqKey, reqKey).run();
                const matchedProduct = getMatchedOrderLicenseProductLabel(check, reqKey);
                return jsonRes({
                    status: 'success',
                    valid: true,
                    message: 'Lisensi berhasil diaktivasi dan dikunci ke domain ini.',
                    data: { produk: matchedProduct || check.license_product_id || check.id_produk || check.nama_produk, email: check.email, domain: reqDomain, version: APP_VERSION, update_url: updateUrl }
                });
            }

            // SKENARIO 2: VERIFIKASI RUTIN (SUDAH DIKUNCI SEBELUMNYA)
            if (check.domain.includes(reqDomain) || reqDomain.includes(check.domain)) {
                 const matchedProduct = getMatchedOrderLicenseProductLabel(check, reqKey);
                 return jsonRes({ status: 'success', valid: true, message: 'Lisensi Valid', data: { produk: matchedProduct || check.license_product_id || check.id_produk || check.nama_produk, email: check.email, domain: check.domain, version: APP_VERSION, update_url: updateUrl } });
            } else {
                 return jsonRes({ 
                     status: 'error', 
                     valid: false, 
                     message: `Lisensi ini sudah terdaftar untuk domain lain.` 
                 });
            }
        }

        // ==========================================
        //  FITUR GANTI DOMAIN (MASTER SIDE)
        // ==========================================
        case 'reset_license_domain': {
            const reqKey = normalizeLicenseKey(body.license_key || "");
            if (!reqKey) return jsonRes({ status: 'error', message: 'License Key wajib diisi.' });

            // Kosongkan kolom domain agar bisa diaktivasi ulang di domain baru
            await env.DB.prepare("UPDATE orders SET domain = '' WHERE license_key = ? OR bump_license_key = ?").bind(reqKey, reqKey).run();
            
            return jsonRes({ 
                status: 'success', 
                message: 'Lisensi siap diaktivasi ulang di domain baru.' 
            });
        }
// ==========================================
        //  FITUR GANTI DOMAIN OTOMATIS (KLIEN SELF-SERVICE)
        // ==========================================
        case 'self_reset_domain': {
            const reqKey = normalizeLicenseKey(body.license_key || "");
            const reqEmail = String(body.email || "").trim().toLowerCase();

            if (!reqKey || !reqEmail) {
                return jsonRes({ status: 'error', message: 'Lisensi dan Email wajib diisi.' });
            }

            // Keamanan: Pastikan lisensi dan email pendaftarannya cocok!
            const checkData = await env.DB.prepare("SELECT * FROM orders WHERE (license_key = ? OR bump_license_key = ?) AND LOWER(email) = ? AND status IN ('Lunas', 'Success')").bind(reqKey, reqKey, reqEmail).first();

            if (!checkData) {
                return jsonRes({ status: 'error', message: 'Verifikasi Gagal! Email tidak cocok dengan pemilik lisensi ini.' });
            }

            // Jika cocok, kosongkan kolom domain agar siap dikunci di domain baru
            await env.DB.prepare("UPDATE orders SET domain = '' WHERE license_key = ? OR bump_license_key = ?").bind(reqKey, reqKey).run();
            
            return jsonRes({ status: 'success', message: 'Domain lama berhasil dihapus. Sistem akan otomatis mengunci lisensi di domain baru ini.' });
        }
        default: return jsonRes({ status: 'error', message: 'Action unknown: ' + action });
      }
    } catch (e) { return jsonRes({ status: 'error', message: "Fatal Error: " + e.message }); }
  },
  
  async scheduled(event, env, ctx) {
    try {
      await ensureD1Schema(env);
      const settings = await getGlobalSettings(env);
      try { await retryOrderNotifications(env, settings); } catch(e) { console.log('Notification Retry Error:', e.message); }
      try { await syncNotivgoPending(env, settings); } catch(e) { console.log('NotivGo Cron Error:', e.message); }
      try { await syncRecentMetaPurchases(env, settings, { limit: 25 }); } catch(e) { console.log("Meta Purchase Sync Error:", e.message); }
      try { await runSubscriptionReminderCron(env, settings); } catch(e) { console.log("Subscription Reminder Cron Error:", e.message); }
      try { await processPendingOrderReminders(env, settings); } catch(e) { console.log("Pending Reminder Cron Error:", e.message); }
    } catch (e) { console.log("Cron Error:", e.message); }
  }
}; 

async function sendPaidNotification(ord, s, env) {
    ord = await activateOrderSubscription(env, ord);
    try { await sendMetaPurchase(ord, s, env); } catch (e) { console.log("Meta Purchase Error:", e.message); }

    const loginUrl = (s.site_url || "").replace(/\/$/, "") + "/member";
    const orderEmail = String(ord.email || "").trim().toLowerCase();
    const memberAccount = orderEmail && env && env.DB
        ? await env.DB.prepare("SELECT password FROM users WHERE LOWER(email) = ? LIMIT 1").bind(orderEmail).first().catch(() => null)
        : null;
    const memberPassword = String(ord.password || ord.member_password || (memberAccount && memberAccount.password) || "").trim();
    const emailSubject = `[SUKSES] Pembayaran Terkonfirmasi - #${ord.invoice}`;
    const hrgTotal = Number(ord.harga_total) || 0;
    const subscriptionExpiry = String(ord.subscription_expires_at || "").trim();
    const subscriptionInfoText = subscriptionExpiry ? `Masa aktif ${getBillingLabel(ord.billing_type)} sampai ${formatDateId(subscriptionExpiry)}.` : "";
    const subscriptionInfoEmail = subscriptionExpiry ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;padding:14px;border-radius:8px;margin:18px 0;color:#1d4ed8;font-weight:bold;text-align:center;">Masa aktif ${escapeHtml(getBillingLabel(ord.billing_type))} sampai ${escapeHtml(formatDateId(subscriptionExpiry))}</div>` : "";
    const targetProdId = cleanProductId(ord.id_produk);
    const isBump = isTruthyOrderValue(ord.take_bump);
    const bumpInfo = await getOrderBumpProductInfo(env, ord);
    const paidBumpTitle = (bumpInfo && bumpInfo.title) || "Order Bump";
    const licenseItems = await assignMissingOrderLicenseItems(env, ord);
    const getLicenseFallbackText = item => normalizeLicenseClaimMode(item.licenseClaimMode) === "stock" ? "Stok lisensi belum tersedia" : "Menunggu Generate";
    const getLicenseDisplayKey = item => item.key || item.existingKey || getLicenseFallbackText(item);
    const getLicenseItemName = item => {
        const prefix = item.role === "bump" ? "Order Bump" : "Produk Utama";
        return `${prefix}: ${item.title || item.licenseProductId || "Produk"}`;
    };
    const getLicenseLabel = item => {
        if (item.isCloudMemberAppLicense) return "KODE LISENSI APLIKASI";
        return item.role === "bump" ? "KODE LISENSI ORDER BUMP" : "KODE LISENSI PRODUK";
    };
    const getLicenseHelp = item => item.isCloudMemberAppLicense
        ? "Gunakan kode ini saat pertama kali setup aplikasi di domain Anda."
        : "Simpan kode ini untuk aktivasi atau klaim produk Anda.";
    const combinedLicenseText = licenseItems.map(item => `${getLicenseItemName(item)}\n${getLicenseDisplayKey(item)}`).join("\n\n");
    
    // VARIABEL KOSONG UNTUK PRODUK BIASA
    let boxLisensiEmail = "";
    let infoLisensiWA = "";
    
    if (licenseItems.length) {
        boxLisensiEmail = licenseItems.map(item => {
            const lisensiDisplay = getLicenseDisplayKey(item);
            const licenseLabel = `${getLicenseLabel(item)} ANDA:`;
            const licenseHelp = getLicenseHelp(item);
            const productName = getLicenseItemName(item);
            return `
        <div style="background: #fffbeb; border: 1px dashed #f59e0b; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0 0 5px 0; color: #92400e; font-size: 12px; font-weight: 700;">${escapeHtml(productName)}</p>
            <p style="margin: 0 0 5px 0; color: #b45309; font-size: 14px;">${escapeHtml(licenseLabel)}</p>
            <h2 style="margin: 0; color: #d97706; letter-spacing: 2px;">${escapeHtml(lisensiDisplay)}</h2>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #92400e;">${escapeHtml(licenseHelp)}</p>
        </div>`;
        }).join("");

        infoLisensiWA = "\n\n" + licenseItems.map(item => {
          const lisensiDisplay = getLicenseDisplayKey(item);
          const productName = getLicenseItemName(item);
          const help = item.isCloudMemberAppLicense
            ? "_Masukkan kode di atas saat pertama kali install script di panel admin Kakak._"
            : "_Simpan kode ini untuk aktivasi atau klaim produk Kakak._";
          return `*${getLicenseLabel(item)} - ${productName}:*\n*${lisensiDisplay}*\n${help}`;
        }).join("\n\n");
    }
    
    //  CEK APAKAH ORDER TERMASUK BUMP SELL UNTUK NOTIFIKASI LUNAS 
    const infoBumpWA = isBump ? `\n *Bonus / Tambahan:* Akses produk *${paidBumpTitle}* juga telah terbuka!` : "";
    const infoBumpEmail = isBump ? `<p style="margin: 10px 0 0 0; padding: 10px; background: #fef3c7; color: #d97706; border-radius: 6px; font-weight: bold; text-align: center;"> Selamat! Anda juga mendapatkan akses ${escapeHtml(paidBumpTitle)}.</p>` : "";
    
    const emailHTML = `<div style="max-width: 600px; margin: auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;"><div style="background: #2563eb; padding: 30px; text-align: center; color: white;"><h1 style="margin: 0; font-size: 24px;">Pembayaran Berhasil! </h1></div><div style="padding: 30px; color: #1e293b;"><p>Halo <strong>${ord.nama}</strong>,</p><p>Terima kasih, pembayaran untuk <strong>${ord.nama_produk}</strong> telah diterima.</p>
    
    ${boxLisensiEmail}
    ${subscriptionInfoEmail}
    
    <table style="width: 100%; background: #f8fafc; border-radius: 8px; margin-top: 10px; border-collapse: collapse;"><tr><td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${ord.nama_produk}</td><td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">Rp${hrgTotal.toLocaleString('id-ID')}</td></tr></table>
    ${infoBumpEmail}
    <div style="margin-top: 30px; text-align: center;"><a href="${loginUrl}" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 999px; font-weight: bold; display: inline-block;">LOGIN MEMBER AREA</a></div></div></div>`;
    
    const paidVars = {
        nama: ord.nama || "",
        email: ord.email || "",
        whatsapp: ord.whatsapp || ord.wa || ord.no_wa || "",
        invoice: ord.invoice || "",
        produk: ord.nama_produk || "Pesanan Digital",
        total: "Rp " + hrgTotal.toLocaleString('id-ID'),
        login_url: loginUrl,
        password: memberPassword,
        lisensi: combinedLicenseText,
        info_bump: isBump ? `Akses produk ${paidBumpTitle} juga telah terbuka.` : "",
        info_lisensi: combinedLicenseText ? `DATA LISENSI:\n${combinedLicenseText}` : "",
        info_langganan: subscriptionInfoText,
        tanggal_berakhir: subscriptionExpiry ? formatDateId(subscriptionExpiry) : ""
    };
    const defaultPaidEmail = `Halo {nama}

Terima kasih, pembayaran untuk {produk} telah diterima. Akses member Anda sudah aktif.

Detail Akses Member:
Email: {email}
Pass: {password}
Login: {login_url}`;
    const paidEmailCopy = textToEmailHtml(renderTemplate(s.notif_paid_email || defaultPaidEmail, paidVars));

    const finalPaidEmailHTML = `<div style="max-width: 600px; margin: auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;"><div style="background: #2563eb; padding: 30px; text-align: center; color: white;"><h1 style="margin: 0; font-size: 24px;">Pembayaran Berhasil!</h1></div><div style="padding: 30px; color: #1e293b;"><p>${paidEmailCopy}</p>${boxLisensiEmail}${subscriptionInfoEmail}<table style="width: 100%; background: #f8fafc; border-radius: 8px; margin-top: 10px; border-collapse: collapse;"><tr><td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${ord.nama_produk || "Pesanan Digital"}</td><td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">Rp${hrgTotal.toLocaleString('id-ID')}</td></tr></table>${infoBumpEmail}<div style="margin-top: 30px; text-align: center;"><a href="${loginUrl}" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 999px; font-weight: bold; display: inline-block;">LOGIN MEMBER AREA</a></div></div></div>`;

    const waMessage = `*PEMBAYARAN SUKSES!* \n\nHalo Kak *${ord.nama}*,\nTerima kasih, pembayaran untuk pesanan *${ord.nama_produk}* telah kami terima.${infoBumpWA}${infoLisensiWA}\n\n*Detail Akses Member:*\n Email: ${ord.email}\n Login: ${loginUrl}\n\nJika butuh bantuan, balas pesan ini ya Kak!`;

    const defaultPaidWA = `*PEMBAYARAN SUKSES!*

Halo Kak *{nama}*,
Terima kasih, pembayaran untuk pesanan *{produk}* telah kami terima.
{info_bump}
{info_lisensi}
{info_langganan}

Detail Akses Member:
Email: {email}
Pass: {password}
Login: {login_url}

Jika butuh bantuan, balas pesan ini ya Kak!`;
    const finalPaidWaMessage = renderTemplate(s.notif_paid_wa || defaultPaidWA, paidVars);
    await sendOrderNotifications(env, s, ord.invoice, 'paid', [
      { channel: 'wa', target: ord.whatsapp || ord.wa || ord.no_wa, content: finalPaidWaMessage },
      { channel: 'email', target: ord.email, subject: emailSubject, content: finalPaidEmailHTML }
    ]);
    try { await sendAffiliateOrderNotification(env, s, ord, "paid"); } catch (e) { console.log("Affiliate Paid Notification Error:", e.message); }
}


