d3.csv("./data/game/processed_0021500492.csv").then(function(data) {
    // Process data
    passingData = data.map(d => {
        return {
            minute: +d.minute,
            second: +d.second,
            totalSeconds: (+d.minute) * 60 + (+d.second),
            kongqiu_team: d.kongqiu_team,
            pass_player_name: d.pass_player_name,
            pass_location_x: +d.pass_location_x,
            pass_location_y: +d.pass_location_y,
            jieqiu_team: d.jieqiu_team,
            jieqiu_player_name: d.jieqiu_player_name,
            end_location_x: +d.end_location_x,
            end_location_y: +d.end_location_y
        };
    });

    // Set max time based on data
    const maxTime = d3.max(passingData, d => d.totalSeconds);
    slider.max = maxTime;

    // Initialize visualization
    updateViz(currentTime);
}).catch(function(error) {
    console.error("Error loading data:", error);
    // Show error message on the page
    d3.select("body")
        .append("div")
        .attr("class", "error")
        .style("color", "red")
        .style("padding", "20px")
        .html(`<p>Error loading data from ./data/game/processed_0021500492.csv</p>
              <p>Make sure the file exists at this location relative to your HTML file.</p>
              <p>Technical error: ${error}</p>`);
});

// Set up SVG
const margin = {top: 10, right: 10, bottom: 10, left: 10};
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#court-container")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Create full court class extending the half court
class FullCourt {
    constructor(svg) {
        this.svg = svg;
    }

    drawCourt() {
        const width = 980;
        const height = 470;
        const pi = Math.PI;

        // Background
        this.svg.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', width)
            .attr('height', height)
            .attr('fill', '#e8b787e0');

        // Court outline
        this.svg.append('rect')
            .attr('x', 10)
            .attr('y', 0)
            .attr('width', width - 20)
            .attr('height', height - 0)
            .attr("stroke", "white")
            .attr("stroke-width", "2px")
            .attr("fill-opacity", 0);

        // Center court line
        this.svg.append("line")
            .attr("x1", width/2)
            .attr("y1", 0)
            .attr("x2", width/2)
            .attr("y2", height)
            .attr("stroke", "white")
            .attr("stroke-width", "2px");

        // Center court circle
        this.svg.append("circle")
            .attr("cx", width/2)
            .attr("cy", height/2)
            .attr("r", 60)
            .attr("fill-opacity", 0)
            .attr("stroke", "white")
            .attr("stroke-width", "2px");

        // Left half
        this.drawHalfCourt(this.svg, 0, 0, 1);
        
        // Right half
        this.drawHalfCourt(this.svg, width, 0, -1);
    }

    drawHalfCourt(svg, xOffset, yOffset, direction) {
        const halfWidth = 490;
        const height = 470;
        const pi = Math.PI;

        // Paint area
        svg.append('rect')
            .attr('x', xOffset - direction * 160 - (direction < 0 ? 160 : 0))
            .attr('y', 0)
            .attr('width', 160)
            .attr('height', 190)
            .attr("stroke", "white")
            .attr("stroke-width", "2px")
            .attr('fill', 'rgba(166, 11, 11, 0.58)');

        // Three point line vertical parts
        svg.append("line")
            .attr("x1", xOffset - direction * 30)
            .attr("y1", 0)
            .attr("x2", xOffset - direction * 30)
            .attr("y2", 140)
            .attr("stroke-width", "2px")
            .attr("stroke", "white");

        // Three point arc
        const threePointArc = d3.arc()
            .innerRadius(239)
            .outerRadius(240)
            .startAngle(-90 * (pi / 180))
            .endAngle(90 * (pi / 180));
        
        svg.append("path")
            .attr("d", threePointArc)
            .attr("stroke-width", "2px")
            .attr("fill", "white")
            .attr("transform", `rotate(${direction < 0 ? 0 : 180}) translate(${direction < 0 ? xOffset - 250 : -xOffset + 250}, -45)`);

        // Free throw line and circle
        const x = xOffset - direction * 250;
        
        svg.append("line")
            .attr("x1", x - 30)
            .attr("y1", 40)
            .attr("x2", x + 30)
            .attr("y2", 40)
            .attr("stroke", "white")
            .attr("stroke-width", "2px");

        const freeThrowArc = d3.arc()
            .innerRadius(40)
            .outerRadius(41)
            .startAngle(-90 * (pi / 180))
            .endAngle(90 * (pi / 180));
        
        svg.append("path")
            .attr("d", freeThrowArc)
            .attr("fill", "white")
            .attr("transform", `rotate(${direction < 0 ? 0 : 180}) translate(${direction < 0 ? x : -x}, -40)`);

        // Basket
        svg.append("circle")
            .attr("cx", x)
            .attr("cy", 52.5)
            .attr("r", 7.5)
            .attr("fill-opacity", 0)
            .attr("stroke", "white");

        svg.append('rect')
            .attr('x', x - 3.5)
            .attr('y', 40)
            .attr('width', 7)
            .attr('height', 5)
            .attr('fill', 'white');
    }
}

