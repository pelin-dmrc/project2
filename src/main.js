import * as d3 from 'd3';

d3.select('#datavis_header')
  .style('color', '#1D9E75')
  .text('WHOOP — Strain vs. Recovery Trend');

const now = new Date();
d3.select('#page-date')
  .text(now.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' }));

const margin = { top: 40, bottom: 50, left: 45, right: 45 };
const width  = 600 - margin.left - margin.right;
const height = 350 - margin.top  - margin.bottom;

const svg = d3.select('#chart')
  .attr('width',  width  + margin.left + margin.right)
  .attr('height', height + margin.top  + margin.bottom)
  .append('g')
  .attr('transform', `translate(${margin.left}, ${margin.top})`);

d3.csv('/data/whoop_fitness_dataset_100k.csv').then(raw => {

  console.log('Total rows:', raw.length);

  const user = raw.filter(d => d.user_id === 'USER_00001');
  const data = user
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7)
    .map(d => ({
      day:            new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
      recovery_score: +d.recovery_score,
      day_strain:     +d.day_strain,
      sleep_hours:    +d.sleep_hours
    }));

  console.log('Last 7 days:', data);

  const lastRecovery = data[data.length - 1].recovery_score;
  const avgStrain    = d3.mean(data, d => d.day_strain);
  const avgSleep     = d3.mean(data, d => d.sleep_hours);

  const recoveryColor = d3.scaleThreshold()
    .domain([34, 67])
    .range(['#E24B4A', '#EF9F27', '#1D9E75']);

  const badgeColors = d3.scaleThreshold()
    .domain([34, 67])
    .range([
      { bg: '#FCEBEB', color: '#A32D2D', label: 'Low' },
      { bg: '#FAEEDA', color: '#854F0B', label: 'Moderate' },
      { bg: '#E1F5EE', color: '#085041', label: 'Good' }
    ]);

  const badge = badgeColors(lastRecovery);

  d3.select('#card-recovery')
    .style('color', recoveryColor(lastRecovery))
    .text(Math.round(lastRecovery));

  d3.select('#card-badge')
    .style('background', badge.bg)
    .style('color', badge.color)
    .text(badge.label);

  d3.select('#card-strain').text(avgStrain.toFixed(1));
  d3.select('#card-sleep').text(avgSleep.toFixed(1));

  const x = d3.scaleBand()
    .domain(data.map(d => d.day))
    .range([0, width])
    .padding(0.35);

  const yRecovery = d3.scaleLinear()
    .domain([0, 100])
    .range([height, 0]);

  const yStrain = d3.scaleLinear()
    .domain([0, 21])
    .range([height, 0]);

  svg.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('font-size', 12);

  svg.append('g')
    .call(d3.axisLeft(yRecovery).ticks(5))
    .selectAll('text')
    .attr('font-size', 11)
    .attr('fill', '#1D9E75');

  svg.append('g')
    .attr('transform', `translate(${width}, 0)`)
    .call(d3.axisRight(yStrain).ticks(5))
    .selectAll('text')
    .attr('font-size', 11)
    .attr('fill', '#BA7517');

  svg.append('text')
    .attr('x', -height / 2).attr('y', -36)
    .attr('transform', 'rotate(-90)')
    .attr('text-anchor', 'middle')
    .attr('font-size', 11)
    .attr('fill', '#1D9E75')
    .text('Recovery score (0–100)');

  svg.append('text')
    .attr('x', -height / 2).attr('y', width + 42)
    .attr('transform', 'rotate(-90)')
    .attr('text-anchor', 'middle')
    .attr('font-size', 11)
    .attr('fill', '#BA7517')
    .text('Day strain (0–21)');

  svg.selectAll('.grid-line')
    .data(yRecovery.ticks(5))
    .enter()
    .append('line')
    .attr('x1', 0).attr('x2', width)
    .attr('y1', d => yRecovery(d))
    .attr('y2', d => yRecovery(d))
    .attr('stroke', 'rgba(0,0,0,0.06)')
    .attr('stroke-width', 1);

  svg.selectAll('.bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.day))
    .attr('y', d => yStrain(d.day_strain))
    .attr('width', x.bandwidth())
    .attr('height', d => height - yStrain(d.day_strain))
    .attr('rx', 4)
    .attr('fill', '#EF9F27')
    .attr('opacity', 0.65);

  const line = d3.line()
    .x(d => x(d.day) + x.bandwidth() / 2)
    .y(d => yRecovery(d.recovery_score))
    .curve(d3.curveCatmullRom.alpha(0.5));

  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#1D9E75')
    .attr('stroke-width', 2.5)
    .attr('stroke-linecap', 'round')
    .attr('d', line);

  svg.selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.day) + x.bandwidth() / 2)
    .attr('cy', d => yRecovery(d.recovery_score))
    .attr('r', 5)
    .attr('fill', d => recoveryColor(d.recovery_score))
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5);

  svg.selectAll('.dot-label')
    .data(data)
    .enter()
    .append('text')
    .attr('x', d => x(d.day) + x.bandwidth() / 2)
    .attr('y', d => yRecovery(d.recovery_score) - 10)
    .attr('text-anchor', 'middle')
    .attr('font-size', 10)
    .attr('fill', d => recoveryColor(d.recovery_score))
    .text(d => Math.round(d.recovery_score));

  const legend = svg.append('g')
    .attr('transform', `translate(0, ${height + 36})`);

  legend.append('rect')
    .attr('x', 0).attr('y', 0)
    .attr('width', 12).attr('height', 12)
    .attr('rx', 2).attr('fill', '#EF9F27').attr('opacity', 0.75);

  legend.append('text')
    .attr('x', 16).attr('y', 10)
    .attr('font-size', 11).attr('fill', '#BA7517')
    .text('Day strain (bars)');

  legend.append('line')
    .attr('x1', 130).attr('y1', 6)
    .attr('x2', 150).attr('y2', 6)
    .attr('stroke', '#1D9E75').attr('stroke-width', 2.5)
    .attr('stroke-linecap', 'round');

  legend.append('circle')
    .attr('cx', 140).attr('cy', 6).attr('r', 4)
    .attr('fill', '#1D9E75').attr('stroke', '#fff').attr('stroke-width', 1.5);

  legend.append('text')
    .attr('x', 154).attr('y', 10)
    .attr('font-size', 11).attr('fill', '#1D9E75')
    .text('Recovery score (line)');

});