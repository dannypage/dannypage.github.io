var mainState = {
    preload: function() {
    // Load all of the images
        game.load.image('background', '../../assets/lineup/spirit.jpg');
        game.load.image('home', '../../assets/lineup/Washington_Spirit_logo.png');
        game.load.image('away', '../../assets/lineup/boston_breakers.png');
        game.stage.backgroundColor = '#7FDBFF';
    },
    create: function() {
        pitch = game.add.sprite(0, 0, 'background');
        pitch.scale.setTo(1.35, 1.35);

        drawing.draw_titlebar();
        drawing.draw_lineup();
        titlebarGroup = game.add.group();
        lineupGroup = game.add.group();
        drawing.text_titlebar();
        drawing.text_lineup();

        home = game.add.sprite(5, 15, 'home');
        home.scale.setTo(0.85, 0.85);
        away = game.add.sprite(670, 15, 'away');
        away.scale.setTo(0.3, 0.35);
        cursor = game.input.keyboard.createCursorKeys();
    },
    update: function() {

    },
};

var drawing = {
    draw_titlebar: function(    ) {
        var bmd = game.add.bitmapData(800, 100);
        bmd.ctx.beginPath();
        bmd.ctx.rect(0, 0, 800, 100);
        bmd.ctx.fillStyle = '#191970';
        bmd.ctx.fill();
        titlebar = game.add.sprite(0, 25, bmd);
    },
    draw_lineup: function() {
        var bmd = game.add.bitmapData(600, 425);
        bmd.ctx.beginPath();
        bmd.ctx.rect(0, 0, 600, 425);
        bmd.ctx.fillStyle = '#BB0000';
        bmd.ctx.fill();
        lineup = game.add.sprite(400, 360, bmd);
        lineup.alpha = 0.5;
        lineup.anchor.setTo(0.5, 0.5);
    },
    text_titlebar:function() {
        var posX = 400
        titlebar_array = ['Washington Spirit VS Boston Breakers', 'June 6th, 2015 - 7:00 PM'];
        for (var i = 0; i < titlebar_array.length; i++)
        {
            titlebarGroup.add(game.make.text(posX, 35 + i * 40, titlebar_array[i], { font: "32px Tahoma, Geneva, sans-serif", fill: '#ffffff' }));
        }
        for (var i = 0, len = titlebarGroup.children.length; i < len; i++) {
            titlebarGroup.children[i].x = posX - (titlebarGroup.children[i].width * 0.5);
        }
    },
    text_lineup:function() {
        var posX = 400
        lineup_array = ['Spirit Starting XI', 'Amanda\nDA COSTA', 'Christine\nNAIRN', 'Crystal\nDUNN', 'Joanna\nLOHMAN', 'Laura\ndel RIO', 'Angela\nSALEM', 'Katherine\nREYNOLDS', 'Estelle\nJOHNSON', 'Megan\nOYSTER', 'Whitney\nCHURCH', 'Kelsey\nWYS'];
        lineupGroup.add(game.make.text(posX, 150, lineup_array[0], { font: "bold 32pt Lucida Sans Unicode, Lucida Grande, sans-serif", fill: '#ffffff' }));
        lineupGroup.children[0].x = posX - (lineupGroup.children[0].width * 0.5);
        lineupGroup.children[0].setShadow(3, 3, 'rgba(0,0,0,0.1)', 0);
        for (var i = 1; i < lineup_array.length; i++)
        {
            lineupGroup.add(game.make.text(posX, 180 + i * 32, lineup_array[i], { font: "20pt Lucida Sans Unicode, Lucida Grande, sans-serif", fill: '#ffffff', align: 'center' }));
        }
        for (var i = 1, len = lineupGroup.children.length; i < len; i++) {
            lineupGroup.children[i].x = posX - (lineupGroup.children[i].width * 0.5);
            lineupGroup.children[i].setShadow(3, 3, 'rgba(0,0,0,0.1)', 0);
            lineupGroup.children[i].inputEnabled = true;
            lineupGroup.children[i].input.useHandCursor = true;
            lineupGroup.children[i].input.enableDrag(false, true);
            lineupGroup.children[i].lineSpacing = -10;
            lineupGroup.children[i].anchor.setTo(0.5,0.5);
        }
    },
    cleanup: function(round) {
        for (var i = 1, len = lineupGroup.children.length; i < len; i++) {
            if (round <= 0) { round = 10; }

            x = lineupGroup.children[i].x / round;
            lineupGroup.children[i].x = Math.round(x) * round;
            y = lineupGroup.children[i].y / round;
            lineupGroup.children[i].y = Math.round(y) * round;
        }
    }
};

var game = new Phaser.Game(800, 600, Phaser.AUTO, 'gameDiv');
game.state.add('main', mainState);
game.state.start('main');
