# D3 - Scatterplot

Let's create another chart that's a little more complex.

There are many questions we could ask our weather dataset about the relationship between different metrics. Let's investigate these two metrics:

- dew point - the highest temperature (°F) at which dew droplets form
- humidity - the amount of water vapor in the air

We expect them to be correlated — high humidity should cause a higher dew point temperature.

Here is the [chart](https://dataviz-exercises.netlify.app/dew-point/index.html) we are going to build.

## Deciding the Chart Type

When looking at the relationship between two metrics, a scatterplot is a good choice.

A scatterplot includes two axes:

- an x axis that displays one metric and
- a y axis that displays the other

We'll plot each data point (in this case, a single day) as a dot. If we wanted to involve a third metric, we could even add another dimension by changing the color or the size of each dot.

## Steps in Drawing Any Chart

Let's solidify our foundation by splitting our chart-creating code into seven general steps.

1. Access data - look at the data structure and declare how to access the values we'll need
1. Create chart dimensions - declare the physical (i.e. pixels) chart parameters
1. Draw canvas - render the chart area and bounds element
1. Create scales - create scales for every data-to-physical attribute in our chart
1. Draw data - render your data elements
1. Draw peripherals - render your axes, labels, and legends
1. Set up interactions - initialize event listeners and create interaction behavior

## Access Data

As we saw, this step will be quick! We can utilize d3.json() to grab the my_weather_data.json file.

```js
let dataset = await d3.json("./data/my_weather_data.json");
```

The next part is to create our accessor functions. Let's log the first data point to the console to look at the available keys.

```js
const dataset = await d3.json("./data/my_weather_data.json");
console.table(dataset[0]);
```

We can see the metrics we're interested in as humidity and dewPoint. Let's use those to define our accessor functions.

```js
const xAccessor = (d) => d.dewPoint;
const yAccessor = (d) => d.humidity;
```

Code:

```js
async function drawScatter() {
  // 1. Access data
  let dataset = await d3.json("./data/my_weather_data.json");

  const xAccessor = (d) => d.dewPoint;
  const yAccessor = (d) => d.humidity;
}
drawScatter();
```

## Create Chart Dimensions

This time, we learn how to create a square chart that fits within any browser window.

Typically, scatterplots are square, with the x axis as wide as the y axis is tall. This makes it easier to look at the overall shape of the data points once they're plotted by not stretching or squashing one of the scales.

We want the height to be the same as the width. We could use the same width we used previously (`window.innerWidth * 0.9`), but then the chart might extend down the page, out of view on horizontal screens.

Ideally, the chart will be as large as possible while still fitting on our screen.

To fix this problem, we want to use either the height or the width of the window, whichever one is smaller. And because we want to leave a little bit of whitespace around the chart, we'll multiply the value by 0.9 (90% of the total width or height).

`d3-array` can help us out here with the `d3.min` method. `d3.min` takes two arguments:

1. an array of data points
1. an accessor function to grab the value from each data point

In this case we won't need to specify the second parameter because it defaults to an identity function and returns the value.

```js
const width = d3.min([window.innerWidth * 0.9, window.innerHeight * 0.9]);
```

> There is a native browser method (`Math.min`) that will also find the lowest number. There are a few benefits to `d3.min`:

- Math.min will count any nulls in the array as 0, whereas d3.min will ignore them
- Math.min will return NaN if there is a value in the array that is undefined or can't be converted into a number, whereas d3.min will ignore it
- d3.min will prevent the need to create another array of values if we need to use an accessor function
- Math.min will return Infinity if the dataset is empty, whereas d3.min will return undefined
- Math.min uses numeric order, whereas d3.min uses natural order, which allows it to handle strings. Make sure to convert your values to numbers beforehand

You can see how d3.min would be preferable when creating charts, especially when using dynamic data.

Use the width variable to define the chart dimensions:

```js
let dimensions = {
  width: width,
  height: width,
};
```

We want a small top and right margin to give the chart some space. Dots near the top or right of the chart or the y axis's topmost tick label might overflow our bounds (because the position of the dot is technically the center of the dot, but the dot has a radius).

We'll want a larger bottom and left margin to create room for our axes.

```js
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
```

Lastly, we want to define the width and height of our bounds, calculated from the space remaining after we add the margins.

```js
dimensions.boundedWidth =
  dimensions.width - dimensions.margin.left - dimensions.margin.right;
dimensions.boundedHeight =
  dimensions.height - dimensions.margin.top - dimensions.margin.bottom;
```

Code:

```js
async function drawScatter() {
  // 1. Access data
  let dataset = await d3.json("./data/my_weather_data.json");

  const xAccessor = (d) => d.dewPoint;
  const yAccessor = (d) => d.humidity;

  // 2. Create chart dimensions

  const width = d3.min([window.innerWidth * 0.9, window.innerHeight * 0.9]);
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
}
drawScatter();
```

## Draw Canvas

This step will look exactly like our line chart code. First, we find an existing DOM element (#wrapper), and append an <svg> element.

Then we use attr to set the size of the <svg> to our dimensions.width and dimensions.height. Note that these sizes are the size of the "outside" of our plot.

```js
const wrapper = d3
  .select("#wrapper")
  .append("svg")
  .attr("width", dimensions.width)
  .attr("height", dimensions.height);
```

Create our bounds and shift them to accommodate our top & left margins:

```js
const bounds = wrapper
  .append("g")
  .style(
    "transform",
    `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
  );
```

Above, we create a group element and use the transform CSS property to move it to the right and down (note that the left margin pushes our bounds to the right, and a top margin pushes our bounds down).

This is the "inner" part of our chart that we will use for our data elements.

## Create Scales

Before we draw our data, we have to figure out how to convert numbers from the data domain to the pixel domain.

Let's start with the x axis. We want to decide the horizontal position of each day's dot based on its dew point.

To find this position we use a d3 scale object, which helps us map our data to pixels. Let's create a scale that will take a dew point (temperature) and tell us how far to the right a dot needs to be.

This will be a linear scale because the input (dew point) and the output (pixels) will be numbers that increase linearly.

`const xScale = d3.scaleLinear()`

### The concept behind scales

Recall, we need to tell our scale:

- what inputs it will need to handle (domain), and
- what outputs we want back (range).

For a simple example, let's pretend that the temperatures in our dataset range from 0 to 100 degrees.

In this case, converting from temperature to pixels is easy: a temperature of 50 degrees maps to 50 pixels because both range and domain are [0,100].

But the relationship between our data and the pixel output is rarely so simple. What if our chart was 200 pixels wide? What if we have to handle negative temperatures?

Mapping between metric values and pixels is one of the areas in which d3 scales shine.

### Finding the extents

In order to create a scale, we need to pick the smallest and largest values we will handle. These numbers can be anything you want, but the standard practice is to examine your data and extract the minimum and maximum values. This way your chart will "automatically" scale according to the values in your dataset.

> D3 has a helper function we can use here: `d3.extent()` that takes two parameters:

- an array
- an accessor function that extracts the metric value from a data point. If not specified, this defaults to an identity function `d => d`.

We'll pass `d3.extent()` our dataset and our `xAccessor()` function and get the min and max temperatures we need to handle (in `[min, max]` format).

```js
const xScale = d3
  .scaleLinear()
  .domain(d3.extent(dataset, xAccessor))
  .range([0, dimensions.boundedWidth]);
```

This scale will create a perfectly useable chart, but we can make it slightly friendlier. With this x scale, our x axis will have a domain of `[11.8, 77.26]` — the exact min and max values from the dataset. The resulting chart will have dots that extend all the way to the left and right edges.

While this works, it would be easier to read the axes if the first and last tick marks were round values. Note that d3 won't even label the top and bottom tick marks of an axis with a strange domain — it might be hard to reason about a chart that scales up to 77.26 degrees. That number of decimal points gives too much unnecessary information to the reader, making them do the next step of rounding the number to a more tangible one.

d3 scales have a `.nice()` method that will round our scale's domain, giving our x axis friendlier bounds.

We can look at how `.nice()` modifies our x scale's domain by looking at the values before and after using `.nice()`. Note that calling `.domain()` without parameters on an existing scale will output the scale's existing domain instead of updating it.

```js
console.log(xScale.domain());
xScale.nice();
console.log(xScale.domain());
```

With the New York City dataset, the domain changes from `[11.8, 77.26]` to `[10, 80]`. Let's chain that method when we create our scale.

```js
const xScale = d3
  .scaleLinear()
  .domain(d3.extent(dataset, xAccessor))
  .range([0, dimensions.boundedWidth])
  .nice();
```

Creating our y scale will be very similar to creating our x scale. The only differences are:

1. we'll be using our `yAccessor()` to grab the humidity values, and
1. we want to invert the range to make sure the axis runs bottom-to-top

```js
const yScale = d3
  .scaleLinear()
  .domain(d3.extent(dataset, yAccessor))
  .range([dimensions.boundedHeight, 0])
  .nice();
```

If we were curious about how .nice() modifies our y scale, we could log those values.

```js
console.log(d3.extent(dataset, yAccessor));
console.log(yScale.domain());
```

In this case, the domain changed from `[0.27, 0.97]` to `[0.2, 1]`, which will create a much friendlier chart.

```js
async function drawScatter() {
  // 1. Access data
  let dataset = await d3.json("./data/my_weather_data.json");

  const xAccessor = (d) => d.dewPoint;
  const yAccessor = (d) => d.humidity;

  // 2. Create chart dimensions

  const width = d3.min([window.innerWidth * 0.9, window.innerHeight * 0.9]);
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

  // 3. Draw canvas

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

  // 4. Create scales

  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(dataset, xAccessor))
    .range([0, dimensions.boundedWidth])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(dataset, yAccessor))
    .range([dimensions.boundedHeight, 0])
    .nice();
}
drawScatter();
```

## Draw Data

The fifth step: drawing our data. This is an important lesson! We talk about data joins, which are one of the trickiest parts of d3, and necessary for updating our charts & binding our visualization to data.

Drawing our scatter plot dots will be different from how we drew our timeline. Instead of one line that covered all of the data points for our scatter plot we want one element per data point.

We'll want to use the `<circle>` SVG element, which thankfully doesn't need a d attribute string. Instead, we'll give it cx and cy attributes, which set its x and y coordinates, respectively. These position the center of the circle, and the r attribute sets the circle's radius (half of its width or height).

Let's draw a circle in the center of our chart to test it out.

```js
bounds
  .append("circle")
  .attr("cx", dimensions.boundedWidth / 2)
  .attr("cy", dimensions.boundedHeight / 2)
  .attr("r", 5);
