const courtWidth = 500;
const courtHeight = 940;
const realCourtWidth = 50 * 10;
const realCourtHeight = 94 * 10;

const svg = d3.select("#court")
    .attr("width", courtWidth)
    .attr("height", courtHeight);

const xScale = d3.scaleLinear()
    .domain([0, realCourtWidth])
    .range([0, courtWidth]);
const yScale = d3.scaleLinear()
    .domain([0, realCourtHeight])
    .range([courtHeight, 0]);

let scaledData = [];
let minuteExtent = [0, 48];
let currentGame = "0021500492";

const gameFiles = {
    "0021500492": "./data/game/processed_0021500492.csv",
    "0021500501": "./data/game/processed_0021500501.csv"
};

// --- Bar chart config ---
const statStackOrder = ['PTS', 'REB', 'AST', 'STL', 'BLK'];
const statColors = {
  PTS: '#3674C7',
  REB: '#A1C45A',
  AST: '#FFA726',
  STL: '#00B5AD',
  BLK: '#8E24AA'
};
const lineColors = {
  offensive: '#E53935',
  defensive: '#3949AB'
};
const statsFiles = {
  "0021500492": "./data/game/stats_0021500492.csv",
  "0021500501": "./data/game/stats_0021500501.csv"
};

let allStatsData = {};
let statsLoaded = 0;
Object.entries(statsFiles).forEach(([gameId, file]) => {
  d3.csv(file).then(data => {
    allStatsData[gameId] = data;
    statsLoaded++;
    if (statsLoaded === Object.keys(statsFiles).length) {
      // once stats loaded, update bar chart for current game/team
      updateBarChart();
    }
  });
});

const gamesInfo = [
    {
      id: "0021500492",
      file: "./data/game/processed_0021500492.csv",
      teams: "TOR v.s. CHA"
    },
    {
      id: "0021500501",
      file: "./data/game/processed_0021500501.csv",
      teams: "DAL v.s. NOP"
    }
  ];
  
// Populate the dropdown
const gameSelect = document.getElementById('game-select');
gamesInfo.forEach(game => {
const option = document.createElement('option');
option.value = game.id;
option.textContent = game.teams;
gameSelect.appendChild(option);
});

// Draw the passing lanes
function drawPassingLanes(data) {
    svg.selectAll(".pass-arrow, defs").remove();

    // Arrowhead markers for success/fail
    const defs = svg.append("defs");
    defs.append("marker")
        .attr("id", "arrowhead-green")
        .attr("viewBox", "0 0 10 6")
        .attr("refX", 7)
        .attr("refY", 3)
        .attr("markerWidth", 7)
        .attr("markerHeight", 4)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,0 L10,3 L0,6")
        .attr("fill", "green");

    defs.append("marker")
        .attr("id", "arrowhead-red")
        .attr("viewBox", "0 0 10 6")
        .attr("refX", 7)
        .attr("refY", 3)
        .attr("markerWidth", 7)
        .attr("markerHeight", 4)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,0 L10,3 L0,6")
        .attr("fill", "red");

    // Tooltip
    const tooltip = d3.select("#arrow-tooltip");

    svg.selectAll(".pass-arrow")
        .data(data)
        .enter()
        .append("line")
        .attr("class", "pass-arrow")
        .attr("x1", d => xScale(d.pass_location_x))
        .attr("y1", d => yScale(d.pass_location_y))
        .attr("x2", d => xScale(d.end_location_x))
        .attr("y2", d => yScale(d.end_location_y))
        .attr("stroke", d => d.kongqiu_team === d.jieqiu_team ? "green" : "red")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", d => d.kongqiu_team === d.jieqiu_team ? "none" : "6,4")
        .attr("marker-end", d => d.kongqiu_team === d.jieqiu_team ? "url(#arrowhead-green)" : "url(#arrowhead-red)")
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            tooltip.style("display", "block")
                .html(
                  `<strong>Passer:</strong> ${d.pass_player_name}<br>` +
                  `<strong>Receiver:</strong> ${d.jieqiu_player_name}`
                );
            d3.select(this).attr("stroke-width", 5);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.clientX + 12) + "px")
                .style("top", (event.clientY - 12) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("display", "none");
            d3.select(this).attr("stroke-width", 3);
        });
}

