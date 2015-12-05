//LeiaCore Version
'use strict';
var REVISION = "0.0.002";

/**
 * LeiaDisplay
 *
 * @param url
 * @constructor
 */
function LeiaDisplayInfo(url) {
    this.version = REVISION;
    var self = this;
    function loadDisplaySettings(url) {
        var request = new XMLHttpRequest;
        request.open('GET', url, false);
        request.send(null);
        if (request.status === 200) {
            var data = JSON.parse(request.responseText);
            self.info                   = data.info;
//            console.log(self);
        } else {
            throw new Error('LeiaCore: Cannot read file ', url);
        }
    }
    if (url == undefined) {
        throw new Error('LeiaCore: must define configuration file when initializing LeiaDisplay().')
    } else {
        loadDisplaySettings(url);
    }
}


/**
 * LeiaHoloScreen
 *
 * @param leiaDisplay
 * @param parameters
 * @constructor
 */
function LeiaHoloView(leiaDisplay, parameters) {

    var lhs;
    this.MULTIVIEW_MODES = { FLAT  : 'flat', TVH   : 'twoViewHorizontal', BASIC : 'basic', SS4X  : 'supersample4x'};
    this.RENDER_MODES   = {TILES   : 1, SWIZZLE : 2};

    this.setDefaultConfig= function(){
      this.modes                = {};
      this.multiViewParameters  = {};
      this.mvp                  = this.multiViewParameters;
      this.mvp.displayType      = "square";
      this.mvp.canvasRotation   = "0deg";
      this.mvp.displayResolution= {"x":1600, "y":1600};
      this.mvp.aspectRatio      = this.mvp.displayResolution.x/this.mvp.displayResolution.y;
      this.mvp.numberOfViews    = new THREE.Vector2(8, 8);
      var viewResX              = this.mvp.displayResolution.x / this.mvp.numberOfViews.x;
      var viewResY              = this.mvp.displayResolution.y / this.mvp.numberOfViews.y;
      this.mvp.viewResolution   = new THREE.Vector2(viewResX, viewResY);
      this.mvp.tileResolution   = new THREE.Vector2(viewResX, viewResY);
      if (this.mvp.displayType == "diamond") {
         this.mvp.tileResolution= new THREE.Vector2(2*viewResX, viewResY);
      }
      this.deltaN              =      0.1;
      this._maxDisparity        =      5;

      this.emissionPatternG     =[];

      for (var j=0; j<8; j++){
        for (var i=0; i<8; i++){
          this.emissionPatternG.push({"x":(i-3.5)*this.deltaN ,"y":(j-3.5)*this.deltaN}); // 3.5 comes from 8-1/2
        }
      }

      this.configHasChanged     =false;
      this.defineNonPhysicalParameters();

    }

    this.setLeiaConfig= function(leiaDisplay){

      this.leiaDisplay          = leiaDisplay;
      this.modes                = {};
      this.multiViewParameters  = {};
      this.mvp                  = this.multiViewParameters;
      var info                  = this.leiaDisplay.info;
      this.mvp.displayType      = info.displayType;
      this.mvp.canvasRotation   = info.canvasRotation;
      this.mvp.displayResolution= new THREE.Vector2(info.displayResolution.x, info.displayResolution.y);
      this.mvp.aspectRatio      = info.displayResolution.x/info.displayResolution.y;
      this.mvp.numberOfViews    = new THREE.Vector2(info.numberOfViews.x, info.numberOfViews.y);
      var viewResX              = this.mvp.displayResolution.x / this.mvp.numberOfViews.x;
      var viewResY              = this.mvp.displayResolution.y / this.mvp.numberOfViews.y;
      this.mvp.viewResolution   = new THREE.Vector2(viewResX, viewResY);
      this.mvp.tileResolution   = new THREE.Vector2(viewResX, viewResY);
      if (this.mvp.displayType == "diamond") {
         this.mvp.tileResolution= new THREE.Vector2(2*viewResX, viewResY);
      }
      this.deltaN              = info.deltaN;
      this._maxDisparity        =      5;
      this.emissionPatternG     = this.leiaDisplay.info.emissionPatternG;
      this.configHasChanged     =true;

      this.defineNonPhysicalParameters();
      this.init()
    }


    this.defineNonPhysicalParameters= function(){
      this.version             = REVISION;
      this.projectionMatrices  = [];
      this._holoScreenCenter    = new THREE.Vector3(0, 0, 0);  // screen center location
      this._normal              = new THREE.Vector3(0, 0, 1);  // screen normal: unit vector pointing from the screen center to the camera array center
      this._up                  = new THREE.Vector3(0, 1, 0);  // positive vertical direction of the screen: y axis
      this.cameraShift          = new THREE.Vector2(0, 0);     // shift of the camera block with respect to its center
      this._width               = 40;                          // width of holo screen in webGL units
      this._height              = this._width/this.mvp.aspectRatio;  // height of holo screen in webGL units
      this._fov                 = Math.PI/6;
      this._ScreenCameraDistance= this._width/(2*Math.tan(this._fov/2));
      this._cameraCenterPosition= new THREE.Vector3(0,0,this._ScreenCameraDistance);
      this._baselineScaling     =      1;                                       // stretch factor of the camera array
      this._baseline            = this._baselineScaling*this.deltaN*this._ScreenCameraDistance;
      this._nearPlane           = this._maxDisparity*this._ScreenCameraDistance/(this._baseline+this._maxDisparity);      // math formula
      //this._farPlane            = ( (this._maxDisparity>=this._baseline)? -Infinity :-(this._maxDisparity*this._ScreenCameraDistance/(this._baseline-this._maxDisparity))); // math formula
      this._farPlane            = ( (this._maxDisparity>=this._baseline)? -20000 :-(this._maxDisparity*this._ScreenCameraDistance/(this._baseline-this._maxDisparity))); // math formula
      this._matricesNeedUpdate  =   true;                      // matrices will be generated upon first render
      this.currentMode          =   null;                      // needs to be set by renderer
      lhs=this;
    }


    function multiViewMode(parameters) {
        this.modeId                 = null;     // name/identifier of the current mode
        this.viewDirections         = null;     // emission Pattern of this mode (typically the green channel specified in the display configuration file.)
        this.matrix                 = null;     // blurring/sharpening kernel
        this.matrixTileStep         = null;     // view spacing when applying the kernel: 0.5 means supersampled grid, 1 means normal grid.
        this.numberOfTiles          = null;     // number of tiles that are rendered in this mode
        this.numberOfTilesOnTexture = null;     // number of tiles that are rendered on each texture
        this.numberOfTextures       = null;     // number of textures necessary to render all tiles.

        this.initFlatCamera  = function( parameters) {
            this.numberOfTiles          =   new THREE.Vector2(1, 1);
            this.numberOfTilesOnTexture =   this.numberOfTiles;
            this.numberOfTextures       =       1;
            this.matrix                 =   [[1]];
            this.matrixTileStep         =   new THREE.Vector2(1, 1);

            this.viewDirections.push(new THREE.Vector3(0, 0, 1));
        };

        this.initBasicCamera = function(parameters) {
            this.numberOfTiles          = lhs.multiViewParameters.numberOfViews;
            this.numberOfTilesOnTexture = this.numberOfTiles;
            this.numberOfTextures       =       1;
            this.matrix                 =   [[1]];
            this.matrixTileStep         =   new THREE.Vector2(1, 1);

            var emissionPattern = lhs.emissionPatternG;
            for (var q=0; q<emissionPattern.length; q++){
                this.viewDirections.push(new THREE.Vector3(emissionPattern[q].x, emissionPattern[q].y, 1));
            }
        };

        this.initHPOCamera = function(parameters) {
            this.numberOfTiles          = new THREE.Vector2(lhs.multiViewParameters.numberOfViews.x, 1);
            this.numberOfTilesOnTexture = this.numberOfTiles;
            this.numberOfTextures       =       1;
            this.matrix                 =   [[1]];
            this.matrixTileStep         =   new THREE.Vector2(1, 1);
        };

        this.initVPOCamera = function(parameters) {
            this.numberOfTiles          = new THREE.Vector2(1, lhs.multiViewParameters.numberOfViews.y);
            this.numberOfTilesOnTexture = this.numberOfTiles;
            this.numberOfTextures       =       1;
            this.matrix                 =   [[1]];
            this.matrixTileStep         =   new THREE.Vector2(1, 1);
        };

        this.initTVHCamera = function(parameters) {
            this.numberOfTiles          = new THREE.Vector2(2, 1);
            this.numberOfTilesOnTexture = this.numberOfTiles;
            this.numberOfTextures       =       1;
            this.matrix                 =   [[1]];
            this.matrixTileStep         =   new THREE.Vector2(1, 1);
            var emissionPattern = lhs.emissionPatternG;
            var nViews  = new THREE.Vector2(lhs.multiViewParameters.numberOfViews.x, lhs.multiViewParameters.numberOfViews.y);
            var xleft   = nViews.x/2-1;
            var xright  = nViews.x/2;
            var yabove  = nViews.y/2;
            var ybelow  = nViews.y/2-1;
            var posA    = emissionPattern[nViews.x*yabove+xleft];
            var posB    = emissionPattern[nViews.x*yabove+xright];
            var posC    = emissionPattern[nViews.x*ybelow+xleft];
            var posD    = emissionPattern[nViews.x*ybelow+xright];
            var leftPos = {
                x: 0.5*(posA.x + posC.x),
                y: 0.5*(posA.y + posC.y)
            };
            var rightPos = {
                x: 0.5*(posB.x + posD.x),
                y: 0.5*(posB.y + posD.y)
            };
            this.viewDirections.push(new THREE.Vector3(leftPos.x, leftPos.y, 1));
            this.viewDirections.push(new THREE.Vector3(rightPos.x, rightPos.y, 1));
        };

        this.initTVVCamera = function(parameters) {
            this.numberOfTiles          = new THREE.Vector2(1, 2);
            this.numberOfTilesOnTexture = this.numberOfTiles;
            this.numberOfTextures       = 1;
            this.matrix                 = [[1]];
            this.matrixTileStep         = new THREE.Vector2(1, 1);
        };

        this.initSS2XCamera = function(parameters) {
            this.numberOfTiles          = lhs.multiViewParameters.numberOfViews;
            this.numberOfTilesOnTexture = this.numberOfTiles;
            this.numberOfTextures       = 1;
            this.matrix                 = [[1]];
            this.matrixTileStep         = new THREE.Vector2(1, 1);
        };

        this.initSS4XCamera = function(parameters) {
            var ntx                     = 2*lhs.multiViewParameters.numberOfViews.x + 1;
            var nty                     = 2*lhs.multiViewParameters.numberOfViews.y + 1;
            this.numberOfTiles          = new THREE.Vector2(ntx, nty);
            this.numberOfTilesOnTexture = this.numberOfTiles;
            this.numberOfTextures       = 1;
            var a =  0.7;
            var b =  0.125;
            var c = -0.05;
            this.matrix                 = [[c, b, c], [b, a, b], [c, b, c]];
            this.matrixTileStep         = new THREE.Vector2(0.5, 0.5);
            var emissionPattern = lhs.emissionPatternG;
            for (var viewIdY=0; viewIdY<this.numberOfTiles.y; viewIdY++){
                for (var viewIdX=0; viewIdX<this.numberOfTiles.x; viewIdX++){
                    this.viewDirections.push(this.computeSS4XPosition(emissionPattern, {x:viewIdX, y:viewIdY}));
                }
            }
        };

        this.computeSS4XPosition = function(emPat, gridIndex){
            var pos         = {x:0, y:0, z:1};
            var nViews      = new THREE.Vector2(lhs.multiViewParameters.numberOfViews.x, lhs.multiViewParameters.numberOfViews.y);
            var nTiles      = new THREE.Vector2(2*nViews.x+1, 2*nViews.y+1);
            var origIndex   = new THREE.Vector2(gridIndex.x/2-0.5, gridIndex.y/2-0.5);

            if ( ((gridIndex.x%2)==1)&&((gridIndex.y%2)==1) ) {
                var emPatId = nViews.x*origIndex.y+origIndex.x;
                pos = emPat[emPatId];
            } else {
                var xmin = Math.floor(origIndex.x);
                var ymin = Math.floor(origIndex.y);
                var xmax = Math.ceil(origIndex.x);
                var ymax = Math.ceil(origIndex.y);
                if (xmin < 0)            { xmin = xmax + 1; }
                if (xmax > (nViews.x-1)) { xmax = xmin - 1; }
                if (ymin < 0)            { ymin = ymax + 1; }
                if (ymax > (nViews.y-1)) { ymax = ymin - 1; }

                var idA = {x: xmin, y: ymin};
                var idB = {x: xmax, y: ymin};
                var idC = {x: xmin, y: ymax};
                var idD = {x: xmax, y: ymax};

                var emPatIdA = nViews.x*idA.y + idA.x;
                var emPatIdB = nViews.x*idB.y + idB.x;
                var emPatIdC = nViews.x*idC.y + idC.x;
                var emPatIdD = nViews.x*idD.y + idD.x;

                var emPatA = emPat[emPatIdA];
                var emPatB = emPat[emPatIdB];
                var emPatC = emPat[emPatIdC];
                var emPatD = emPat[emPatIdD];
                if (xmin>xmax){
                    if (origIndex.x < 0){
                        pos.x = 0.25*(3*emPatB.x - emPatA.x + 3*emPatD.x - emPatC.x);
                    } else {
                        pos.x = 0.25*(3*emPatA.x - emPatB.x + 3*emPatC.x - emPatD.x);
                    }
                } else {
                    pos.x = 0.25*(emPatA.x + emPatB.x + emPatC.x + emPatD.x);
                }
                if (ymin>ymax){
                    if (origIndex.y < 0) {
                        pos.y = 0.25*(3*emPatC.y - emPatA.y + 3*emPatD.y - emPatB.y);
                    } else {
                        pos.y = 0.25*(3*emPatA.y - emPatC.y + 3*emPatB.y - emPatD.y);
                    }
                } else {
                    pos.y = 0.25*(emPatA.y + emPatB.y + emPatC.y + emPatD.y);
                }

            }

            return new THREE.Vector3(pos.x, pos.y, pos.z);
        };

        this.composeVertexShader = function(renderMode) {
            return this.composeStandardVertexShader(renderMode);
        };

        this.composeFragmentShader = function(renderMode) {
            var fragmentShader = "";
            switch (lhs.multiViewParameters.displayType) {
                case "square"  :
                case "diamond" :
                    fragmentShader = this.composeStandardFragmentShader(renderMode); break;
                default:
                    fragmentShader = this.composeTileViewFragmentShader(renderMode);
                    console.log('LeiaCore: unknown display type. Please use official display configuration files only.');
            }

            return fragmentShader;
        };

        this.composeStandardVertexShader = function(renderMode) {
            var vertexShader  = "varying vec2 vUv;\n"+
                                "void main() {\n"+
                                "    vUv = uv;\n"+
                                "    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n"+
                                "}";
            return vertexShader;
        };

        this.composeTileViewFragmentShader = function(renderMode) {
            var fragmentShader  = "varying vec2 vUv;\n";
            fragmentShader     +=  "uniform sampler2D tTexture0;\n";
            fragmentShader     +=  "void main() {\n";
            fragmentShader     += "  gl_FragColor = texture2D(tTexture0, vUv);\n";
            fragmentShader     += "}\n";
            return fragmentShader;
        };

        this.composeStandardFragmentShader = function(renderMode) {
            var mvp             = lhs.multiViewParameters;
            var displayType     = mvp.displayType;
            var canvasRotation  = mvp.canvasRotation;
            var fragmentShader  = "varying vec2 vUv;\n";
            fragmentShader     += "uniform sampler2D tTexture0;\n";
            fragmentShader     += "vec2 pixelCoord, sPixId, viewId;\n";
            if (displayType == "diamond"){
                fragmentShader += "float parityId;\n";
            }
            fragmentShader     += "void idPixel() {\n" ;
            fragmentShader     += "  pixelCoord = vec2(";
            switch (canvasRotation) {
                case "0deg":
                    fragmentShader += "floor(vUv.s*"+mvp.displayResolution.x.toFixed(1)+"),floor((vUv.t)*"+mvp.displayResolution.y.toFixed(1)+")";
                    break;
                case "90deg":
                    fragmentShader += "floor((1.0-vUv.t)*"+mvp.displayResolution.x.toFixed(1)+"),floor((vUv.s)*"+mvp.displayResolution.y.toFixed(1)+")";
                    break;
                default:
                    console.log('Warning: wrong canvas rotation setting in configuration file. Please use official LEIA configuration files only.');
            }
            fragmentShader     += ");\n";
            if (renderMode === lhs.RENDER_MODES.SWIZZLE) {
                fragmentShader += "  sPixId = vec2(floor(pixelCoord.s/"+mvp.numberOfViews.x.toFixed(1)+"),floor(pixelCoord.t/"+mvp.numberOfViews.y.toFixed(1)+") );\n";
                fragmentShader += "  viewId = vec2(mod(pixelCoord.s,"+mvp.numberOfViews.x.toFixed(1)+"),mod(pixelCoord.t,"+mvp.numberOfViews.y.toFixed(1)+") );\n";
                if (displayType == "diamond") {
                    fragmentShader += "  parityId = mod(sPixId.t, 2.0);\n";
                    fragmentShader += "  if (parityId == 1.0) {\n";
                    fragmentShader += "    sPixId = vec2( floor((pixelCoord.s-4.0)/"+mvp.numberOfViews.x.toFixed(1)+"), floor(pixelCoord.t/"+mvp.numberOfViews.y.toFixed(1)+") );\n";
                    fragmentShader += "    viewId = vec2(   mod((pixelCoord.s-4.0),"+mvp.numberOfViews.x.toFixed(1)+"),   mod(pixelCoord.t,"+mvp.numberOfViews.y.toFixed(1)+") );\n";
                    fragmentShader += "  }\n";
                }
            } else {
                fragmentShader += "  sPixId = vec2(mod(pixelCoord.s,"+mvp.viewResolution.x.toFixed(1)+"),mod(pixelCoord.t, "+mvp.viewResolution.y.toFixed(1)+") );\n";
                fragmentShader += "  viewId = vec2(floor(pixelCoord.s/"+mvp.viewResolution.x.toFixed(1)+"),floor(pixelCoord.t/"+mvp.viewResolution.y.toFixed(1)+") );\n";
            }
            fragmentShader     +=  "}\n";
            fragmentShader     +=  "vec4 getPixel( in vec2 view, in vec2 sPix";
            if (displayType == "diamond"){
                fragmentShader += ", in float parity";
            }
            fragmentShader     +=  ") {\n";

            switch(this.modeId) {
                case lhs.MULTIVIEW_MODES.FLAT:
                    fragmentShader +=  "  vec2 viewPos = vec2(0, 0);\n";
                    break;
                case lhs.MULTIVIEW_MODES.TVH:
                    var center      =  mvp.numberOfViews.x/2;
                    fragmentShader +=  "  vec2 viewPos;\n";
                    fragmentShader +=  "  if (viewId.s<"+center.toFixed(1)+") {\n";
                    fragmentShader +=  "    viewPos = vec2(0, 0);\n";
                    fragmentShader +=  "  } else {\n";
                    fragmentShader +=  "    viewPos = vec2(1, 0);\n";
                    fragmentShader +=  "  }\n";
                    break;
                case lhs.MULTIVIEW_MODES.BASIC:
                    fragmentShader +=  "  vec2 viewPos = viewId;\n";
                    break;
                case lhs.MULTIVIEW_MODES.SS4X:
                    var maxId = new THREE.Vector2(this.numberOfTiles.x-1, this.numberOfTiles.y-1);
                    fragmentShader +=  "  vec2 viewPos = vec2(1.0, 1.0) + 2.0*view;\n";
                    fragmentShader +=  "  viewPos = vec2( min("+maxId.x.toFixed(1)+", max(0.0, viewPos.s)), min("+maxId.y.toFixed(1)+", max(0.0, viewPos.t)) );\n";
                    break;
                default:
                    throw new Error('Error: fragment shader not implemented for mode ['+this.modeId+']. Initializing flat shader');
                    fragmentShader += "  vec2 viewPos = vec2(0, 0);\n";
            }

            var fraction = {
                 x : 1.0/(mvp.tileResolution.x * this.numberOfTiles.x),
                 y : 1.0/(mvp.tileResolution.y * this.numberOfTiles.y)
            };
            fragmentShader     += "  vec4 res = vec4(1.0, 0.0, 0.0, 1.0);\n";
            switch (displayType){
                case "square":
                    fragmentShader +=  "  vec2 id = vec2( "+fraction.x.toFixed(8)+"*(sPix.s+viewPos.s*"+mvp.tileResolution.x.toFixed(1)+"+0.5) , "+fraction.y.toFixed(8)+"*(sPix.t+viewPos.t*"+mvp.tileResolution.y.toFixed(1)+"+0.5));\n";
                    fragmentShader +=  "  res = texture2D( tTexture0, id );\n";
                    break;
                case "diamond":
                    fragmentShader += "  vec2 idA = vec2( "+fraction.x.toFixed(8)+"*(2.0*sPix.s+viewPos.s*"+mvp.tileResolution.x.toFixed(1)+"+0.5) , "+fraction.y.toFixed(8)+"*(sPix.t+viewPos.t*"+mvp.tileResolution.y.toFixed(1)+"+0.5));\n";
                    fragmentShader += "  vec2 idB;\n";
                    fragmentShader += "  if (parity == 1.0) {\n";
                    fragmentShader += "    idB = vec2( "+fraction.x.toFixed(8)+"*(2.0*sPix.s+0.5+viewPos.s*"+mvp.tileResolution.x.toFixed(1)+"+0.5) , "+fraction.y.toFixed(8)+"*(sPix.t+viewPos.t*"+mvp.tileResolution.y.toFixed(1)+"+0.5));\n";
                    fragmentShader += "  } else {\n";
                    fragmentShader += "    idB = vec2( "+fraction.x.toFixed(8)+"*(2.0*sPix.s-0.5+viewPos.s*"+mvp.tileResolution.x.toFixed(1)+"+0.5) , "+fraction.y.toFixed(8)+"*(sPix.t+viewPos.t*"+mvp.tileResolution.y.toFixed(1)+"+0.5));\n";
                    fragmentShader += "  }\n";
                    fragmentShader += "  res = 0.5 * ( texture2D( tTexture0, idA) + texture2D( tTexture0, idB) ); \n";
                    break;
                default:
                    console.log('Warning: display type in configuration file. Please use official LEIA configuration files only.');

            }
            fragmentShader     += "  return res;\n";
            fragmentShader     +=  "}\n";
            fragmentShader     +=  "void main() {\n";
            fragmentShader     +=  "  idPixel();\n";

            var shaderMatrix = this.matrix;
            var myMax = shaderMatrix.length;
            var mvsx  = this.matrixTileStep.x;
            var mvsy  = this.matrixTileStep.y;
            var mcy   = (myMax-1)/2;
            fragmentShader += "  vec4 pixelRGBA = ";
            if ((myMax % 2) == 0) {
                throw new Error('Cannot compute fragment shader for mode ['+this.modeId+']. Matrix needs to be of dimension (2n+1)x(2m+1); e.g 1x1, 1x3, 3x5, 7x3, etc.')
            }
            for (var myid=0; myid<myMax; myid++){
                var mxMax = shaderMatrix[myid].length;
                if ((mxMax % 2) == 0) {
                    throw new Error('Cannot compute fragment shader for mode ['+this.modeId+']. Matrix needs to be of dimension (2n+1)x(2m+1); e.g 1x1, 1x3, 3x5, 7x3, etc.')
                }
                var mcx = (mxMax-1)/2;
                for (var mxid=0; mxid<mxMax; mxid++){
                    var m = shaderMatrix[myid][mxid];
                    var vsx = mvsx*(mxid-mcx);
                    var vsy = mvsy*(myid-mcy);
                    var viewShiftX = "";
                    var viewShiftY = "";
                    if (Math.abs(vsx)>0) viewShiftX = ((vsx<0)?"":"+") + vsx.toFixed(2);
                    if (Math.abs(vsy)>0) viewShiftY = ((vsy<0)?"":"+") + vsy.toFixed(2);
                    if (Math.abs(m)>0){
                        if ((vsx == 0)&&(vsy==0)) {
                            fragmentShader += "+"+m.toFixed(3)+"*getPixel(viewId, sPixId";
                        } else {
                            fragmentShader += "+"+m.toFixed(3)+"*getPixel(vec2(viewId.s"+viewShiftX+", viewId.t"+viewShiftY+"), sPixId";
                        }
                        if (displayType == "diamond"){
                            fragmentShader += ", parityId";
                        }
                        fragmentShader += ")";
                    }
                }
            }
            fragmentShader     += ";\n";
            fragmentShader     += "  gl_FragColor = pixelRGBA;\n";
            fragmentShader     += "}\n";
            return fragmentShader;
        };


        this.init = function (parameters) {
            if (parameters === undefined) {
                throw new Error('multiViewMode needs to be instantiated with parameters. Please see examples.')
            }

            this.viewDirections = [];
            this.modeId = parameters.modeId;

            switch (parameters.modeId) {
                case lhs.MULTIVIEW_MODES.FLAT   : this.initFlatCamera(parameters);   break;
                case lhs.MULTIVIEW_MODES.HPO    : this.initHPOCamera(parameters);    break;
                case lhs.MULTIVIEW_MODES.VPO    : this.initVPOCamera(parameters);    break;
                case lhs.MULTIVIEW_MODES.TVH    : this.initTVHCamera(parameters);    break;
                case lhs.MULTIVIEW_MODES.TVV    : this.initTVVCamera(parameters);    break;
                case lhs.MULTIVIEW_MODES.BASIC  : this.initBasicCamera(parameters);  break;
                case lhs.MULTIVIEW_MODES.SS2X   : this.initSS2XCamera(parameters);   break;
                case lhs.MULTIVIEW_MODES.SS4X   : this.initSS4XCamera(parameters);   break;
            }

        };

        this.init(parameters);
    };


    this.checkUpdate = function() {

        if (this._matricesNeedUpdate){
            this.updateProjectionMatrices();
            this._matricesNeedUpdate = false;
        }
    };

    this.calculateProjectionMatrix = function(camPosition) {
        // camPosition is the XY position of sub-camera relative to the camera array center
        var D = this._ScreenCameraDistance;
        var X = {min: -0.5 * this._width, max: 0.5 * this._width};
        var Y = {min: -0.5 * this._height, max: 0.5 * this._height};

        // putting the max here ensures that the nearPlane is between the camera plane and the holo plane
        var Z = {max: D-this._farPlane, min: Math.max(D-this._nearPlane,0)};

        var projectionMatrix = new THREE.Matrix4();

        var m11 = (2*D) / (X.max - X.min);
        var m22 = (2*D) / (Y.max - Y.min);
        var m13 = (X.max + X.min - 2 * camPosition.x) / (X.max - X.min);
        var m23 = (Y.max + Y.min - 2 * camPosition.y) / (Y.max - Y.min);
        var m14 = -(2*D * camPosition.x) / (X.max - X.min);
        var m24 = -(2*D * camPosition.y) / (Y.max - Y.min);
        var m33 = -(Z.max + Z.min) / (Z.max - Z.min);
        var m34 = -2 * Z.max * Z.min / (Z.max - Z.min);

        projectionMatrix.set(
            m11,   0,  m13,  m14,
            0,   m22,  m23,  m24,
            0,     0,  m33,  m34,
            0,     0,   -1,    0
        );

        return projectionMatrix;
    };

    this.updateProjectionMatrices = function() {
        this.projectionMatrices = [];
        var nx = this.currentMode.numberOfTiles.x;  // number of cameras along x direction
        var ny = this.currentMode.numberOfTiles.y;  // number of cameras along y direction

        var distanceToScreen    = this._ScreenCameraDistance;  // unit: webgl
        var baselineScaling     = this._baselineScaling;
        var stretchFactor       = distanceToScreen*baselineScaling;
        var camShiftX = this.cameraShift.x;
        var camShiftY = this.cameraShift.y;

        for (var j = 0; j < ny; j++) {
            for (var i = 0; i < nx; i++) {
                var idx = nx*j + i;
                var camPosition = {
                      x: stretchFactor*this.currentMode.viewDirections[idx].x - camShiftX,
                      y: stretchFactor*this.currentMode.viewDirections[idx].y - camShiftY
                };
                var projectionMatrix = this.calculateProjectionMatrix(camPosition);
                this.projectionMatrices.push(projectionMatrix);
            }
        }
        this.isUpdated = true;   //not used
    };

    this.setMode = function(mode) {
        this.currentMode = this.modes[mode];
        this._matricesNeedUpdate = true;
    };


    this.init = function(parameters) {
            for (var mode in lhs.MULTIVIEW_MODES){
                this.modes[lhs.MULTIVIEW_MODES[mode]] = new multiViewMode({ modeId: lhs.MULTIVIEW_MODES[mode]} );
            }
    };
    this.setDefaultConfig();
    this.init();

}