```

Now let's add one circle for each day.

One way of drawing the dots would be to map over each element in the dataset and append a circle to our bounds.

We will grab the values for `cx` and `cy` from our data using our scales and passing in our accessors:

```js
dataset.forEach((d) => {
  bounds
    .append("circle")
    .attr("cx", xScale(xAccessor(d)))
    .attr("cy", yScale(yAccessor(d)))
    .attr("r", 5);
});
```

While this method of drawing the dots works for now, we're adding a level of nesting, which makes our code harder to follow.

If we run this function twice, we'll end up drawing two sets of dots. When we start updating our charts, we will want to draw and update our data with the same code to prevent repeating ourselves.

D3 has functions that will help us address these issues and keep our code clean. Let's handle the dots in the d3 way - without using a loop.

### Data joins

Delete the last `forEach` block of code.

We'll start off by grabbing all `<circle>` elements in a d3 selection object. Instead of using d3.selection's `.select()` method, which returns one matching element, we'll use its `.selectAll()` method, which returns an array of matching elements.

`const dots = bounds.selectAll("circle")`

This will seem strange at first — we don't have any dots yet, why would we select something that doesn't exist? Don't worry. You'll soon become comfortable with this pattern.

By using `const dots = bounds.selectAll("circle")` we're creating a d3 selection that is aware of what elements already exist. If we had already drawn part of our dataset, this selection would be aware of what dots were already drawn, and which need to be added.

To tell the selection what our data look like, we'll pass our dataset to the selection's .data() method.

```js
const dots = bounds.selectAll("circle").data(dataset);
```

When we call `.data()` on our selection, we're joining our selected elements with our array of data points. The returned selection will have

1. a list of existing elements,
1. new elements that need to be added, and
1. old elements that need to be removed.

We'll see these changes to our selection object in three ways:

- our selection object is updated to contain any overlap between existing DOM elements and data points
- an `_enter` key is added that lists any data points that don't already have an element rendered
- an `_exit` key is added that lists any data points that are already rendered but aren't in the provided dataset

<svg width="640" height="480" viewBox="0 0 640 480" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="640" height="480" fill="white"/>
<circle cx="421" cy="250" r="188" fill="#9A9EFF"/>
<circle cx="219" cy="250" r="188" fill="#9AB6FF"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M320 408.593C372.311 375.21 407 316.656 407 250C407 183.344 372.311 124.79 320 91.4066C267.689 124.79 233 183.344 233 250C233 316.656 267.689 375.21 320 408.593Z" fill="#8083D0"/>
<text fill="black" xml:space="preserve" style="white-space: pre" font-family="Arial" font-size="24" letter-spacing="0em"><tspan x="76" y="42.3203">Dataset</tspan></text>
<text fill="black" xml:space="preserve" style="white-space: pre" font-family="Arial" font-size="24" letter-spacing="0em"><tspan x="76" y="216.32">new&#10;</tspan><tspan x="76" y="244.32">_enter</tspan></text>
<text fill="black" xml:space="preserve" style="white-space: pre" font-family="Arial" font-size="24" letter-spacing="0em"><tspan x="275" y="216.32">existing&#10;</tspan><tspan x="275" y="244.32">_groups</tspan></text>
<text fill="black" xml:space="preserve" style="white-space: pre" font-family="Arial" font-size="24" letter-spacing="0em"><tspan x="475" y="216.32">old&#10;</tspan><tspan x="475" y="244.32">_exit</tspan></text>
<text fill="black" xml:space="preserve" style="white-space: pre" font-family="Arial" font-size="24" letter-spacing="0em"><tspan x="298" y="42.3203">DOM</tspan></text>
<text fill="black" xml:space="preserve" style="white-space: pre" font-family="Arial" font-size="24" letter-spacing="0em"><tspan x="511" y="42.3203">Elements</tspan></text>
</svg>

Let's get an idea of what that updated selection object looks like by logging it to the console.

```js
let dots = bounds.selectAll("circle");
console.log(dots);
dots = dots.data(dataset);
console.log(dots);
```

Recall that the currently selected DOM elements are located under the `_groups` key. Before we join our dataset to our selection, the selection just contains an empty array. That makes sense - there are no circles in bounds yet.

(View the results of the first `console.log(dots)`.)

However, the next selection object looks different. We have two new keys: `_enter` and `_exit`, and our `_groups` array has an array with 365 elements — the number of data points in our dataset.

(View the results of the second `console.log(dots);`.)

Take a closer look at the `_enter` key. If we expand the array and look at one of the values, we can see an object with a `__data__` property.

> The namespaceURI key tells the browser that the element is a SVG element and needs to be created in the "http://www.w3.org/2000/svg" namespace (SVG).

If we expand the **data** value, we will see one of our data points.

We can see that each value in `_enter` corresponds to a value in our dataset. This is what we would expect, since all of the data points need to be added to the DOM.

The `_exit` value is an empty array — if we were removing existing elements, we would see those listed out here.

In order to act on the new elements, we can create a d3 selection object containing just those elements with the enter method. There is a matching method (exit) for old elements that we'll need when we look at transitions between data sets.

```js
const dots = bounds.selectAll("circle").data(dataset).enter();
console.log(dots);
```

This looks just like any d3 selection object we've manipulated before. Let's append one `<circle>` for each data point. We can use the same `.append()` method we've been using for single-node selection objects and d3 will create one element for each data point.

```js
const dots = bounds.selectAll("circle").data(dataset).enter().append("circle");
```

When we load our webpage we still have a blank page. However, we will be able to see 365 new empty `<circle>` elements in our bounds in the browser's Elements panel.

Set the position and size of these circles:

```js
const dots = bounds
  .selectAll("circle")
  .data(dataset)
  .enter()
  .append("circle")
  .attr("cx", (d) => xScale(xAccessor(d)))
  .attr("cy", (d) => yScale(yAccessor(d)))
  .attr("r", 5);
