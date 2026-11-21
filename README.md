# ybsmembermaster
YBS Member Master


## Perbaikan paket master (favicon dan secrets)

- `favicon.ico` dan `favicon.svg` tersedia di root aset dan ditautkan dari halaman HTML.
- Nilai `ADMIN_SESSION_SECRET` dan `CRON_TOKEN` tidak lagi disimpan sebagai `[vars]` di `wrangler.toml`.
- Atur keduanya sebagai Worker Secrets sebelum deploy (jangan commit nilainya ke Git):

```powershell
npx wrangler secret put ADMIN_SESSION_SECRET
npx wrangler secret put CRON_TOKEN
npx wrangler deploy
```

Gunakan secret acak yang kuat dan berbeda untuk masing-masing variabel. Jika `MASTER_DEPLOY_TOKEN` dikonfigurasi terpisah, simpan juga sebagai Worker Secret.
