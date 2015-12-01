'use strict';

var players = [];
var files = ['./assets/baseball/452655.json', './assets/baseball/457706.json', './assets/baseball/502082.json'];
window.onload = populatePlayers(players);

function populatePlayers(players){
  var fileCount = files.length;
  var count = 0;
  for (var i = 0; i < fileCount; i++){
    d3.json(files[i], function(error, json) {
      if (error) return console.warn(error);
      players.push(json);
      var select = document.getElementById("playerSelect");
      var opt = json.name;``
      var el = document.createElement("option");
      el.textContent = opt;
      el.value = opt;
      select.appendChild(el);
      count++;
      if (count > fileCount - 1) drawGraphs(0);
    });
  }
}

function drawGraphs(index){
  var player = players[index];
  var atBatArray = player.games.map(function(obj){return obj.AB});
  var atBats = d3.sum(atBatArray);
  var hitArray = player.games.map(function(obj){return obj.H});
  var hits = d3.sum(hitArray);
  var battingAverage = (hits/atBats).toPrecision(3);
  var rollingArrays = calcRollingStats(atBatArray, hitArray);
  var hittingStreak = calcHittingStreak(hitArray);

  $("#playerImage").attr("src", player.image);
  $("#teamImage").attr("src", player.games[0].teamImage);
  $("#playerName").html(player.name);
  $("#playerGames").html(player.games.length);
  $("#playerABs").html(atBats);
  $("#playerHits").html(hits);
  $("#playerBA").html(battingAverage.toString().substring(1));
  $("#playerHRs").html(d3.sum(player.games.map(function(obj){return obj.HR})));
  $("#playerRBIs").html(d3.sum(player.games.map(function(obj){return obj.RBI})));

  Plotly.newPlot('battingAverageGraph', graphRollingTimeSeries(player.games, rollingArrays.rollingBA), setLayout("Batting Average"));
  Plotly.newPlot('hittingStreakGraph', graphRollingTimeSeries(player.games, hittingStreak), setLayout("Hitting Streak"));
  Plotly.newPlot('atBatsGraph', graphTimeSeries(player.games, 'AB'), setLayout("At Bats"));
  Plotly.newPlot('homeRunsGraph', graphTimeSeries(player.games, 'HR'), setLayout("Home Runs"));
  Plotly.newPlot('hitsGraph', graphTimeSeries(player.games, 'H'), setLayout("Hits"));
  Plotly.newPlot('rbiGraph', graphTimeSeries(player.games, 'RBI'), setLayout("RBIs"));
}

function calcRollingStats(atBatArray, hitArray) {
  var rollingAB = [];
  var rollingH = [];
  atBatArray.reduce(function(a,b,i) { return rollingAB[i] = a+b; },0);
  hitArray.reduce(function(a,b,i) { return rollingH[i] = a+b; },0);
  var rollingBA = [];
  atBatArray.reduce(function(a,b,i) {
    return rollingBA[i] = (rollingH[i]/rollingAB[i]).toPrecision(3);
  },0);

  return {
    rollingBA: rollingBA,
    rollingH: rollingH,
    rollingAB: rollingAB
  };
}

function calcHittingStreak(hitArray) {
  var hittingStreak = [];
  var count = 0;
  for (var i =0; i < hitArray.length; i++){
    if (hitArray[i] > 0){
      count++;
    } else {
      count = 0;
    }
    hittingStreak.push(count);
  }
  return hittingStreak;
}

function graphTimeSeries(games, key){
  return [
    {
      x: games.map(function(obj){return obj.date}),
      y: games.map(function(obj){return obj[key]}),
      mode: 'markers',
      type: 'scatter'
    }
  ];
}

function graphRollingTimeSeries(games, array){
  return [
    {
      x: games.map(function(obj){return obj.date}),
      y: array,
      type: 'scatter'
    }
  ];
}

function everythingGraph(games){

}

function setLayout(title){
  return {
    title: title,
    margin: {
      l: 40,
      r: 40,
      t: 80,
      b: 40
    }
  }
}
