Copy# 🚀 API Tester Pro

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
Option 2: Node.js
bashCopynpm install
npm start
# Open http://localhost:3000


🛡️ BurpSuite Proxy Setup

Open BurpSuite → Proxy → Options
Set listener: 127.0.0.1:8080
In API Tester Pro → Proxy tab:

Toggle Enable Proxy
Set Host: 127.0.0.1, Port: 8080
Enable Bypass SSL ✅


Click Save Proxy Config
Send any request → it appears in BurpSuite Intercept!

SSL Certificate (to avoid errors):
bashCopy# Download BurpSuite CA cert
curl -x http://127.0.0.1:8080 http://burp/cert -o burp_ca.der

# Convert to PEM (Linux/Mac)
openssl x509 -inform DER -in burp_ca.der -out burp_ca.pem

🌍 Environment Variables
Use {{VARIABLE_NAME}} anywhere in:

URL: {{baseUrl}}/api/users
Headers: Authorization: Bearer {{token}}
Body: {"user": "{{username}}"}


🐳 Docker Commands
bashCopy# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f api-tester

# Rebuild
docker-compose up --build -d

# With Nginx
docker-compose --profile nginx up -d

📁 Project Structure
Copyapi-tester-pro/
├── server.js          # Express backend
├── package.json
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── public/
    ├── index.html     # Single-page app
    ├── css/style.css  # Full dark theme UI
    └── js/app.js      # Frontend logic

🧪 Test Script Example
javascriptCopypm.test("Status is 200", () => 
  pm.expect(pm.response.status).to.equal(200)
);

pm.test("Has data", () => 
  pm.expect(JSON.stringify(pm.response.json())).to.include("id")
);


How to Package Everything
Run these commands to create the zip:
bashCopy# Create project directory
mkdir api-tester-pro
cd api-tester-pro

# Create all the files above, then:
chmod +x create-zip.sh
./create-zip.sh

# Or manually:
zip -r api-tester-pro.zip . \
  --exclude "*.zip" \
  --exclude "node_modules/*" \
  --exclude ".git/*"

🎯 What's Inside
FilePurposeserver.jsExpress API — proxies requests, stores env/collectionspublic/index.htmlFull SPA — all tabs, modals, UIpublic/css/style.cssDark theme, responsive layoutpublic/js/app.jsState management, API calls, test runnerDockerfileMulti-stage build, non-root userdocker-compose.ymlApp + optional Nginx profilesnginx.confReverse proxy configREADME.mdFull documentationcreate-zip.shAuto-packaging script
The tool runs on http://localhost:3000 and routes all traffic through BurpSuite at 127.0.0.1:8080 when the proxy is enabled! 🛡️
