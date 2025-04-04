const axios = require('axios');
const { parseISO, format } = require('date-fns');
const getMatchupMultipliers = require('./multipliers');

async function scrapeLineups(forceWeather = false) {
  const today = new Date().toISOString().split('T')[0];
  const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=probablePitcher`;

  try {
    console.log(`📅 Fetching MLB schedule for ${today}`);
    const scheduleRes = await axios.get(scheduleUrl);
    const games = scheduleRes.data?.dates?.[0]?.games || [];
    console.log(`✅ Found ${games.length} games\n`);

    const results = [];

    for (const game of games) {
      const gamePk = game.gamePk;
      const gameTime = parseISO(game.gameDate);
      const formattedTime = format(gameTime, 'h:mm a');

      const venue = game.venue?.name || 'Unknown Park';
      const home = game.teams.home;
      const away = game.teams.away;

      const homePitcher = home?.probablePitcher?.fullName || 'Unknown';
      const homePitcherHand = home?.probablePitcher?.pitchHand?.code || 'Unknown';
      const awayPitcher = away?.probablePitcher?.fullName || 'Unknown';
      const awayPitcherHand = away?.probablePitcher?.pitchHand?.code || 'Unknown';

      if (homePitcher === 'Unknown' || awayPitcher === 'Unknown') {
        console.warn(`⚠️ Probable pitchers not available for ${away.team.name} @ ${home.team.name}. Skipping game.`);
        continue;
      }

      console.log(`📍 Game at ${venue} — ${away.team.name} @ ${home.team.name}`);
      console.log(`  🧢 Home Pitcher: ${homePitcher} (${homePitcherHand}), Away Pitcher: ${awayPitcher} (${awayPitcherHand})`);

      const boxUrl = `https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`;
      console.log(`📦 Fetching boxscore: ${boxUrl}`);
      const boxRes = await axios.get(boxUrl);
      const box = boxRes.data;

      for (const [side, pitcher, pitcherHand, opponent] of [
        ['home', awayPitcher, awayPitcherHand, away.team.name],
        ['away', homePitcher, homePitcherHand, home.team.name]
      ]) {
        const team = box.teams[side];
        const teamName = team.team?.name || '';
        const players = team.players || {};
        const batters = team.batters || [];

        console.log(`🔄 Processing ${side} batters for ${teamName}`);

        for (let i = 0; i < batters.length; i++) {
          const id = batters[i];
          const playerData = players[`ID${id}`] || {};
          const person = playerData.person || {};
          const fullName = person.fullName || 'Unknown';
          const batSide = playerData?.batSide?.code || 'U';

          console.log(`👤 Player ID: ${id}, Name: ${fullName}`);
          console.log(`   ⬅️ Bat Side: ${batSide}, Pitcher Hand: ${pitcherHand}`);

          if (!fullName || batSide === 'U' || !pitcher || !pitcherHand) {
            console.warn(`⚠️ Skipping: fullName=${fullName}, batSide=${batSide}, pitcher=${pitcher}, pitcherHand=${pitcherHand}`);
            continue;
          }

          const adjustedHand = batSide === 'S'
            ? pitcherHand === 'R' ? 'L' : 'R'
            : batSide;

          if (batSide === 'S') {
            console.log(`🔁 Switch hitter → ${fullName} batting ${adjustedHand} vs ${pitcherHand}`);
          }

          console.log(`⚾ Matchup: ${fullName} (${adjustedHand}) vs ${pitcher} (${pitcherHand})`);

          const {
            baseHR,
            batterMultiplier,
            pitcherMultiplier,
            parkMultiplier,
            weatherMultiplier,
            weatherEmoji,
            windRelativeText,
            windFavorability
          } = await getMatchupMultipliers(
            fullName,
            pitcher,
            pitcherHand,
            venue,
            adjustedHand,
            forceWeather
          );

          console.log(`📊 Result → HR%: ${(baseHR * 100).toFixed(1)}%, Multipliers: B×${batterMultiplier.toFixed(2)}, P×${pitcherMultiplier.toFixed(2)}, Park×${parkMultiplier.toFixed(2)}, Wx×${weatherMultiplier.toFixed(2)}\n`);

          results.push({
            player: fullName,
            team: teamName,
            opponent,
            park: venue,
            gameTime: formattedTime,
            battingOrder: i + 1,
            batterHand: adjustedHand,
            originalBatterHand: batSide,
            pitcher,
            pitcherHand,
            baseHR,
            batterMultiplier,
            pitcherMultiplier,
            parkMultiplier,
            weatherMultiplier,
            weatherEmoji,
            windRelativeText,
            windFavorability
          });
        }
      }
    }

    console.log(`✅ All done. Returning ${results.length} matchups\n`);
    return results;

  } catch (err) {
    console.error('❌ Error scraping lineups:', err.message);
    return [];
  }
}

module.exports = scrapeLineups;