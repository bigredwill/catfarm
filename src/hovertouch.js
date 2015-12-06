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

var touchTime = 100; //ms

var xStart = 0;
var yStart = 0;

var xSwipeThresh = 200;
var ySwipeThresh = 200;
var swipeMaxTime = 200; //ms

var xTouchThresh = 20;
var yTouchThresh = 20;

var swipeStartTime = new Date();


var dispatchTouchEvent = function(type, x, y) {


	if (type=="touchstart") {
		
		xStart = x;
		yStart = y;
		
		swipeStartTime = new Date();

		// console.log("touchstart", x, y);

	} else if (type=="touchend") {

		panStop();

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
					viewInput("RIGHT");
					console.log("swipe right");
				} else if (dX > 0) {
					viewInput("LEFT");
					console.log("swipe left");
				}
			};
		} else {
			if(Math.abs(dY) > ySwipeThresh && dT < swipeMaxTime) {
				if(dY < 0) {
					viewInput("UP");
					console.log("swipe up");
				} else if (dY > 0) {
					viewInput("DOWN");
					console.log("swipe down");
				}
			};
		}

	} else {
		//touchmoving
		//record last x and y
		lastX = x;
		lastY = y;

		var dT = new Date() - swipeStartTime;

		//If too long for swipe, then pan
		if (dT > swipeMaxTime) {
			var maxX = 1100,
					maxY = 1900,
					hX = maxX/2, //half x
					hY = maxY/2; //half y

			var dX, dY;

			if (x < hX) {
				dX = 1 - (x/hX);
			} else {
				dX = -1 * (((x-hX)/hX));
			}

			if (y < hY) {
				dY = 1 - (y/hY);
			} else {
				dY = -1 * (((y-hY)/hY));
			}
		
			panner(dX, dY);
			// console.log("pan ",dX, dY);
			// console.log(x, y);
		}



	}

}

var hoverXMax = 1100;
var hoverYMax = 1900;

var xMid = hoverXMax/2;
var yMid = hoverYMax/2;


var dispatchHoverEvent = function(x,y,z) {
	var position = {
		x: 0,
		y: 0
	};

	if (z < 150) {
		dispatchHoverEndEvent();
		return;
	}

	if (x < xMid){
		position.x = (xMid - x)/xMid;
	} else {
		position.x = -1*(x - xMid)/xMid;
	}

	if (y < yMid) {
		position.y = (yMid-y)/yMid;
	} else {
		position.y = -1*(y-yMid)/yMid;
	}


	console.log("hover ", position.x, position.y);

}

var dispatchHoverEndEvent = function() {
	console.log("Hover End");

	//return pan back to 0;
}

socket.on('port data', function(msg) {
  	lastHoverState = hoverState;

    hoverState = parseInt(msg.s);

    //if we were touching and no longer touching
    if(lastHoverState == 1 && hoverState!= 1) {
    	dispatchTouchEvent("touchend", parseInt(msg.x), parseInt(msg.y));
    }

    if (hoverState == 0) {
    	// dispatchHoverEndEvent("hoverEnd");
    };

    if(hoverState == 5) { 
    // Hovering

    	// dispatchHoverEvent("hover", parseInt(msg.x), parseInt(msg.y), parseInt(msg.z));

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


