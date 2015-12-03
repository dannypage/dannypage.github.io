parseFiles();
var bertinMLS, bertinEPL, rileyEPL;
function parseFiles() {

  Papa.parse('/assets/data/bertinMLS.csv', {
    download: true,
    header: true,
    complete: function(results) {
      bertinMLS = results;
      loadSelect(bertinMLS, 'defendingTeamName', 'bertinMLSTeamAgainst');
      loadSelect(bertinMLS, 'shootingTeamName', 'bertinMLSTeamFor');
      loadSelect(bertinMLS, 'name', 'bertinMLSPlayers');
    }
  });
  Papa.parse('/assets/data/bertinEPL.csv', {
    download: true,
    header: true,
    complete: function(results) {
      bertinEPL = results;
      loadSelect(bertinEPL, 'defendingTeamName', 'bertinEPLTeamAgainst');
      loadSelect(bertinEPL, 'shootingTeamName', 'bertinEPLTeamFor');
      loadSelect(bertinEPL, 'name', 'bertinEPLPlayers');
    }
  });
  Papa.parse('/assets/data/rileyEPL.csv', {
    download: true,
    header: true,
    complete: function(results) {
      rileyEPL = results;
      loadSelect(rileyEPL, 'Team Against', 'rileyEPLTeamAgainst');
      loadSelect(rileyEPL, 'Team For', 'rileyEPLTeamFor');
      loadSelect(rileyEPL, 'Player', 'rileyEPLPlayers');
    }
  });
};

function loadSelect(parsed, variable, id) {

  var options = d3.map(parsed.data, function(d){return d[variable];}).keys();
  options.sort();
  for (var i=0; i< options.length; i++) {
    var select = document.getElementById(id);
    var opt = options[i];
    var el = document.createElement("option");
    el.textContent = opt;
    el.value = opt;
    select.appendChild(el);
  }
}

function selectOption(sel) {
  var value = sel.value;
  var id = sel.id;
  switch (id) {
    case 'bertinMLSTeamFor':
    shotData(bertinMLS, 'shootingTeamName', value, 'bertin', ' Goals For');
    break;
    case 'bertinMLSTeamAgainst':
    shotData(bertinMLS, 'defendingTeamName', value, 'bertin', ' Goals Against');
    break;
    case 'bertinMLSPlayers':
    shotData(bertinMLS, 'name', value, 'bertin', ' Goals');
    break;
    case 'bertinEPLTeamFor':
    shotData(bertinEPL, 'shootingTeamName', value, 'bertin', ' Goals For');
    break;
    case 'bertinEPLTeamAgainst':
    shotData(bertinEPL, 'defendingTeamName', value, 'bertin', ' Goals Against');
    break;
    case 'bertinEPLPlayers':
    shotData(bertinEPL, 'name', value, 'bertin', ' Goals');
    break;
    case 'rileyEPLTeamFor':
    shotData(rileyEPL, 'Team For', value, 'riley', ' Goals For');
    break;
    case 'rileyEPLTeamAgainst':
    shotData(rileyEPL, 'Team Against', value, 'riley', ' Goals Against');
    break;
    case 'rileyEPLPlayers':
    shotData(rileyEPL, 'Player', value, 'riley', ' Goals');
    break;
    default:
    break;
  }
  document.getElementById("shareURLlink").href = getShareURL();
  document.getElementById("shareURLlink").hidden = false;
}

function shotData(parsed, variable, value, author, modifier){
  var goals = 0;
  var chances = "";
  for(var i=0;i<parsed.data.length;i++){
    if (parsed.data[i][variable] == value){
      switch (author) {
        case 'bertin':
        chances = chances + Math.round(parsed.data[i]["expG"] * 10000) / 10000 + ","
        goals = (parsed.data[i]["is.goal"] == "TRUE") ? goals + 1 : goals;
        break;
        case 'riley':
        chances = chances + Math.round(parsed.data[i]["ExpG"] * 10000) / 10000 + ","
        goals = (parsed.data[i]["Outcome"] == "Goal") ? goals + 1 : goals;
        break;
        default:
        break;
      }
    }
  }
  document.getElementById("name").innerHTML = value + modifier;
  document.getElementById("chances").value = chances;
  document.getElementById("goals").value = goals;
}

function getShareURL() {
  var origin = document.location['origin'];
  var name = document.getElementById('name').innerHTML;
  var chances = document.getElementById('chances').value;
  var goals = document.getElementById('goals').value;

  encode = chances.replace(/([0]\.)/g,'.').replace(/\s/g,'') + '|' + goals.replace(/ /g,'');
  compressed = LZString.compressToEncodedURIComponent(encode);

  var share = "?share=" + compressed + "&name=" + name;

  return origin + "/expected_season_goals.html" + share;
}
