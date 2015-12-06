
var OBJMTLLoader = new THREE.OBJMTLLoader();
var TextureLoader = new THREE.TextureLoader();

function approach(from, to, lerp) {
	var dist = to - from;
	return from + (dist * lerp);
}

var cameraView = "TOP";
function viewInput(input) {
	// if (cameraView == "TOP") {
	// } else {

		if (input == cameraView) {
			cameraView = "TOP";
		} else {
			cameraView = input;
		}

	// }
};

function createScene(scene, camera, realScene, looper) {

	var cars = [];
	var pedestrians = [];
	var car;
	var shadow;
	var warnings = [];

	// var ambient = new THREE.AmbientLight( 0x333333 );
	// scene.add( ambient );

	var directionalLight = new THREE.DirectionalLight( 0xcccccc, 0.15 );
	directionalLight.position.set( 0, 0, 1.5 ).normalize();
	directionalLight.castShadow = true;

	directionalLight.shadowCameraNear = 1200;
	directionalLight.shadowCameraFar = 2500;
	directionalLight.shadowCameraFov = 50;

	directionalLight.shadowBias = 0.0001;

	directionalLight.shadowMapWidth = 2048;
	directionalLight.shadowMapHeight = 2048;

	realScene.add( directionalLight );

	var light = new THREE.HemisphereLight( 0xffffff, 0x080820, 1.5 );
	realScene.add(light);

	var material = new THREE.LineBasicMaterial({
		color: 0x0000ff
	});

	var currentWarningIndex = 0;
	function clearWarnings() {
		for (var i in warnings) {
			var warning = warnings[i];
			warning.visible = false;
			warning.rotation.copy(camera.rotation);
		}
		currentWarningIndex = 0;
	}

	function showWarning(x, y) {
		if (currentWarningIndex > warnings.length) {
			return;
		}

		var warning = warnings[currentWarningIndex]

		if (!warning) {
			return;
		}

		warning.visible = true;

		warning.position.setX(x);
		warning.position.setY(y);

		currentWarningIndex++;
	}

	new Promise(function(resolve, reject) {

		/* Load the car model! */
		OBJMTLLoader.load( './models/mustang impala.obj', './models/mustang impala.mtl', function ( object ) {

			object.scale.set(0.25, 0.5, 0.25)
			object.position.z = -0.1;
			object.position.y = 13;
			object.position.x = 13;

			object.rotation.x = Math.PI/2;

			scene.add( object );

			object.castShadow = true;
			object.receiveShadow = true;
			object.collision = new SAT.Box(new SAT.Vector(0,0), 8, 16).toPolygon();
			object.collision.offset = new SAT.Vector(-4, -8);

			car = object;

			resolve();

		} );

	}).then(function() {

		var promises = [];
		for (var i = 0; i < 4; i++) {
			promises.push(new Promise(function(resolve, reject) {
				/* Load the car model! */
				OBJMTLLoader.load( './models/mustang impala.obj', './models/mustang impala.mtl', function ( object ) {

					object.scale.set(0.25, 0.5, 0.25)
					object.position.z = -0.1;
					object.position.y = 0;
					object.position.x = 0;

					object.rotation.x = Math.PI/2;

					scene.add( object );

					object.castShadow = true;
					object.receiveShadow = true;
					object.collision = new SAT.Box(new SAT.Vector(0,0), 9, 15).toPolygon();
					object.collision.offset = new SAT.Vector(-4.5, -7.5);

					cars.push(object);

					resolve();

				} );
			}));
		}

		return Promise.all(promises);

	}).then(function() {

		cars[1].position.x = 10;
		cars[2].position.x = 30;
		cars[3].position.x = -20;

	}).then(function() {

		/* Load a bunch of wills.. */
		var promises = [];
		for (var i = 0; i < 5; i++) {
			promises.push(new Promise(function(resolve, reject) {

				OBJMTLLoader.load( './models/will.obj', './models/will.mtl', function ( object ) {

					object.scale.set(0.5, 0.5, 0.5);
					object.position.z = -0.1;
					object.position.y = 10;
					object.position.x = 10;

					object.rotation.x = Math.PI/2;

					scene.add( object );

					object.castShadow = true;
					object.receiveShadow = true;
					object.collision = new SAT.Box(new SAT.Vector(0,0), 6, 6).toPolygon();
					object.collision.offset = new SAT.Vector(-3, -3);

					pedestrians.push(object);

					resolve();

				} );
			}));
		}

		return Promise.all(promises);
	}).then(function() {
		return new Promise(function(resolve, reject) {

			TextureLoader.load(
				// resource URL
				'texture/cement.png',
				// Function when resource is loaded
				function ( texture ) {

					var material = new THREE.MeshLambertMaterial( {
						map: texture,
						shininess: 0,
						specular: 0xAAAAAA,
						emissive: 0x555555,
					 } );

					var block = new THREE.Mesh(
						new THREE.BoxGeometry(80, 10, 10),
						material
					);
					block.position.y = 45;

					var block2 = new THREE.Mesh(
						new THREE.BoxGeometry(80, 10, 10),
						material
					);
					block2.position.y = -45;

					var block3 = new THREE.Mesh(
						new THREE.BoxGeometry(10, 100, 10),
						material
					);
					block3.position.x = 45;

					var block4 = new THREE.Mesh(
						new THREE.BoxGeometry(10, 100, 10),
						material
					);
					block4.position.x = -45;

					scene.add(block);
					scene.add(block2);
					scene.add(block3);
					scene.add(block4);

					resolve(texture);
				}
			);

		});
	}).then(function() {
		return new Promise(function(resolve, reject) {

			TextureLoader.load(
				// resource URL
				'texture/parkinglot.jpg',
				// Function when resource is loaded
				function ( texture ) {
					resolve(texture);
				}
			);

		});
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
		return new Promise(function(resolve, reject) {

			TextureLoader.load(
				// resource URL
				'texture/warning.png',
				// Function when resource is loaded
				function ( texture ) {

					var geometry = new THREE.PlaneGeometry(10, 10);

					var material = new THREE.MeshBasicMaterial( {
						map: texture,
						alpha: 0.5,
						transparent: true
					 } );

					for (var i = 0; i < 10; i++) {
						warnings[i] = new THREE.Mesh(
							geometry,
							material
						);
						warnings[i].position.z = 5;

						scene.add(warnings[i]);
					}

					resolve();
				}
			);

		});
	}).then(function() {
		return new Promise(function(resolve, reject) {

			TextureLoader.load(
				// resource URL
				'texture/shadow.png',
				// Function when resource is loaded
				function ( texture ) {

					var bigGeo = new THREE.PlaneGeometry(20, 20);

					var material = new THREE.MeshBasicMaterial( {
						map: texture,
						alpha: 0.5,
						transparent: true
					 } );

					var shadow = new THREE.Mesh(
						bigGeo,
						material
					);
					shadow.rotation.x = -Math.PI/2;
					shadow.rotation.z = Math.PI/2;
					shadow.position.y = 5;
					shadow.position.z = 5;
					shadow.scale.set(1/0.25, 1/0.5, 1/0.25);

					car.add(shadow);

					for (var i in cars) {
						var cari = cars[i];

						var shadow = new THREE.Mesh(
							bigGeo,
							material
						);
						shadow.rotation.x = -Math.PI/2;
						shadow.rotation.z = Math.PI/2;
						shadow.position.y = 5;
						shadow.position.z = 5;
						shadow.scale.set(1/0.25, 1/0.5, 1/0.25);

						cari.add(shadow);
					}

					var smallGeo = new THREE.PlaneGeometry(5, 5);

					for (var i in pedestrians) {
						var pedestriani = pedestrians[i];

						var shadow = new THREE.Mesh(
							smallGeo,
							material
						);

						shadow.rotation.x = -Math.PI/2;
						shadow.rotation.z = Math.PI/2;
						shadow.position.y = 1;
						shadow.position.z = 0;
						shadow.scale.set(1, 1, 1);						

						pedestriani.i = Math.random() * 1000;

						pedestriani.add(shadow);
					}

					resolve();
				}
			);

		});
	}).then(function() {
		return new Promise(function(resolve, reject) {

			TextureLoader.load(
				// resource URL
				'texture/pedestrian.png',
				// Function when resource is loaded
				function ( texture ) {

					var material = new THREE.MeshBasicMaterial( {
						map: texture,
						alpha: 0.5,
						transparent: true
					 } );


					for (var i in pedestrians) {
						var pedestriani = pedestrians[i];

						sign = new THREE.Mesh(
							new THREE.PlaneGeometry(10, 10),
							material
						);
						sign.position.z = 5;

						scene.add(sign);

						pedestriani.sign = sign;
					}

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

		var xRotApproach = 0;
		var yRotApproach = 0;

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

			/* Car Control */

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

			/* Camera Control */

			var camPos = new THREE.Vector2(camera.position.x, camera.position.y);
			camPos.lerp(new THREE.Vector2(car.position.x, car.position.y), 0.25);

			var cameraQuat = new THREE.Quaternion();
			cameraQuat.setFromEuler(new THREE.Euler(0, 0, car.rotation.y));

			var xRot = 0;
			var yRot = 0;

			if (cameraView == "UP") {
				xRot = 0;
				yRot = Math.PI/3;
			}

			if (cameraView == "DOWN") {
				xRot = Math.PI;
				yRot = Math.PI/3;
			}

			if (cameraView == "LEFT") {
				xRot = Math.PI/2;
				yRot = Math.PI/3;
			}

			if (cameraView == "RIGHT") {
				xRot = -Math.PI/2;
				yRot = Math.PI/3;
			}

			xRotApproach = approach(xRotApproach, xRot, 0.08);
			yRotApproach = approach(yRotApproach, yRot, 0.08);

			var rotQuat = new THREE.Quaternion();
			rotQuat.setFromAxisAngle( new THREE.Vector3(0, 0, 1), xRotApproach );
			cameraQuat.multiply(rotQuat);
			rotQuat.setFromAxisAngle( new THREE.Vector3(1, 0, 0), yRotApproach );
			cameraQuat.multiply(rotQuat);

			var camFinal = new THREE.Euler();
			camFinal.setFromQuaternion(cameraQuat);

			var camFrom = new THREE.Quaternion();
			camFrom.setFromEuler(new THREE.Euler(camera.rotation.x, camera.rotation.y, camera.rotation.z));
			var camTo = new THREE.Quaternion();
			camTo.setFromEuler(new THREE.Euler(camFinal.y, camFinal.y, camFinal.y));

			camera.rotation.copy(camFinal);
			camera.position.x = camPos.x;
			camera.position.y = camPos.y;

			// console.log(car.position.x, car.position.y);

			clearWarnings();

			if (Math.floor(time * 5) % 2) {

				for (var i in cars) {
					var cari = cars[i];

					var colRes = testCollisionObjects(car, cari);
					if (colRes.collided) {
						showWarning(colRes.a.offset.x + colRes.overlapN.x*5, colRes.a.offset.y + colRes.overlapN.y*5);
					}
				}

				for (var i in pedestrians) {
					var pedestriani = pedestrians[i];


					var colRes = testCollisionObjects(car, pedestriani);
					if (colRes.collided) {
						// showWarning(colRes.a.offset.x + colRes.overlapN.x*5, colRes.a.offset.y + colRes.overlapN.y*5);
						showWarning(colRes.b.offset.x, colRes.b.offset.y);
					}
				}

			}

			for (var i in pedestrians) {
				var pedestriani = pedestrians[i];
				pedestriani.sign.rotation.copy(camera.rotation);
				pedestriani.sign.position.x = pedestriani.position.x;
				pedestriani.sign.position.y = pedestriani.position.y;
			}

			for (var i = 0; i < pedestrians.length-1; i++) {
				var pedestriani = pedestrians[i];

				pedestriani.position.x += Math.cos(pedestriani.rotation.y) * delta * 5;
				pedestriani.position.y += Math.sin(pedestriani.rotation.y) * delta * 5;

				pedestriani.position.x = Math.max(Math.min(40, pedestriani.position.x), -40);
				pedestriani.position.y = Math.max(Math.min(40, pedestriani.position.y), -40);

				pedestriani.rotation.y += Math.cos(time/1000 * Math.cos(pedestriani.i * time) * pedestriani.i * 100) * Math.PI / 20;
			}


		});

	});


}
