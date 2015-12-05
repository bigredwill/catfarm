/* USB Serial I/O */
var serialport = require("serialport");
var SerialPort = serialport.SerialPort;

/* HTTP & Server Socket I/O */
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);


/* Auto-detect the USB serial port, and use it to get an instance of SerialPort */
serialport.list(function (err, ports) {
    ports.forEach(function (port) {
        var portName = port.comName;

        //if (portName.indexOf("cu.usbserial") != -1) {
        if (portName.indexOf("cu.usbmodem") != -1) {
            console.log("Auto-Detecting USB Port: "+portName);

            var sp = new SerialPort(portName, {
                baudrate: 2000000,
                parser: serialport.parsers.readline("\n")
            });

            sp.on('open', function() {
//                sp.write("frw 0 1\r\n");
                sp.on('data', function(data) {
                    //console.log(data);
                    handleTouchEvent(data);
                });
                
                setInterval(function() { //Poll physical device every 100ms
                    sp.write("ptouch_get\r\n");
                }, 10);
            });

            /* Hopefully we dont catch any of these, but just in case... */
            sp.on("error", function(err) {
                console.log("ERROR: "+err);
            });
        }
    });
});

var lastFrame = JSON.parse("{}");

function handleTouchEvent(data) {
    var jsonData = JSON.parse(data); //Parse the data into a proper JSON object

    if( JSON.stringify(jsonData) != JSON.stringify(lastFrame) ) {
        io.emit('port data', jsonData);
        console.log("Socket broadcast: " + JSON.stringify(jsonData));
        lastFrame = jsonData;
    }
}


http.listen(3000, function () {
    console.log('HTTP server Listening on *:3000');
});