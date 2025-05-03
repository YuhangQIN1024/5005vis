const radarStats = ['PTS', 'AST', 'STL', 'BLK', 'OREB', 'DREB'];
const shootingStats = ['FG_PCT', 'FG3_PCT', 'FT_PCT'];
const volumeStats = ['GP', 'MIN_PG'];
const disciplineStats = ['TOV_PG', 'PF_PG'];

let data;
let allPlayers = [];
let playerIdMap = {}; // Map to store player_name to PLAYER_ID mapping

const playerSearch = d3.select('#playerSearch');
const playerSelect = d3.select('#playerSelect');
const seasonSelect = d3.select('#seasonSelect');
const gpFilter = d3.select('#gpFilter');
const mpgFilter = d3.select('#mpgFilter');

const shootingFiles = [
  'data/simplified_shot_data.csv'
];

const searchResults = d3.select('#searchResults');
let selectedPlayerId = null;

// Debounce function for search
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

// Setup the search functionality with the two-stage approach
function setupSearch() {
  playerSearch.on('input', debounce(() => {
    const query = playerSearch.property('value').toLowerCase();
    
    // Only show results if we have at least 2 characters
    if (query.length < 2) {
      searchResults.style('display', 'none');
      return;
    }
    
    // Filter players by name
    const filtered = allPlayers.filter(name => 
      name.toLowerCase().includes(query)
    );
    
    // Limit to first 20 matches for performance
    const displayResults = filtered.slice(0, 20);
    
    // Display search results
    searchResults.style('display', 'block');
    searchResults.html(''); // Clear previous results
    
    if (displayResults.length === 0) {
      searchResults.append('div')
        .attr('class', 'search-item')
        .style('padding', '8px 12px')
        .style('color', '#999')
        .text('No players found');
      return;
    }
    
    // Add each matching player to the results dropdown
    displayResults.forEach(name => {
      searchResults.append('div')
        .attr('class', 'search-item')
        .style('padding', '8px 12px')
        .style('cursor', 'pointer')
        .style('border-bottom', '1px solid #eee')
        .text(name)
        .on('mouseover', function() {
          d3.select(this).style('background', '#f0f0f0');
        })
        .on('mouseout', function() {
          d3.select(this).style('background', 'none');
        })
        .on('click', function() {
          // When a player is selected from search results
          const id = playerIdMap[name];
          
          // Update the search input with the selected name
          playerSearch.property('value', name);
          
          // Hide the search results
          searchResults.style('display', 'none');
          
          // Update the player dropdown and select this player
          playerSelect.property('value', id);
          
          // Now update the charts
          updateSeasons();
        });
    });
    
    // Show how many more results exist
    if (filtered.length > 20) {
      searchResults.append('div')
        .style('padding', '8px 12px')
        .style('color', '#999')
        .style('font-style', 'italic')
        .style('text-align', 'center')
        .text(`+ ${filtered.length - 20} more players`);
    }
  }, 300)); // 300ms debounce time
  
  // Close search results when clicking elsewhere on the page
  d3.select('body').on('click', function() {
    searchResults.style('display', 'none');
  });
  
  // Stop propagation on search box to prevent it from closing when clicking inside it
  d3.select('#playerSearch').on('click', function(event) {
    event.stopPropagation();
  });
  
  // Same for search results
  searchResults.on('click', function(event) {
    event.stopPropagation();
  });
}

function loadShootingData(playerId, seasonId) {
  Promise.all(shootingFiles.map(file => d3.csv(file))).then(shootingParts => {
    const allShots = shootingParts.flat();

    // Now filter and visualize
    const filteredShots = allShots.filter(d => 
        d.PLAYER_ID === playerId.toString() &&
        d.SEASON_ID === seasonId
    );

    drawShootingChart(filteredShots);
  });
}

