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
    .range([0, courtHeight]);

let scaledData = [];
let minuteExtent = [0, 48];
let currentGame = "0021500492";

const gameFiles = {
    "0021500492": "./data/game/processed_0021500492.csv",
    "0021500501": "./data/game/processed_0021500501.csv"
};

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

// Draw the passing lanes (your latest version with green/red arrows, etc)
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
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY - 12) + "px");
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

            // You may want to re-attach the change event listener each time:
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
    });
};