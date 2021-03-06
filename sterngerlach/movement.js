var prev_theta;
var prev_phi;
var prev_rho;

$("*").keydown(function(e) {
  if (!camera.focusedOn) {
    camera.focusOn(SGE.ORIGIN);
  } else {
    SGE.focus_point = camera.focusedOn;
  }
  prev_theta = camera.theta;
  prev_phi = camera.phi;
  prev_rho = camera.rho;
  if (e.which===39) {
    camera.theta -= Math.PI/100;
    prev_theta = camera.theta;
  } else if (e.which===37) {
    camera.theta += Math.PI/100;
  } else if (e.which===38) {
    camera.phi -= Math.PI/100;
  } else if (e.which===40) {
    camera.phi += Math.PI/100;
  } else if (e.which===73) {
    camera.rho -= .1;
  } else if (e.which===79) {
    camera.rho += .1;
  } else if (e.which===87) {
    SGE.focus_point.y += .1;
    camera.focusOn(SGE.focus_point);
    camera.phi = prev_phi;
    camera.rho = prev_rho;
  } else if (e.which===65) {
    SGE.focus_point.x -= .1;
    camera.focusOn(SGE.focus_point);
    camera.theta = prev_theta;
    camera.rho = prev_rho;
  } else if (e.which===83) {
    SGE.focus_point.y -= .1;
    camera.focusOn(SGE.focus_point);
    camera.phi = prev_phi;
    camera.rho = prev_rho;
  } else if (e.which===68) {
    SGE.focus_point.x += .1;
    camera.focusOn(SGE.focus_point);
    camera.theta = prev_theta;
    camera.rho = prev_rho;
  }
});

var n_images = 0;
var t = 300;
var start = 0;
var end = 19;
var skip = end+1;
var delay = 0;
var start_transparency = 1;
var images;

btGo.div.onclick = function() {
  setTimeout(function() {
    var i = 0;
    images = [];
    var interval = setInterval(function () {
      if (i < n_images) {
        //images.push(viewport.canvas3d.toDataURL("png"));
        textures();
      } else {
        clearInterval(interval);
        if (n_images !== 0) {
          draw_frames();
        }
      }
      i++;
    }, t);
  }, delay);
}

btNext.div.onclick = function() {
  setTimeout(function() {
    var i = 0;
    images = [];
    var interval = setInterval(function () {
      if (i < n_images) {
        textures();
      } else {
        clearInterval(interval);
        if (n_images !== 0) {
          draw_frames();
        }
      }
      i++;
    }, t);
  }, delay);
}


