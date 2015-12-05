
function createScene(scene) {

    // Generate A Cube
    var boxGeometry = new THREE.BoxGeometry(3, 3, 3);
    var greenMaterial = new THREE.MeshBasicMaterial( { color: 0xff00ff } );
    var cube = new THREE.Mesh(boxGeometry, greenMaterial);

    // Add The Cube To The Scene
    scene.add(cube);

}
