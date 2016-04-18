var results, winsChart, goalsADataPoints, goalsBDataPoints, diffDataPoints, n, goalBars;
var red = "#d7191c"
var blue = "#2c7bb6"
var draw = "#cfcf6f"
var seededChance;
var seasonPoints;

var encode, compressed, decompressed, variables;

defaults = {
  'teamAShots': "0.05,0.05,0.05,0.05,0.20,0.20,0.2,0.2,0.2",
  'teamBShots': "0.4,0.4,0.4",
  'name': "John Smith FC",
  'chances': "0.05,0.05,0.05,0.05,0.20,0.20,0.2,0.2,0.2",
  'goals': "2",
}

var share = getQueryVariable('share');
if (share.length > 0) {
  decompressed = LZString.decompressFromEncodedURIComponent(share);
  variables = decompressed.split(/\|/);
  if (page_type == "season" && variables.length == 2) {
    document.getElementById('chances').value = variables[0];
    document.getElementById('goals').value = variables[1];
    getURLValue("name", defaults["name"]);
  } else if (page_type == "match" && variables.length == 2) {
    document.getElementById('teamAShots').value = variables[0];
    document.getElementById('teamBShots').value = variables[1];
  } else {
    console.log("Share link failed.")
    for (value in defaults) { getURLValue(value, defaults[value]) }
  }
} else {
  for (value in defaults) { getURLValue(value, defaults[value]) }
}


function getURLValue(elementID, defaultValue) {
  if ( !!(document.getElementById(elementID)) ) {
    var urlValue = getQueryVariable(elementID);
    if (urlValue.length > 0 ) {
      document.getElementById(elementID).value = urlValue;
    } else {
      document.getElementById(elementID).value = defaultValue;
    }
  }
}

