// hover touch stuff
var socket = io('http://localhost:3000');

var hoverState = 0;
var lastHoverState = 0;

var userHover = true;

//Handle hover/swipe events
// var hoverEvent = {};
// extend(hoverEvent , EventEmitter);


var touchX = 0;
var touchY = 0;
var lastX = -Math.PI;
var lastY = -Math.PI;

var xStart = 0;
var yStart = 0;

var xSwipeThresh = 200;
var ySwipeThresh = 200;
var swipeMaxTime = 1000; //ms
var swipeMinTime = 100; //ms

var swipeStartTime = new Date();


var xTouchThresh = 20;
var yTouchThresh = 20;
var touchTime = 100; //ms



var dispatchTouchEvent = function(type, x, y) {


	if (type=="touchstart") {
		
		xStart = x;
		yStart = y;
		
		swipeStartTime = new Date();

		// console.log("touchstart", x, y);

	} else if (type=="touchend") {

		//touch ended, we need lastX and lastY
		// console.log("touchend", lastX, lastY);

		var dT = new Date() - swipeStartTime;

		var dX = lastX - xStart;
		var speedX = dX / dT;

		var dY = lastY - yStart;
		var speedY = dY / dT;

		if (Math.abs(dX) > Math.abs(dY)) {
			if(Math.abs(dX) > xSwipeThresh && dT < swipeMaxTime) {
				if(dX < 0) {
					console.log("swipe right");
				} else if (dX > 0) {
					console.log("swipe left");
				}
			};
		} else {
			if(Math.abs(dY) > ySwipeThresh && dT < swipeMaxTime) {
				if(dY < 0) {
					console.log("swipe up");
				} else if (dY > 0) {
					console.log("swipe down");
				}
			};
		}


		

	} else {
		//touchmoving
		//record last x and y
		lastX = x;
		lastY = y;
	}



}


socket.on('port data', function(msg) {
  	lastHoverState = hoverState;

    hoverState = parseInt(msg.s);

    //if we were touching and no longer touching
    if(lastHoverState == 1 && hoverState!= 1) {
    	dispatchTouchEvent("touchend", parseInt(msg.x), parseInt(msg.y));
    }

    if(hoverState == 5) { 
    // Hovering
    } else if(hoverState == 1) { 
    // Touching
    		//already touching, touchmove
        if (lastHoverState == 1) {
        	dispatchTouchEvent("touchmove", parseInt(msg.x), parseInt(msg.y));
        } else {
        	dispatchTouchEvent("touchstart", parseInt(msg.x), parseInt(msg.y));
        }
    }
});


