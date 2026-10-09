# Portfolioo API Reference

> Dokumentasi teknis resmi untuk backend Portfolioo API yang menyediakan layanan data pencapaian, integrasi autentikasi pihak ketiga, sistem chat interaktif berbasis Supabase, layanan pengiriman email notifikasi via Nodemailer, dan statistik Codewars.

## 🌐 Base URL

| Environment | Base URL |
| :--- | :--- |
| **Development** | `http://localhost:5000` |
| **Production** | `https://portfolioo.onrender.com` |

## 🔐 Autentikasi

Layanan ini menggunakan beberapa mekanisme autentikasi tergantung pada endpoint yang diakses:
- **Public**: Endpoint yang dapat diakses secara terbuka tanpa token.
- **NextAuth Session**: Endpoint autentikasi sosial menggunakan provider Google dan GitHub.

Contoh Header Permintaan (jika memerlukan autentikasi):
```http
Authorization: Bearer <YOUR_ACCESS_TOKEN>
Content-Type: application/json
```

## 📋 Daftar Endpoint

| Method | Path | Keterangan | Auth |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/achievements` | Mengambil daftar pencapaian dengan filter opsional | Public |
| **GET** | `/api/achievements/categories` | Mengambil daftar kategori pencapaian | Public |
| **GET** | `/api/achievements/types` | Mengambil daftar tipe pencapaian | Public |
| **GET/POST** | `/api/auth/[...nextauth]` | Mengelola autentikasi NextAuth (Google & GitHub) | Public |
| **POST** | `/api/chat/email` | Mengirim email notifikasi atau balasan chat via Nodemailer | Public |
| **GET** | `/api/chat` | Mengambil seluruh daftar pesan chat room | Public |
| **POST** | `/api/chat` | Mengirim pesan baru ke chat room | Public |
| **DELETE** | `/api/chat/{slug}` | Menghapus pesan berdasarkan ID (slug) | Public |
| **GET** | `/api/codewars` | Mengambil statistik profil Codewars | Public |

## 🔍 Detail Spesifikasi Endpoint

### 1. Achievements

#### Mengambil Daftar Pencapaian
- **Method:** `GET`
- **Path:** `/api/achievements`
- **Headers:** `Content-Type: application/json`
- **Query Params:**
  - `category` (string, opsional): Filter berdasarkan kategori pencapaian.
  - `search` (string, opsional): Kata kunci pencarian.
- **Response 200 OK:**
  ```json
  [
    {
      "id": "1",
      "title": "Best Developer Award",
      "category": "Award",
      "description": "Awarded for exceptional contribution.",
      "date": "2023-12-01"
    }
  ]
  ```
- **Response 500 Internal Server Error:**
  ```json
  {
    "message": "Internal Server Error"
  }
  ```
- **cURL Command:**
  ```bash
  curl -X GET "http://localhost:5000/api/achievements?category=Award&search=Developer" \
       -H "Content-Type: application/json"
  ```

---

#### Mengambil Kategori Pencapaian
- **Method:** `GET`
- **Path:** `/api/achievements/categories`
- **Headers:** `Content-Type: application/json`
- **Response 200 OK:**
  ```json
  [
    "Award",
    "Certification",
    "Competition"
  ]
  ```
- **Response 500 Internal Server Error:**
  ```json
  {
    "message": "Internal Server Error"
  }
  ```
- **cURL Command:**
  ```bash
  curl -X GET "http://localhost:5000/api/achievements/categories" \
       -H "Content-Type: application/json"
  ```

---

#### Mengambil Tipe Pencapaian
- **Method:** `GET`
- **Path:** `/api/achievements/types`
- **Headers:** `Content-Type: application/json`
- **Response 200 OK:**
  ```json
  [
    "Global",
    "National",
    "Internal"
  ]
  ```
- **Response 500 Internal Server Error:**
  ```json
  {
    "message": "Internal Server Error"
  }
  ```
- **cURL Command:**
  ```bash
  curl -X GET "http://localhost:5000/api/achievements/types" \
       -H "Content-Type: application/json"
  ```

---

### 2. Autentikasi (NextAuth)

#### Endpoint Handler NextAuth (Google & GitHub)
- **Method:** `GET`, `POST`
- **Path:** `/api/auth/[...nextauth]`
- **Keterangan:** Menangani alur sign-in, sign-out, callback, dan session dari NextAuth providers (Google, GitHub).

---

### 3. Chat & Email Service

#### Mengirim Email / Notifikasi
- **Method:** `POST`
- **Path:** `/api/chat/email`
- **Headers:** `Content-Type: application/json`
- **Body JSON (Skenario Reply Notification):**
  ```json
  {
    "type": "REPLY_NOTIFICATION",
    "targetEmail": "user@example.com",
    "senderName": "Satria Bahari",
    "message": "Halo, pesan Anda sudah saya terima dan tinjau."
  }
  ```
- **Body JSON (Skenario Pesan Baru):**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Halo, saya ingin mendiskusikan sebuah proyek."
  }
  ```
