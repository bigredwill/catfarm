
var OBJMTLLoader = new THREE.OBJMTLLoader();
var TextureLoader = new THREE.TextureLoader();


function createScene(scene, camera, looper) {

	var car;

	var ambient = new THREE.AmbientLight( 0x444444 );
	scene.add( ambient );

	var directionalLight = new THREE.DirectionalLight( 0xffeedd );
	directionalLight.position.set( 0, 0, 1.5 ).normalize();
	scene.add( directionalLight );

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
					// do something with the texture
					var material = new THREE.MeshBasicMaterial( {
						map: texture
					 } );

					var road = new THREE.Mesh(
						new THREE.PlaneGeometry(100, 100),
						material
					);
					road.position.z = 0;

					scene.add(road);

					resolve();
				}
			);

		})
	}).then(function() {
		console.log(car);
	});

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

	var time = (new Date()).getTime() / 1000;
	var oldTime = time;
	var delta = 0;
	looper(function() {
		oldTime = time;
		time = (new Date()).getTime() / 1000;
		var delta = time - oldTime;

		if (keysDown["T"]) {
			car.position.x += 30 * delta * Math.cos(car.rotation.y + Math.PI/2);
			car.position.y += 30 * delta * Math.sin(car.rotation.y + Math.PI/2);
				
			if (keysDown["F"]) {
				car.rotation.y += 2 * delta;
			}
				
			if (keysDown["H"]) {
				car.rotation.y -= 2 * delta;
			}
		}

		if (keysDown["G"]) {
			car.position.x -= 30 * delta * Math.cos(car.rotation.y + Math.PI/2);
			car.position.y -= 30 * delta * Math.sin(car.rotation.y + Math.PI/2);
				
			if (keysDown["F"]) {
				car.rotation.y -= 2 * delta;
			}
				
			if (keysDown["H"]) {
				car.rotation.y += 2 * delta;
			}
		}

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

	});



}