const statLabels = {
  FG_PCT: 'Field Goal %',
  FG3_PCT: '3PT %',
  FT_PCT: 'Free Throw %',
  GP: 'Games Played',
  MIN_PG: 'Minutes / Game',
  TOV_PG: 'Turnovers / Game',
  PF_PG: 'Fouls / Game'
};

d3.csv('./data/all_players_career_stats.csv', row => ({
  ...row,
  PLAYER_ID: +row.PLAYER_ID,
  TEAM_ID: +row.TEAM_ID,
  PLAYER_AGE: +row.PLAYER_AGE,
  GP: +row.GP,
  GS: +row.GS,
  MIN: +row.MIN,
  FGM: +row.FGM,
  FGA: +row.FGA,
  FG_PCT: +row.FG_PCT,
  FG3M: +row.FG3M,
  FG3A: +row.FG3A,
  FG3_PCT: +row.FG3_PCT,
  FTM: +row.FTM,
  FTA: +row.FTA,
  FT_PCT: +row.FT_PCT,
  OREB: +row.OREB,
  DREB: +row.DREB,
  REB: +row.REB,
  AST: +row.AST,
  STL: +row.STL,
  BLK: +row.BLK,
  TOV: +row.TOV,
  PF: +row.PF,
  PTS: +row.PTS,
  player_name: row.player_name
})).then(csvData => {
  data = csvData;
  
  // Create a map of player names to IDs and collect unique players
  const playerMap = new Map();
  data.forEach(d => {
    playerMap.set(d.player_name, d.PLAYER_ID);
  });
  
  // Extract unique player names and sort them
  allPlayers = Array.from(playerMap.keys()).sort();
  
  // Create a mapping from player name to PLAYER_ID
  allPlayers.forEach(name => {
    playerIdMap[name] = playerMap.get(name);
  });

  populatePlayerDropdown(allPlayers);

  playerSelect.on('change', updateSeasons);
  seasonSelect.on('change', updateCharts);

  playerSearch.on('input', () => {
    const query = playerSearch.property('value').toLowerCase();
    const filtered = allPlayers.filter(name => name.toLowerCase().includes(query));
    populatePlayerDropdown(filtered);
  });

  gpFilter.on('input', () => {
    playerSearch.property('value', '');
    populatePlayerDropdown(allPlayers);
  });

  mpgFilter.on('input', () => {
    playerSearch.property('value', '');
    populatePlayerDropdown(allPlayers);
  });

  setupSearch(); // Initialize the search functionality
});

function populatePlayerDropdown(filteredPlayers) {
  const minGP = +gpFilter.property('value');
  const minMPG = +mpgFilter.property('value');
  const selectedSeason = seasonSelect.property('value');

  let playerSeasonData = data;

  if (selectedSeason) {
    playerSeasonData = playerSeasonData.filter(d => d.SEASON_ID === selectedSeason);
  }

  if (!isNaN(minGP) && minGP > 0) {
    playerSeasonData = playerSeasonData.filter(d => d.GP >= minGP);
  }

  if (!isNaN(minMPG) && minMPG > 0) {
    playerSeasonData = playerSeasonData.filter(d => (d.MIN / d.GP) >= minMPG);
  }

  const validPlayers = new Set(playerSeasonData.map(d => d.player_name));
  const finalList = filteredPlayers.filter(name => validPlayers.has(name));

  // Clear and populate the dropdown
  playerSelect.selectAll('option').remove();
  playerSelect.selectAll('option')
    .data(finalList)
    .enter()
    .append('option')
    .text(d => d)
    .attr('value', d => playerIdMap[d]);

  // Only update charts if explicitly selected (not during search)
  const currentSearch = playerSearch.property('value');
  const isSearchActive = currentSearch && currentSearch.length > 0;
  
  if (finalList.length > 0) {
    // Set the first player as default
    if (!isSearchActive) {
      playerSelect.property('value', playerIdMap[finalList[0]]);
      updateSeasons();
    }
  } else {
    // Only clear charts if not actively searching
    if (!isSearchActive) {
      seasonSelect.selectAll('option').remove();
      d3.select('#radarChart').selectAll('*').remove();
      d3.select('#barChart1').selectAll('*').remove();
      d3.select('#barChart2').selectAll('*').remove();
      d3.select('#barChart3').selectAll('*').remove();
    }
  }
}

