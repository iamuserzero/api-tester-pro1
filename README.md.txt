# 🚀 API Tester Pro

A powerful **Postman-like API testing tool** built with Node.js + vanilla JS.

## ✨ Features

| Feature | Details |
|---|---|
| 🌐 HTTP Methods | GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS |
| 🔑 Auth | Bearer Token, Basic Auth, API Key |
| 📦 Body Types | JSON, form-urlencoded, raw, XML |
| 🌍 Environments | Variable injection with `{{VAR}}` syntax |
| 📁 Collections | Save & organize requests |
| 🛡️ BurpSuite Proxy | Route ALL traffic through BurpSuite |
| 📜 History | Last 100 requests with replay |
| 📤 Export/Import | JSON backup & restore |
| 🧪 Test Scripts | JavaScript assertion runner |
| ⌨️ Shortcuts | `Ctrl+Enter` to send, `Esc` to close |

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/api-tester-pro.git
cd api-tester-pro

# Build & run
docker-compose up --build -d

# Open in browser
open http://localhost:3000