```

We can write the same code we would write for a single-node selection object. Any attribute values that are functions will be passed each data point individually. This helps keep our code concise and consistent.

Make these dots a lighter color to help them stand out:

`.attr("fill", "cornflowerblue")`

### Visualizing data joins

Here's a quick example to help visualize the data join concept. We're going to split the dataset in two and draw both parts separately. Temporarily comment out your finished dots code so we have a clear slate to work with. We'll put it back when we're done with this exercise.

Let's add a function called `drawDots()` that mimics our dot drawing code. This function will select all existing circles, join them with a provided dataset, and draw any new circles with a provided color.

```js
  // 5. Draw data
  const drawDots = (dataset, color) => {
    const dots = bounds
      .selectAll("circle")
      .data(dataset)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(xAccessor(d)))
      .attr("cy", (d) => yScale(yAccessor(d)))
      .attr("r", 5)
      .attr("fill", color);
  };
  drawDots(dataset.slice(0, 100), "gray");
}
drawScatter();
```

Add some logging and another slice after one second:

```js
  // 5. Draw data
  const drawDots = (dataset, color) => {
    const dots = bounds.selectAll("circle").data(dataset);

    console.log(dots);

    dots
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(xAccessor(d)))
      .attr("cy", (d) => yScale(yAccessor(d)))
      .attr("r", 5)
      .attr("fill", color);
  };
  drawDots(dataset.slice(0, 100), "gray");
  setTimeout(() => {
    drawDots(dataset, "cornflowerblue");
  }, 1000);
}
drawScatter();
```

In the log we can see the exit array (the old or previously created dots) has a length of 100. These dots were not recreated.

We can use `.merge()` to make all the dots blue:

```js
  // 5. Draw data
  const drawDots = (dataset, color) => {
    const dots = bounds.selectAll("circle").data(dataset);

    console.log("dots", dots);

    dots
      .enter()
      .append("circle")
      // NEW
      .merge(dots)
      .attr("cx", (d) => xScale(xAccessor(d)))
      .attr("cy", (d) => yScale(yAccessor(d)))
      .attr("r", 5)
      .attr("fill", color);
  };
  drawDots(dataset.slice(0, 100), "gray");

  setTimeout(() => {
    drawDots(dataset, "cornflowerblue");
  }, 1000);
}
drawScatter();
```

Let's clean up the code to reset it back.

> Many people found `.enter()` etc. to be confusing so d3's maintainers added `.join()` as an easier alternative. However, it is good to start building an understanding of `._enter()` etc. in order to understand what's going on under the hood.

```js
  // 5. Draw data
  const dots = bounds.selectAll("circle").data(dataset);

  dots
    // NEW
    .join("circle")
    .attr("cx", (d) => xScale(xAccessor(d)))
    .attr("cy", (d) => yScale(yAccessor(d)))
    .attr("r", 5)
    .attr("fill", "cornflowerblue");
}
drawScatter();
```

Code:

```js
async function drawScatter() {
  // 1. Access data
  let dataset = await d3.json("./data/my_weather_data.json");

  const xAccessor = (d) => d.dewPoint;
  const yAccessor = (d) => d.humidity;

  // 2. Create chart dimensions

  const width = d3.min([window.innerWidth * 0.9, window.innerHeight * 0.9]);
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

  // 3. Draw canvas

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

  // 4. Create scales

  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(dataset, xAccessor))
    .range([0, dimensions.boundedWidth])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(dataset, yAccessor))
    .range([dimensions.boundedHeight, 0])
    .nice();

  // 5. Draw data
  const dots = bounds.selectAll("circle").data(dataset);

  dots
    // NEW
    .join("circle")
    .attr("cx", (d) => xScale(xAccessor(d)))
    .attr("cy", (d) => yScale(yAccessor(d)))
    .attr("r", 5)
    .attr("fill", "cornflowerblue");
}
drawScatter();
```

## Draw Peripherals

Let's draw our axes, learn about the text SVG element, and how to add (and rotate) labels, starting with the x axis.

We want our x axis to be:

- a line across the bottom
- with spaced "tick" marks that have
- labels for values per tick
- a label for the axis overall

To do this, we'll create our axis generator using `d3.axisBottom()`, then pass it:

- our x scale so it knows what ticks to make (from the domain) and
- what size to be (from the range)

```js
const xAxisGenerator = d3.axisBottom().scale(xScale);
```

Next, we'll use our `xAxisGenerator()` and call it on a new `g` element. Remember, we need to translate the x axis to move it to the bottom of the chart bounds.

```js
const xAxis = bounds
  .append("g")
  .call(xAxisGenerator)
  .style("transform", `translateY(${dimensions.boundedHeight}px)`);
