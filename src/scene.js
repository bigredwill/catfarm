
var OBJMTLLoader = new THREE.OBJMTLLoader();

function createScene(scene) {

	var car;

	Promise.resolve(function() {
		return new Promise(function(resolve, reject) {

			/* Load the car model! */
			OBJMTLLoader.load( './models/mustang impala.obj', './models/mustang impala.mtl', function ( object ) {

				object.scale.set(0.5, 1, 0.5)
				object.position.z = -0.1;
				object.position.y = 13;
				object.position.x = 13;

				object.rotation.x = Math.PI/2;

				scene.add( object );

				car = object;

				 resolve();

			} );


		});
	}).then(function() {
		return new Promise(function(resolve, reject) {

			loader.load(
				// resource URL
				'textures/land_ocean_ice_cloud_2048.jpg',
				// Function when resource is loaded
				function ( texture ) {
					// do something with the texture
					var material = new THREE.MeshBasicMaterial( {
						map: texture
					 } );
				}
			);

		})
	}).then(function() {

	});

    // Generate A Cube
    var boxGeometry = new THREE.BoxGeometry(3, 3, 3);
    var greenMaterial = new THREE.MeshBasicMaterial( { color: 0xff00ff } );
    var cube = new THREE.Mesh(boxGeometry, greenMaterial);

	var ambient = new THREE.AmbientLight( 0x444444 );
	scene.add( ambient );

	var directionalLight = new THREE.DirectionalLight( 0xffeedd );
	directionalLight.position.set( 0, 0, 1.5 ).normalize();
	scene.add( directionalLight );

    // Add The Cube To The Scene
    // scene.add(cube);

	var road = new THREE.Mesh(
		new THREE.PlaneGeometry(20, 20),
		greenMaterial
	);
	road.position.z = 0;

	scene.add(road);

/*****/

	setInterval(function() {
		cube.rotation.x += 0.01;
		cube.rotation.y += 0.05;
	}, 0)



}
