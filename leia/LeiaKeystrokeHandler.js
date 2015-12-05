/**
 * Constants
 * **/
var KEY = {
        ESC:27,
        SPACE:32,
        LEFT:37,
        UP:38,
        RIGHT:39,
        DOWN:40,
        SHIFT:16,
        TILDE:192,
        ONE:49,
        TWO:50,
        THREE:51,
        ENTER:13,
        A:65,
        C:67,
        S:83,
        T:84,
        U:85,
        V:86,
        W:87,
        K:75,
        L:76,
        B:66,
        INF:188,           // technically it's " , " but I like to think of it as " > " (same key) which looks like an fov , decrease fov
        SUP:190,           // technically it's " . " but I like to think of it as " > " , increases fov
        RIGHT_BRACKET:221, // " ] "  increase width
        LEFT_BRACKET:219}; // " [ "  decrease width
/**
 * Example usage:
 *
 * var lks = new LeiaKeystrokeHandler(threeScene, leiaHoloScreen, leiaRenderer, useReservedKeys);
 * lks.addKeyHandler('t', function(event){
 *     console.log(event.keyCode + " was pressed");
 * });
 *
 * @constructor
 */
function LeiaKeystrokeHandler(threeScene, leiaHoloObject, leiaRenderer, useReservedKeys) {
    var keyHandlers = [];

    this.onKeyDown = function(event) {

        var kc = event.keyCode;
        if( keyHandlers[kc] !== undefined ) {
            keyHandlers[kc](event);
        }
    };

    this.addKeyHandler = function(key, handlerFunction) {
        var keyCode = key.toUpperCase().charCodeAt(0);
        keyHandlers[keyCode] = handlerFunction;
    };

    this.addKeyHandlerForCharCode = function(keyCode, handlerFunction) {
        keyHandlers[keyCode] = handlerFunction;
    };

    document.addEventListener('keydown', this.onKeyDown, false);

    if(useReservedKeys) {
        console.log("LeiaKeystrokeHandler: Initializing with LEIA reserved keys turned -->> ON <<--");
        this.addKeyHandler("a", function(){ // toggle between swizzle and tile mode
            leiaRenderer.toggleSwizzle();
        });
        this.addKeyHandler("i", function(){ // move canvas by 1 pixel in y
            leiaRenderer.shiftY(1);
        });
        this.addKeyHandler("j", function(){ // move canvas by -1 pixel in x
            leiaRenderer.shiftX(-1);
        });
        this.addKeyHandler("k", function(){ // move canvas by -1 pixel in y
            leiaRenderer.shiftY(-1);
        });
        this.addKeyHandler("l", function(){ // move canvas by 1 pixel in x
            leiaRenderer.shiftX(1);
        });
        this.addKeyHandler("p", function(){ // save canvas as image: holoScreenOutput.png
            leiaRenderer.saveCanvas("holoScreenOutput");
        });
        this.addKeyHandler("s", function(){ // toggle between basic and supersample4x mode.
            leiaRenderer.toggleSuperSample();
        });
        this.addKeyHandlerForCharCode(KEY.SPACE, function(){ // toggle between animation on/off
            leiaRenderer.toggleIsAnimating();
        });
        this.addKeyHandlerForCharCode(KEY.TILDE, function(){ // toggle between basic and supersample4x mode.
            leiaRenderer.toggleMultiViewModes();
        });
        this.addKeyHandlerForCharCode(KEY.ONE, function(){ // toggle between basic and supersample4x mode.
            var baselineScaling= leiaHoloObject._baselineScaling;
            baselineScaling -=0.2;
            if (baselineScaling <= 0.001) {
                baselineScaling = 0.001;
            }

              leiaHoloObject.setBaselineScaling(baselineScaling);
              leiaRenderer.updateShaderMaterial = true;
        });
        this.addKeyHandlerForCharCode(KEY.TWO, function(){
          var baselineScaling= leiaHoloObject._baselineScaling;
          baselineScaling +=0.2;
          if (baselineScaling > 5) {
              baselineScaling = 5;
          }
            leiaHoloObject.setBaselineScaling(baselineScaling);
            leiaRenderer.updateShaderMaterial = true;
        });
        this.addKeyHandlerForCharCode(KEY.THREE, function(){ // toggle between basic and supersample4x mode.
            leiaRenderer.toggle2D3D();
            leiaRenderer.updateShaderMaterial = true;
        });
        this.addKeyHandlerForCharCode(KEY.SUP, function(){ // increase fov
            var fov= leiaHoloObject._fov;
            fov+=0.1
            if (fov > 3*Math.PI/4) {
                fov = 3*Math.PI/4;
            }
              leiaHoloObject.setFOV(fov);
              leiaRenderer.updateShaderMaterial = true;
        });

        this.addKeyHandlerForCharCode(KEY.INF, function(){ // decrease fov
            var fov= leiaHoloObject._fov;
            fov -=0.1;
            if (fov < 0) {
                fov = 0.01; 
            }

              leiaHoloObject.setFOV(fov);
              leiaRenderer.updateShaderMaterial = true;
        });

        this.addKeyHandlerForCharCode(KEY.RIGHT_BRACKET, function(){ // increase width
          var width= leiaHoloObject._width;
          width += 1;
          leiaHoloObject.setWidth(width);
          leiaRenderer.updateShaderMaterial = true;

        });
        this.addKeyHandlerForCharCode(KEY.LEFT_BRACKET, function(){ // decrease width
          var width= leiaHoloObject._width;
          width -=1;
          if (width < 15) {
              width = 15;
          }
            leiaHoloObject.setWidth(width);
            leiaRenderer.updateShaderMaterial = true;
        });
    }
}