```

Let's expand on our knowledge and create labels for our axes. Drawing text in an SVG is fairly straightforward - we need a `<text>` element, which can be positioned with an x and a y attribute. We'll want to position it horizontally centered and slightly above the bottom of the chart.

`<text>` elements will display their children as text — we can set that with our selection's `.html()` method.

```js
const xAxisLabel = xAxis
  .append("text")
  .attr("x", dimensions.boundedWidth / 2)
  .attr("y", dimensions.margin.bottom - 10)
  .attr("fill", "black")
  .style("font-size", "1.4em")
  .html("Dew point (°F)");
```

> We need to explicitly set the text fill to black because it inherits a fill value of none that d3 sets on the axis `<g>` element.

Let's do the same thing with the y axis. First, we need an axis generator.

D3 axes can be customized in many ways. An easy way to cut down on visual clutter is to tell our axis to aim for a certain number with the ticks method. Let's aim for 4 ticks, which should give the viewer enough information.

```js
const yAxisGenerator = d3.axisLeft().scale(yScale).ticks(4);
```

> Note that the resulting axis won't necessarily have exactly 4 ticks. D3 will take the number as a suggestion and aim for that many ticks, but also trying to use friendly intervals. Check out some of the internal logic in the d3-array code — see how it's attempting to use intervals of 10, then 5, then 2?

> There are many ways to configure the ticks for a d3 axis — find them all in the [docs](https://github.com/d3/d3-axis#axis_ticks). For example, you can specify their exact values by passing an array of values to `.tickValues()`.

Use our generator to draw our y axis:

```js
const yAxis = bounds.append("g").call(yAxisGenerator);
```

To finish up, let's draw the y axis label in the middle of the y axis, just inside the left side of the chart wrapper. d3 selection objects also have a `.text()` method that operates similarly to `.html()`:

```js
const yAxisLabel = yAxis
  .append("text")
  .attr("x", -dimensions.boundedHeight / 2)
  .attr("y", -dimensions.margin.left + 10)
  .attr("fill", "black")
  .style("font-size", "1.4em")
  .text("Relative humidity");