function simulateExpectedGoals() {
  seededChance = new Chance(12345);
  var teamAShots = document.getElementById('teamAShots');
  var teamBShots = document.getElementById('teamBShots');
  var teamAArray = stringToArray(teamAShots.value);
  var teamBArray = stringToArray(teamBShots.value);
  var sims = 10000;
  var seasonGames = 38;
  var seasons = 2500;

  results = simulateGames(sims, teamAArray, teamBArray)

  var teamAMAD = meanDeviation(results.AScores);
  var teamBMAD = meanDeviation(results.BScores);
  var teamAPPG = Math.round(100*(results.A*3+results.T)/sims)/100;
  var teamBPPG = Math.round(100*(results.B*3+results.T)/sims)/100;
  var teamAWin = Math.round(100*(results.A/sims));
  var teamBWin = Math.round(100*(results.B/sims));

  document.getElementById('teamAMAD').innerHTML = Math.round(teamAMAD * 100) / 100
  document.getElementById('teamBMAD').innerHTML = Math.round(teamBMAD * 100) / 100
  document.getElementById('teamAAVG').innerHTML = Math.round(sum(teamAArray)*100)/100
  document.getElementById('teamBAVG').innerHTML = Math.round(sum(teamBArray)*100)/100
  document.getElementById('teamAWin').innerHTML = teamAWin;
  document.getElementById('teamBWin').innerHTML = teamBWin;
  document.getElementById('teamAShotCount').innerHTML = teamAArray.length;
  document.getElementById('teamBShotCount').innerHTML = teamBArray.length;
  document.getElementById('teamAPPG').innerHTML = teamAPPG;
  document.getElementById('teamBPPG').innerHTML = teamBPPG;

  ppgData = [{
    values: [teamAPPG, teamBPPG],
    labels: ['Team A PPG', 'Team B PPG'],
    name: 'Points Per Game',
    textinfo: 'value',
    hoverinfo: 'label+value',
    hole: 0.4,
    type: 'pie',
    marker: {
      colors: [red, blue]
    },
    textfont: {
      color: 'white',
      size: 18
    },
    rotation: -180,
    sort: false,
    direction: 'counterclockwise'
  }];
  var ppgLayout = {
    showlegend: false,
    title: 'Points Per Game',
    titlefont: {
      size: 28
    },
    margin:{
      t:60,
      b:60,
      l:60,
      r:60,
      autoexpand:true
    }
  };
  Plotly.newPlot('ppgChart', ppgData, ppgLayout);

  var xValue = ['Team A', 'Draw', 'Team B'];
  var yValue = [results.A/100, results.T/100, results.B/100]
  var winsData = [{
    x: xValue,
    y: yValue,
    marker:{
      color: [red, draw, blue]
    },
    type: 'bar'
  }];

  var annotationContent = [];
  var winsLayout = {
    title: 'Result Percentage',
    titlefont: {
      size: 28
    },
    margin:{
      t:60,
      b:60,
      l:60,
      r:60,
      autoexpand:true
    },
    annotations: annotationContent
  };

  for( var i = 0 ; i < xValue.length ; i++ ){
    var result = {
      x: xValue[i],
      y: yValue[i],
      text: yValue[i],
      xanchor: 'center',
      yanchor: 'bottom',
      showarrow: false
    };
    annotationContent.push(result);
  }

  Plotly.newPlot('winsChart', winsData, winsLayout);

  goalsAx = [];
  goalsAy = [];
  goalsBx = [];
  goalsBy = [];
  for (var i = 0; i < results.AGoals.length; i++){
    if (results.AGoals[i] > 0) {
      goalsAx.push(i);
      goalsAy.push(results.AGoals[i]/100);
    } else {
      goalsAx.push(i);
      goalsAy.push(0);
    }
  }
  for (var i = 0; i < results.BGoals.length; i++){
    if (results.BGoals[i] > 0) {
      goalsBx.push(i);
      goalsBy.push(results.BGoals[i]/100);
    } else {
      goalsBx.push(i);
      goalsBy.push(0);
    }
  }

  var goalsData = [{
    x: goalsAx,
    y: goalsAy,
    marker:{
      color: red
    },
    type: 'bar',
    name: 'Team A',
    textinfo: 'value',
    hoverinfo: 'label+value',
  },{
    x: goalsBx,
    y: goalsBy,
    marker:{
      color: blue
    },
    type: 'bar',
    name: 'Team B',
    textinfo: 'value',
    hoverinfo: 'label+value',
  }];

  var goalsLayout = {
    title: 'Goals Scored',
    titlefont: {
      size: 28
    },
    margin:{
      t:60,
      b:60,
      l:60,
      r:60,
      autoexpand:true
    },
    showlegend: false
  };

  Plotly.newPlot('goalsChart', goalsData, goalsLayout);

  diffDataPoints = {
    'y': [],
    'x': [],
    'c': [],
  };
  n = [];
  for (var i in results.diffGoals) { n.push(Number(i) ); }
  var diffMax = Math.max.apply(Math, n);
  var diffMin = Math.min.apply(Math, n);
  for (var key = diffMin; key <= diffMax; key++) {
    if (key == 0) {
      diffDataPoints.y.push(results.diffGoals[key]/100);
      diffDataPoints.x.push(key);
      diffDataPoints.c.push(draw);
    } else if (key < 0) {
      diffDataPoints.y.push(results.diffGoals[key]/100);
      diffDataPoints.x.push(key);
      diffDataPoints.c.push(red);
    } else if (key > 0) {
      diffDataPoints.y.push(results.diffGoals[key]/100);
      diffDataPoints.x.push(key);
      diffDataPoints.c.push(blue);
    }
  }

  var diffData = [{
    x: diffDataPoints.x,
    y: diffDataPoints.y,
    marker:{
      color: diffDataPoints.c
    },
    type: 'bar'
  }];

  var annotationContent = [];
  var diffLayout = {
    title: 'Goal Difference',
    titlefont: {
      size: 28
    },
    margin:{
      t:60,
      b:60,
      l:60,
      r:60,
      autoexpand:true
    },
    annotations: annotationContent
  };

  for( var i = 0 ; i < diffDataPoints.x.length ; i++ ){
    var result = {
      x: diffDataPoints.x[i],
      y: diffDataPoints.y[i],
      text: diffDataPoints.y[i],
      xanchor: 'center',
      yanchor: 'bottom',
      showarrow: false
    };
    annotationContent.push(result);
  }

  Plotly.newPlot('diffChart', diffData, diffLayout);

  seasonPoints = {
    teamA: [],
    teamB: []
  };
  for (var i =0 ; i< seasons ; i++){
    seasonResults = simulateGames(seasonGames, teamAArray, teamBArray);
    seasonPoints.teamA.push(seasonResults.A*3+seasonResults.T);
    seasonPoints.teamB.push(seasonResults.B*3+seasonResults.T);
  }

  var teamASeason = {
    y: seasonPoints.teamA,
    type: 'box',
    name: 'Team A',
    marker:{
      color: red
    },
    boxmean:"sd"
  };

  var teamBSeason = {
    y: seasonPoints.teamB,
    type: 'box',
    name: 'Team B',
    marker:{
      color: blue
    },
    boxmean:"sd"
  };

  var seasonLayout = {
    title: '38 Games Season Sim',
    titlefont: {
      size: 28
    },
    margin:{
      t:60,
      b:60,
      l:60,
      r:60,
      autoexpand:true
    },
    showlegend: false
  };

  var seasonData = [teamASeason, teamBSeason];

  Plotly.newPlot('seasonPlot', seasonData, seasonLayout);

  var teamAHistogram = {
    x: seasonPoints.teamA,
    type: 'histogram',
    marker: {
      color: red
    },
    opacity: 0.75,
    name: 'Team A'
  };
  var teamBHistogram = {
    x: seasonPoints.teamB,
    marker: {
      color: blue
    },
    opacity: 0.75,
    type: 'histogram',
    name: 'Team B'
  };
  var seasonBarData = [teamAHistogram, teamBHistogram];
  var seasonLayout = {
    title: '38 Games - Histogram',
    titlefont: {
      size: 28
    },
    margin:{
      t:60,
      b:60,
      l:60,
      r:60,
      autoexpand:true
    },
    xaxis: {title: 'Season Points'},
    yaxis: {title: 'Count'},
    barmode: 'overlay',
    showlegend: false
  };

  Plotly.newPlot('seasonBar', seasonBarData, seasonLayout);

  var shareURL = getShareURL();
  document.getElementById("shareURLlink").href = shareURL;
}

