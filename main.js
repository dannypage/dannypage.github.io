// For chaining the demo:
// http://www.thecodeship.com/web-development/alternative-to-javascript-evil-setinterval/
function interval(func, wait, times){
    var interv = function(w, t){
        return function(){
            if(typeof t === "undefined" || t-- > 0){
                setTimeout(interv, w);
                try{
                    func.call(null);
                }
                catch(e){
                    t = 0;
                    throw e.toString();
                }
            }
        };
    }(wait, times);

    setTimeout(interv, wait);
};

var mainState = {
    preload: function() {
    // Load all of the images
        game.load.image('small', './assets/towers-of-hanoi/blueHigh2.png');
        game.load.image('medium', './assets/towers-of-hanoi/blueHigh4.png');
        game.load.image('large', './assets/towers-of-hanoi/blueHigh6.png');
        game.load.image('red', './assets/towers-of-hanoi/red6.png');
        game.load.image('reload', './assets/towers-of-hanoi/return.png')
        game.stage.backgroundColor = '#7FDBFF';
    },
    create: function() {
    // This function is called after the preload function
    // Here we set up the game, display sprites, input, etc.
        count = 0;
        selected = null;  //Disk Selected
        moving = false;   //Disk Is Freely Moving
        tweening = false; //Disk is being animated
        fresh = true;     //No moves made yet
        demoing = false;  //Enabled whenever the demo takes over.

        landscape.createRedBlocks();
        landscape.createDisks();
        landscape.demoButton();
        landscape.reloadButton();

        landscape.arrowKeys();
    },
    update: function() {
    // This function is called 60 times per second
        if (small.column == 2 && medium.column == 2 && large.column == 2 && !moving) {
            var text = game.add.text(game.world.centerX, 200, "Congrats! You win!", { font: "65px Arial", fill: "#ffffff", align: "center" });
            text.anchor.set(0.5);
            moving = true;
            demoing = false;
            actions.unselect();
            landscape.reloadButton();
            small.inputEnabled = false;
            medium.inputEnabled = false;
            large.inputEnabled = false;
        }
    },
};
var actions = {
    moveDisk: function(direction, player) {
        if (player && demoing) {
            // We don't want the player to interrupt the demo.
            return;
        }
        if (selected != null && !tweening ) {
            if (direction == 'left' && selected.level == 3 && selected.column !=0) {
                selected.column -= 1;
                landscape.tweenX();
            } else if (direction == 'right' && selected.level == 3 && selected.column !=2) {
                selected.column += 1;
                landscape.tweenX();
            } else if (direction == 'up' && landscape.checkUp() && !moving) {
                if (fresh) {
                    fresh = false; // Up is always our first real move, let's put it in player's hands.
                    demo.destroy();
                    drawnObject.destroy();
                }
                moving = true;
                selected.level = 3;
                landscape.tweenY();
            } else if (direction == 'down' && landscape.checkDown() && moving) {
                moving = false;
                landscape.tweenY();
            }
        }
    },
    select: function(disk) {
        // Don't want to leave a disk literally hanging around.
        if (!moving && !tweening) {
            if (selected != null){
                selected.tint = 0xffffff;
            }
            selected = disk;
            selected.tint = 0xbbbbbb;
        }
    },
    unselect: function() {
        if (selected != null) {
            selected.tint = 0xffffff;
            selected = null;
        }
    },
    restart: function() {
        game.state.start('main');
    },
    demo: function() {
        demoing = true;
        reload.destroy();

        //This string contains the most efficient solution to the ToH problem
        actions.auto_sequence("surrdmurdsufdlurrdsufdmurdsurrd");
    },
    hint: function() {
        //Implentation of the Hamiltonian Cycle Triangle
        if (!demoing){
            //Don't let multiple actions queue up until it's done.
            demoing = true;
            var currentState = ""
            for (var i = 0; i<3;i++){
                currentState += diskArray[i].column;
            }
            console.log("Old State");
            var aToC = ['000','200','210','010','110','112','212','012','022','222'];
            var bToC = ['111','211','201','101','001','002','202','102','122','222'];
            var aToB = ['000','100','120','020','220','221','121','021','011','111'];
            var legFast = aToC.indexOf(currentState);
            var legMedium = bToC.indexOf(currentState);
            var legSlow = aToB.indexOf(currentState);

            //Find out which edge of the Triangle we are on
            if (legFast > -1) {
                var nextState = aToC[legFast+1];
            } else if (legMedium > -1) {
                var nextState = bToC[legMedium+1];
            } else if (legSlow > -1) {
                var nextState = aToB[legSlow+1];
            } else {
                alert("Invalid State.");
                return;
            }
            console.log("New state");
            //Find the moved Disk
            for (var i=0; i<3; i++){
                if (currentState[i] != nextState[i]) {
                    var disk = i;
                    break;
                }
            }
            // Grab top of stack in currentState Column
            actions.select(diskArray[disk]);
            // Move to nextState Column
            if (currentState[disk] == 0 && nextState[disk] == 1) {
                actions.auto_sequence('urdk');
            } else if (currentState[disk] == 0 && nextState[disk] == 2) {
                actions.auto_sequence('urrdk');
            } else if (currentState[disk] == 2 && nextState[disk] == 1) {
                actions.auto_sequence('ufdk');
            } else if (currentState[disk] == 2 && nextState[disk] == 0) {
                actions.auto_sequence('uffdk');
            } else if (currentState[disk] == 1 && nextState[disk] == 0) {
                actions.auto_sequence('ufdk');
            } else if (currentState[disk] == 1 && nextState[disk] == 2) {
                actions.auto_sequence('urdk');
            } else {
                actions.auto_sequence('k');
            }
        }
    },
    unlock: function() {
        demoing = false;
    },
    auto_sequence: function(command_string) {
        //We iterate over commands, step by step, and act out the solution
        count = 0;
        interval(function(){
            actions.auto_move(command_string[count]);
            count++;
        }, 300, command_string.length);
    },
    auto_move: function(command) {
        switch(command){
            case 's':
                actions.select(small);
                break;
            case 'm':
                actions.select(medium);
                break;
            case 'l':
                actions.select(large);
                break;
            case 'u':
                actions.moveDisk('up', false);
                break;
            case 'r':
                actions.moveDisk('right', false);
                break;
            case 'f':
                actions.moveDisk('left', false);
                break;
            case 'd':
                actions.moveDisk('down', false);
                break;
            case 'k':
                actions.unlock();
                break;
        }
    }
};

