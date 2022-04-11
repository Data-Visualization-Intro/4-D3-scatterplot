var margin = { top: 10, right: 20, bottom: 30, left: 30 };
var width = 800 - margin.left - margin.right;
var height = 500 - margin.top - margin.bottom;

async function drawLineChart() {
  const dataset = await d3.json("./data.json");

  var parseTime = d3.timeParse("%Y/%m/%d");

  var svg = d3
    .select(".chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  dataset.forEach((company) => {
    company.values.forEach((d) => {
      d.date = parseTime(d.date);
      d.close = +d.close;
    });
  });

  var xScale = d3
    .scaleTime()
    .domain([
      d3.min(dataset, (co) => d3.min(co.values, (d) => d.date)),
      d3.max(dataset, (co) => d3.max(co.values, (d) => d.date)),
    ])
    .range([0, width]);

  svg
    .append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).ticks(5));

  var yScale = d3
    .scaleLinear()
    .domain([
      d3.min(dataset, (co) => d3.min(co.values, (d) => d.close)),
      d3.max(dataset, (co) => d3.max(co.values, (d) => d.close)),
    ])
    .range([height, 0]);

  svg.append("g").call(d3.axisLeft(yScale));

  var line = d3
    .line()
    .x((d) => xScale(d.date))
    .y((d) => yScale(d.close))
    .curve(d3.curveCatmullRom.alpha(0.5));

  svg
    .selectAll(".line")
    .data(dataset)
    .enter()
    .append("path")
    .attr("class", "line")
    .attr("d", (d) => line(d.values))
    .style("stroke", (d, i) => ["#FF9900", "#3369E8"][i])
    .style("stroke-width", 2)
    .style("fill", "none");
}

drawLineChart();
