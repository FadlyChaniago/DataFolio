# Datafolio — Analytics Project Hub

Portfolio Data Analytics berbentuk **project directory**. Semua project (Tableau, Grafana, Streamlit, Power BI, Metabase, Looker Studio, Superset, Python/Jupyter, dll.) dikumpulkan di satu halaman, bisa dicari, difilter, dan dibuka langsung ke dashboard aslinya.

- **Astro 7**, output **static** (tanpa server, tanpa database, tanpa API)
- **Vanilla CSS** + CSS custom properties (token dari design system Datafolio)
- **Vanilla JS** hanya untuk search, filter, sort, theme toggle, dan mobile menu (≈ 4 KB, di-inline)
- **Satu sumber data**: `src/content/projects.json`, divalidasi schema Zod saat build
- Disajikan **Nginx** dari folder `dist/`

---

## Menjalankan secara lokal

Butuh Node.js ≥ 22.12 (lihat `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # validasi data + build ke dist/
npm run preview    # serve hasil build
```

Domain production **tidak di-hardcode**. Set saat build bila sudah ada:

```bash
SITE_URL=https://projects.domainmu.com npm run build
```

Jika `SITE_URL` di-set, maka canonical URL, `og:url`/`og:image`, dan isi `sitemap.xml` + baris `Sitemap:` di `robots.txt` ikut di-generate. Kalau tidak di-set, semuanya otomatis dihilangkan.

---

## Struktur

```text
datafolio/
├── public/
│   ├── images/projects/      ← screenshot project (.webp, 16:9)
│   ├── favicon.svg
│   └── og-image.png          ← gambar share 1200×630
├── src/
│   ├── components/           ← Header, Hero, ProjectStats, FeaturedProjects,
│   │                           ProjectCard, ProjectExplorer, ToolsSection, Footer, Icon
│   ├── content/projects.json ← SATU-SATUNYA sumber data project
│   ├── content.config.ts     ← schema & validasi (Zod)
│   ├── data/site.ts          ← nama situs, link GitHub, page size, supporting tools
│   ├── layouts/BaseLayout.astro  ← <head>, SEO, Open Graph, theme bootstrap
│   ├── pages/
│   │   ├── index.astro       ← halaman utama (single page)
│   │   ├── robots.txt.ts
│   │   └── sitemap.xml.ts
│   ├── scripts/
│   │   ├── project-explorer.js  ← search, filter, sort, URL state, Load More
│   │   └── site.js              ← theme toggle, mobile nav, fallback gambar rusak
│   └── styles/global.css     ← token + komponen (prefix df-)
├── scripts/
│   ├── validate-projects.mjs ← cek ID unik, file thumbnail ada, dll. (jalan sebelum build)
│   └── check-links.mjs       ← health check URL project
├── deploy/nginx.conf
└── .github/workflows/        ← build.yml, deploy.yml, link-check.yml
```

Kenapa begini:

- **components/** — satu file per bagian UI, jadi gampang dicari dan diubah.
- **content/ + content.config.ts** — data dipisah dari tampilan. Menambah project tidak perlu menyentuh kode.
- **scripts/** (di `src`) — JS client terpisah dari markup. Astro mem-bundle dan meng-inline-nya.
- **scripts/** (di root) — tool Node untuk CI, tidak ikut ke browser.

---

## Menambah project baru

1. (Opsional) Simpan screenshot ke `public/images/projects/<id>.webp`. Rasionya 16:9, sekitar 1280×720, tanpa browser chrome. Bisa dikonversi dengan `cwebp -q 80 in.png -o out.webp`.
2. Tambahkan objek baru ke `src/content/projects.json`:

```json
{
  "id": "atm-sla-dashboard",
  "title": "ATM SLA Dashboard",
  "description": "Availability and SLA breach trends per region, refreshed hourly.",
  "platform": "Grafana",
  "category": "Monitoring & Observability",
  "tags": ["SLA", "Availability"],
  "thumbnail": "/images/projects/atm-sla-dashboard.webp",
  "projectUrl": "https://grafana.domainmu.com/d/abc123",
  "githubUrl": null,
  "status": "live",
  "featured": false,
  "publishedAt": "2026-10-19"
}
```

3. Jalankan `npm run build`. Kalau ada field yang salah, build gagal dengan pesan yang menunjuk field tersebut.
4. Commit & push. Workflow **Build** memvalidasi otomatis.

### Aturan field

| Field | Wajib | Catatan |
|---|---|---|
| `id` | ✔ | kebab-case, unik |
| `title` | ✔ | ≤ 80 karakter |
| `description` | ✔ | 1 kalimat, ≤ 160 karakter, tampil 2 baris di kartu |
| `platform` | ✔ | salah satu dari: Tableau, Streamlit, Grafana, Power BI, Metabase, Looker Studio, Apache Superset, Python, GitHub, Other. Platform baru ditambahkan di `PLATFORMS` (`content.config.ts`). |
| `category` | ✔ | teks bebas, ≤ 40 karakter. Opsi filter dibuat otomatis dari data. |
| `tags` | – | maks 6 (yang tampil 3) |
| `thumbnail` | – | path di `/images/projects/`; `null` → fallback |
| `projectUrl` | ✔* | http(s). Wajib kecuali `status: "private"`. IP/host internal ditolak. |
| `githubUrl` | – | menampilkan link **Source** |
| `status` | ✔ | `live` · `demo` · `archived` · `private` |
| `featured` | – | maks 3 yang tampil di Featured Projects (terbaru dulu) |
| `publishedAt` | ✔ | `YYYY-MM-DD`, dipakai untuk sorting |
| `sample` | – | `true` untuk data contoh. Selama masih ada project sample, situs menampilkan notice "Sample projects…". |

**Status:**

- `live` hanya untuk project yang memang publik dan aktif. Jangan dipakai cuma karena URL-nya ada.
- `private` membuat kartu tidak punya link sama sekali (muncul "Access restricted"). Pakai ini untuk dashboard yang butuh VPN/login internal. Jangan pernah mencantumkan URL internal.

> 14 project bawaan adalah **data contoh** (`"sample": true`, URL `example.com`). Ganti atau hapus semuanya sebelum go-live. Notice di hero hilang otomatis begitu tidak ada lagi project sample.

---

## Fitur

| Fitur | Implementasi |
|---|---|
| Search real-time | judul, deskripsi, platform, kategori, tags; multi-kata (AND). Shortcut `/`, `Esc` untuk clear. |
| Filter platform | chip dengan jumlah project; hanya platform yang punya project |
| Filter kategori | `<select>` native |
| Sorting | Newest, Oldest, A–Z, Z–A, Featured First |
| URL state | `?q=&platform=&category=&sort=` bisa dibagikan, dan tombol back/forward browser bekerja |
| Load More | 12 per halaman (`site.pageSize`). Filter tetap bekerja ke **semua** project. |
| Empty state | "No projects match your search." + Clear Filters |
| Statistik | dihitung dari data saat build |
| Gambar | lazy load, ukuran tetap (tanpa layout shift), fallback saat gambar gagal |
| Dark mode | ikut OS saat kunjungan pertama, lalu toggle disimpan di localStorage |
| Tanpa JS | semua project tetap tampil dan link tetap bisa diklik |

---

## Deploy ke VPS (Nginx)

### 1. Siapkan server (sekali saja)

```bash
# sebagai root / sudo
adduser --disabled-password deploy
mkdir -p /var/www/datafolio/releases
chown -R deploy:deploy /var/www/datafolio

cp deploy/nginx.conf /etc/nginx/sites-available/datafolio   # ganti YOUR_DOMAIN
ln -s /etc/nginx/sites-available/datafolio /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# HTTPS (Let's Encrypt)
apt install certbot python3-certbot-nginx
certbot --nginx -d YOUR_DOMAIN       # sekaligus redirect 80 → 443, auto-renew via systemd timer
```

Buat SSH key khusus deploy (di laptop):

```bash
ssh-keygen -t ed25519 -f datafolio_deploy -C "datafolio deploy"
ssh-copy-id -i datafolio_deploy.pub deploy@YOUR_SERVER
ssh-keyscan -t ed25519 YOUR_SERVER     # output-nya → secret VPS_KNOWN_HOSTS
```

### 2. GitHub Actions

Buka **Settings → Secrets and variables → Actions**:

| Jenis | Nama | Isi |
|---|---|---|
| Secret | `VPS_HOST` | hostname/IP server |
| Secret | `VPS_USER` | `deploy` |
| Secret | `VPS_SSH_KEY` | isi file `datafolio_deploy` (private key) |
| Secret | `VPS_KNOWN_HOSTS` | output `ssh-keyscan` |
| Secret | `VPS_PORT` | opsional, default 22 |
| Variable | `SITE_URL` | `https://YOUR_DOMAIN` |
| Variable | `DEPLOY_PATH` | opsional, default `/var/www/datafolio` |
| Variable | `DEPLOY_ENABLED` | `true` untuk auto-deploy setiap push ke `main` |

Tanpa `DEPLOY_ENABLED`, deploy hanya berjalan manual lewat **Actions → Deploy to VPS → Run workflow**.

### 3. Cara kerja deploy (atomic)

```text
push → npm ci → validate → astro build → rsync dist/ → releases/<timestamp-sha>/
                                                   └→ ln -sfn + mv -T  → current  (atomic)
Nginx root = /var/www/datafolio/current
```

Pengunjung tidak pernah melihat situs yang setengah ter-upload, karena `current` baru dipindah setelah upload selesai. Lima release terakhir disimpan.

### Rollback

```bash
ssh deploy@YOUR_SERVER
cd /var/www/datafolio
ls -1t releases/                         # pilih release sebelumnya
ln -sfn releases/<RELEASE_LAMA> current.tmp && mv -Tf current.tmp current
```

Nginx tidak perlu di-reload.

### Deploy manual tanpa CI

```bash
SITE_URL=https://YOUR_DOMAIN npm run build
R=$(date +%Y%m%d%H%M%S)
rsync -az dist/ deploy@YOUR_SERVER:/var/www/datafolio/releases/$R/
ssh deploy@YOUR_SERVER "cd /var/www/datafolio && ln -sfn releases/$R current.tmp && mv -Tf current.tmp current"
```

### Cache policy (di `deploy/nginx.conf`)

| Path | Cache |
|---|---|
| `/_astro/*` (hashed) | 1 tahun, `immutable` |
| `/images/*` | 7 hari. Ganti nama file saat screenshot diperbarui. |
| HTML | `no-cache`, jadi deploy baru langsung terlihat |

---

## Link health check

`.github/workflows/link-check.yml` berjalan tiap Senin 09:17 WIB (atau manual):

- Hanya **melaporkan** (di Job Summary + artifact `link-report.md`). Tidak pernah menghapus project atau mengubah status.
- 401/403/429 ditandai 🟡 *needs review*, bukan broken, karena banyak platform memblokir bot atau butuh login.
- Ada timeout 15 detik, 2× retry dengan backoff, dan jeda 1 detik antar request.
- Melewati project `private` dan host placeholder (`example.com`).

Jalankan lokal: `npm run check-links`.

---

## Design system

Token warna, tipografi, spacing, radius, dan komponen berasal dari design system **Datafolio**. Semuanya ada di `src/styles/global.css` (bagian 1 = token). Untuk mengganti warna, ubah token di bagian atas file, bukan di tiap komponen.

Beberapa catatan aksesibilitas yang diwarisi dari palet brief:

- `foreground-secondary` di atas `surface` hanya 4.4:1, jadi jangan dipakai untuk teks kecil di area abu-abu.
- Border input `border-hover` < 3:1. Karena itu setiap kontrol juga ditandai dengan ikon, placeholder, atau chevron.