function simulateLongTermExpectedGoals(){
  seededChance = new Chance(12345);
  var entity = document.getElementById('name').value;
  var chances = document.getElementById('chances').value;
  var goals = document.getElementById('goals').value;
  var chancesArray = stringToArray(chances);
  var sims = 10000;

  results = simulateSeasons(sims, chancesArray, goals);
  document.getElementById('averageGoals').innerHTML = Math.round(results.average * 100) / 100;
  document.getElementById('meanAbsoulteGoals').innerHTML = Math.round(results.meanAbsoulteDev * 100) / 100;
  over = results.bin.over / sims;
  exact = results.bin.exact / sims;
  under = results.bin.under / sims;
  document.getElementById('under').innerHTML = Math.round(under*100);
  document.getElementById('exact').innerHTML = Math.round(exact*100);
  document.getElementById('over').innerHTML = Math.round(over*100);
  distance = Math.round(100*(goals - results.average)/results.meanAbsoulteDev)/100;
  var explanation = {
    'reality': entity + " scored " + goals + " goals. ",
    'expectation': "Simulations indicate that you would expect them to score around " + Math.round(results.average) + " goals, give or take " + Math.round(results.meanAbsoulteDev) + ". ",
    'bins': "<br>" + goals + " goals " + " is exactly correct in " + Math.round(exact*100) + "% of the simulations, while it's a sign of underperforming in " + Math.round(under*100) + "% of the sims and a sign of overperforming in " + Math.round(over*100) + "% of the sims.",
    'test': "<br>" + entity + " was " + distance + " mean absolute deviations from the expected mean."
  };
  document.getElementById('explanation').innerHTML = explanation.reality + explanation.expectation + explanation.bins + explanation.test;

  goalBars = {
    x: [],
    y: [],
    text: [],
    colors: []
  }
  for (var i = 0; i < results.goals.length; i++){
    if(typeof results.goals[i] === 'undefined') {
      goalBars.y.push(0);
    } else {
      goalBars.y.push(results.goals[i]/100);
    }
    goalBars.x.push(i);
    goalBars.colors.push('rgb(158,202,240)');
    goalBars.text.push(Math.round(100*(i - results.average)/results.meanAbsoulteDev)/100 + ' MADs from Mean');
  }
  goalBars.colors[goals] = 'rgb(116,196,118)';
  var data = [
    {
      x: goalBars.x,
      y: goalBars.y,
      type: 'bar',
      text: goalBars.text,
      name: 'Percentage',
      marker: {
        color: goalBars.colors
      }
    }
  ];
  var layout = {
    title: 'Simulation Outcomes for ' + entity,
    margin: {
      l: 80,
      r: 80,
      t: 80,
      b: 80
    },
    font: {
        size: 16
    },
    yaxis: {
      ticksuffix:"%"
    },
    xaxis: {
      title: "Goals"
    },
    showlegend: false
  };
  Plotly.newPlot('goalsChart', data, layout);

  var shareURL = getLTShareURL();
  document.getElementById("shareURLlink").href = shareURL;
}