function textures() {

  var renderer = viewport.__renderer;

  var depth_texture = new THREE.DepthTexture(viewport.width, viewport.height);
  var rt = new THREE.WebGLRenderTarget( viewport.width, viewport.height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
  rt.depthTexture = depth_texture;
  renderer.render(viewport.__scene, viewport.__camera, rt);

  this.png_data = new THREE.TextureLoader().load(viewport.canvas3d.toDataURL("png"));
  setTimeout(function() {
    png_data.generateMipmaps = false;
    png_data.wrapS = png_data.wrapT = THREE.ClampToEdgeWrapping;
    png_data.minFilter = THREE.LinearFilter;
    renderer.setTexture2D(png_data, 0);

    images.push({image: renderer.properties.get(png_data).__webglTexture, depth: renderer.properties.get(rt.depthTexture).__webglTexture});

  }, 5);
}




function draw_frames() {
  stop = 1;
  this.gl = viewport.__renderer.context;

  var vs_source =
  `
  precision highp float;
  attribute vec2 vert_pos;
  attribute vec2 a_texcoord;
  varying vec2 v_texcoord;
  void main() {
    v_texcoord = a_texcoord;
    gl_Position = vec4(vec2(1, -1)*vert_pos, 0, 1);
  }
  `
  var fs_source =
  `
  precision highp float;
  varying vec2 v_texcoord;
  uniform sampler2D image1;
  uniform sampler2D image2;
  uniform sampler2D depth1;
  uniform sampler2D depth2;
  uniform float iter;
  vec3 gray(vec4 col) {
    return vec3((col.r+col.g+col.b)/3.0);
  }
  float d1(vec2 dir) {
    return texture2D(depth1, v_texcoord+dir/vec2(800.0, 400.0)).r;
  }
  float d2(vec2 dir) {
    return texture2D(depth2, v_texcoord+dir/vec2(800.0, 400.0)).r;
  }
  void main() {
    vec3 pixel1 = texture2D(image1, v_texcoord).rgb;
    vec3 pixel2 = texture2D(image2, v_texcoord).rgb;
    float depth1 = d1(vec2(0, 0));
    float depth2 = d2(vec2(0, 0));

    float Ndepth1 = d1(vec2(0, -1));
    float Edepth1 = d1(vec2(1, 0));
    float Sdepth1 = d1(vec2(0, 1));
    float Wdepth1 = d1(vec2(-1, 0));

    float Ndepth2 = d2(vec2(0, -1));
    float Edepth2 = d2(vec2(1, 0));
    float Sdepth2 = d2(vec2(0, 1));
    float Wdepth2 = d2(vec2(-1, 0));

    depth1 = min(min(min(depth1, Ndepth1), min(Edepth1, Sdepth1)), Wdepth1);
    depth2 = min(min(min(depth2, Ndepth2), min(Edepth2, Sdepth2)), Wdepth2);

    if (depth1<depth2-1.0/255.0) {
      gl_FragColor = vec4(pixel1*iter+(1.0-iter)*pixel2, 1);
    } else {
      gl_FragColor = vec4(pixel2*iter+(1.0-iter)*pixel1, 1);
    }
  }
  `
  var fs2_source =
  `
  precision highp float;
  varying vec2 v_texcoord;
  uniform sampler2D image1;
  uniform sampler2D image2;
  uniform sampler2D depth1;
  uniform sampler2D depth2;
  vec3 gray(vec4 col) {
    return vec3((col.r+col.g+col.b)/3.0);
  }
  void main() {
    vec4 pixel1 = texture2D(image1, v_texcoord);
    vec4 pixel2 = texture2D(image2, v_texcoord);
    vec4 depth1 = texture2D(depth1, v_texcoord);
    vec4 depth2 = texture2D(depth2, v_texcoord);
    if (depth1.r<depth2.r) {
      gl_FragColor = depth1;
    } else {
      gl_FragColor = depth2;
    }
  }
  `
  var prgm = gl.createProgram();
  var vs = gl.createShader(gl.VERTEX_SHADER);
  var fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(vs, vs_source);
  gl.shaderSource(fs, fs_source);
  gl.compileShader(vs);
  gl.compileShader(fs);
  gl.attachShader(prgm, vs);
  gl.attachShader(prgm, fs);
  gl.linkProgram(prgm);

  var prgm2 = gl.createProgram();
  vs = gl.createShader(gl.VERTEX_SHADER);
  fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(vs, vs_source);
  gl.shaderSource(fs, fs2_source);
  gl.compileShader(vs);
  gl.compileShader(fs);
  gl.attachShader(prgm2, vs);
  gl.attachShader(prgm2, fs);
  gl.linkProgram(prgm2);


  gl.useProgram(prgm);
  gl.uniform1i(gl.getUniformLocation(prgm, "image1"), 0);
  gl.uniform1i(gl.getUniformLocation(prgm, "image2"), 1);
  gl.uniform1i(gl.getUniformLocation(prgm, "depth1"), 2);
  gl.uniform1i(gl.getUniformLocation(prgm, "depth2"), 3);
  var iter_location = gl.getUniformLocation(prgm, "iter");

  gl.useProgram(prgm2);
  gl.uniform1i(gl.getUniformLocation(prgm2, "image1"), 0);
  gl.uniform1i(gl.getUniformLocation(prgm2, "image2"), 1);
  gl.uniform1i(gl.getUniformLocation(prgm2, "depth1"), 2);
  gl.uniform1i(gl.getUniformLocation(prgm2, "depth2"), 3);

  var vertices = new Float32Array([
    -1, -1,
    -1, 1,
    1, -1,
    1, 1
  ]);
  var t_vertices = new Float32Array([
    0, 1,
    0, 0,
    1, 1,
    1, 0
  ]);

  var vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  var pal = gl.getAttribLocation(prgm2, 'vert_pos');
  gl.vertexAttribPointer(
    pal,
    2,
    gl.FLOAT,
    gl.FALSE,
    2*Float32Array.BYTES_PER_ELEMENT,  // Size of individual vertex
    0  // Offset
  );
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(pal);
  var tbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
  var tal = gl.getAttribLocation(prgm2, 'a_texcoord');
  gl.vertexAttribPointer(
    tal,
    2,
    gl.FLOAT,
    gl.FALSE,
    2*Float32Array.BYTES_PER_ELEMENT,  // Size of individual vertex
    0  // Offset
  );
  gl.bufferData(gl.ARRAY_BUFFER, t_vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(tal);

  gl.useProgram(prgm);
  var vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  var pal = gl.getAttribLocation(prgm, 'vert_pos');
  gl.vertexAttribPointer(
    pal,
    2,
    gl.FLOAT,
    gl.FALSE,
    2*Float32Array.BYTES_PER_ELEMENT,  // Size of individual vertex
    0  // Offset
  );
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(pal);
  var tbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
  var tal = gl.getAttribLocation(prgm, 'a_texcoord');
  gl.vertexAttribPointer(
    tal,
    2,
    gl.FLOAT,
    gl.FALSE,
    2*Float32Array.BYTES_PER_ELEMENT,  // Size of individual vertex
    0  // Offset
  );
  gl.bufferData(gl.ARRAY_BUFFER, t_vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(tal);

  var fb = gl.createFramebuffer();

  var tex_in = gl.createTexture();
  data_texture(gl, tex_in, null, viewport.width, viewport.height);
  var tex_out = gl.createTexture();
  data_texture(gl, tex_out, null, viewport.width, viewport.height);

  var depth_in = gl.createTexture();
  data_texture(gl, depth_in, null, viewport.width, viewport.height);
  var depth_out = gl.createTexture();
  data_texture(gl, depth_out, null, viewport.width, viewport.height);




  gl.useProgram(prgm2);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, images[start].image);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, images[start+1].image);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, images[start].depth);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, images[start+1].depth);
  gl.activeTexture(gl.TEXTURE4);
  gl.bindTexture(gl.TEXTURE_2D, depth_out);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, depth_out, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  if (end-start===1) {
    this.depth_buffer = new Uint8Array(viewport.width*viewport.height*4);
    gl.readPixels(0, 0, viewport.width, viewport.height, gl.RGBA, gl.UNSIGNED_BYTE, depth_buffer);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.useProgram(prgm);
  gl.uniform1f(iter_location, start_transparency);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, images[start].image);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, images[start+1].image);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, images[start].depth);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, images[start+1].depth);
  gl.activeTexture(gl.TEXTURE4);
  gl.bindTexture(gl.TEXTURE_2D, tex_out);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex_out, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  if (end-start===1) {
    this.buffer = new Uint8Array(viewport.width*viewport.height*4);
    gl.readPixels(0, 0, viewport.width, viewport.height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
    draw_final();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    for (var i = start+1; i < end; i++) {
      if (i !== skip) {
        tex_in = tex_out;
        var tex_out = gl.createTexture();
        data_texture(gl, tex_out, null, viewport.width, viewport.height);

        depth_in = depth_out;
        var depth_out = gl.createTexture();
        data_texture(gl, depth_out, null, viewport.width, viewport.height);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex_in);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, images[i+1].image);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, depth_in);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, images[i+1].depth);
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, depth_out);

        gl.useProgram(prgm2);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, depth_out, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (i===end-1) {
          this.depth_buffer = new Uint8Array(viewport.width*viewport.height*4);
          gl.readPixels(0, 0, viewport.width, viewport.height, gl.RGBA, gl.UNSIGNED_BYTE, depth_buffer);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.useProgram(prgm);
        gl.uniform1f(iter_location, (i-start)/(end-start)*(1-start_transparency)+start_transparency);
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, tex_out);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex_out, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (i===end-1) {
          this.buffer = new Uint8Array(viewport.width*viewport.height*4);
          gl.readPixels(0, 0, viewport.width, viewport.height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
          draw_final();
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
    }
  }
}

