var options = {responsive: true,
  maintainAspectRatio: false,
};
var PPGData = {
  labels: ["Team A PPG", "Team B PPG"],
  datasets: [
    {
      label: "PPG",
      fillColor: "rgba(220,220,220,0.8)",
      strokeColor: "rgba(220,220,220,0.8)",
      highlightFill: "rgba(220,220,220,0.75)",
      highlightStroke: "rgba(220,220,220,1)",
      data: [0,0]
    }
  ]
};
var WinsData = {
  labels: ["Team A Wins", "Draws", "Team B Wins"],
  datasets: [
    {
      label: "PPG",
      fillColor: "rgba(220,220,220,0.8)",
      strokeColor: "rgba(220,220,220,0.8)",
      highlightFill: "rgba(220,220,220,0.75)",
      highlightStroke: "rgba(220,220,220,1)",
      data: [0,0,0]
    }
  ]
};
var goalsData = {
  labels: [],
  datasets: [
    {
      label: "Team A Goals",
      fillColor: "rgba(220,220,220,0.8)",
      strokeColor: "rgba(220,220,220,0.8)",
      highlightFill: "rgba(220,220,220,0.75)",
      highlightStroke: "rgba(220,220,220,1)",
      data: []
    },
    {
      label: "Team B Goals",
      fillColor: "rgba(220,220,220,0.8)",
      strokeColor: "rgba(220,220,220,0.8)",
      highlightFill: "rgba(220,220,220,0.75)",
      highlightStroke: "rgba(220,220,220,1)",
      data: []
    }
  ]
};
var shotsData = {
  labels: [],
  datasets: [
    {
      label: 'Team A',
      strokeColor: '#F16220',
      pointColor: '#F16220',
      pointStrokeColor: '#fff',
      data: [
        { x: 0.4, y: 1 , r: 3},
        { x: 0.5, y: 1 , r: 1},
        { x: 0.05, y: 1, r: 8}
      ]
    },
    {
      label: 'Team B',
      strokeColor: '#007ACC',
      pointColor: '#007ACC',
      pointStrokeColor: '#fff',
      data: [
        { x: 0.4, y: 2 , r: 3},
        { x: 0.5, y: 2 , r: 1},
        { x: 0.05, y: 2, r: 8}
      ]
    }
  ]
};

var winsctx = document.getElementById("winsChart").getContext("2d");
var winsChart = new Chart(winsctx).Bar(WinsData, options);
var ppgctx = document.getElementById("PPGChart").getContext("2d");
var PPGChart = new Chart(ppgctx).Bar(PPGData, options);
var goalsctx = document.getElementById("goalsChart").getContext("2d");
var goalsChart = new Chart(goalsctx).Bar(goalsData, options);
var shotsctx = document.getElementById("shotsChart").getContext("2d");
var shotsChart = new Chart(shotsctx).Scatter(shotsData, options);

function simulateExpectedGoals() {
  var teamAShots = document.getElementById('teamAShots');
  var teamBShots = document.getElementById('teamBShots');
  var teamAArray = stringToArray(teamAShots.value);
  var teamBArray = stringToArray(teamBShots.value);
  var sims = 10000;

  var results = simulateGames(sims, teamAArray, teamBArray)
  document.getElementById('teamAWins').innerHTML = results.A;
  document.getElementById('teamBWins').innerHTML = results.B;
  document.getElementById('draws').innerHTML = results.T;
  document.getElementById('teamAPPG').innerHTML = (results.T + results.A*3)/sims;
  document.getElementById('teamBPPG').innerHTML = (results.T + results.B*3)/sims;
  teamASD = standardDeviation(results.AScores);
  document.getElementById('teamASD').innerHTML = Math.round(teamASD * 100) / 100
  teamBSD = standardDeviation(results.BScores);
  document.getElementById('teamBSD').innerHTML = Math.round(teamBSD * 100) / 100
  teamAAVG = average(results.AScores);
  document.getElementById('teamAAVG').innerHTML = Math.round(teamAAVG * 100) / 100
  teamBAVG = average(results.BScores);
  document.getElementById('teamBAVG').innerHTML = Math.round(teamBAVG * 100) / 100


  winsChart.datasets[0].bars[0].value = results.A;
  winsChart.datasets[0].bars[1].value = results.T;
  winsChart.datasets[0].bars[2].value = results.B;
  winsChart.update();

  PPGChart.datasets[0].bars[0].value = (results.T + results.A*3)/sims;
  PPGChart.datasets[0].bars[1].value = (results.T + results.B*3)/sims;
  PPGChart.update();

  while (goalsChart.datasets[0].bars.length > 0) {
    goalsChart.removeData();
    }
  for (var i = 0; i <= Math.max(results.AGoals.length, results.BGoals.length); i++){
    if(typeof results.AGoals[i] === 'undefined') {
      var AGoals = 0 }
    else { var AGoals = results.AGoals[i] }
    if(typeof results.BGoals[i] === 'undefined') {
      var BGoals = 0 }
    else { var BGoals = results.BGoals[i] }
     goalsChart.addData([AGoals, BGoals], i+" Goals")
  }
  goalsChart.update();
}
function simulateGames(sims, teamAArray, teamBArray) {
  var results = {"A":0, "T":0, "B":0,
                 "AScores":[], "BScores":[],
                 "AGoals":[], "BGoals":[]
                };
  var scoreA, scoreB;
  for (var i = 0; i < sims; i++) {
    scoreA = simulateShots(teamAArray);
    scoreB = simulateShots(teamBArray);
    results.AScores.push(scoreA)
    results.BScores.push(scoreB)
    if(typeof results.AGoals[scoreA] === 'undefined') {
      results.AGoals[scoreA] = 1 }
    else { results.AGoals[scoreA]++ }
    if(typeof results.BGoals[scoreB] === 'undefined') {
      results.BGoals[scoreB] = 1 }
    else { results.BGoals[scoreB]++ }

    if (scoreA > scoreB) {
      results.A++;
    } else if (scoreB > scoreA) {
      results.B++;
    } else {
      results.T++;
    }
  }
  return results;
}
function stringToArray(string) {
  trimmed = string.replace(" ","");
  array = trimmed.split(",").map(Number);
  return array;
}
function simulateShots(shotsArray) {
  var score = 0;
  for (var i = 0; i < shotsArray.length; i++) {
    if (shotsArray[i] > Math.random() ) {
      score++;
    }
  }
  return score;
}
//http://derickbailey.com/2014/09/21/calculating-standard-deviation-with-array-map-and-array-reduce-in-javascript/
function standardDeviation(values){
  var avg = average(values);

  var squareDiffs = values.map(function(value){
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });

  var avgSquareDiff = average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

function average(data){
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}