function simulateSeasons(sims, chancesArray, actualGoals) {
  var results = {
    "goals":[], "results":[], "meanAbsoulteDev": 0, "average": 0,
    "bin": {
      "under":0,
      "over":0,
      "exact":0
    }
  };

  for (var i = 0; i < sims; i++) {
    value = simulateShots(chancesArray);
    results.results.push(value);
    if(typeof results.goals[value] === 'undefined') {
      results.goals[value] = 1;
    } else {
      results.goals[value]++;
    }
    if (actualGoals < value) {
      results.bin.under++;
    } else if (actualGoals > value) {
      results.bin.over++;
    } else {
      results.bin.exact++;
    }

  }
  results.meanAbsoulteDev = meanDeviation(results.results);
  results.average = average(results.results);
  return results;
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
  array = trimmed.split(/[ ,]+/).map(Number);
  for(var i = array.length - 1; i >= 0; i--) {
    if(array[i] === 0) {
       array.splice(i, 1);
    }
  }
  return array;
}

function simulateShots(shotsArray) {
  var score = 0;
  for (var i = 0; i < shotsArray.length; i++) {
    if (seededChance.bool({likelihood: shotsArray[i]*100}) ) {
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

function meanDeviation(values){
  var avg = average(values);

  var meanDiffs = values.map(function(value){
    var diff = value - avg;
    return Math.abs(diff);
  });

  var maDev = average(meanDiffs);
  return maDev;
}

function average(data){
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}

function sum(data){
  return data.reduce(function(sum, value){
    return sum + value;
  }, 0);
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

  encode = teamAShots.replace(/\|/g,'') + '|' + teamBShots.replace(/ /g,'');
  compressed = LZString.compressToEncodedURIComponent(encode);

  var share = "?share=" + compressed;
  return origin + pathname + share;
}

function getLTShareURL() {
  var origin = document.location['origin'];
  var pathname = document.location['pathname'];
  var name = document.getElementById('name').value;
  var chances = document.getElementById('chances').value;
  var goals = document.getElementById('goals').value;

  encode = chances.replace(/([0]\.)/g,'.').replace(/\s/g,'') + '|' + goals.replace(/ /g,'');
  compressed = LZString.compressToEncodedURIComponent(encode);

  var share = "?share=" + compressed + "&name=" + name;

  return origin + pathname + share;
}
