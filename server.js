const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const https = require('https');
const http = require('http');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────
// In-memory storage (replace with DB if needed)
// ─────────────────────────────────────────────
let environments = {};
let collections = {};
let history = [];
let proxyConfig = {
  enabled: false,
  host: '127.0.0.1',
  port: 8080,
  protocol: 'http',
  bypassSSL: true,
};

// ─────────────────────────────────────────────
// HELPER: Replace environment variables {{VAR}}
// ─────────────────────────────────────────────
function replaceEnvVars(text, envVars) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return envVars[key] !== undefined ? envVars[key] : match;
  });
}

function processWithEnv(obj, envVars) {
  if (typeof obj === 'string') return replaceEnvVars(obj, envVars);
  if (typeof obj === 'object' && obj !== null) {
    const result = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
      result[key] = processWithEnv(obj[key], envVars);
    }
    return result;
  }
  return obj;
}

// ─────────────────────────────────────────────
// PROXY CONFIG ROUTES
// ─────────────────────────────────────────────
app.get('/api/proxy-config', (req, res) => {
  res.json(proxyConfig);
});

app.post('/api/proxy-config', (req, res) => {
  proxyConfig = { ...proxyConfig, ...req.body };
  res.json({ success: true, config: proxyConfig });
});

// ─────────────────────────────────────────────
// ENVIRONMENT ROUTES
// ─────────────────────────────────────────────
app.get('/api/environments', (req, res) => {
  res.json(environments);
});

app.post('/api/environments', (req, res) => {
  const { name, variables } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  environments[name] = variables || {};
  res.json({ success: true, environments });
});

app.put('/api/environments/:name', (req, res) => {
  const { name } = req.params;
  const { variables, newName } = req.body;
  if (newName && newName !== name) {
    environments[newName] = environments[name] || {};
    delete environments[name];
    if (variables) environments[newName] = variables;
  } else {
    if (!environments[name]) environments[name] = {};
    if (variables) environments[name] = variables;
  }
  res.json({ success: true, environments });
});

app.delete('/api/environments/:name', (req, res) => {
  delete environments[req.params.name];
  res.json({ success: true, environments });
});

// ─────────────────────────────────────────────
// COLLECTIONS ROUTES
// ─────────────────────────────────────────────
app.get('/api/collections', (req, res) => {
  res.json(collections);
});

app.post('/api/collections', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (!collections[name]) collections[name] = { requests: [] };
  res.json({ success: true, collections });
});

app.post('/api/collections/:name/requests', (req, res) => {
  const { name } = req.params;
  if (!collections[name]) collections[name] = { requests: [] };
  const reqData = { id: Date.now().toString(), ...req.body };
  collections[name].requests.push(reqData);
  res.json({ success: true, collections });
});

app.delete('/api/collections/:name', (req, res) => {
  delete collections[req.params.name];
  res.json({ success: true, collections });
});

app.delete('/api/collections/:name/requests/:id', (req, res) => {
  const { name, id } = req.params;
  if (collections[name]) {
    collections[name].requests = collections[name].requests.filter(
      (r) => r.id !== id
    );
  }
  res.json({ success: true, collections });
});

// ─────────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────────
app.get('/api/history', (req, res) => {
  res.json(history.slice(-100).reverse());
});

app.delete('/api/history', (req, res) => {
  history = [];
  res.json({ success: true });
});

