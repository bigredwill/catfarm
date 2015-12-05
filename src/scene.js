
var OBJMTLLoader = new THREE.OBJMTLLoader();
var TextureLoader = new THREE.TextureLoader();


function createScene(scene, camera, realScene, looper) {

	var car;

	var ambient = new THREE.AmbientLight( 0x222233 );
	scene.add( ambient );

	var directionalLight = new THREE.DirectionalLight( 0xffccff );
	directionalLight.position.set( 0, 0, 1.5 ).normalize();
	realScene.add( directionalLight );

	new Promise(function(resolve, reject) {

		/* Load the car model! */
		OBJMTLLoader.load( './models/mustang impala.obj', './models/mustang impala.mtl', function ( object ) {

			object.scale.set(0.25, 1, 0.25)
			object.position.z = -0.1;
			object.position.y = 13;
			object.position.x = 13;

			object.rotation.x = Math.PI/2;

			scene.add( object );
			console.log("hey");

			car = object;

			resolve();

		} );


	}).then(function() {
		return new Promise(function(resolve, reject) {

			TextureLoader.load(
				// resource URL
				'models/parkinglot.jpg',
				// Function when resource is loaded
				function ( texture ) {
					resolve(texture);
				}
			);

		})
	}).then(function(texture) {
		return new Promise(function(resolve, reject) {

			TextureLoader.load(
				// resource URL
				'models/11730-normal.jpg',
				// Function when resource is loaded
				function ( normal ) {
					// do something with the texture
					var material = new THREE.MeshPhongMaterial( {
						map: texture,
						normalMap: normal,
						shininess: 60,
						// specular: 0x333333,
						emissive: 0x222222,
					 } );

					var road = new THREE.Mesh(
						new THREE.PlaneGeometry(80, 80),
						material
					);
					road.position.z = 0;

					scene.add(road);

					resolve();
				}
			);

		});
	}).then(function() {
		console.log(car);
	}).then(function() {

	    // Generate A Cube
	    // var boxGeometry = new THREE.BoxGeometry(3, 3, 3);
	    // var greenMaterial = new THREE.MeshBasicMaterial( { color: 0xff00ff } );
	    // var cube = new THREE.Mesh(boxGeometry, greenMaterial);

	    // Add The Cube To The Scene
	    // scene.add(cube);

	/*****/

		// setInterval(function() {
		// 	cube.rotation.x += 0.01;
		// 	cube.rotation.y += 0.05;
		// }, 0)

		var keysDown = {}

		window.addEventListener("keydown", function(event) {
			keysDown[String.fromCharCode(event.keyCode)] = true;
		});

		window.addEventListener("keyup", function(event) {
			keysDown[String.fromCharCode(event.keyCode)] = false;
		});

		var carLocation = new THREE.Vector2(car.position.x, car.position.y);
		var carHeading = 0.0;
		var carSpeed = 10.0;
		var steerAngle = Math.PI/7;
		var wheelBase = 7.0; // the distance between the two axles

		var time = (new Date()).getTime()/1000;
		var oldTime = time;
		var delta = 0;
		looper(function() {
			oldTime = time;
			time = (new Date()).getTime()/1000;
			var delta = (time - oldTime);

			if (keysDown["T"]) {
				carSpeed += 100 * delta;

				if (carSpeed > 30) {
					carSpeed = 30;
				}
					
			}

			if (keysDown["G"]) {
				carSpeed -= 100 * delta;

				if (carSpeed < -30) {
					carSpeed = -30;
				}

			}

			if (!keysDown["G"] && !keysDown["T"]) {
				if (carSpeed != 0) {
					var sign = carSpeed / Math.abs(carSpeed);
					carSpeed -= sign * 100 * delta;
					var sign2 = carSpeed / Math.abs(carSpeed);
					if (sign2 != sign) {
						carSpeed = 0;
					}
				}
			}

			if (keysDown["F"]) {
				steerAngle += 10 * delta;

				if (steerAngle > Math.PI/7) {
					steerAngle = Math.PI/7;
				}
					
			}

			if (keysDown["H"]) {
				steerAngle -= 10 * delta;

				if (steerAngle < -Math.PI/7) {
					steerAngle = -Math.PI/7;
				}

			}

			if (!keysDown["H"] && !keysDown["F"]) {
				if (steerAngle != 0) {
					var sign = steerAngle / Math.abs(steerAngle);
					steerAngle -= sign * 50 * delta;
					var sign2 = steerAngle / Math.abs(steerAngle);
					if (sign2 != sign) {
						steerAngle = 0;
					}
				}
			}

			var frontWheel = carLocation.clone()
				.add(new THREE.Vector2(Math.cos(carHeading) * wheelBase/2 , Math.sin(carHeading) * wheelBase/2))
				.add((new THREE.Vector2(Math.cos(carHeading + steerAngle), Math.sin(carHeading + steerAngle))).multiplyScalar(carSpeed * delta));

			var backWheel = carLocation.clone()
				.sub(new THREE.Vector2( Math.cos(carHeading) * wheelBase/2 , Math.sin(carHeading) * wheelBase/2))
				.add((new THREE.Vector2(Math.cos(carHeading), Math.sin(carHeading))).multiplyScalar(carSpeed * delta));

			carLocation.copy(frontWheel).add(backWheel).divideScalar(2);
			carHeading = Math.atan2( frontWheel.y - backWheel.y , frontWheel.x - backWheel.x );

			car.position.x = carLocation.x;
			car.position.y = carLocation.y;
			car.rotation.y = carHeading + Math.PI/2 + Math.PI;

			var camPos = new THREE.Vector2(camera.position.x, camera.position.y);
			camPos.lerp(new THREE.Vector2(car.position.x, car.position.y), 0.25);

			var camRot = new THREE.Quaternion();
			var camTo = new THREE.Quaternion();
			var camFinal = new THREE.Euler();
			camRot.setFromEuler(new THREE.Euler(camera.rotation.z, 0, 0));
			camTo.setFromEuler(new THREE.Euler(car.rotation.y, 0, 0));
			camRot.slerp(camTo, 0.08);
			camFinal.setFromQuaternion(camRot);

			camera.position.x = camPos.x;
			camera.position.y = camPos.y;
			camera.rotation.z = camFinal.x;
			// camera.rotation.x = Math.PI/4;

		});

	});


}
