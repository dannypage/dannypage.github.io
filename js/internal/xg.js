function simulateExpectedGoals() {
  var teamAShots = document.getElementById('teamAShots');
  var teamBShots = document.getElementById('teamBShots');
  var teamAArray = stringToArray(teamAShots.value);
  var teamBArray = stringToArray(teamBShots.value);
  var sims = 10000;

  results = simulateGames(sims, teamAArray, teamBArray)
  document.getElementById('teamAWins').innerHTML = results.A;
  document.getElementById('teamBWins').innerHTML = results.B;
  document.getElementById('draws').innerHTML = results.T;
  document.getElementById('teamAPPG').innerHTML = (results.T + results.A*3)/sims;
  document.getElementById('teamBPPG').innerHTML = (results.T + results.B*3)/sims;

}
function simulateGames(sims, teamAArray, teamBArray) {
  var results = {"A":0, "T":0, "B":0 };
  for (var i = 0; i < sims; i++) {
    var scoreA = simulateShots(teamAArray);
    var scoreB = simulateShots(teamBArray);

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
