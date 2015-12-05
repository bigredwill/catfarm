
function testCollisionObjects(obj1, obj2, debugGeo, debugGeo2) {
	if (!obj1.collision) {
		return;
	}

	if (!obj2.collision) {
		return;
	}

	var collision1 = new SAT.Polygon(new SAT.Vector(), obj1.collision.points);
	var collision2 = new SAT.Polygon(new SAT.Vector(), obj2.collision.points);

	collision1.setOffset(new SAT.Vector(obj1.position.x, obj1.position.y));
	collision2.setOffset(new SAT.Vector(obj2.position.x, obj2.position.y));

	collision1.setPreOffset(obj1.collision.offset);
	collision2.setPreOffset(obj2.collision.offset);

	collision1.setAngle(obj1.rotation.y);
	collision2.setAngle(obj2.rotation.y);

	var response = new SAT.Response();
	var collided = SAT.testPolygonPolygon(collision1, collision2, response);
	response.collided = collided;

	for (var i = 0; i < 4; i++) {
		debugGeo.vertices[i].set(collision1.calcPoints[i].x, collision1.calcPoints[i].y, 1);
	}
	debugGeo.verticesNeedUpdate = true;

	for (var i = 0; i < 4; i++) {
		debugGeo2.vertices[i].set(collision2.calcPoints[i].x, collision2.calcPoints[i].y, 1);
	}
	debugGeo2.verticesNeedUpdate = true;

	return response;
}