//====================== Holo Objects ==========================================

//======================The HoloCamera Object ==================================


function LeiaHoloCamera(parameters){

  this._position              = new THREE.Vector3(0,0,this._ScreenCameraDistance);
  this._lookAtVector          = new THREE.Vector3(0,0,0);
  this._holoviewHasChanged    = false;

  this._updateVectors= function(){
      this._up.normalize();
      this._holoScreenCenter.copy(this._lookAtVector);
      this._cameraCenterPosition.copy(this._position);
      this._normal.copy( ( (new THREE.Vector3()).subVectors(this._position,this._lookAtVector) ).normalize() );
      this._ScreenCameraDistance=((new THREE.Vector3()).subVectors(this._position,this._lookAtVector)).length();
      this._updateIntrinsicParametersAfterDistanceChange();
    }

   this.setCameraAtDistance= function(newDistance){

        this._ScreenCameraDistance= newDistance;
        this._position.copy((((new THREE.Vector3()).copy(this._normal)).multiplyScalar(this._ScreenCameraDistance)).add(this._lookAtVector));
        this._cameraCenterPosition.copy(this._position);
        this._updateIntrinsicParametersAfterDistanceChange();
   }

    this._updateIntrinsicParametersAfterDistanceChange=function(){

        this._width               = 2*Math.tan(this._fov/2)*(this._ScreenCameraDistance);
        this._height              = this._width/this.mvp.aspectRatio;
        this._baseline            = this._baselineScaling*this.deltaN*this._ScreenCameraDistance;
        this._nearPlane           = this._maxDisparity*this._ScreenCameraDistance/(this._baseline+this._maxDisparity);
        //this._farPlane            = ( (this._maxDisparity>=this._baseline)? -Infinity :-(this._maxDisparity*this._ScreenCameraDistance/(this._baseline-this._maxDisparity))); // math formula
        this._farPlane            = ( (this._maxDisparity>=this._baseline)? -20000 :-(this._maxDisparity*this._ScreenCameraDistance/(this._baseline-this._maxDisparity))); // math formula
        this._matricesNeedUpdate  = true;
        this._holoviewHasChanged  = true;
    }

   this.setBaselineScaling= function(newBaselineScaling){
        this._baselineScaling     = newBaselineScaling;
        this._baseline            = this._baselineScaling*this.deltaN*this._ScreenCameraDistance;
        this._nearPlane           = this._maxDisparity*this._ScreenCameraDistance/(this._baseline+this._maxDisparity);
        this._farPlane            = ( (this._maxDisparity>=this._baseline)? -20000 :-(this._maxDisparity*this._ScreenCameraDistance/(this._baseline-this._maxDisparity))); // math formula
        this._matricesNeedUpdate  = true;
        this._holoviewHasChanged  = true;
   }

   this.setFOV = function(newFOV){
        this._fov= newFOV;
        this.setCameraAtDistance(this._width/(2*Math.tan(this._fov/2)));
   }

    this.lookAt= function (newLookAt){
        this._lookAtVector.copy(newLookAt);
        this._updateVectors();
      }

    this.setWidth=function(newWidth){
      this.setCameraAtDistance(newWidth/(2*Math.tan(this._fov/2)));
    }

    this.setPosition=function(newPosition){
      var oldThirdVector = new THREE.Vector3().crossVectors(this._normal,this._up);
      this._normal.copy(newNormal);
      var upProjectionOnNormal=((new THREE.Vector3()).copy(this._normal)).multiplyScalar(this._normal.dot(new THREE.Vector3(0,1,0)));
      if (upProjectionOnNormal.length()>=0.999999){
        this._up.copy(new THREE.Vector3().crossVectors(oldThirdVector,this._normal));
      }
      else{
        this._up.subVectors(new THREE.Vector3(0,1,0),upProjectionOnNormal);
      }
      this._updateVectors();
    }

    this.setUp=function(newUp){
      this._up.copy(newUp);
      this._updateVectors()
    }
}