var landscape = {
    createRedBlocks: function () {
        red1 = game.add.sprite(225, 525, 'red');
        red2 = game.add.sprite(625, 525, 'red');
        red3 = game.add.sprite(1025, 525, 'red');
        red1.anchor.setTo(0.5);
        red2.anchor.setTo(0.5);
        red3.anchor.setTo(0.5);
    },
    createDisks: function () {
        large = game.add.sprite(225, 447, 'large');
        medium = game.add.sprite(225, 337, 'medium');
        small = game.add.sprite(225, 227, 'small');
        diskArray = [small, medium, large];
        landscape.assign_values(large,0);
        landscape.assign_values(medium,1);
        landscape.assign_values(small,2);
    },
    assign_values: function (disk, level) {
        disk.anchor.setTo(0.5);
        disk.inputEnabled = true;
        disk.level = level;
        disk.column = 0;

        disk.events.onInputDown.add(actions.select, this);

        disk.input.useHandCursor = true;
    },
    demoButton: function() {
        bmd = game.add.bitmapData(175, 75);

        bmd.ctx.beginPath();
        bmd.ctx.rect(0, 0, 175, 75);
        bmd.ctx.fillStyle = '#0088ff';
        bmd.ctx.fill();
        drawnObject = game.add.sprite(1050, 25, bmd);
        drawnObject.inputEnabled = true;
        drawnObject.input.useHandCursor = true;

        demo = game.add.text(1050, 25, "Demo", { font: "65px Arial", fill: "#ffffff", align: "center" });
        drawnObject.events.onInputDown.add(actions.demo, this);
    },
    reloadButton: function() {
        reload = game.add.sprite(0, 0, 'reload');
        reload.inputEnabled = true;
        reload.input.useHandCursor = true;
        reload.events.onInputDown.add(actions.restart, this);
    },
    arrowKeys: function() {
        game.input.keyboard.addKey(Phaser.Keyboard.UP).onDown.add(function () { actions.moveDisk('up', true); }, this);
        game.input.keyboard.addKey(Phaser.Keyboard.DOWN).onDown.add(function () { actions.moveDisk('down', true); }, this);
        game.input.keyboard.addKey(Phaser.Keyboard.LEFT).onDown.add(function () { actions.moveDisk('left', true); }, this);
        game.input.keyboard.addKey(Phaser.Keyboard.RIGHT).onDown.add(function () { actions.moveDisk('right', true); }, this);
        game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR).onDown.add(function() {actions.hint()});
    },
    tweenX: function() {
        var tween = game.add.tween(selected)
        tweening = true;
        tween.to({x: landscape.mapX(selected.column)}, 100);
        tween.start();
        tween.onComplete.add( function() {
            tweening = false;
        })
    },
    mapX: function(column) {
        switch(column) {
            case 0:
                return 225;
            case 1:
                return 625;
            case 2:
                return 1025;
        }
    },
    tweenY: function(){
        var tween = game.add.tween(selected)
        tweening = true;
        tween.to({y: landscape.mapY(selected.level)}, 100);
        tween.start();
        tween.onComplete.add( function() {
            tweening = false;
        })
    },
    mapY: function(level) {
        // The blocks, minus pegs & lip, are 113 px tall. Orange lip is 3 px.
        // The offsets were 450/350/250, but didn't look right. Now lined up.
        switch(level) {
            case 0:
                return 447;
            case 1:
                return 337;
            case 2:
                return 227;
            case 3:
                return 100;
        }
    },

    checkUp: function() {
        // Check for any blocks above the selected block.
        // Checks all of the other blocks to make sure nothing is above it.
        if (small.column == selected.column && small.level > selected.level) {
            return false;
        } else if (medium.column == selected.column && medium.level > selected.level) {
            return false;
        } else if (large.column == selected.column && large.level > selected.level) {
            return false;
        } else {
            return true;
        }
    },

    checkDown: function() {
        // Find the proper landing spot for the disk.
        // If the disks below it are smaller, don't allow the drop.
        if (selected.key == "small") {
            if (selected.column == medium.column) {
                selected.level = medium.level + 1;
            } else if (selected.column == large.column) {
                selected.level = large.level + 1;
            } else {
                selected.level = 0;
            }
            return true;
        } else if (selected.key == "medium") {
            if (selected.column == small.column) {
                return false;
            } else if (selected.column == large.column) {
                selected.level = large.level + 1;
            } else {
                selected.level = 0;
            }
            return true;
        } else if (selected.key == "large") {
            if (selected.column == small.column) {
                return false;
            } else if ( selected.column == medium.column ) {
                return false;
            } else {
                selected.level = 0;
            }
            return true;
        }
    }
}

var game = new Phaser.Game(1250, 600, Phaser.AUTO, 'gameDiv');
game.state.add('main', mainState);
game.state.start('main');