function updateSeasons() {
  const playerId = +playerSelect.property('value');
  const seasons = Array.from(
    new Set(data.filter(d => d.PLAYER_ID === playerId).map(d => d.SEASON_ID))
  ).sort().reverse();

  seasonSelect.selectAll('option').remove();
  seasonSelect.selectAll('option').data(seasons).enter().append('option').text(d => d);
  seasonSelect.property('value', seasons[0]);
  updateCharts();
}

function updateCharts() {
  const playerId = +playerSelect.property('value');
  const season = seasonSelect.property('value');
  const minGP = +gpFilter.property('value');
  const minMPG = +mpgFilter.property('value');

  const playerData = data.find(d => d.PLAYER_ID === playerId && d.SEASON_ID === season);
  if (!playerData || playerData.GP === 0) return;

  let seasonData = data.filter(d => d.SEASON_ID === season);

  if (!isNaN(minGP) && minGP > 0) {
    seasonData = seasonData.filter(d => d.GP >= minGP);
  }

  if (!isNaN(minMPG) && minMPG > 0) {
    seasonData = seasonData.filter(d => (d.MIN / d.GP) >= minMPG);
  }

  if (seasonData.length === 0) return;

  const radarPlayerValues = {};
  const leagueTotalStats = {};
  const leagueTotalGames = d3.sum(seasonData, d => d.GP);

  radarStats.forEach(stat => {
    leagueTotalStats[stat] = d3.sum(seasonData, d => d[stat]);
    radarPlayerValues[stat] = playerData[stat] / playerData.GP;
  });

  const leagueAvgPerGame = {};
  const leagueMaxPerGame = {};

  radarStats.forEach(stat => {
    leagueAvgPerGame[stat] = leagueTotalStats[stat] / leagueTotalGames;
    leagueMaxPerGame[stat] = d3.max(seasonData, d => d[stat] / d.GP);
  });

  const radarPlayerData = radarStats.map(stat => ({
    stat,
    normalized: radarPlayerValues[stat] / leagueMaxPerGame[stat],
    actual: radarPlayerValues[stat]
  }));

  const radarLeagueData = radarStats.map(stat => ({
    stat,
    normalized: leagueAvgPerGame[stat] / leagueMaxPerGame[stat],
    actual: leagueAvgPerGame[stat]
  }));

  drawRadarChart(radarStats, radarPlayerData, radarLeagueData);

  const barData1 = shootingStats.map(stat => ({
    stat,
    player: playerData[stat],
    avg: d3.mean(seasonData, d => d[stat]),
    max: d3.max(seasonData, d => d[stat])
  }));

  const barData2 = [
    {
      stat: 'GP',
      player: playerData.GP,
      avg: d3.mean(seasonData, d => d.GP),
      max: d3.max(seasonData, d => d.GP)
    },
    {
      stat: 'MIN_PG',
      player: playerData.MIN / playerData.GP,
      avg: d3.mean(seasonData, d => d.MIN / d.GP),
      max: d3.max(seasonData, d => d.MIN / d.GP)
    }
  ];

  const barData3 = [
    {
      stat: 'TOV_PG',
      player: playerData.TOV / playerData.GP,
      avg: d3.mean(seasonData, d => d.TOV / d.GP),
      max: d3.max(seasonData, d => d.TOV / d.GP)
    },
    {
      stat: 'PF_PG',
      player: playerData.PF / playerData.GP,
      avg: d3.mean(seasonData, d => d.PF / d.GP),
      max: d3.max(seasonData, d => d.PF / d.GP)
    }
  ];

  drawBarChart('#barChart1', barData1, true, 'Shooting Percentage Comparison');
  drawBarChart('#barChart2', barData2, false, 'Games & Minutes Played Comparison');
  drawBarChart('#barChart3', barData3, false, 'Turnover & Fouls Comparison');
  
  // Load and process the shooting data for the shot chart
  loadShootingData(playerId, season);
}