LeiaHoloCamera.prototype = new LeiaHoloView();


//==============================================================================

//======================The HoloScreen Object ==================================


function LeiaHoloScreen(parameters){


    this._position              = new THREE.Vector3(0,0,0);
    this._holoviewHasChanged    = false;

    this.setPosition=function(newPosition){
      this._position.copy(newPosition);
      this._updateVectors();
    }

    this.setUp=function(newUp){
      this._up.copy(newUp);
      this._updateVectors()
    }

    this.setNormal=function(newNormal){
      var oldThirdVector = new THREE.Vector3().crossVectors(this._normal,this._up);
      this._normal.copy(newNormal);
      var upProjectionOnNormal=((new THREE.Vector3()).copy(this._normal)).multiplyScalar(this._normal.dot(new THREE.Vector3(0,1,0)));
      if (upProjectionOnNormal.length()>=0.999999){
        this._up.copy(new THREE.Vector3().crossVectors(oldThirdVector,this._normal));
      }
      else{
        this._up.subVectors(new THREE.Vector3(0,1,0),upProjectionOnNormal);
      }
      this._updateVectors();
    }

    this._updateVectors= function(){

      this._up.normalize();
      this._normal.normalize();
      this._holoScreenCenter.copy(this._position);
      this._cameraCenterPosition= new THREE.Vector3();
      this._cameraCenterPosition.copy(this._normal);
      this._cameraCenterPosition.multiplyScalar(this._ScreenCameraDistance);
      this._cameraCenterPosition.add(this._holoScreenCenter);
      this._holoviewHasChanged= true;
      }

   this._updateIntrinsicParameters= function(){

     this._height              = this._width/this.mvp.aspectRatio;
     this._ScreenCameraDistance= this._width/(2*Math.tan(this._fov/2));
     this._baseline            = this._baselineScaling*this.deltaN*this._ScreenCameraDistance;
     this._nearPlane           = this._maxDisparity*this._ScreenCameraDistance/(this._baseline+this._maxDisparity);
     //this._farPlane            = ( (this._maxDisparity>=this._baseline)? -Infinity :-(this._maxDisparity*this._ScreenCameraDistance/(this._baseline-this._maxDisparity))); // math formula
     this._farPlane            = ( (this._maxDisparity>=this._baseline)? -20000 :-(this._maxDisparity*this._ScreenCameraDistance/(this._baseline-this._maxDisparity))); // math formula
     this._matricesNeedUpdate  = true;
     this._holoviewHasChanged  = true;
   }

   this.setWidth= function(newWidth){
     this._width = newWidth;
     this._updateIntrinsicParameters();
     this._cameraCenterPosition= new THREE.Vector3();
     this._cameraCenterPosition.copy(this._normal);
     this._cameraCenterPosition.multiplyScalar(this._ScreenCameraDistance);
     this._cameraCenterPosition.add(this._holoScreenCenter);
   }

   this.setFOV= function (newFOV){
     this._fov= newFOV;
     this._updateIntrinsicParameters();
     this._cameraCenterPosition= new THREE.Vector3();
     this._cameraCenterPosition.copy(this._normal);
     this._cameraCenterPosition.multiplyScalar(this._ScreenCameraDistance);
     this._cameraCenterPosition.add(this._holoScreenCenter);
     }

   this.setBaselineScaling= function(newBaselineScaling){
     this._baselineScaling= newBaselineScaling;
     this._updateIntrinsicParameters();
   }
}