// Draw the court
const court = new FullCourt(svg);
court.drawCourt();

// Setup scales to map the coordinates to our canvas
const xScale = d3.scaleLinear()
    .domain([0, 50])
    .range([10, 970]);
    
const yScale = d3.scaleLinear()
    .domain([0, 50])
    .range([10, 460]);

// Create pass groups
const passGroup = svg.append("g").attr("class", "passes");

// Setup time slider
const slider = document.getElementById("time-slider");
const currentTimeDisplay = document.getElementById("current-time");
const playButton = document.getElementById("play-button");

let currentTime = 0;
let isPlaying = false;
let animationInterval;
let passingData = [];

// Format time display
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
}

// Update visualization based on current time
function updateViz(time) {
    // Clear existing passes
    passGroup.selectAll("*").remove();
    
    // Filter data up to current time
    const visiblePasses = passingData.filter(d => d.totalSeconds <= time);
    
    // Display passes
    visiblePasses.forEach((pass, i) => {
        // Draw line for pass
        passGroup.append("line")
            .attr("x1", xScale(pass.pass_location_x))
            .attr("y1", yScale(pass.pass_location_y))
            .attr("x2", xScale(pass.end_location_x))
            .attr("y2", yScale(pass.end_location_y))
            .attr("stroke", "green")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,3")
            .attr("opacity", i === visiblePasses.length - 1 ? 1 : 0.3);
        
        // Draw point for pass origin
        passGroup.append("circle")
            .attr("cx", xScale(pass.pass_location_x))
            .attr("cy", yScale(pass.pass_location_y))
            .attr("r", i === visiblePasses.length - 1 ? 6 : 4)
            .attr("fill", "blue")
            .attr("opacity", i === visiblePasses.length - 1 ? 1 : 0.5);
        
        // Draw point for pass destination
        passGroup.append("circle")
            .attr("cx", xScale(pass.end_location_x))
            .attr("cy", yScale(pass.end_location_y))
            .attr("r", i === visiblePasses.length - 1 ? 6 : 4)
            .attr("fill", "red")
            .attr("opacity", i === visiblePasses.length - 1 ? 1 : 0.5);
        
        // Add player names
        if (i === visiblePasses.length - 1) {
            // Pass origin player
            passGroup.append("text")
                .attr("x", xScale(pass.pass_location_x))
                .attr("y", yScale(pass.pass_location_y) - 10)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .attr("fill", "black")
                .text(pass.pass_player_name);
            
            // Pass destination player
            passGroup.append("text")
                .attr("x", xScale(pass.end_location_x))
                .attr("y", yScale(pass.end_location_y) - 10)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .attr("fill", "black")
                .text(pass.jieqiu_player_name);
        }
    });
    
    // Update time display
    currentTimeDisplay.textContent = formatTime(time);
}

// Initialize visualization
updateViz(currentTime);

// Handle slider input
slider.addEventListener("input", function() {
    currentTime = parseInt(this.value);
    updateViz(currentTime);
});

// Play/pause button
playButton.addEventListener("click", function() {
    if (isPlaying) {
        clearInterval(animationInterval);
        playButton.textContent = "Play";
        isPlaying = false;
    } else {
        // Set maximum time based on data
        const maxTime = d3.max(passingData, d => d.totalSeconds);
        slider.max = maxTime;
        
        animationInterval = setInterval(() => {
            currentTime++;
            if (currentTime > maxTime) {
                currentTime = 0;
            }
            slider.value = currentTime;
            updateViz(currentTime);
        }, 1000);
        
        playButton.textContent = "Pause";
        isPlaying = true;
    }
});