function drawRadarChart(stats, playerValues, leagueValues) {
  const svg = d3.select('#radarChart');
  svg.selectAll('*').remove();
  const width = +svg.attr('width');
  const height = +svg.attr('height');
  const radius = Math.min(width, height) / 2 - 40;
  const center = [width / 2, height / 2];
  const angleSlice = (2 * Math.PI) / stats.length;
  const rScale = d3.scaleLinear().domain([0, 1]).range([0, radius]);

  const radarLine = d3.lineRadial()
    .radius(d => rScale(d))
    .angle((d, i) => i * angleSlice)
    .curve(d3.curveLinearClosed);

  // Tooltip
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('background', '#fff')
    .style('border', '1px solid #ccc')
    .style('padding', '6px 10px')
    .style('border-radius', '4px')
    .style('pointer-events', 'none')
    .style('font-size', '14px')
    .style('display', 'none');

  const axisGrid = svg.append('g').attr('transform', `translate(${center})`);
  for (let level = 0.2; level <= 1; level += 0.2) {
    axisGrid.append('circle')
      .attr('r', rScale(level))
      .style('fill', 'none')
      .style('stroke', '#ccc');
  }

  // Draw axis labels
  stats.forEach((stat, i) => {
    const angle = i * angleSlice - Math.PI / 2;
    const x = center[0] + Math.cos(angle) * (radius + 15);
    const y = center[1] + Math.sin(angle) * (radius + 15);
    svg.append('text')
      .attr('x', x)
      .attr('y', y)
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .style('font-size', '12px')
      .text(stat);
  });

  // League Avg first (so it appears underneath)
  axisGrid.append('path')
    .datum(leagueValues.map(d => d.normalized))
    .attr('d', radarLine)
    .attr('fill', 'rgba(255, 165, 0, 0.4)')   // Orange/yellow fill
    .attr('stroke', 'orange')                // Orange stroke
    .attr('stroke-width', 2);

  // Player line second (on top)
  axisGrid.append('path')
    .datum(playerValues.map(d => d.normalized))
    .attr('d', radarLine)
    .attr('fill', 'rgba(23, 64, 139, 0.4)')   // NBA Blue fill
    .attr('stroke', '#17408B')               // NBA Blue stroke
    .attr('stroke-width', 2);

  // Draw invisible circles for tooltips
  [playerValues, leagueValues].forEach((valueSet, seriesIndex) => {
    const color = seriesIndex === 0 ? 'blue' : 'orange';
    const label = seriesIndex === 0 ? 'Player' : 'League';

    valueSet.forEach((point, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const x = center[0] + Math.cos(angle) * rScale(point.normalized);
      const y = center[1] + Math.sin(angle) * rScale(point.normalized);

      svg.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 6)
        .attr('fill', color)
        .attr('opacity', 0)
        .on('mouseover', () => {
          tooltip
            .style('display', 'block')
            .html(
              `<strong>${stats[i]}</strong><br>
               ${label}: ${point.actual.toFixed(2)}`
            );
        })
        .on('mousemove', (event) => {
          tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 30) + 'px');
        })
        .on('mouseout', () => {
          tooltip.style('display', 'none');
        });
    });
  });
}

