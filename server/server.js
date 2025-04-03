// server/server.js
const express = require('express');
const cors = require('cors');
const lineupScraper = require('./scraper');
const getWeatherMultipliers = require('./weather');

const app = express();
const PORT = 3001;

app.use(cors());

app.get('/lineups', async (req, res) => {
  try {
    console.log('📥 /lineups request received');
    const lineups = await lineupScraper(false); // cached weather
    console.log('📤 Sending lineup data');
    res.json(lineups);
  } catch (err) {
    console.error('❌ Error scraping lineups:', err);
    res.status(500).json({ error: 'Failed to fetch lineups' });
  }
});

app.get('/refresh-weather', async (req, res) => {
  try {
    console.log('🌦️ /refresh-weather request received');
    await getWeatherMultipliers(true); // force update
    console.log('✅ Weather multipliers refreshed');
    res.json({ success: true, message: 'Weather updated' });
  } catch (err) {
    console.error('❌ Failed to refresh weather:', err);
    res.status(500).json({ error: 'Weather update failed' });
  }
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
