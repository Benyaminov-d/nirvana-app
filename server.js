const express = require('express');
const path = require('path');
const app = express();

const root = '/srv';
// Serve static files (PDF, HTML, images) from public/static
app.use('/static', express.static(path.join(root, 'spa', 'static'), { maxAge: '30d' }));
// Serve built assets from dist first, then shared assets  
app.use('/assets', express.static(path.join(root, 'spa', 'assets'), { maxAge: '30d', immutable: true }));
app.use('/assets', express.static(path.join(root, 'assets'), { maxAge: '30d', immutable: true }));
// Serve dist at root
app.use('/', express.static(path.join(root, 'spa')));

// SPA fallback for any client-side route
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(root, 'spa', 'index.html'));
});

app.get('/healthz', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 80;
app.listen(port, () => {
  console.log(`frontend static server listening on ${port}`);
});