```

We'll need to rotate this label to fit next to the y axis. To rotate it around its center, we set its CSS property text-anchor to middle:

```js
const yAxisLabel = yAxis
  .append("text")
  .attr("x", -dimensions.boundedHeight / 2)
  .attr("y", -dimensions.margin.left + 10)
  .attr("fill", "black")
  .style("font-size", "1.4em")
  .text("Relative humidity")
  .style("transform", "rotate(-90deg)")
  .style("text-anchor", "middle");
}
```

## Adding Color

In our dataset, each datapoint records the cloud cover for that day.

`console.table(dataset[0])`

Let's bring in the amount of cloud cover for each day to see if there's a correlation with the other metrics. We'll show how the amount of cloud cover varies based on humidity and dew point by adding a color scale.

Looking at a value in our dataset, we can see that the amount of cloud cover exists at the key cloudCover. Let's add another data accessor function near the top of our file:

`const colorAccessor = d => d.cloudCover`

Create another scale at the bottom of our Create scales step.

So far, we've only looked at linear scales that convert numbers to other numbers. Scales can also convert a number into a color — we just need to replace the domain with a range of colors.

Let's make low cloud cover days be light blue and very cloudy days dark blue - that's a good semantic mapping.

```js
const colorScale = d3
  .scaleLinear()
  .domain(d3.extent(dataset, colorAccessor))
  .range(["skyblue", "darkslategrey"]);
```

If we log `colorScale(0.1)` to the console, we should see a color value, such as `rgb(126, 193, 219)`.

All that's left to do is to update how we set the fill of each dot. Let's find where we're doing that now.

`.attr("fill", "cornflowerblue")`

Instead of making every dot blue, let's use our `colorAccessor()` to grab the precipitation value, then pass that into our `colorScale()`:

`.attr("fill", d => colorScale(colorAccessor(d)))`

When we refresh our webpage, we should see our finished scatter plot with dots of various blues.

> For a complete, accessible chart, it would be a good idea to add a legend to explain what our colors mean. We'll skip this for now, to keep things simple.