// ─────────────────────────────────────────────
// MAIN REQUEST PROXY ENDPOINT
// ─────────────────────────────────────────────
app.post('/api/send-request', async (req, res) => {
  const {
    url,
    method,
    headers,
    body,
    params,
    auth,
    environment,
    bodyType,
    formData,
  } = req.body;

  // Get active env vars
  const envVars = environment ? environments[environment] || {} : {};

  // Replace env vars in all fields
  let processedUrl = replaceEnvVars(url, envVars);
  let processedHeaders = processWithEnv(headers || {}, envVars);
  let processedBody = processWithEnv(body, envVars);

  // Add query params
  if (params && params.length > 0) {
    const urlObj = new URL(processedUrl);
    params.forEach(({ key, value, enabled }) => {
      if (enabled && key) {
        urlObj.searchParams.append(
          replaceEnvVars(key, envVars),
          replaceEnvVars(value, envVars)
        );
      }
    });
    processedUrl = urlObj.toString();
  }

  // Handle auth
  if (auth) {
    if (auth.type === 'bearer' && auth.token) {
      processedHeaders['Authorization'] =
        `Bearer ${replaceEnvVars(auth.token, envVars)}`;
    } else if (auth.type === 'basic' && auth.username) {
      const encoded = Buffer.from(
        `${replaceEnvVars(auth.username, envVars)}:${replaceEnvVars(auth.password || '', envVars)}`
      ).toString('base64');
      processedHeaders['Authorization'] = `Basic ${encoded}`;
    } else if (auth.type === 'apikey' && auth.key) {
      if (auth.addTo === 'header') {
        processedHeaders[replaceEnvVars(auth.keyName || 'X-API-Key', envVars)] =
          replaceEnvVars(auth.key, envVars);
      }
    }
  }

  // Build axios config
  const axiosConfig = {
    method: method || 'GET',
    url: processedUrl,
    headers: processedHeaders,
    validateStatus: () => true,
    maxRedirects: 10,
    timeout: 30000,
  };

  // Handle body types
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method?.toUpperCase())) {
    if (bodyType === 'json' && processedBody) {
      axiosConfig.data =
        typeof processedBody === 'string'
          ? processedBody
          : JSON.stringify(processedBody);
      processedHeaders['Content-Type'] =
        processedHeaders['Content-Type'] || 'application/json';
    } else if (bodyType === 'form-urlencoded' && formData) {
      const params = new URLSearchParams();
      formData.forEach(({ key, value, enabled }) => {
        if (enabled && key)
          params.append(
            replaceEnvVars(key, envVars),
            replaceEnvVars(value, envVars)
          );
      });
      axiosConfig.data = params.toString();
      processedHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (bodyType === 'raw' && processedBody) {
      axiosConfig.data = processedBody;
    } else if (bodyType === 'xml' && processedBody) {
      axiosConfig.data = processedBody;
      processedHeaders['Content-Type'] =
        processedHeaders['Content-Type'] || 'application/xml';
    }
  }

  axiosConfig.headers = processedHeaders;

  // ── PROXY SETUP (BurpSuite) ──
  if (proxyConfig.enabled) {
    const proxyUrl = `${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`;
    try {
      if (processedUrl.startsWith('https://')) {
        axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl, {
          rejectUnauthorized: !proxyConfig.bypassSSL,
        });
      } else {
        axiosConfig.httpAgent = new HttpProxyAgent(proxyUrl);
      }
      // Also set httpsAgent to bypass SSL verification for BurpSuite cert
      if (proxyConfig.bypassSSL) {
        axiosConfig.httpsAgent =
          axiosConfig.httpsAgent ||
          new https.Agent({ rejectUnauthorized: false });
      }
    } catch (e) {
      console.error('Proxy setup error:', e.message);
    }
  }

  const startTime = Date.now();

  try {
    const response = await axios(axiosConfig);
    const duration = Date.now() - startTime;

    const responseSize = JSON.stringify(response.data).length;

    const result = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      duration,
      size: responseSize,
      proxied: proxyConfig.enabled,
      proxyInfo: proxyConfig.enabled
        ? `${proxyConfig.host}:${proxyConfig.port}`
        : null,
    };

    // Save to history
    history.push({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      method: method || 'GET',
      url: processedUrl,
      status: response.status,
      duration,
      environment: environment || null,
      request: { url: processedUrl, method, headers: processedHeaders, body },
      response: result,
    });

    res.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errResult = {
      error: true,
      message: error.message,
      code: error.code,
      duration,
      proxied: proxyConfig.enabled,
    };

    history.push({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      method: method || 'GET',
      url: processedUrl,
      status: 0,
      duration,
      error: error.message,
      environment: environment || null,
    });

    res.status(500).json(errResult);
  }
});

// ─────────────────────────────────────────────
// EXPORT / IMPORT
// ─────────────────────────────────────────────
app.get('/api/export', (req, res) => {
  res.json({ environments, collections, exportedAt: new Date().toISOString() });
});

app.post('/api/import', (req, res) => {
  const { environments: envs, collections: cols } = req.body;
  if (envs) environments = { ...environments, ...envs };
  if (cols) collections = { ...collections, ...cols };
  res.json({ success: true, environments, collections });
});

// ─────────────────────────────────────────────
// SERVE FRONTEND
// ─────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ API Tester running at http://localhost:${PORT}`);
  console.log(`📡 BurpSuite proxy: ${proxyConfig.enabled ? 'ENABLED' : 'DISABLED'}`);
});