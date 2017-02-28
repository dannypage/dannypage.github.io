var scoreboard = new Scoreboard({
  autoStart: true,
  homeTeamName: 'Juventus',
  awayTeamName: 'Barcelona',
  homeTeamLogo: 'http://scoreboardjs.onedev.se/demos/img/home_logo.png',
  awayTeamLogo: 'http://scoreboardjs.onedev.se/demos/img/away_logo.png',
  arena: 'Juventus Stadium',
  homeTeamGoals: 1,
  awayTeamGoals: 2,
  homeTeamShots: 14,
  awayTeamShots: 9,
  homeTeamPoss: '55%',
  awayTeamPoss: '45%',
  homeTeamSubs: '• •',
  awayTeamSubs: '• • •'
});

scoreboard.showMessage('statusMessage', {}, false);
