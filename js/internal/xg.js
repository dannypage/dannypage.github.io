var results, winsChart, goalsADataPoints, goalsBDataPoints, diffDataPoints, n;
var red = "#d7191c"
var blue = "#2c7bb6"
var draw = "#cfcf6f"

defaults = {
  'teamAShots': "0.05,0.05,0.05,0.05,0.20,0.20,0.2,0.2,0.2",
  'teamBShots': "0.4,0.4,0.4"
}

for (value in defaults) { getURLValue(value, defaults[value]) }

function getURLValue(elementID, defaultValue) {
  var urlValue = getQueryVariable(elementID);
  if (urlValue.length > 0 ) {
    document.getElementById(elementID).value = urlValue;
  } else {
    document.getElementById(elementID).value = defaultValue;
  }
}

function simulateExpectedGoals() {
  var teamAShots = document.getElementById('teamAShots');
  var teamBShots = document.getElementById('teamBShots');
  var teamAArray = stringToArray(teamAShots.value);
  var teamBArray = stringToArray(teamBShots.value);
  var sims = 10000;

  results = simulateGames(sims, teamAArray, teamBArray)

  teamASD = standardDeviation(results.AScores);
  document.getElementById('teamASD').innerHTML = Math.round(teamASD * 100) / 100
  teamBSD = standardDeviation(results.BScores);
  document.getElementById('teamBSD').innerHTML = Math.round(teamBSD * 100) / 100
  teamAAVG = average(results.AScores);
  document.getElementById('teamAAVG').innerHTML = Math.round(teamAAVG * 100) / 100
  teamBAVG = average(results.BScores);
  document.getElementById('teamBAVG').innerHTML = Math.round(teamBAVG * 100) / 100
  teamAPPG = Math.round(100*(results.A*3+results.T)/sims)/100
  teamBPPG = Math.round(100*(results.B*3+results.T)/sims)/100
  teamAWin = Math.round(100*(results.A/sims))
  document.getElementById('teamAWin').innerHTML = teamAWin;
  teamBWin = Math.round(100*(results.B/sims))
  document.getElementById('teamBWin').innerHTML = teamBWin;
  document.getElementById('teamBAVG').innerHTML = Math.round(teamBAVG * 100) / 100
  document.getElementById('teamAShotCount').innerHTML = teamAArray.length
  document.getElementById('teamBShotCount').innerHTML = teamBArray.length


  var ppgChart = new CanvasJS.Chart("ppgChart", {
		title:{
			text: "Points Per Game"
		},
    animationEnabled: true,
		data: [
		{
			type: "doughnut",
			startAngle: 90,
			toolTipContent: "{legendText}: <strong>{y}</strong>",
			showInLegend: false,
			dataPoints: [
				{y: teamAPPG, indexLabel: "{y} ppg", legendText: "Team A", color: red },
				{y: teamBPPG, indexLabel: "{y} ppg", legendText: "Team B", color: blue }
      ]
		}
		]
	});
	ppgChart.render();
  winsChart = new CanvasJS.Chart("winsChart",{
    title:{
      text: "Results (10000 Sims)"
    },
    animationEnabled: true,
    data: [
      {
        type: "column",
        toolTipContent: "{label}: <strong>{y}</strong>",
  			showInLegend: false,
        dataPoints: [
          {y: results.A, label: "Team A Wins", color: red},
          {y: results.T, label: "Draws", color: draw},
          {y: results.B, label: "Team B Wins", color: blue}
        ]
      }
    ]
  });
  winsChart.render();

  goalsADataPoints = [];
  goalsBDataPoints = [];
  for (var i = 0; i < results.AGoals.length; i++){
    if (results.AGoals[i] > 0) {
      goalsADataPoints.push({y: results.AGoals[i], label: i});
    } else {
      goalsADataPoints.push({y: 0, label: i });
    }
  }
  for (var i = 0; i < results.BGoals.length; i++){
    if (results.BGoals[i] > 0) {
      goalsBDataPoints.push({y: results.BGoals[i], label: i });
    } else {
      goalsBDataPoints.push({y: 0, label: i });
    }
  }
  goalsChart = new CanvasJS.Chart("goalsChart",{
    title:{
      text: "Games With # of Goals"
    },
    toolTip: {
      shared: true
    },
    legend:{
      cursor:"pointer",
      itemclick: function(e){
        if (typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
        	e.dataSeries.visible = false;
        }
        else {
          e.dataSeries.visible = true;
        }
      	goalsChart.render();
      }
    },
    animationEnabled: true,
    data: [
      {
        type: "column",
        name: "Team A",
        legendText: "Team A",
  			showInLegend: true,
        color: red,
        dataPoints: goalsADataPoints
      },
      {
        type: "column",
        name: "Team B",
        legendText: "Team B",
  			showInLegend: true,
        color: blue,
        dataPoints: goalsBDataPoints
      }
    ]
  });
  goalsChart.render();

  diffDataPoints = [];
  n = [];
  for (var i in results.diffGoals) { n.push(Number(i) ); }
  var diffMax = Math.max.apply(Math, n);
  var diffMin = Math.min.apply(Math, n);
  for (var key = diffMin; key <= diffMax; key++) {
    if (key == 0) {
      diffDataPoints.push({y: results.diffGoals[key], label: String(key), color: draw})
    } else if (key < 0) {
      diffDataPoints.push({y: results.diffGoals[key], label: String(key), color: red})
    } else if (key > 0) {
      diffDataPoints.push({y: results.diffGoals[key], label: String(key), color: blue})
    }
  }
  diffChart = new CanvasJS.Chart("diffChart",{
    title:{
      text: "Goal Difference"
    },
    animationEnabled: true,
    data: [
      {
        type: "column",
        toolTipContent: "{label}: <strong>{y}</strong>",
  			showInLegend: false,
        dataPoints: diffDataPoints
      }
    ]
  });
  diffChart.render();

  var shareURL = getShareURL();
  document.getElementById("shareURLtext").innerHTML = shareURL;
  document.getElementById("shareURLlink").href = shareURL;
}

