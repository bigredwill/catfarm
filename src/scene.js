
function createScene(scene) {

    // Generate A Cube
    var boxGeometry = new THREE.BoxGeometry(3, 3, 3);
    var greenMaterial = new THREE.MeshBasicMaterial( { color: 0xff00ff } );
    var cube = new THREE.Mesh(boxGeometry, greenMaterial);

	var ambient = new THREE.AmbientLight( 0x444444 );
	scene.add( ambient );

	var directionalLight = new THREE.DirectionalLight( 0xffeedd );
	directionalLight.position.set( 0, 0, 1 ).normalize();
	scene.add( directionalLight );

    // Add The Cube To The Scene
    // scene.add(cube);

/*****/

	setInterval(function() {
		cube.rotation.x += 0.01;
		cube.rotation.y += 0.05;
	}, 0)


	var loader = new THREE.OBJMTLLoader();
	loader.load( './models/mustang impala.obj', './models/mustang impala.mtl', function ( object ) {

		window.car = object;

		object.scale.set(0.5, 1, 0.5)
		object.position.z = -10;
		object.position.y = 0;

		// object.rotation.z = Math.PI;
		// object.rotation.x = Math.PI/4;
		object.rotation.x = Math.PI/2;

		setInterval(function() {
			// object.rotation.y += 0.01;
		}, 0);

		// object.rotation.x += 10;
		var bbox = new THREE.Box3().setFromObject(object);
		console.log(bbox);

		scene.add( object );

	} );


}