function drawBarChart(selector, data, isPercentage, chartTitle = '') {
  const svg = d3.select(selector);
  svg.selectAll('*').remove();

  const margin = { top: 40, right: 20, bottom: 40, left: 40 };
  const width = +svg.attr('width') - margin.left - margin.right;
  const height = +svg.attr('height') - margin.top - margin.bottom;

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x0 = d3.scaleBand()
    .domain(data.map(d => statLabels[d.stat] || d.stat))
    .rangeRound([0, width])
    .paddingInner(0.2);

  const x1 = d3.scaleBand()
    .domain(['player', 'avg', 'max'])
    .rangeRound([0, x0.bandwidth()])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => Math.max(d.player, d.avg, d.max))])
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal()
    .domain(['player', 'avg', 'max'])
    .range(['#17408B', '#C4CED4', '#E03A3E']); // Blue, Grey, Red

  const tooltip = d3.select('#barTooltip');

  // Title
  svg.append('text')
    .attr('x', +svg.attr('width') / 2)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .style('font-size', '16px')
    .style('font-weight', 'bold')
    .text(chartTitle);

  g.append('g')
    .call(d3.axisLeft(y).ticks(5).tickFormat(isPercentage ? d3.format(".0%") : null))
    .selectAll('text')
    .style('font-size', '13px');

  g.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x0))
    .selectAll('text')
    .style('font-size', '14px') // You can increase this to 16px or more if needed
    .style('font-weight', 'bold');

  const statGroup = g.selectAll('.stat')
    .data(data)
    .enter().append('g')
    .attr('class', 'stat')
    .attr('transform', d => `translate(${x0(statLabels[d.stat] || d.stat)},0)`);

  statGroup.selectAll('rect')
    .data(d => ['player', 'avg', 'max'].map(key => ({ key, value: d[key], stat: d.stat })))
    .enter().append('rect')
    .attr('x', d => x1(d.key))
    .attr('y', d => y(d.value))
    .attr('width', x1.bandwidth())
    .attr('height', d => height - y(d.value))
    .attr('fill', d => color(d.key))
    .on('mouseover', function (event, d) {
      tooltip
        .style('display', 'block')
        .html(`<strong>${statLabels[d.stat] || d.stat}</strong><br>${d.key}: ${isPercentage ? d3.format(".1%")(d.value) : d.value.toFixed(2)}`);
    })
    .on('mousemove', function (event) {
      tooltip
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function () {
      tooltip.style('display', 'none');
    });
}

// Shooting Chart
class Qiuchang {
  constructor(svg) {
      this.svg = svg;
  }

  drawqiuchang() {
    const Width = 500;
    const Height = 470;

    const pi = Math.PI;

    //背景板
    this.svg.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', Width)
      .attr('height', Height)
      .attr('fill', '#e8b787e0');

    this.svg.append('rect')
      .attr('x', 170)
      .attr('y', 0)
      .attr('width', 160)
      .attr('height', 190)
      .attr("stroke", "white")
      .attr("stroke-width", "2px")
      .attr('fill', 'rgba(166, 11, 11, 0.58)');

    // 三分线
    this.svg.append("line")
      .attr("x1", 30)
      .attr("y1", 0)
      .attr("x2", 30)
      .attr("y2", 140)
      .attr("stroke-width", "2px")
      .attr("stroke", "white");

    // 三分线
    this.svg.append("line")
      .attr("x1", 470)
      .attr("y1", 0)
      .attr("x2", 470)
      .attr("y2", 140)
      .attr("stroke-width", "2px")
      .attr("stroke", "white");
    // 三分线
    const sanfenxian = d3.arc()
      .innerRadius(239)
      .outerRadius(240)
      .startAngle(-90 * (pi / 180))
      .endAngle(90 * (pi / 180))
    this.svg.append("path")
      .attr("d", sanfenxian)
      .attr("stroke-width", "2px")
      .attr("fill", "white")
      .attr("transform", "rotate(180) translate(-250, -45)")

    // 覆盖
    this.svg.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 29.5)
      .attr('height', 150)
      .attr('fill', '#e8b787e0');

    this.svg.append('rect')
      .attr('x', 470.5)
      .attr('y', 0)
      .attr('width', 29)
      .attr('height', 140)
      .attr('fill', '#e8b787e0');