LeiaHoloScreen.prototype = new LeiaHoloView();


//==============================================================================
//==============================================================================

/**
 * LeiaRenderer
 *
 * @param leiaDisplay
 * @param leiaHoloScreen
 * @param parameters
 * @constructor
 */
function LeiaRenderer(leiaHoloObject, parameters) {
    this.setParameters= function(){
        this.leiaHoloObject        = leiaHoloObject;
        // If we witch back to holoObject.position.set etc we should updateVectors each time the holoObject is called
        console.log(this.leiaHoloObject.mvp);
        this.aspectRatio           = this.leiaHoloObject.mvp.aspectRatio;
        this.version               = REVISION;
        this.width                 = this.leiaHoloObject.mvp.displayResolution.x;
        this.height                = this.leiaHoloObject.mvp.displayResolution.y;
        this.canvasWidth           = null;
        this.canvasHeight          = null;
        this.currentModeId         = this.leiaHoloObject.MULTIVIEW_MODES.BASIC;
        this.renderMode            = this.leiaHoloObject.RENDER_MODES.SWIZZLE;
        this.updateTextureSettings = true;
        this.updateShaders         = true;
        this.debugMode             = false;
        this.isAnimating           = true;
        this.outputScene           = new THREE.Scene;
        this.outputGeometry        = new THREE.PlaneGeometry(this.width, this.height);
        this.outputMesh            = new THREE.Mesh(new THREE.PlaneGeometry(this.width, this.height), this.currentShaderMaterial)
        this.shifterCookie         = null;
        this.canvasShift           = null;
        this.canvasRotation        = this.leiaHoloObject.mvp.canvasRotation;
        this.orthoCamera           = new THREE.OrthographicCamera(this.width / -2, this.width / 2, this.height / 2, this.height / -2, -1, 1);
        this.cannedScene           = new THREE.Scene();
        this.emptyScene            = new THREE.Scene();
        this.timer0                = Date.now() * 0.001;
        this.timer1                = Date.now() * 0.001;
        this.timer                 = 0;
        this.textures              = null;
        this.video                 = null;
        this.videotexture          = null;
        this.leiaHoloObject.configHasChanged=false;
      }

    this.setMultiViewMode = function(multiViewMode){
        this.currentModeId          = multiViewMode;
        this.updateTextureSettings  = true;
    };

    this.getMultiViewMode = function(){
        return this.currentModeId;
    };

    this.setRenderMode = function(renderMode){
        this.renderMode             = renderMode;
        this.updateShaderMaterial   = true;
    };

    this.getRenderMode = function(){
        return this.renderMode;
    };

    this.setCannedImage = function(multiViewMode, url){
        this.setMultiViewMode(multiViewMode);
        leiaHoloObject.setMode(this.currentModeId);
        console.log('LeiaCore: Preparing shaders for render mode ['+this.leiaHoloObject.currentMode.modeId+'].');
        this.textures = [];
        var cm           = this.leiaHoloObject.currentMode;
        var mvp          = this.leiaHoloObject.multiViewParameters;
        var textureSizeX = cm.numberOfTilesOnTexture.x * mvp.tileResolution.x;
        var textureSizeY = cm.numberOfTilesOnTexture.y * mvp.tileResolution.y;

        for (var textureNumber = 0; textureNumber<cm.numberOfTextures; textureNumber++) {
            this.textures[textureNumber] = new THREE.WebGLRenderTarget(textureSizeX, textureSizeY, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat });
        }
        this.prepareShaderMaterial(this.leiaHoloObject)
        this.renderer.shadowMapEnabled = true;
        this.updateTextureSettings     = false;
        var backgroundPlaneTexture     = new THREE.ImageUtils.loadTexture(url);
        backgroundPlaneTexture.wrapS   = backgroundPlaneTexture.wrapT = THREE.RepeatWrapping;
        backgroundPlaneTexture.repeat.set(1, 1);

        var views           = this.leiaHoloObject.currentMode.numberOfTiles;
        var cm              = this.leiaHoloObject.currentMode;
        var mvp             = this.leiaHoloObject.multiViewParameters;
        var textureSizeX    = cm.numberOfTilesOnTexture.x * mvp.tileResolution.x;
        var textureSizeY    = cm.numberOfTilesOnTexture.y * mvp.tileResolution.y;
        var planeMaterial   = new THREE.MeshBasicMaterial({ map: backgroundPlaneTexture });
        var planeGeometry   = new THREE.PlaneGeometry(mvp.displayResolution.x, mvp.displayResolution.y);
        var plane           = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.castShadow    = true;
        plane.receiveShadow = true;
        this.cannedScene.add(plane);
    };

    this.prepareTextures = function () {
        this.leiaHoloObject.setMode(this.currentModeId);
        console.log('LeiaCore: Preparing shaders for render mode ['+this.leiaHoloObject.currentMode.modeId+'].');
        this.textures   = [];
        var cm          = this.leiaHoloObject.currentMode;
        var mvp         = this.leiaHoloObject.multiViewParameters;
        var textureSizeX = cm.numberOfTilesOnTexture.x * mvp.tileResolution.x;
        var textureSizeY = cm.numberOfTilesOnTexture.y * mvp.tileResolution.y;
        for (var textureNumber = 0; textureNumber<cm.numberOfTextures; textureNumber++){
            this.textures[textureNumber] = new THREE.WebGLRenderTarget(textureSizeX, textureSizeY, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat });
        }
        this.prepareShaderMaterial(this.leiaHoloObject)
        this.renderer.shadowMapEnabled  = true;
        this.updateTextureSettings      = false;
    };

    this.render = function(scene) {
      if (this.leiaHoloObject.configHasChanged){
        this.setParameters();
        this.initWithoutRenderer();
        this.render(scene);
      }
      else{
        this.timer1 = Date.now() * 0.001;
        if (!this.isAnimating) {
            this.timer0 = this.timer1 - this.timer;
        }
        if ((this.isAnimating) || (this.updateTextureSettings||this.updateShaderMaterial) ) {
            this.timer = this.timer1 - this.timer0;
            this.doRender(scene, this.leiaHoloObject);
        }
      }
    };


    this.prepareVideo = function(filename, multiViewMode) {
        this.setMultiViewMode(multiViewMode);
        this.leiaHoloObject.setMode(this.currentModeId);
        this.textures   = [];
        var cm          = this.leiaHoloObject.currentMode;
        var mvp         = this.leiaHoloObject.multiViewParameters;
        var textureSizeX, textureSizeY;
        switch (this.leiaHoloObject.multiViewParameters.displayType){
            case "square" :
                textureSizeX = cm.numberOfTilesOnTexture.x * mvp.tileResolution.x;
                textureSizeY = cm.numberOfTilesOnTexture.y * mvp.tileResolution.y;
                break;
            case "diamond":
                textureSizeX = 0.5*cm.numberOfTilesOnTexture.x * mvp.tileResolution.x;
                textureSizeY = cm.numberOfTilesOnTexture.y * mvp.tileResolution.y;
                break;
        }
        for (var textureNumber = 0; textureNumber<cm.numberOfTextures; textureNumber++){
            this.textures[textureNumber] = new THREE.WebGLRenderTarget(textureSizeX, textureSizeY, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat });
        }
        this.prepareShaderMaterial(this.leiaHoloObject)
        this.renderer.shadowMapEnabled  = true;
        this.updateTextureSettings      = false;

        var views        = this.leiaHoloObject.currentMode.numberOfTiles;
        var cm           = this.leiaHoloObject.currentMode;
        var mvp          = this.leiaHoloObject.multiViewParameters;
        var textureSizeX = cm.numberOfTilesOnTexture.x * mvp.tileResolution.x;
        var textureSizeY = cm.numberOfTilesOnTexture.y * mvp.tileResolution.y;

        this.video             = document.createElement('video');
        this.video.autoplay    = true;
        this.video.crossOrigin = "Anonymous";
        this.video.src         = filename;
        var tv                 = this.video;
        document.addEventListener('click',function(){
          console.log("\n\n\nvideo start play\n\n\n");
          tv.play();
        },false);

        this.videotexture                 = new THREE.Texture(this.video);
        this.videotexture.minFilter       = THREE.LinearFilter;
        this.videotexture.magFilter       = THREE.LinearFilter;
        this.videotexture.format          = THREE.RGBFormat;
        this.videotexture.generateMipmaps = false;
        var videoMaterial                 = new THREE.MeshBasicMaterial({ color:0xffffff, map:this.videotexture});
        var planeGeometry                 = new THREE.PlaneGeometry(mvp.displayResolution.x, mvp.displayResolution.y);
        var plane                         = new THREE.Mesh(planeGeometry, videoMaterial);
        plane.castShadow                  = true;
        plane.receiveShadow               = true;
        this.cannedScene.add(plane);
    };


    this.showVideo = function() {
        if ( this.video.readyState === this.video.HAVE_ENOUGH_DATA ) {
            //imageContext.drawImage( video, 0, 0 );
            this.videotexture.needsUpdate=true;
            if  ( this.videotexture ) this.videotexture.needsUpdate = true;
        }
        this.updateRenderer(this.leiaHoloObject);
        this.renderer.setClearColor(new THREE.Color().setRGB(0.0, 0.0, 0.0));
        this.renderer.setViewport(0, 0, this.width, this.height);
        this.renderer.setScissor (0, 0, this.width, this.height);
        this.renderer.enableScissorTest(true);
        this.renderer.render(this.cannedScene, this.orthoCamera, this.textures[0], false);
        this.displayOutput();
    };

    this.doRender = function(scene) {
        this.updateRenderer(this.leiaHoloObject);
        this.renderTiles(scene, this.leiaHoloObject, this.textures);
        this.displayOutput();
    };

    this.displayOutput = function(){
        this.outputScene.remove(this.outputMesh);
        this.outputMesh = new THREE.Mesh(this.outputGeometry, this.currentShaderMaterial)
        this.outputScene.add(this.outputMesh);
        this.renderer.setViewport(0, 0, this.canvasWidth, this.canvasHeight);
        this.renderer.setScissor (0, 0, this.canvasWidth, this.canvasHeight);
        this.renderer.enableScissorTest(true);
        this.renderer.render(this.outputScene, this.orthoCamera);
    };

    this.composeShaderUniforms = function() {
        var uniforms={};
        switch (this.leiaHoloObject.currentMode.numberOfTextures) {
            case 8: uniforms.tTexture7 = { type: "t", value: this.textures[7] };
            case 7: uniforms.tTexture6 = { type: "t", value: this.textures[6] };
            case 6: uniforms.tTexture5 = { type: "t", value: this.textures[5] };
            case 5: uniforms.tTexture4 = { type: "t", value: this.textures[4] };
            case 4: uniforms.tTexture3 = { type: "t", value: this.textures[3] };
            case 3: uniforms.tTexture2 = { type: "t", value: this.textures[2] };
            case 2: uniforms.tTexture1 = { type: "t", value: this.textures[1] };
            case 1: uniforms.tTexture0 = { type: "t", value: this.textures[0] };
        }
        return uniforms;
    };

    this.renderTiles = function(scene, textures) {
        this.renderer.setClearColor(new THREE.Color().setRGB(0.0, 0.0, 0.0));

        var currentCamera       = this.camera;
        var numberOfTextures    = this.leiaHoloObject.currentMode.numberOfTextures;
        var tileResolution      = this.leiaHoloObject.multiViewParameters.tileResolution;
        var numberOfTilesX      = this.leiaHoloObject.currentMode.numberOfTilesOnTexture.x;
        var numberOfTilesY      = this.leiaHoloObject.currentMode.numberOfTilesOnTexture.y;
        var tileId              = 0;
        var nbrOfTiles          = this.leiaHoloObject.currentMode.numberOfTiles.x * this.leiaHoloObject.currentMode.numberOfTiles.y;
        this.renderer.enableScissorTest(true);
        this.renderer.autoClear = true;
          for (var textureNumber = 0; textureNumber < numberOfTextures; textureNumber++){
            var textureOffsetPage = textureNumber * numberOfTilesX * numberOfTilesY;

                this.renderer.clear();

            for (var ty = 0; ty < numberOfTilesY; ty++) {
                var textureOffset = textureOffsetPage + ty*numberOfTilesX;
                for (var tx = 0; tx < numberOfTilesX; tx++) {
                    this.renderer.setViewport(tileResolution.x * tx, tileResolution.y * ty, tileResolution.x, tileResolution.y);
                    this.renderer.setScissor(tileResolution.x * tx, tileResolution.y * ty, tileResolution.x, tileResolution.y);
                    tileId = textureOffset + tx;
                    if (tileId < nbrOfTiles) {
                        var projectionMatrix = this.leiaHoloObject.projectionMatrices[textureOffset + tx];
                        currentCamera.projectionMatrix.copy( projectionMatrix );
                        this.textures[textureNumber].sx = tileResolution.x * tx;
                        this.textures[textureNumber].sy = tileResolution.y * ty;
                        this.textures[textureNumber].w  = tileResolution.x;
                        this.textures[textureNumber].h  = tileResolution.y;
                        this.renderer.render(scene, currentCamera, this.textures[textureNumber], false);
                    }
                 }
            }
        }
        this.renderer.autoClear = true;
    };

    this.prepareShaderMaterial = function() {
        var shaderMaterial;
        var shaderUniforms  = this.composeShaderUniforms(this.leiaHoloObject);
        var vertexShader    = this.leiaHoloObject.currentMode.composeVertexShader(this.renderMode);
        var fragmentShader  = this.leiaHoloObject.currentMode.composeFragmentShader(this.renderMode);

        shaderMaterial = new THREE.ShaderMaterial({
            uniforms: shaderUniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            depthWrite: false,
            depthTest: false,
            blending: THREE.NoBlending
        });
        this.currentShaderMaterial  = shaderMaterial;
        this.updateShaderMaterial   = false;
    };

    this.resetCentralCamera = function() {
       var cameraFOV = this.leiaHoloObject._fov;
       var aspectRatio = this.leiaHoloObject.mvp.aspectRatio;
       this.camera = new THREE.PerspectiveCamera(cameraFOV, aspectRatio, this.leiaHoloObject._nearPlane, this.leiaHoloObject._farPlane);
       this.camera.up.copy(this.leiaHoloObject._up);
       this.camera.position.copy(this.leiaHoloObject._cameraCenterPosition);
       this.camera.lookAt(this.leiaHoloObject._holoScreenCenter);
   };


   this.updateRenderer = function() {
       if (this.updateTextureSettings){
           this.prepareTextures(this.leiaHoloObject);
       } else {
           if (this.updateShaderMaterial){
               this.prepareShaderMaterial(this.leiaHoloObject);
           }
       }
       this.leiaHoloObject.checkUpdate(this.leiaHoloObject);
       this.resetCentralCamera(this.leiaHoloObject);
   };

    this.dataURLtoBlob = function(dataURL) {
        var byteString;

        // Convert base64/URLEncoded data component to raw binary data held in a string
        if (dataURL.split(',')[0].indexOf('base64') >= 0) {
            byteString = atob(dataURL.split(',')[1]);
        } else {
            byteString = unescape(dataURL.split(',')[1]);
        }

        var mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0]; // Separate out the mime component
        var ia = new Uint8Array(byteString.length); // Write the bytes of the string to a typed array

        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        return new Blob([ia], {type:mimeString});
    };

    this.saveCanvas = function(prefix) {
        var a = document.createElement("a");
        var filename = prefix + ".png";
        console.log("LeiaCore: creating image file ", filename);
        a.download = filename;
        var blob = this.dataURLtoBlob(leiaRenderer.renderer.domElement.toDataURL("image/png"));
        a.href = (window.URL || window.URL).createObjectURL(blob);
        a.click();
    };

    this.toggleMultiViewModes = function() {
        console.log('LeiaCore: Toggling multiview modes');
        var q = 0;
        var currentId = 0;
        var availableModes  = [];
        for (var mode in this.leiaHoloObject.MULTIVIEW_MODES) {
            var modeId = this.leiaHoloObject.MULTIVIEW_MODES[mode]
            availableModes[q] = mode;
            if (modeId == this.currentModeId){
                currentId = q;
            }
            q++;
        }
        this.setMultiViewMode(this.leiaHoloObject.MULTIVIEW_MODES[availableModes[(currentId+1)%q]]);
    };

    this.toggleSuperSample = function() {
        switch (this.getMultiViewMode()) {
            case this.leiaHoloObject.MULTIVIEW_MODES.BASIC :   this.setMultiViewMode(this.leiaHoloObject.MULTIVIEW_MODES.SS4X);   break;
            case this.leiaHoloObject.MULTIVIEW_MODES.SS4X  :   this.setMultiViewMode(this.leiaHoloObject.MULTIVIEW_MODES.BASIC);  break;
            default:   this.setMultiViewMode(this.leiaHoloObject.MULTIVIEW_MODES.BASIC);  break;
        }
    };

    this.toggle2D3D = function() {
        switch (this.getMultiViewMode()) {
            case this.leiaHoloObject.MULTIVIEW_MODES.BASIC :   this.setMultiViewMode(this.leiaHoloObject.MULTIVIEW_MODES.FLAT);   break;
            case this.leiaHoloObject.MULTIVIEW_MODES.FLAT  :   this.setMultiViewMode(this.leiaHoloObject.MULTIVIEW_MODES.BASIC);  break;
            default:   this.setMultiViewMode(this.leiaHoloObject.MULTIVIEW_MODES.FLAT);  break;
        }
    };

    this.toggleIsAnimating = function() {
        this.setAnimationStatus(!this.getAnimationStatus());
    };

    this.setAnimationStatus = function(setting) {
        if ((setting == true) || (setting == false)) {
            this.isAnimating = setting;
            if (this.isAnimating){
                this.setMultiViewMode(this.leiaHoloObject.MULTIVIEW_MODES.BASIC);
            } else {
                this.setMultiViewMode(this.leiaHoloObject.MULTIVIEW_MODES.SS4X);
                this.doRender(scene, this.leiaHoloObject);
            }
        }
    };

    this.getAnimationStatus = function() {
        return this.isAnimating;
    };

    this.importShaderMatrix = function(url) {
        var request = new XMLHttpRequest;
        request.open('GET', url, false);
        request.send(null);
        var m;
        if (request.status === 200) {
            var data = JSON.parse(request.responseText);
            m = data.matrix;
        } else {
            throw new Error('LeiaCore: Cannot read shader matrix file ', url);
        }
        return m;
    };

    this.toggleSwizzle = function() {  // Single, Tiled, Swizzle
        switch (this.getRenderMode()){
            case this.leiaHoloObject.RENDER_MODES.TILES    :   this.setRenderMode(this.leiaHoloObject.RENDER_MODES.SWIZZLE);  break;
            case this.leiaHoloObject.RENDER_MODES.SWIZZLE  :   this.setRenderMode(this.leiaHoloObject.RENDER_MODES.TILES);    break;
        }
    };

    this.shiftX = function(shiftX) {
        this.canvasShift.x = (this.canvasShift.x + shiftX + this.canvasShift.nbrOfViewsX) % this.canvasShift.nbrOfViewsX;
        this.setCanvasShift();
    };

    this.shiftY = function(shiftY) {
        this.canvasShift.y = (this.canvasShift.y + shiftY + this.canvasShift.nbrOfViewsY) % this.canvasShift.nbrOfViewsY;
        this.setCanvasShift();
    };

    this.setCanvasShift = function(){
      var shiftX = this.canvasShift.x;
      var shiftY = this.canvasShift.y;
      this.shifterCookie.setItem('LeiaShiftX', shiftX);
      this.shifterCookie.setItem('LeiaShiftY', shiftY);
      var sX = 0;
      var sY = 0;
      var canRot = this.canvasRotation;
      setTimeout( function() {
          var canvas = document.getElementsByTagName("canvas");

          switch (canRot) {
              case "0deg":
                  sX = shiftX;
                  sY = shiftY;
                  break;
              case "90deg":
                  sX = shiftY;
                  sY = 7 - shiftX;
                  break;
              default:
                  console.log('Warning: wrong canvas rotation setting in configuration file. Please use official LEIA configuration files only.');
          }
          canvas[0].style.setProperty("transform", "translate("+sX.toFixed(2)+"px, "+sY.toFixed(2)+"px) ", null);
      }, 0);
    };

    this.initWithoutRenderer= function(parameters){
      var nViews          = this.leiaHoloObject.multiViewParameters.numberOfViews;
      this.shifterCookie  = LeiaCookieHandler;
      this.canvasShift    = {
                              x           : this.shifterCookie.getItem('LeiaShiftX'),
                              y           : this.shifterCookie.getItem('LeiaShiftY'),
                              nbrOfViewsX : nViews.x,
                              nbrOfViewsY : nViews.y
                            };
      this.setCanvasShift();
      this.outputScene.add(this.outputMesh);
      switch (this.leiaHoloObject.multiViewParameters.canvasRotation) {
          case "0deg":
              this.renderer.setSize(this.width, this.height);
              this.canvasWidth  = this.width;
              this.canvasHeight = this.height;
              break;
          case "90deg":
              this.renderer.setSize(this.height, this.width);
              this.canvasWidth  = this.height;
              this.canvasHeight = this.width;
              break;
          default:
              console.log('Warning: wrong canvas rotation setting in configuration file. Please use official LEIA configuration files only.');
      }
    }

    this.init = function(parameters) {
        var nViews          = this.leiaHoloObject.multiViewParameters.numberOfViews;
        this.shifterCookie  = LeiaCookieHandler;
        this.canvasShift    = {
                                x           : this.shifterCookie.getItem('LeiaShiftX'),
                                y           : this.shifterCookie.getItem('LeiaShiftY'),
                                nbrOfViewsX : nViews.x,
                                nbrOfViewsY : nViews.y
                              };
        this.setCanvasShift();
        this.outputScene.add(this.outputMesh);
        this.renderer = new THREE.WebGLRenderer({
            antialias:false,
            preserveDrawingBuffer: true,
            devicePixelRatio: 1,
        });
        if (this.debugMode){
            console.log('Warning: initializing LeiaCore in debug mode.')
        }

        switch (this.leiaHoloObject.multiViewParameters.canvasRotation) {
            case "0deg":
                this.renderer.setSize(this.width, this.height);
                this.canvasWidth  = this.width;
                this.canvasHeight = this.height;
                break;
            case "90deg":
                this.renderer.setSize(this.height, this.width);
                this.canvasWidth  = this.height;
                this.canvasHeight = this.width;
                break;
            default:
                console.log('Warning: wrong canvas rotation setting in configuration file. Please use official LEIA configuration files only.');
        }
        this.resetCentralCamera(this.leiaHoloObject);
    };

    this.setParameters();
    this.init(this.leiaHoloObject);

}