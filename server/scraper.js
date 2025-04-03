// server/scraper.js
const axios = require('axios');
const getMatchupMultipliers = require('./multipliers');
const { parseISO, format, isAfter } = require('date-fns');

const USE_TEST_DATA = true;

const testGames = [
  {
    park: 'Oriole Park at Camden Yards',
    gameTime: '06:35 PM',
    pitcher: 'Zach Eflin',
    pitcherHand: 'R',
    batters: [
      { player: 'Jarren Duran', hand: 'L' },
      { player: 'Rafael Devers', hand: 'L' },
      { player: 'Alex Bregman', hand: 'R' },
      { player: 'Triston Casas', hand: 'L' },
      { player: 'Trevor Story', hand: 'R' },
      { player: 'Wilyer Abreu', hand: 'L' },
      { player: 'Kristian Campbell', hand: 'R' },
      { player: 'Connor Wong', hand: 'R' },
      { player: 'Ceddanne Rafaela', hand: 'R' }
    ]
  },
  {
    park: 'Citizens Bank Park',
    gameTime: '06:45 PM',
    pitcher: 'Zack Wheeler',
    pitcherHand: 'R',
    batters: [
      { player: 'Brenton Doyle', hand: 'R' },
      { player: 'Ezequiel Tovar', hand: 'R' },
      { player: 'Ryan McMahon', hand: 'L' },
      { player: 'Hunter Goodman', hand: 'R' },
      { player: 'Kris Bryant', hand: 'R' },
      { player: 'Michael Toglia', hand: 'S' },
      { player: 'Nick Martini', hand: 'L' },
      { player: 'Kyle Farmer', hand: 'R' },
      { player: 'Mickey Moniak', hand: 'L' }
    ]
  },
  {
    park: 'Yankee Stadium',
    gameTime: '07:05 PM',
    pitcher: 'Carlos Rodón',
    pitcherHand: 'L',
    batters: [
      { player: 'Ketel Marte', hand: 'S' },
      { player: 'Corbin Carroll', hand: 'L' },
      { player: 'Lourdes Gurriel Jr.', hand: 'R' },
      { player: 'Randal Grichuk', hand: 'R' },
      { player: 'Josh Naylor', hand: 'L' },
      { player: 'Eugenio Suárez', hand: 'R' },
      { player: 'Gabriel Moreno', hand: 'R' },
      { player: 'Jake McCarthy', hand: 'L' },
      { player: 'Geraldo Perdomo', hand: 'S' }
    ]
  }
];

async function scrapeLineups(forceWeather = false) {
  if (USE_TEST_DATA) {
    console.log('🧪 Using test data mode');
    const testLineups = [];

    for (const game of testGames) {
      const { park, gameTime, pitcher, pitcherHand, batters } = game;
      console.log(`🎯 Game: ${park} — ${pitcher} (${pitcherHand})`);

      for (let i = 0; i < batters.length; i++) {
        const { player, hand } = batters[i];
        const batterHand = hand === 'S' ? (pitcherHand === 'R' ? 'L' : 'R') : hand;

        console.log(`⚾ Evaluating matchup: ${player} (${batterHand}) vs ${pitcher} (${pitcherHand}) at ${park}`);
        const {
          baseHR,
          batterMultiplier,
          pitcherMultiplier,
          parkMultiplier,
          weatherMultiplier
        } = await getMatchupMultipliers(player, pitcher, pitcherHand, park, batterHand, forceWeather);

        testLineups.push({
          player,
          team: 'Test Team',
          opponent: 'Test Opponent',
          park,
          gameTime,
          battingOrder: i + 1,
          batterHand,
          pitcher,
          pitcherHand,
          baseHR,
          batterMultiplier,
          pitcherMultiplier,
          parkMultiplier,
          weatherMultiplier
        });

        console.log(`✅ Added ${player} → HR%: ${(baseHR * 100).toFixed(1)}%`);
      }
    }

    console.log(`\n✅ Finished — Returning ${testLineups.length} players (TEST MODE)\n`);
    return testLineups;
  }

  console.warn('❌ No real scraper logic implemented yet.');
  return [];
}

module.exports = scrapeLineups;
