
var OBJMTLLoader = new THREE.OBJMTLLoader();
var TextureLoader = new THREE.TextureLoader();


function createScene(scene, camera, realScene, looper) {

	var car;

	// var ambient = new THREE.AmbientLight( 0x333333 );
	// scene.add( ambient );

	var directionalLight = new THREE.DirectionalLight( 0xffffff, 1.5 );
	directionalLight.position.set( 0, 0, 1.5 ).normalize();
	directionalLight.castShadow = true;

	directionalLight.shadowCameraNear = 1200;
	directionalLight.shadowCameraFar = 2500;
	directionalLight.shadowCameraFov = 50;

	directionalLight.shadowBias = 0.0001;

	directionalLight.shadowMapWidth = 2048;
	directionalLight.shadowMapHeight = 2048;

	scene.add( directionalLight );

	var light = new THREE.HemisphereLight( 0xffffff, 0x080820, 1 );
	scene.add(light);


	new Promise(function(resolve, reject) {

		/* Load the car model! */
		OBJMTLLoader.load( './models/mustang impala.obj', './models/mustang impala.mtl', function ( object ) {

			object.scale.set(0.25, 0.5, 0.25)
			object.position.z = -0.1;
			object.position.y = 13;
			object.position.x = 13;

			object.rotation.x = Math.PI/2;

			scene.add( object );
			console.log("hey");

			object.castShadow = true;
			object.receiveShadow = true;

			car = object;

			resolve();

		} );

	}).then(function() {

		/* Load the car model! */
		OBJMTLLoader.load( './models/mustang impala.obj', './models/mustang impala.mtl', function ( object ) {

			object.scale.set(0.25, 0.5, 0.25)
			object.position.z = -0.1;
			object.position.y = 23;
			object.position.x = 23;

			object.rotation.x = Math.PI/2;

			scene.add( object );
			console.log("hey");

			object.castShadow = true;
			object.receiveShadow = true;

			resolve();

		} );


	}).then(function() {
		return new Promise(function(resolve, reject) {

			TextureLoader.load(
				// resource URL
				'texture/parkinglot.png',
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
					var material = new THREE.MeshLambertMaterial( {
						map: texture,
						normalMap: normal,
						shininess: 0,
						specular: 0xAAAAAA,
						emissive: 0x555555,
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

			var cameraQuat = new THREE.Quaternion();
			cameraQuat.setFromEuler(new THREE.Euler(0, 0, car.rotation.y));

			if (keysDown["1"]) {
				var rotQuat = new THREE.Quaternion();
				rotQuat.setFromAxisAngle( new THREE.Vector3(1, 0, 0), Math.PI/3 );
				cameraQuat.multiply(rotQuat);
			}

			if (keysDown["2"]) {
				var rotQuat = new THREE.Quaternion();
				rotQuat.setFromAxisAngle( new THREE.Vector3(0, 0, 1), Math.PI );
				cameraQuat.multiply(rotQuat);
				rotQuat.setFromAxisAngle( new THREE.Vector3(1, 0, 0), Math.PI/3 );
				cameraQuat.multiply(rotQuat);
			}

			var camFinal = new THREE.Euler();
			camFinal.setFromQuaternion(cameraQuat);
			camera.rotation.copy(camFinal);


			// var cameraQuat = new THREE.Quaternion();
			// cameraQuat.setFromEuler(new THREE.Euler(0, 0, car.rotation.y));



			// var camRot = new THREE.Quaternion();
			// var camTo = new THREE.Quaternion();
			// var camFinal = new THREE.Euler();
			// camRot.setFromEuler(camera.rotation);
			// camTo.setFromEuler(new THREE.Euler(0, 0, car.rotation.y));

			// if (keysDown["1"]) {
			// 	var rotQuat = new THREE.Quaternion();
			// 	rotQuat.setFromAxisAngle( new THREE.Vector3(1, 0, 0), Math.PI/3 );
			// 	camTo.multiply(rotQuat);
			// 	// camera.rotation.setFromQuaternion(cameraQuat);
			// }

			// camRot.slerp(camTo, 0.08);

			// if (keysDown["2"]) {
			// 	var rotQuat = new THREE.Quaternion();
			// 	rotQuat.setFromAxisAngle( new THREE.Vector3(0, 0, 1), Math.PI );
			// 	camTo.multiply(rotQuat);
			// 	rotQuat.setFromAxisAngle( new THREE.Vector3(1, 0, 0), Math.PI/3 );
			// 	camTo.multiply(rotQuat);
			// 	camRot = camTo;
			// }

			// camFinal.setFromQuaternion(camRot);

			// camera.rotation.copy(camFinal);
			// camera.rotation.z = camFinal.x;
			// camera.rotation.x = Math.PI/4;

			camera.position.x = camPos.x;
			camera.position.y = camPos.y;

		});

	});


}
