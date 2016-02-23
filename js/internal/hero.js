'use strict';

var players = [];
var files = ['./assets/hero/player.json'];
window.onload = populatePlayers(players);

function populatePlayers(players){
  var fileCount = files.length;
  var count = 0;
  for (var i = 0; i < fileCount; i++){
    d3.json(files[i], function(error, json) {
      if (error) return console.warn(error);
      players.push(json);
      var select = document.getElementById("playerSelect");
      var opt = json.name;
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

  Plotly.newPlot('heroGraph', graphBarGraph(player.fields, player.percent, player.values), setLayout(player.name));
}

function graphBarGraph(fields, percent, values){
  return [
     {
        x: fields,
        y: percent,
        text: values,
        type: 'bar',
        marker: {
          line: {
            color: 'rbg(8,48,107)',
            width: 1.5
          }
        }
      }
    ];
}

function setLayout(title){
  return {
    title: title,
    margin: {
      l: 40,
      r: 40,
      t: 80,
      b: 40
    },
    bargap: 0.05,
    yaxis: {
      tickmode: "array",
      tickvals: [0,25,50,75,100],
      ticktext: ["0th","25th", "50th", "75th","100th"]
    }
  }
}
