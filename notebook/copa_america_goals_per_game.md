---
title: "Copa America 2016 - Goals Tracker"
author: "Danny Page"
created: "Tue Jun 07 2016 23:24:06 GMT-0400 (EDT)"
original:
    title: "Blank Kajero notebook"
    url: "http://www.joelotter.com/kajero/blank"
show_footer: false
---

## ~~Is Copa America 2016 goal draught historical?~~

I started writing this after Mexico's win over Uruguay was the only game to have more than 2 goals, and the goals per game average sat at 1.33 after 6 games.

Well... It's up to 2.0 GPG after 9.5 games and Colombia still might drop a few more on Paraguay as a type this.

Anyway, I'll keep updating this through the group stage. Might be interesting to see how this tournament stacks up to other recent tournaments involving CONCACAF and CONMEBOL men's senior teams.

```javascript; auto
// Matches In Order of when they were played via http://www.oddsportal.com/soccer/world/
worldCup2010 = [2,0,2,1,2,1,1,4,2,1,2,2,0,3,1,1,3,5,3,2,1,4,0,1,2,3,2,2,4,7,1,2,1,3,4,2,1,1,1,3,5,0,4,3,0,3,0,3];
worldCup2014 = [4,1,6,4,3,4,3,3,3,3,3,4,0,3,3,0,2,5,2,4,3,3,0,1,7,3,1,4,1,1,6,4,2,3,4,5,1,0,5,3,5,4,3,0,1,3,1,2];
goldCup2011 = [5,5,4,0,5,2,2,5,2,8,1,3,7,5,4,1,2,1];
goldCup2013 = [1,3,4,2,3,7,1,2,2,1,5,1,0,4,1,2,4,1];
goldCup2015 = [2,3,4,0,4,6,2,1,1,2,2,0,1,2,1,0,1,8];
copa2011    = [2,1,0,0,1,3,0,2,2,1,4,1,2,3,1,1,6,6];
copa2015    = [2,0,1,4,1,3,5,6,1,1,1,1,3,5,2,1,0,3];
copa2016    = [2,0,1,0,1,4,3,3,4,2];

plotlyTrace = function(tournament, name){
  // The graphing library likes hashes
  // We also need to calculate the tournament's GPG at each match.
  var goalsPerGame = 0;
  gpg_array = [];
  matchday = [];
  for(var i = 0; i<tournament.length; i++){
    goalsPerGame += tournament[i]
    gpg_array.push(goalsPerGame/(i+1));
    matchday.push(i+1);
  }
  return {
    x: matchday,
    y: gpg_array,
    name: name
  }
}

graphing_data = [];

//graphing_data.push(plotlyTrace(worldCup2010, "World Cup 2010"));
//graphing_data.push(plotlyTrace(worldCup2014, "World Cup 2014"));
graphing_data.push(plotlyTrace(goldCup2011, "Gold Cup 2011"));
graphing_data.push(plotlyTrace(goldCup2013, "Gold Cup 2013"));
graphing_data.push(plotlyTrace(goldCup2015, "Gold Cup 2015"));
graphing_data.push(plotlyTrace(copa2011, "Copa 2011"));
graphing_data.push(plotlyTrace(copa2015, "Copa 2015"));
graphing_data.push(plotlyTrace(copa2016, "Copa 2016"));

return graphing_data;
```

Now that the data is processed and loaded, we'll graph it.

```javascript; runnable
var layout = {
  title:'Group Stage Running Goals Per Game ',
  xaxis: {
    title: "Match Game"
  },
  yaxis: {
    title: "Goals Per Game"
  }
};

Plotly.newPlot('graph', graphing_data, layout);

return "See below!"
```

[Danny Page](https://twitter.com/dannypage)