    this.svg.append('rect')
      .attr('x', 10)
      .attr('y', 0)
      .attr('width', Width - 20)
      .attr('height', Height - 65)
      .attr("stroke", "white")
      .attr("stroke-width", "2px")
      .attr("fill-opacity", 0);


    this.svg.append("line")
      .attr("x1", 220)
      .attr("y1", 40)
      .attr("x2", 280)
      .attr("y2", 40)
      .attr("stroke", "#e8b787e0")
      .attr("stroke-width", "0.3%");


    this.svg.append("circle")
      .attr("cx", 250)
      .attr("cy", 52.5)
      .attr("r", 7.5)
      .attr("fill-opacity", 0)
      .attr("stroke", "white");


    this.svg.append('rect')
      .attr('x', 246.5)
      .attr('y', 40)
      .attr('width', 7)
      .attr('height', 5)
      .attr('fill', 'white');


    const t = d3.arc()
      .innerRadius(40)
      .outerRadius(41)
      .startAngle(-90 * (pi / 180))
      .endAngle(90 * (pi / 180))

    this.svg.append("path")
      .attr("d", t)
      .attr("fill", "white")
      .attr("transform", "rotate(180) translate(-250, -40)")


    this.svg.append('rect')
      .attr('x', 470.5)
      .attr('y', 430)
      .attr('width', 50)
      .attr('height', 12)
      .attr('fill', '#76B7B2')

    this.svg.append("text")
      .attr("x", 426)
      .attr("y", 436)
      .attr("font-size", 14)
      .attr("font-weight", "bold")
      .attr("dy", ".35em")
      .attr("font-family", "Oswald")
      .text("Made")
      .style("fill", "black")


    this.svg.append('rect')
      .attr('x', 470.5)
      .attr('y', 410)
      .attr('width', 50)
      .attr('height', 12)
      .attr('fill', 'darkred')

    this.svg.append("text")
      .attr("x", 417)
      .attr("y", 416)
      .attr("dy", ".35em")
      .attr("font-size", 14)
      .attr("font-weight", "bold")
      .attr("font-family", "Oswald")
      .text("Missed")
      .style("fill", "black")
  }
}

class Toulan {
  constructor(svg, filteredShots) {
    this.svg = svg;

    if (filteredShots && filteredShots.length > 0) {
      filteredShots.forEach(shot => {
        if (shot.SHOT_MADE_FLAG === "1") {
            this.drawShot([+shot.LOC_X, +shot.LOC_Y], "Made Shot");
        } else {
            this.drawShot([+shot.LOC_X, +shot.LOC_Y], "Missed Shot");
        }
      });
    }
  }

  drawShot(position, result) {
      const hexbin = d3.hexbin().radius(5);
      if (result === "Made Shot") {
          this.svg.append("g")
              .selectAll(".hexagon")
              .data(hexbin([position]))
              .enter().append("path")
              .attr("d", function (d) {
                  return "M" + d.x + "," + d.y + hexbin.hexagon();
              })
              .attr("stroke", "white")
              .attr('transform', 'translate(250, 52.5)')
              .attr("fill", "#76B7B2")
              .attr("fill-opacity", 0.7)
              .attr("stroke-width", "0.1px");
      } else if (result === "Missed Shot") {
          this.svg.append("g")
              .selectAll(".hexagon")
              .data(hexbin([position]))
              .enter().append("path")
              .attr("d", function (d) {
                  return "M" + d.x + "," + d.y + hexbin.hexagon();
              })
              .attr("stroke", "white")
              .attr('transform', 'translate(250, 52.5)')
              .attr("fill", "darkred")
              .attr("fill-opacity", 0.7)
              .attr("stroke-width", "0.1px");
      }
  }
}

function drawShootingChart(filteredShots) {
  const svg = d3.select("#shootingChart");
  svg.selectAll('*').remove();

  const qiuchang = new Qiuchang(svg);
  qiuchang.drawqiuchang();

  new Toulan(svg, filteredShots);
}