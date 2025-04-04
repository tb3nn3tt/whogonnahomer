// server/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const lineupScraper = require('./scraper');
const getWeatherMultipliers = require('./weather');
const getMatchupMultipliers = require('./multipliers');

const app = express();
const PORT = 3001;

app.use(cors());

app.get('/lineups', async (req, res) => {
  const useTestData = req.query.test === 'true';
  console.log(`📥 /lineups request received (test mode: ${useTestData})`);

  try {
    let data = [];

    if (useTestData) {
      console.log('🧪 Loading test data from test_lineups.json');
      const raw = fs.readFileSync(path.join(__dirname, 'data', 'test_lineups.json'), 'utf8');
      const players = JSON.parse(raw);

      for (const p of players) {
        console.log(`➡️ Processing test batter: ${p.player} vs ${p.pitcher} at ${p.park}`);
        const result = await getMatchupMultipliers(
          p.player,
          p.pitcher,
          p.pitcherHand,
          p.park,
          p.batterHand
        );

        data.push({
          ...p,
          ...result,
          adjustedHR: (result.baseHR * 100).toFixed(1)
        });
      }
    } else {
      data = await lineupScraper(false); // live scrape
    }

    console.log(`📤 Sending ${data.length} players`);
    res.json(data);
  } catch (err) {
    console.error('❌ Error in /lineups:', err);
    res.status(500).json({ error: 'Failed to get lineups' });
  }
});

app.get('/refresh-weather', async (req, res) => {
  try {
    console.log('🌦️ /refresh-weather request received');
    await getWeatherMultipliers(true); // force refresh
    console.log('✅ Weather multipliers refreshed');
    res.json({ success: true, message: 'Weather updated' });
  } catch (err) {
    console.error('❌ Failed to refresh weather:', err);
    res.status(500).json({ error: 'Weather update failed' });
  }
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