function updateVisualizationFromSlider([minMinute, maxMinute]) {
    const teamRadio = document.querySelector('input[name="team"]:checked');
    if (!teamRadio) return;
    const team = teamRadio.value;
    let filtered = scaledData.filter(d =>
        d.minute >= minMinute && d.minute <= maxMinute &&
        d.kongqiu_team === team
    );
    drawPassingLanes(filtered);
    document.getElementById('minute-range-label').textContent = `${minMinute} - ${maxMinute}`;
}

function loadGame(gameId) {
    const game = gamesInfo.find(g => g.id === gameId);
    if (!game) return;
    d3.csv(gameFiles[gameId])
        .then(data => {
            scaledData = data.map(d => ({
                ...d,
                pass_location_x: parseFloat(d.pass_location_x) * 10,
                pass_location_y: parseFloat(d.pass_location_y) * 10,
                end_location_x: parseFloat(d.end_location_x) * 10,
                end_location_y: parseFloat(d.end_location_y) * 10,
                minute: parseInt(d.minute),
                second: parseInt(d.second)
            }));
            minuteExtent = d3.extent(scaledData, d => d.minute);

            // Set up or update noUiSlider
            const minuteSlider = document.getElementById('minute-range-slider');
            if (!minuteSlider.noUiSlider) {
                noUiSlider.create(minuteSlider, {
                    start: [minuteExtent[0], minuteExtent[1]],
                    connect: true,
                    step: 1,
                    range: {
                        'min': minuteExtent[0],
                        'max': minuteExtent[1]
                    },
                    // tooltips: [true, true], // <--- REMOVE THIS LINE
                    format: {
                        to: value => Math.round(value),
                        from: value => Math.round(value)
                    }
                });
                minuteSlider.noUiSlider.on('update', function(values) {
                    const range = values.map(v => Math.round(v));
                    updateVisualizationFromSlider(range);
                });
            } else {
                minuteSlider.noUiSlider.updateOptions({
                    range: { min: minuteExtent[0], max: minuteExtent[1] },
                    start: [minuteExtent[0], minuteExtent[1]]
                });
            }

            // After loading and parsing the CSV...
            const uniqueTeams = [...new Set(scaledData.map(d => d.kongqiu_team))];

            // Dynamically generate team radio buttons
            const teamFilter = document.getElementById('team-filter');
            teamFilter.innerHTML = ''; // clear previous

            uniqueTeams.forEach((team, idx) => {
            const id = `team-radio-${team}`;
            const label = document.createElement('label');
            label.style.marginRight = "18px";
            label.innerHTML = `
                <input type="radio" name="team" value="${team}" id="${id}" ${idx === 0 ? 'checked' : ''}>
                ${team}
            `;
            teamFilter.appendChild(label);
            });
            
            updateBarChart();

            teamFilter.addEventListener('change', function() {
                const minuteSlider = document.getElementById('minute-range-slider');
                const values = minuteSlider.noUiSlider.get().map(v => Math.round(v));
                updateVisualizationFromSlider(values);
            });

            // Hide loading
            d3.select("#loading").style("display", "none");

            // Initial draw
            updateVisualizationFromSlider([minuteExtent[0], minuteExtent[1]]);
        })
        .catch(err => {
            console.error(err);
            d3.select("#loading").text("Error loading data.");
        });
}

window.onload = function() {
    // Initial load
    loadGame(currentGame);

    // Game dropdown
    document.getElementById('game-select').addEventListener('change', function() {
        currentGame = this.value;
        d3.select("#loading").style("display", "block");
        loadGame(currentGame);
    });

    // Team radio listener
    document.getElementById('team-filter').addEventListener('change', function() {
        const minuteSlider = document.getElementById('minute-range-slider');
        const values = minuteSlider.noUiSlider.get().map(v => Math.round(v));
        updateVisualizationFromSlider(values);
        updateBarChart();
    });
};

function parseMinStr(minStr) {
    if (!minStr) return 0;
    if (minStr.indexOf(':') < 0) return +minStr || 0;
    let [mm, ss] = minStr.split(':').map(Number);
    return mm + (ss||0)/60;
}

