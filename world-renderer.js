'use strict';

// The mesh for each photograph lies along the original camera rays. Assigning
// different distances to its subjects keeps the original framing at rest.
function createWorldRenderer(canvas, plates, onChange) {
  const gl = canvas.getContext('webgl', {
    alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power'
  });
  if (!gl) return null;

  const vertex = `
    attribute vec2 uv;
    attribute float relief;
    uniform vec2 fit, look, aim;
    uniform float travel;
    varying mediump vec2 imageUV;
    void main() {
      imageUV = uv;
      vec2 plane = vec2(2.0*uv.x-1.0, 1.0-2.0*uv.y) * fit;
      float distanceZ = mix(3.2, 1.05, relief);
      float z = distanceZ - travel;
      vec2 projected = plane*distanceZ - aim*travel - look;
      gl_Position = vec4(projected, 0.0, z);
    }`;
  const fragment = `
    precision mediump float;
    varying mediump vec2 imageUV;
    uniform sampler2D plate;
    uniform vec2 viewport, portal;
    uniform float passage, style, cut;
    void main() {
      vec2 screen=vec2(gl_FragCoord.x/viewport.x,1.0-gl_FragCoord.y/viewport.y);
      vec2 p=screen-portal;
      float field=length(p*vec2(1.10,1.40));
      if (style < .5) field=length(vec2(p.x+.36*p.y,p.y*.32)*vec2(1.4,1.0));
      else if (style < 1.5) field=length(p*vec2(1.2,1.6))+.045*cos(atan(p.y+.00001,p.x+.00001)*6.0);
      else if (style < 2.5) field=length(p*vec2(.70,2.1));
      else if (style < 3.5) field+=.018*sin(29.0*length(p)-passage*8.0);
      float edge=mix(-.25,2.55,passage);
      float alpha=mix(1.0,1.0-smoothstep(edge-.17,edge+.24,field),cut);
      vec2 sampleUV=imageUV;
      float lens=sin(passage*3.14159265);
      if (style > 1.5 && style < 3.5) {
        sampleUV+=p*.009*lens*sin(17.0*length(p)-passage*5.0);
      }
      gl_FragColor=vec4(texture2D(plate,clamp(sampleUV,.001,.999)).rgb,alpha);
    }`;
  const program = gl.createProgram();
  for (const [type, code] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const uniforms = {};
  for (const name of ['fit','look','aim','travel','plate','viewport','portal','passage','style','cut'])
    uniforms[name] = gl.getUniformLocation(program,name);
  const uv = gl.getAttribLocation(program,'uv'), relief = gl.getAttribLocation(program,'relief');
  gl.enableVertexAttribArray(uv);
  gl.enableVertexAttribArray(relief);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0.071,0.078,0.075,1);

  function smooth(low, high, v) {
    const t = Math.max(0, Math.min(1, (v-low)/(high-low)));
    return t*t*(3-2*t);
  }
  function mound(x,y,cx,cy,rx,ry) {
    return Math.exp(-1.65*(((x-cx)/rx)**2+((y-cy)/ry)**2));
  }
  function distanceProfile(key,x,y) {
    if (key === 'wing') {
      const ledge = (1-smooth(.08,.22,x)) * .84;
      const hull = mound(x,y,.53,.46,.49,.28);
      const sail = mound(x,y,.65,.32,.15,.53);
      return Math.max(.08,ledge,.81*hull,.92*sail);
    }
    if (key === 'silver') {
      const face = mound(x,y,.50,.39,.18,.34);
      const ring = Math.hypot((x-.50)*1.52,(y-.44)*1.05);
      return .25+.23*face+.47*Math.exp(-((ring-.43)**2)/.013);
    }
    if (key === 'whale') {
      const whale = mound(x,y,.51,.36,.49,.18);
      const trees = Math.max(mound(x,y,.20,.53,.16,.26),mound(x,y,.80,.53,.16,.26));
      const figure = mound(x,y,.50,.79,.050,.20);
      return Math.max(.10+.33*smooth(.55,.99,y),.73*whale,.84*trees,figure);
    }
    if (key === 'bay') {
      const border = Math.max(Math.abs(x-.50)*1.90,Math.abs(y-.49)*1.9);
      return .13+.76*smooth(.39,.92,border);
    }
    const flowers = smooth(.16,.51,Math.abs(x-.50))*(.41+.30*y);
    return .10+.18*mound(x,y,.5,.35,.32,.36)+Math.max(flowers,.69*smooth(.58,1,y));
  }

  const cols=80, rows=45, indices=[];
  for (let j=0;j<rows;j++) for (let i=0;i<cols;i++) {
    const n=j*(cols+1)+i;
    indices.push(n,n+1,n+cols+1,n+1,n+cols+2,n+cols+1);
  }
  const indexBuffer=gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  const scenes=plates.map(img=>{
    const vertices=[];
    for(let j=0;j<=rows;j++) for(let i=0;i<=cols;i++) {
      const x=i/cols, y=j/rows;
      vertices.push(x,y,distanceProfile(img.dataset.world,x,y));
    }
    const mesh=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    return {img,mesh,texture:null};
  });
  const focuses=[[.64,.34],[.50,.43],[.52,.36],[.50,.48],[.50,.40]];
  let width=1,height=1,compact=false,lost=false;
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();
    lost=true;
    onChange();
  });
  // If the GPU disappears, the CSS camera remains interactive for this visit.
  function getTexture(scene) {
    if (scene.texture) return scene.texture;
    if (!scene.img.complete || !scene.img.naturalWidth) return null;
    const texture=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,texture);
    for(const flag of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,flag,gl.CLAMP_TO_EDGE);
    for(const flag of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,flag,gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,scene.img);
    scene.texture=texture;
    return texture;
  }
  function frameScale(index) {
    const img=scenes[index].img;
    const ratio=img.naturalWidth/img.naturalHeight/(width/height);
    return compact ? [Math.min(1,ratio),Math.min(1,1/ratio)] : [Math.max(1,ratio),Math.max(1,1/ratio)];
  }
  function drawLayer(index,texture,travel,passage,cut,from,x,y) {
    const scene=scenes[index], fit=frameScale(index);
    const aim=focuses[index];
    gl.bindBuffer(gl.ARRAY_BUFFER,scene.mesh);
    gl.vertexAttribPointer(uv,2,gl.FLOAT,false,12,0);
    gl.vertexAttribPointer(relief,1,gl.FLOAT,false,12,8);
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.uniform2f(uniforms.fit,fit[0]*1.027,fit[1]*1.027);
    gl.uniform2f(uniforms.aim,(aim[0]-.5)*2*fit[0],(.5-aim[1])*2*fit[1]);
    gl.uniform2f(uniforms.look,x*.029,y*.023);
    gl.uniform1f(uniforms.travel,travel);
    const opening=focuses[from];
    gl.uniform2f(uniforms.portal,.5+(opening[0]-.5)*fit[0],.5+(opening[1]-.5)*fit[1]);
    gl.uniform1f(uniforms.passage,passage);
    gl.uniform1f(uniforms.style,from);
    gl.uniform1f(uniforms.cut,cut);
    gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
  }
  return {
    resize(w,h,isCompact) {
      width=w; height=h; compact=isCompact;
      const scale=Math.min(window.devicePixelRatio||1,1.6,2304/Math.max(width,height));
      canvas.width=Math.max(1,Math.round(w*scale)); canvas.height=Math.max(1,Math.round(h*scale));
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.uniform2f(uniforms.viewport,canvas.width,canvas.height);
    },
    draw(from,to,t,x,y) {
      if (lost || gl.isContextLost()) return false;
      const base=getTexture(scenes[from]);
      const next=t>0 && to!==from ? getTexture(scenes[to]) : null;
      if (!base || (t>0 && from!==to && !next)) return false;
      gl.clear(gl.COLOR_BUFFER_BIT);
      drawLayer(from,base,.29*t*t,t,0,from,x,y);
      if (next) drawLayer(to,next,.09*(1-t),t,1,from,x,y);
      return true;
    }
  };
}
