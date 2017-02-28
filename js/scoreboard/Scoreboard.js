/*
---
name: Scoreboard.js
description: Easy Scoreboards with notifications.

license: MIT-style

authors:
  - Tobias Bleckert

requires:
  - Core/1.4.5

provides: [Scoreboard]
...
*/

(function () {

	'use strict';
	
	window.Scoreboard = new Class({
	
		Implements: [Options, Events],
		
		options: {
			element:         'scoreboard',    // ID of main element
			position:        'topCenter',     // Position of the scoreboard to it's relative parent
			autoStart:       false,           // Auto start time or not
			homeTeamLogo:    null,            // logo image src
			awayTeamLogo:    null,            // logo image src
			homeTeamName:    'Home',          // home team full name
			awayTeamName:    'Away',          // away team full name
			homeTeamShort:   null,            // three letter name. If null three first letters of the name will be used
			awayTeamShort:   null,            // three letter name. If null three first letters of the name will be used
			homeTeamGoals:   0,               // home team goals
			awayTeamGoals:   0,               // away team goals
			secondLength:    1000,            // second length in ms
			timeDirection:   'up',            // countdown or normal
			time:            '00:00',         // start time
			animationSpeed:  300,             // animation speed
			duration:        3000,            // message life time
			leadingZero:     false            // leading zero on goals
		},
		
		initialize: function (options) {
			// Set options
			this.setOptions(options);
			
			// Create message element
			this.message = new Element('article', {
				'class': 'scoreboard-message',
				'id':    'scoreboard-message',
				styles: {
					opacity: 0
				}
			});
			
			// Filter array
			this.filters = [];
			
			// Add message to body
			this.message.inject($(document.body));
			
			// Create morph for the message
			this.messageMorph = new Fx.Morph(this.message, {
				duration: this.options.animationSpeed,
				'link': 'chain'
			});
			
			// Prepeare message queue
			this.messageQueue = [];
			
			// Set short names
			if (this.options.homeTeamShort === null) {
				this.options.homeTeamShort = String.shortName(this.options.homeTeamName);
			}
			
			if (this.options.awayTeamShort === null) {
				this.options.awayTeamShort = String.shortName(this.options.awayTeamName);
			}
			
			// Set main element
			this.element = document.id(this.options.element);
	
			// Set position of the scoreboard, build it and attach events
			this.setPosition().build().attach();
		},
		
		attach: function () {
			this.addEvent('change', function (what, value) {
				var element = this.getScoreboardElement(what),
				    type    = element.get('tag')[0];
				
				// Check if leading zero is enabled
				if (this.options.leadingZero) {
					if (what === 'homeTeamGoals' || what === 'awayTeamGoals') {
						if (value < 10) {
							value = '0' + value;
						}
					}
				}
				
				if (type === 'input') {
					element.set('value', value);
				} else {
					element.set('html', value);
				}
			});
		
			return this;
		},
		
		detach: function () {
			// Nothing to do here yet
			return this;
		},
		
		build: function () {
			var self = this;
			
			// Add tween to main element
			this.element.set('tween', {
				duration: this.options.animationSpeed
			});
			
			// Add values to listeners
			Object.each(this.options, function (value, key) {
				var element = self.getScoreboardElement(key),
				    type    = element.get('tag')[0];
				
				// Check if leading zero is enabled
				if (self.options.leadingZero) {
					if (key === 'homeTeamGoals' || key === 'awayTeamGoals') {
						if (value < 10) {
							value = '0' + value;
						}
					}
				}
				
				if (type === 'input') {
					element.set('value', value);
				} else {
					element.set('html', value);
				}
			});
			
			if (this.options.autoStart) {
				this.startTime();
			}
			
			return this;
		},
		
		setPosition: function () {
			// Position scoreboard
			if (this.options.position) {
				this['position' + this.options.position.capitalize()]();
			}
			
			return this;
		},
		
		positionTopLeft: function () {
			this.element.setStyles({
				position: 'absolute',
				top: '20px',
				left: '20px'
			});
		},
		
		positionTopCenter: function () {
			this.element.setStyles({
				position: 'absolute',
				top: '20px',
				left: '50%',
				marginLeft: - (this.element.getWidth() / 2)
			});
		},
		
		positionTopRight: function () {
			this.element.setStyles({
				position: 'absolute',
				top: '20px',
				right: '20px'
			});
		},
		
		positionBottomLeft: function () {
			this.element.setStyles({
				position: 'absolute',
				bottom: '20px',
				left: '20px'
			});
		},
		
		positionBottomCenter: function () {
			this.element.setStyles({
				position: 'absolute',
				bottom: '20px',
				left: '50%',
				marginLeft: - (this.element.getWidth() / 2)
			});
		},
		
		positionBottomRight: function () {
			this.element.setStyles({
				position: 'absolute',
				bottom: '20px',
				right: '20px'
			});
		},
		
		positionCenter: function () {
			this.element.setStyles({
				position: 'absolute',
				bottom: '50%',
				left: '50%',
				marginLeft: - (this.element.getWidth() / 2),
				marginTop: - (this.element.getHeight() / 2)
			});
		},
		
		show: function (animate) {
			if (animate) {
				this.element.tween('opacity', 1);
			} else {
				this.element.setStyles({
					opacity: 1
				});
			}
		},
		
		hide: function (animate) {
			if (animate) {
				this.element.tween('opacity', 0);
			} else {
				this.element.setStyles({
					opacity: 0
				});
			}
		},
		
		get: function (what) {
			return this.options[what];
		},
		
		set: function (what, value) {
			this.options[what] = value;
			
			this.fireEvent('change', [what, value]);
			return this;
		},
		
		setName: function (team, name, short) {
			short = short || String.shortName(name);
			
			if (team === 'home') {
				this.set('homeTeamName', name);
				this.set('homeTeamShort', short.toUpperCase());
			} else {
				this.set('awayTeamName', name);
				this.set('awayTeamShort', short.toUpperCase());
			}
			
			return this;
		},
		
		addGoal: function (team) {
			var goals;
			
			if (team === 'home') {
				goals = this.get('homeTeamGoals');
				goals += 1;
				
				// Apply filter
				goals = this.filter('addHomeTeamGoal', goals);
				
				this.set('homeTeamGoals', goals);
			} else if (team === 'away') {
				goals = this.get('awayTeamGoals');
				goals += 1;
				
				// Apply filter
				goals = this.filter('addAwayTeamGoal', goals);
				
				this.set('awayTeamGoals', goals);
			}
		
			this.fireEvent('onScored', team);
			return this;
		},
		
		removeGoal: function (team) {
			var goals;
			
			if (team === 'home') {
				goals = this.get('homeTeamGoals');
				goals -= 1;
				
				// Apply filter
				goals = this.filter('removeHomeTeamGoal', goals);
				
				if (goals >= 0) {
					this.set('homeTeamGoals', goals);
				}
			} else if (team === 'away') {
				goals = this.get('awayTeamGoals');
				goals -= 1;
				
				// Apply filter
				goals = this.filter('removeAwayTeamGoal', goals);
				
				if (goals >= 0) {
					this.set('awayTeamGoals', goals);
				}
			}
			
			this.fireEvent('onGoalRemoved', team);
			return this;
		},
		
		resetGoals: function (team) {
			if (team === 'home') {
				this.set('homeTeamGoals', 0);
			} else if (team === 'away') {
				this.set('awayTeamGoals', 0);
			}
			
			this.fireEvent('onGoalsReset', team);
			return this;
		},
		
		startTime: function () {
			var self = this; 
			
			clearInterval(this.timer);
		
			this.timer = setInterval(function () {
				self.increaseTime();
			}, Number.from(this.options.secondLength));
			
			this.fireEvent('onStartTime');
			return this;
		},
		
		stopTime: function () {
			clearInterval(this.timer);
		
			this.fireEvent('onStopTime');
			return this;
		},
		
		increaseTime: function () {
			var time = this.options.time,
			    seconds = Number.from(time.split(':')[1]),
			    minutes = Number.from(time.split(':')[0]);
					
			if (this.options.timeDirection === 'down') {
				seconds -= 1;
				
				if (seconds < 0 && minutes > 0) {
					seconds  = 59;
					minutes -= 1; 
				} else if (seconds > 0 && minutes === 0) {
					seconds -= 1;
				}
				
				if (seconds < 0) {
					seconds = 0;
				}
			} else {
				seconds += 1;
			
				if (seconds >= 60) {
					seconds = 0;
					minutes += 1;
				}
			}
			
			seconds = (seconds < 10) ? '0' + String.from(seconds) : String.from(seconds);
			minutes = (minutes < 10) ? '0' + String.from(minutes) : String.from(minutes);
			
			time = minutes + ':' + seconds;
			
			// Apply filter
			time = this.filter('increaseTime', time);
			
			this.set('time', time);
		
			this.fireEvent('onTimeIncreased');
			return this;
		},
		
		decreaseTime: function () {
			var time = this.options.time,
			    seconds = Number.from(time.split(':')[1]),
			    minutes = Number.from(time.split(':')[0]);
					
			if (seconds > 0 || minutes > 0) {
				seconds -= 1;
			}
			
			if (seconds < 0 && minutes > 0) {
				seconds = 59;
				minutes -= 1;
			}
			
			seconds = (seconds < 10) ? '0' + String.from(seconds) : String.from(seconds);
			minutes = (minutes < 10) ? '0' + String.from(minutes) : String.from(minutes);
			
			time = minutes + ':' + seconds;
			
			// Apply filter
			time = this.filter('decreaseTime', time);
			
			this.set('time', time);
			
			this.fireEvent('onTimeDecreased');
			return this;
		},
		
		resetTime: function () {
			this.set('time', '00:00');
			this.fireEvent('onTimeReset');
			
			return this;
		},
		
		getScoreboardElement: function (what) {
			return this.element.getElements('[data-scoreboard-bind="' + what + '"]');
		},
		
		showMessage: function (id, data, position) {
			position = position || 'bottomCenter';
			
			data.scoreboard = this.options;
			
			var template = document.id(id).get('html'),
					self     = this;
					
			if (this.message.hasClass('isShowing')) {
				this.messageQueue.push([id, data, position]);
			} else {
				this.message.set('styles', {
					bottom: '-20px',
					left: '50%',
					marginLeft: -(this.message.getWidth() / 2)
				}).set('html', this.tim(template, data)).addClass('isShowing');
				
				this.messageMorph.start({
					'opacity': [0, 1],
					'bottom':  [-20, 20]
				});
				
				setTimeout(function () {
					self.hideMessage();
				}, this.options.duration);
			}
		},
		
		hideMessage: function () {
			var self  = this,
			    nextMessage,
			    morph = new Fx.Morph(this.message, {
			    	duration: this.options.animationSpeed,
			    	onComplete: function () {
			    		self.message.removeClass('isShowing');
			    		if (self.messageQueue.length > 0) {
			    			nextMessage = self.messageQueue[0];
			    			self.showMessage(nextMessage[0], nextMessage[1], nextMessage[2]);

			    			self.messageQueue.shift();
			    		}
			    	}
			    });
			
			morph.start({
				'opacity': [1, 0],
				'bottom':  [20, -20]
			});
		},
		
		applyFilter: function (hook, func) {
			this.filters[hook] = func;
		},
		
		filter: function (filter, val) {
			if (this.filters.hasOwnProperty(filter) && typeof(this.filters[filter]) === 'function') {
				return this.filters[filter](val);
			}
			
			return val;
		},
		
		toJSON: function () {
			return JSON.stringify(this.options);
		},
		
		// https://github.com/premasagar/tim
		tim: function () {
			var e = /{{\s*([a-z0-9_][\\.a-z0-9_]*)\s*}}/gi;
			return function (f, g) {
				return f.replace(e, function (h, i) {
					for (var c = i.split("."), d = c.length, b = g, a = 0; a < d; a++) {
						b = b[c[a]];
						if (b === void 0) throw "tim: '" + c[a] + "' not found in " + h;
						if (a === d - 1) return b
					}
				})
			}
		}()
	
	});
	
	String.extend('shortName', function (name) {
		return name.slice(0, 3).toUpperCase();
	});
	
})();