var c = document.createElement("canvas");
c.width = viewport.width;
c.height = viewport.height;
document.body.appendChild(c);
var gl2 = c.getContext("webgl");

function draw_final() {
  var vs_source =
  `
  precision highp float;
  attribute vec2 vert_pos;
  attribute vec2 a_texcoord;
  varying vec2 v_texcoord;
  void main() {
    v_texcoord = vec2(a_texcoord.x, 1.0-a_texcoord.y);
    gl_Position = vec4(vert_pos, 0, 1);
  }
  `
  var fs_source =
  `
  precision highp float;
  varying vec2 v_texcoord;
  uniform sampler2D image;
  uniform sampler2D depth;

  vec4 gray(vec4 col) {
    return vec4(vec3((col.r+col.g+col.b)/3.0), 1);
  }

  void main() {
    gl_FragColor = gray(texture2D(image, v_texcoord));
  }
  `

  var vs = gl2.createShader(gl2.VERTEX_SHADER);
  var fs = gl2.createShader(gl2.FRAGMENT_SHADER);
  var prgm = gl2.createProgram();
  gl2.shaderSource(vs, vs_source);
  gl2.shaderSource(fs, fs_source);
  gl2.compileShader(vs);
  gl2.compileShader(fs);
  gl2.attachShader(prgm, vs);
  gl2.attachShader(prgm, fs);
  gl2.linkProgram(prgm);
  gl2.useProgram(prgm);

  gl2.uniform1i(gl2.getUniformLocation(prgm, "image"), 0);
  gl2.uniform1i(gl2.getUniformLocation(prgm, "depth"), 1);

  var vertices = new Float32Array([
    -1, -1,
    -1, 1,
    1, -1,
    1, 1
  ]);
  var t_vertices = new Float32Array([
    0, 1,
    0, 0,
    1, 1,
    1, 0
  ]);

  var vbo = gl2.createBuffer();
  gl2.bindBuffer(gl2.ARRAY_BUFFER, vbo);
  var pal = gl2.getAttribLocation(prgm, 'vert_pos');
  gl2.vertexAttribPointer(
    pal,
    2,
    gl2.FLOAT,
    false,
    2*Float32Array.BYTES_PER_ELEMENT,  // Size of individual vertex
    0  // Offset
  );
  gl2.bufferData(gl2.ARRAY_BUFFER, vertices, gl2.STATIC_DRAW);
  gl2.enableVertexAttribArray(pal);
  var tbo = gl2.createBuffer();
  gl2.bindBuffer(gl2.ARRAY_BUFFER, tbo);
  var tal = gl2.getAttribLocation(prgm, 'a_texcoord');
  gl2.vertexAttribPointer(
    tal,
    2,
    gl2.FLOAT,
    false,
    2*Float32Array.BYTES_PER_ELEMENT,  // Size of individual vertex
    0  // Offset
  );
  gl2.bufferData(gl2.ARRAY_BUFFER, t_vertices, gl2.STATIC_DRAW);
  gl2.enableVertexAttribArray(tal);

  var tex = gl2.createTexture();
  data_texture(gl2, tex, buffer, viewport.width, viewport.height);
  var depth = gl2.createTexture();
  data_texture(gl2, depth, depth_buffer, viewport.width, viewport.height);

  gl2.activeTexture(gl2.TEXTURE0);
  gl2.bindTexture(gl2.TEXTURE_2D, tex);
  gl2.activeTexture(gl2.TEXTURE1);
  gl2.bindTexture(gl2.TEXTURE_2D, depth);

  gl2.drawArrays(gl2.TRIANGLE_STRIP, 0, 4);
}

function data_texture(gl, tex, data, width, height) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}
