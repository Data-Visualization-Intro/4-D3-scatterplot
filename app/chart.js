async function drawScatter() {
  // 1. Access data
  let dataset = await d3.json("./data/my_weather_data.json");

  const xAccessor = (d) => d.dewPoint;
  const yAccessor = (d) => d.humidity;
  const colorAccessor = (d) => d.cloudCover;

  // console.log(dataset[0]);
  // console.log(xAccessor(dataset[0]));

  const width = d3.min([window.innerWidth * 0.9, window.innerHeight * 0.9]);
  const arr = [1, 2, 3];
  // console.log({
  //   d3: d3.min(dataset, xAccessor),
  //   Math: Math.min(...arr),
  // });

  let dimensions = {
    width: width,
    height: width,
    margin: {
      top: 10,
      right: 10,
      bottom: 50,
      left: 50,
    },
  };

  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right;
  dimensions.boundedHeight =
    dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

  const wrapper = d3
    .select("#wrapper")
    .append("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height);

  const bounds = wrapper
    .append("g")
    .style(
      "transform",
      `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
    );

  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(dataset, xAccessor))
    .range([0, dimensions.boundedWidth])
    .nice();
  // console.log(xScale.domain());

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(dataset, yAccessor))
    .range([dimensions.boundedHeight, 0])
    .nice();

  const colorScale = d3
    .scaleLinear()
    .domain(d3.extent(dataset, colorAccessor))
    .range(["skyblue", "darkslategrey"]);

  // 5. Draw data

  const dots = bounds.selectAll("circle").data(dataset);

  dots
    .join("circle")
    .attr("cx", (d) => xScale(xAccessor(d)))
    .attr("cy", (d) => yScale(yAccessor(d)))
    .attr("r", 5)
    .attr("fill", (d) => colorScale(colorAccessor(d)));

  const delaunay = d3.Delaunay.from(
    dataset,
    (d) => xScale(xAccessor(d)),
    (d) => yScale(yAccessor(d))
  );

  const voronoi = delaunay.voronoi();
  voronoi.xmax = dimensions.boundedWidth;
  voronoi.ymax = dimensions.boundedHeight;

  bounds
    .selectAll(".voronoi")
    .data(dataset)
    .join("path")
    .attr("class", "voronoi")
    .attr("d", (d, i) => voronoi.renderCell(i))
    .attr("stroke", "salmon")
    .attr("fill", "transparent");

  const xAxisGenerator = d3.axisBottom().scale(xScale);

  const xAxis = bounds
    .append("g")
    .call(xAxisGenerator)
    .style("transform", `translateY(${dimensions.boundedHeight}px)`);

  const xAxisLabel = xAxis
    .append("text")
    .attr("x", dimensions.boundedWidth / 2)
    .attr("y", dimensions.margin.bottom - 10)
    .attr("fill", "black")
    .style("font-size", "1.4em")
    .html("Dew point (&deg;F)");

  const yAxisGenerator = d3.axisLeft().scale(yScale).ticks(5);
  const yAxis = bounds.append("g").call(yAxisGenerator);

  const yAxisLabel = yAxis
    .append("text")
    .attr("x", -dimensions.boundedWidth / 2)
    .attr("y", -dimensions.margin.left + 12)
    .attr("fill", "black")
    .style("font-size", "1.4em")
    .html("Relative Humidity")
    .style("transform", "rotate(-90deg")
    .style("text-anchor", "middle");

  const tooltip = d3.select("#tooltip");

  bounds
    .selectAll(".voronoi")
    .on("mouseenter", onMouseEnter)
    .on("mouseleave", onMouseLeave);

  function onMouseEnter(event, d) {
    const dayDot = bounds
      .append("circle")
      .attr("class", "tooltipDot")
      .attr("cx", xScale(xAccessor(d)))
      .attr("cy", yScale(yAccessor(d)))
      .attr("r", 7)
      .style("fill", "maroon")
      .style("pointer-events", "none");

    tooltip.style("opacity", 1);
    const formatHumidity = d3.format(".2f");
    tooltip.select("#humidity").text(formatHumidity(yAccessor(d)));

    const formatDewPoint = d3.format(".2f");
    tooltip.select("#dew-point").text(formatDewPoint(xAccessor(d)));

    const dateParser = d3.timeParse("%Y-%m-%d");
    const formatDate = d3.timeFormat("%B %A %-d, %Y");
    tooltip.select("#date").text(formatDate(dateParser(d.date)));

    const x = xScale(xAccessor(d)) + dimensions.margin.left;
    const y = yScale(yAccessor(d)) + dimensions.margin.top;

    tooltip.style(
      "transform",
      `translate( calc( -50% + ${x}px), calc(-100% + ${y}px))`
    );
  }

  function onMouseLeave() {
    tooltip.style("opacity", 0);

    d3.selectAll(".tooltipDot").remove();
  }
}
drawScatter();