function simulateGames(sims, teamAArray, teamBArray) {
  var results = {
    "A":0, "T":0, "B":0,
    "AScores":[], "BScores":[],
    "AGoals":[], "BGoals":[],
    "diffGoals":{}, "scorelines":[]
  };
  var scoreA, scoreB;
  for (var i = 0; i < sims; i++) {
    scoreA = simulateShots(teamAArray);
    scoreB = simulateShots(teamBArray);
    results.AScores.push(scoreA);
    results.BScores.push(scoreB);
    if(typeof results.AGoals[scoreA] === 'undefined') {
      results.AGoals[scoreA] = 1;
    } else {
      results.AGoals[scoreA]++;
    }
    if(typeof results.BGoals[scoreB] === 'undefined') {
      results.BGoals[scoreB] = 1;
    } else {
      results.BGoals[scoreB]++;
    }
    scoreline = scoreA + "-" + scoreB;
    if(typeof results.scorelines[scoreline] === 'undefined') {
      results.scorelines[scoreline] = {"A": scoreA, "B": scoreB, "C": 1};
    } else {
      results.scorelines[scoreline].C++;
    }

    if (scoreA > scoreB) {
      results.A++;
    } else if (scoreB > scoreA) {
      results.B++;
    } else {
      results.T++;
    }

    var diff = scoreB - scoreA;
    if(typeof results.diffGoals[diff] === 'undefined') {
      results.diffGoals[diff] = 1;
    } else {
      results.diffGoals[diff]++;
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

function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
    return '';
}

function getShareURL() {
  var origin = document.location['origin'];
  var pathname = document.location['pathname'];
  var teamAShots = document.getElementById('teamAShots').value;
  var teamBShots = document.getElementById('teamBShots').value;
  var search = "?teamAShots=" + teamAShots + "&teamBShots" + teamBShots;
  return origin + pathname + search;
}