- **Response 200 OK:** (Bergantung pada implementasi transporter nodemailer, mengembalikan sukses pengiriman).
- **Response 500 Internal Server Error:**
  ```json
  {
    "message": "Internal Server Error"
  }
  ```
- **cURL Command:**
  ```bash
  curl -X POST "http://localhost:5000/api/chat/email" \
       -H "Content-Type: application/json" \
       -d '{"name": "John Doe", "email": "john@example.com", "message": "Halo!"}'
  ```

---

#### Mengambil Daftar Pesan Chat
- **Method:** `GET`
- **Path:** `/api/chat`
- **Headers:** `Content-Type: application/json`
- **Response 200 OK:**
  ```json
  [
    {
      "id": "uuid-string",
      "name": "Jane Doe",
      "message": "Keren sekali portofolionya!",
      "created_at": "2023-10-01T10:00:00Z"
    }
  ]
  ```
- **cURL Command:**
  ```bash
  curl -X GET "http://localhost:5000/api/chat" \
       -H "Content-Type: application/json"
  ```

---

#### Mengirim Pesan Chat Baru
- **Method:** `POST`
- **Path:** `/api/chat`
- **Headers:** `Content-Type: application/json`
- **Body JSON:**
  ```json
  {
    "name": "Jane Doe",
    "message": "Keren sekali portofolionya!"
  }
  ```
- **Response 200 OK:**
  ```json
  "Data saved successfully"
  ```
- **Response 500 Internal Server Error:**
  ```json
  {
    "message": "Error message description"
  }
  ```
- **cURL Command:**
  ```bash
  curl -X POST "http://localhost:5000/api/chat" \
       -H "Content-Type: application/json" \
       -d '{"name": "Jane Doe", "message": "Keren sekali portofolionya!"}'
  ```

---

#### Menghapus Pesan Chat
- **Method:** `DELETE`
- **Path:** `/api/chat/{slug}`
- **Path Parameters:**
  - `slug` (string, wajib): ID unik pesan yang akan dihapus.
- **Headers:** `Content-Type: application/json`
- **Response 200 OK:**
  ```json
  "Data saved successfully"
  ```
- **Response 500 Internal Server Error:**
  ```json
  {
    "message": "Internal Server Error"
  }
  ```
- **cURL Command:**
  ```bash
  curl -X DELETE "http://localhost:5000/api/chat/uuid-string-123" \
       -H "Content-Type: application/json"
  ```

---

### 4. Codewars

#### Mengambil Statistik Codewars
- **Method:** `GET`
- **Path:** `/api/codewars`
- **Headers:** `Content-Type: application/json`
- **Response 200 OK:**
  ```json
  {
    "username": "satriabahari",
    "name": "Satria Bahari",
    "honor": 1250,
    "leaderboardPosition": 15000,
    "ranks": {
      "overall": {
        "rank": -4,
        "name": "4 kyu",
        "color": "blue",
        "score": 1500
      }
    },
    "codeChallenges": {
      "totalCompleted": 250
    }
  }
  ```
- **Response 500 Internal Server Error:**
  ```json
  {
    "message": "Internal Server Error"
  }
  ```
- **cURL Command:**
  ```bash
  curl -X GET "http://localhost:5000/api/codewars" \
       -H "Content-Type: application/json"
  ```

---

## ⚠️ Kode Error & Penanganan

Portfolioo API menggunakan standar kode status HTTP untuk mengindikasikan status keberhasilan atau kegagalan dari sebuah permintaan:

| Kode Status | Deskripsi | Penanganan Umum |
| :--- | :--- | :--- |
| **200 OK** | Permintaan berhasil diproses. | Lanjutkan memproses data balasan di sisi klien (ReactJS). |
| **400 Bad Request** | Format payload JSON tidak valid atau parameter query salah. | Periksa kembali struktur data atau parameter yang dikirimkan. |
| **401 Unauthorized** | Autentikasi gagal atau token tidak disertakan/kedaluwarsa. | Lakukan autentikasi ulang melalui NextAuth. |
| **404 Not Found** | Endpoint atau resource data tidak ditemukan. | Pastikan URL path atau ID parameter (slug) sudah benar. |
| **500 Internal Server Error** | Terjadi kesalahan pada server (kesalahan database Supabase, kegagalan Nodemailer, atau error internal service). | Periksa log server backend, pastikan environment variables sudah dikonfigurasi dengan benar. |