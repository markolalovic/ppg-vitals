// Based on: 
// https://gist.github.com/pjsier/fbf9317b31f070fd540c5523fef167ac
// https://bl.ocks.org/mbostock/3884955
// For transitions: https://bl.ocks.org/mbostock/1642874

function realTimeLineChart() {
    var margin = {top: 20, right: 20, bottom: 50, left: 50},
        width = 600,
        height = 400,
        duration = 500,
        color = ['#4682b4'];
  
    function chart(selection) {
      selection.each(function(data) {
        data = ['x'].map(function(c) {
          return {
            label: c,
            values: data.map(function(d) {
              return {time: +d.time, value: d[c]};
            })
          };
        });
  
        var t = d3.transition().duration(duration).ease(d3.easeLinear),
            x = d3.scaleTime().rangeRound([0, width-margin.left-margin.right]),
            y = d3.scaleLinear().rangeRound([height-margin.top-margin.bottom, 0]),
            z = d3.scaleOrdinal(color);
  
        var xMin = d3.min(data, function(c) { return d3.min(c.values, function(d) { return d.time; })});
        var xMax = new Date(new Date(d3.max(data, function(c) {
          return d3.max(c.values, function(d) { return d.time; })
        })).getTime() - (duration*2));
  
        x.domain([xMin, xMax]);
        y.domain([
          d3.min(data, function(c) { return d3.min(c.values, function(d) { return d.value; })}),
          d3.max(data, function(c) { return d3.max(c.values, function(d) { return d.value; })})
        ]);
        z.domain(data.map(function(c) { return c.label; }));
  
        var line = d3.line()
          .curve(d3.curveBasis)
          .x(function(d) { return x(d.time); })
          .y(function(d) { return y(d.value); });
  
        var svg = d3.select(this).selectAll("svg").data([data]);
        var gEnter = svg.enter().append("svg").append("g");
        gEnter.append("g").attr("class", "axis x");
        gEnter.append("g").attr("class", "axis y");
        gEnter.append("defs").append("clipPath")
            .attr("id", "clip")
          .append("rect")
            .attr("width", width-margin.left-margin.right)
            .attr("height", height-margin.top-margin.bottom);
        gEnter.append("g")
            .attr("class", "lines")
            .attr("clip-path", "url(#clip)")
          .selectAll(".data").data(data).enter()
            .append("path")
              .attr("class", "data");
  
        var svg = selection.select("svg");
        svg.attr('width', width).attr('height', height);
        var g = svg.select("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
        var formatY = d3.format(".2f");

        g.select("g.axis.x")
          .attr("transform", "translate(0," + (height-margin.bottom-margin.top) + ")")
          .transition(t)
          .style("font-size","15px")
          .call(d3.axisBottom(x)); // .ticks(5)
        
        g.select("g.axis.y")
          .transition(t)
          .attr("class", "axis y")
          .style("font-size","15px")
          .call(d3.axisLeft(y).tickFormat(formatY));
  
        g.select("defs clipPath rect")
          .transition(t)
          .attr("width", width-margin.left-margin.right)
          .attr("height", height-margin.top-margin.right);
  
        g.selectAll("g path.data")
          .data(data)
          .style("stroke", function(d) { return z(d.label); })
          .style("stroke-width", 3)
          .style("fill", "none")
          .transition()
          .duration(duration)
          .ease(d3.easeLinear)
          .on("start", tick);
  
        function tick() {
          d3.select(this)
            .attr("d", function(d) { return line(d.values); })
            .attr("transform", null);
  
          var xMinLess = new Date(new Date(xMin).getTime() - duration);
          d3.active(this)
              .attr("transform", "translate(" + x(xMinLess) + ",0)")
            .transition()
              .on("start", tick);
        }
      });
    }
  
    chart.margin = function(_) {
      if (!arguments.length) return margin;
      margin = _;
      return chart;
    };
  
    chart.width = function(_) {
      if (!arguments.length) return width;
      width = _;
      return chart;
    };
  
    chart.height = function(_) {
      if (!arguments.length) return height;
      height = _;
      return chart;
    };
  
    chart.color = function(_) {
      if (!arguments.length) return color;
      color = _;
      return chart;
    };
  
    chart.duration = function(_) {
      if (!arguments.length) return duration;
      duration = _;
      return chart;
    };
  
    return chart;
  }