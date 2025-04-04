// server/multipliers.js
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const getWeatherMultipliers = require('./weather');

function loadCSV(fileName) {
  const filePath = path.join(__dirname, 'data', fileName);
  const content = fs.readFileSync(filePath, 'utf8');
  return Papa.parse(content, { header: true, skipEmptyLines: true }).data;
}

const batters = loadCSV('batters.csv');
const batters_vL = loadCSV('batters_vL.csv');
const batters_vR = loadCSV('batters_vR.csv');
const pitchers_vL = loadCSV('pitchers_vL.csv');
const pitchers_vR = loadCSV('pitchers_vR.csv');
const parkFactors = require('./data/park_factors_hr_pa.json');

const LEAGUE_AVG_HR_RATE = 5453 / 182449;

const parkToTeamMap = {
  'Yankee Stadium': 'Yankees',
  'Oriole Park at Camden Yards': 'Orioles',
  'Fenway Park': 'Red Sox',
  'Rogers Centre': 'Blue Jays',
  'Tropicana Field': 'Rays',
  'Comerica Park': 'Tigers',
  'Kauffman Stadium': 'Royals',
  'Guaranteed Rate Field': 'White Sox',
  'Target Field': 'Twins',
  'Progressive Field': 'Guardians',
  'Angel Stadium': 'Angels',
  'Minute Maid Park': 'Astros',
  'T-Mobile Park': 'Mariners',
  'Globe Life Field': 'Rangers',
  'Oakland Coliseum': 'Athletics',
  'Truist Park': 'Braves',
  'Citizens Bank Park': 'Phillies',
  'loanDepot Park': 'Marlins',
  'Nationals Park': 'Nationals',
  'Citi Field': 'Mets',
  'PNC Park': 'Pirates',
  'Wrigley Field': 'Cubs',
  'Great American Ball Park': 'Reds',
  'Busch Stadium': 'Cardinals',
  'American Family Field': 'Brewers',
  'Chase Field': 'Diamondbacks',
  'Coors Field': 'Rockies',
  'Dodger Stadium': 'Dodgers',
  'Petco Park': 'Padres',
  'Oracle Park': 'Giants'
};

function findPlayer(data, name) {
  return data.find(p => p.Player?.toLowerCase() === name.toLowerCase() || p.Name?.toLowerCase() === name.toLowerCase());
}

function safeDivide(numerator, denominator, fallback = 0.045) {
  const result = parseFloat(numerator) / parseFloat(denominator);
  return isNaN(result) || !isFinite(result) ? fallback : result;
}

function normalizeParkName(name) {
  const aliases = {
    'loandepot park': 'loanDepot Park',
    'rogers centre': 'Rogers Centre',
    'oracle park': 'Oracle Park',
    'citizens bank park': 'Citizens Bank Park',
    'yankee stadium': 'Yankee Stadium'
  };
  const lower = name.toLowerCase().trim();
  const normalized = aliases[lower] || name.trim();
  return normalized;
}

async function getMatchupMultipliers(batterName, pitcherName, pitcherHand, park, batterHand, forceUpdate = false) {
  const batterSplit = pitcherHand === 'L' ? batters_vL : batters_vR;
  const batterNeutral = batters;
  const batterVs = findPlayer(batterSplit, batterName);
  const batterOverall = findPlayer(batterNeutral, batterName);

  const pitcherSplit = batterHand === 'L' ? pitchers_vL : pitchers_vR;
  const pitcherVs = findPlayer(pitcherSplit, pitcherName);

  const parkName = normalizeParkName(park);
  const teamKey = parkToTeamMap[parkName] || '';
  const parkHR = parkFactors[teamKey]?.[batterHand] || 1.0;

  const weatherMultipliers = await getWeatherMultipliers(forceUpdate);
  const weatherForPark = weatherMultipliers[teamKey] || {
    R: 1.0,
    L: 1.0,
    S: 1.0,
    raw: {
      emoji: '',
      windDirectionText: '',
      favorability: {
        R: '',
        L: '',
        S: ''
      }
    }
  };

  const weatherMult = weatherForPark[batterHand] || 1.0;
  const windText = weatherForPark.raw?.windDirectionText || '';
  const windFav = weatherForPark.raw?.favorability?.[batterHand] || '';

  const batterHRvs = batterVs ? safeDivide(batterVs.HR, batterVs.PA, LEAGUE_AVG_HR_RATE) : LEAGUE_AVG_HR_RATE;
  const batterHRall = batterOverall ? safeDivide(batterOverall.HR, batterOverall.PA, LEAGUE_AVG_HR_RATE) : LEAGUE_AVG_HR_RATE;
  const pitcherHR = pitcherVs ? safeDivide(pitcherVs.HR, pitcherVs.TBF, LEAGUE_AVG_HR_RATE) : LEAGUE_AVG_HR_RATE;

  const batterMult = (0.75 * batterHRvs + 0.25 * batterHRall) / LEAGUE_AVG_HR_RATE;
  const pitcherMult = (0.75 * pitcherHR + 0.25 * LEAGUE_AVG_HR_RATE) / LEAGUE_AVG_HR_RATE;

  const baseHR = Math.min(batterMult * pitcherMult * parkHR * weatherMult * LEAGUE_AVG_HR_RATE * 4, 1.0);

  return {
    baseHR,
    batterMultiplier: batterMult,
    pitcherMultiplier: pitcherMult,
    parkMultiplier: parkHR,
    weatherMultiplier: weatherMult,
    weatherEmoji: weatherForPark.raw?.emoji || '',
    windRelativeText: windText,
    windFavorability: windFav
  };
}

module.exports = getMatchupMultipliers;