function updateBarChart() {
    const stats = allStatsData[currentGame];
    if (!stats) return;

    // Find selected team
    const teamRadio = document.querySelector('input[name="team"]:checked');
    if (!teamRadio) return;
    const team = teamRadio.value;

    // Filter players: MIN > 0 and team
    const players = stats.filter(d =>
        d.TEAM_ABBREVIATION === team && parseMinStr(d.MIN) > 0
    ).map(d => ({
        PLAYER_NAME: d.PLAYER_NAME,
        MIN: parseMinStr(d.MIN),
        PTS: +d.PTS,
        REB: +d.REB,
        AST: +d.AST,
        STL: +d.STL,
        BLK: +d.BLK,
        offensiveRating: +d.offensiveRating,
        defensiveRating: +d.defensiveRating
    }));

    if (!players.length) {
        d3.select("#player-stats-bar").selectAll("*").remove();
        d3.select("#bar-legend").text("No player stats found for this team.");
        return;
    }

    players.forEach(d => d.total = statStackOrder.reduce((sum, k) => sum + (+d[k] || 0), 0));
    players.sort((a, b) => b.total - a.total);

    // Stack data for vertical bars
    const stack = d3.stack()
        .keys(statStackOrder)
        .value((d, key) => +d[key] || 0);
    const stackedSeries = stack(players);

    // Chart sizing
    const margin = {top: 70, right: 100, bottom: 90, left: 60}; // top margin increased for legend!
    const width = Math.max(players.length * 55, 380);
    const height = 430;
    const svg = d3.select('#player-stats-bar')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    svg.selectAll('*').remove();

    // Y scale for stats
    const maxTotal = d3.max(players, d => d.total || 1);
    const y = d3.scaleLinear().domain([0, maxTotal]).range([height, 0]);
    // X axis for players
    const x = d3.scaleBand()
        .domain(players.map(d => d.PLAYER_NAME))
        .range([0, width])
        .padding(0.18);

    // For ratings (off/def) - scale overlays on same Y as stats
    const minRating = d3.min(players, d => Math.min(d.offensiveRating, d.defensiveRating));
    const maxRating = d3.max(players, d => Math.max(d.offensiveRating, d.defensiveRating));
    const yRating = d3.scaleLinear()
        .domain([Math.min(minRating, 0), Math.max(maxTotal, maxRating)])
        .range([height, 0]);

    // Axes
    svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .call(d3.axisLeft(y).ticks(6))
        .call(g => g.selectAll("text").style("font-size", "13px"));

    svg.append("g")
        .attr("transform", `translate(${margin.left},${height + margin.top})`)
        .call(d3.axisBottom(x))
        .call(g => g.selectAll("text")
            .attr("transform", "rotate(-38)")
            .style("text-anchor", "end")
            .style("font-size", "14px"));

    // Bars
    const barGroup = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const tooltip = d3.select("#bar-tooltip");
    barGroup.selectAll("g.bar-segment")
        .data(stackedSeries)
        .join("g")
        .attr("fill", d => statColors[d.key])
        .attr("class", d => `bar-segment stat-${d.key}`)
        .selectAll("rect")
        .data(d => d.map((v, i) => ({...v, key: d.key, player: players[i]})))
        .join("rect")
        .attr("x", d => x(d.player.PLAYER_NAME))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .on("mousemove", function(event, d) {
            tooltip.style("display", "block")
                .style("transform", `translate(${event.clientX + 12}px, ${event.clientY - 18}px)`)
                .html(
                    `<strong>${d.player.PLAYER_NAME}</strong><br>
                    ${d.key}: <b>${d.player[d.key]}</b>`
                );
        })
        .on("mouseleave", () => tooltip.style("display", "none"));

    // Overlays: lines + dots for ratings
    const xCenters = players.map(d => margin.left + x(d.PLAYER_NAME) + x.bandwidth()/2);

    // Prepare data for line generators
    const offData = players.map((d, i) => ({
        x: margin.left + x(d.PLAYER_NAME) + x.bandwidth()/2,
        y: margin.top + yRating(d.offensiveRating),
        name: d.PLAYER_NAME,
        val: d.offensiveRating
    }));
    const defData = players.map((d, i) => ({
        x: margin.left + x(d.PLAYER_NAME) + x.bandwidth()/2,
        y: margin.top + yRating(d.defensiveRating),
        name: d.PLAYER_NAME,
        val: d.defensiveRating
    }));

    // Line generators
    const lineGen = d3.line()
        .x(d => d.x)
        .y(d => d.y);

    // Offensive line (red, solid)
    svg.append("path")
        .datum(offData)
        .attr("fill", "none")
        .attr("stroke", lineColors.offensive)
        .attr("stroke-width", 2.5)
        .attr("d", lineGen);

    // Defensive line (blue, solid)
    svg.append("path")
        .datum(defData)
        .attr("fill", "none")
        .attr("stroke", lineColors.defensive)
        .attr("stroke-width", 2.5)
        .attr("d", lineGen);

    // Dots at ratings
    ['offensiveRating','defensiveRating'].forEach((key, idx) => {
        const color = lineColors[key === 'offensiveRating' ? 'offensive' : 'defensive'];
        svg.selectAll(`.line-dot-${key}`)
            .data(players)
            .join('circle')
            .attr('cx', d => margin.left + x(d.PLAYER_NAME) + x.bandwidth()/2)
            .attr('cy', d => margin.top + yRating(d[key]))
            .attr('r', 7)
            .attr('fill', color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .on("mousemove", function(event, d) {
                tooltip.style("display", "block")
                    .style("transform", `translate(${event.clientX + 10}px, ${event.clientY - 18}px)`)
                    .html(
                        `<strong>${d.PLAYER_NAME}</strong><br>
                        ${key === 'offensiveRating' ? 'Offensive' : 'Defensive'} Rating: <b>${d[key]}</b>`
                    );
            })
            .on("mouseleave", () => tooltip.style("display", "none"));
    });

    // Y axis for ratings (right side)
    const rightAxis = svg.append("g")
        .attr("transform", `translate(${width + margin.left + 12},${margin.top})`)
        .call(d3.axisRight(yRating).ticks(6).tickFormat(d3.format(".0f")))
        .call(g => g.selectAll("text").style("font-size", "12px").style("fill", "#3949AB"));

    // Add a multi-line label (to avoid being cut off)
    rightAxis.append("text")
        .attr("x", 38)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("dy", "-1.2em")
        .attr("transform", `rotate(90,38,${height/2})`)
        .style("font-size", "13px")
        .style("fill", "#3949AB")
        .text("Off/Def Rating");

    // --- Off/Def Rating Legends at Top Center ---
    const legendGroup = svg.append("g")
        .attr("transform", `translate(${margin.left + width/2 - 120}, 28)`); // adjusted position for better spacing

    // Increased spacing between legends
    legendGroup.append("rect")
        .attr("x", 14)
        .attr("y", 0)
        .attr("width", 18)
        .attr("height", 4)
        .attr("fill", lineColors.offensive)
        .attr("rx", 2);

    legendGroup.append("text")
        .attr("x", 38)
        .attr("y", 6)
        .attr("fill", lineColors.offensive)
        .attr("font-size", 15)
        .attr("font-weight", 600)
        .text("Off. Rating");

    // Increased x position to prevent overlap
    legendGroup.append("rect")
        .attr("x", 145)
        .attr("y", 0)
        .attr("width", 18)
        .attr("height", 4)
        .attr("fill", lineColors.defensive)
        .attr("rx", 2);

    legendGroup.append("text")
        .attr("x", 169)
        .attr("y", 6)
        .attr("fill", lineColors.defensive)
        .attr("font-size", 15)
        .attr("font-weight", 600)
        .text("Def. Rating");

    // --- Bar Legends (bottom, centered, only stats) ---
    const legend = d3.select("#bar-legend");
    legend.html("");
    statStackOrder.forEach(key => {
        legend.append("span")
            .style("margin-right", "18px")
            .html(`<span class="bar-legend-box" style="background:${statColors[key]}"></span>${key}`);
    });
}