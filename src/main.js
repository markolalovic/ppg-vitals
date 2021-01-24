document.querySelector('#record').addEventListener('click', onRecord);

const inProduction = true; // hide video and tmp canvas
const channel = 'r'; // red by default TODO: could include g, b

let video, c_tmp, ctx_tmp; // video from rear-facing-camera and tmp canvas
let frameCount = 0; // count number of video frames processed 
let delay = 0; // delay = 100; should give us 10 fps, estimated around 7
let burnIn = 50; // skip the initial burnIn number of frames
const rgbInit = 1.5 - 250.0/255; // expected mean intensity around .6
let rgbMean = {
  'r': rgbInit, 
  'g': rgbInit, 
  'b': rgbInit
};
let rgbMeanArr = []; // save the signal for analysis
let numOfQualityFrames = 0; // TODO: count the number of quality frames

let constraintsObj = {
    audio: false,
    video: {
        width: { ideal: 4096 },
        height: { ideal: 2160 }, 
        frameRate: {ideal: 240 },
        facingMode: 'environment' // rear-facing-camera
    }
};

function setWH() {
    let [w, h] = [video.videoWidth, video.videoHeight];
    document.getElementById('delay').innerHTML = `Frame compute delay: ${delay}`;
    document.getElementById('resolution').innerHTML = `Video resolution: ${w} x ${h}`;
    c_tmp.setAttribute('width', w);
    c_tmp.setAttribute('height', h);    
}

function init() {
    c_tmp = document.getElementById('output-canvas');
    if (inProduction) {
      c_tmp.style.display = 'none';
    }
    ctx_tmp = c_tmp.getContext('2d');
    startTime = new Date();
}

function computeFrame() {
    // if (numOfQualityFrames < ) {
    ctx_tmp.drawImage(video,
        0, 0, video.videoWidth, video.videoHeight);
    let frame = ctx_tmp.getImageData(
        0, 0, video.videoWidth, video.videoHeight);

    // process each frame
    const count = frame.data.length/4;
    let rgb = {'r': 0, 'g': 0, 'b': 0};
    for (let i=0; i < count; i++) {
        rgb['r'] += frame.data[i * 4 + 0];
        rgb['g'] += frame.data[i * 4 + 1];
        rgb['b'] += frame.data[i * 4 + 2];
    }
    // TODO: maybe invert to show the PPG signal not inverted signal
    // abs(max(x)-x)
    if (frameCount > burnIn) {
      rgbMean['r'] = 1.5 - rgb['r'] / (count*255);
      rgbMean['g'] = 1.5 - rgb['g'] / (count*255);
      rgbMean['b'] = 1.5 - rgb['b'] / (count*255);
    }

    let rgbMeanData = {
      time: new Date(),
      x: rgbMean[channel],
    };
    rgbMeanArr.push(rgbMeanData);

    document.getElementById('frame-time').innerHTML = `Frame time: ${(rgbMeanData.time - startTime) / 1000}`;
    document.getElementById('video-time').innerHTML = `Video time: ${(video.currentTime)}`;
    document.getElementById('signal').innerHTML = `X: ${rgbMeanData.x}`;

    const fps = (++frameCount / video.currentTime).toFixed(3); 
    document.getElementById('frame-fps').innerHTML = `Frame count: ${frameCount}, FPS: ${fps}`;

    ctx_tmp.putImageData(frame, 0, 0);
    setTimeout(computeFrame, delay); // continue with delay
    // } else {
    //     pauseVideo();
    // TODO: send, evaluate, show results
    // }
}

function onRecord() {
    navigator.mediaDevices.getUserMedia(constraintsObj)
    .then(function(mediaStreamObj) {

      // we must turn on the LED / torch
      const track = mediaStreamObj.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track)
      const photoCapabilities = imageCapture.getPhotoCapabilities()
        .then(() => {
          track.applyConstraints({
            advanced: [{torch: true}]
          })
          .catch(err => console.log('No torch', err));
        })
        .catch(err => console.log('No torch', err));

      video = document.getElementById('video');
      if (inProduction) {
        video.style.display = 'none';
      }

      if ("srcObject" in video) {
          video.srcObject = mediaStreamObj;
      } else {
          // for older versions of browsers
          video.src = window.URL.createObjectURL(mediaStreamObj);
      }

      video.onloadedmetadata = function(ev) {
          video.play();
      };

      init();
      video.addEventListener('play', setWH);
      video.addEventListener('play', computeFrame);
      video.addEventListener('play', drawLineChart);

      video.onpause = function() {
          console.log('paused');
      };
    })
    .catch(error => console.log(error));
}

function pauseVideo() {
    video.pause();
    video.currentTime = 0;
}

// draw the signal data as it comes
let lineArr = [];
let MAX_LENGTH = 100;
let duration = 100;
let chart = realTimeLineChart();

function randomNumberBounds(min, max) {
  return Math.floor(Math.random() * max) + min;
}

// start with dummy flat signal
function seedData() {
  let now = new Date();
  for (let i = 0; i < MAX_LENGTH; ++i) {
    lineArr.push({
      time: new Date(now.getTime() - ((MAX_LENGTH - i) * duration)),
      x: 1.5 - 250.0/255,
    });
  }
}

function updateData() {
  let now = new Date();

  let lineData = {
    time: now,
    x: rgbMean[channel],
  };
  lineArr.push(lineData);

  if (lineArr.length > 30) {
    lineArr.shift();
  }
  d3.select("#chart").datum(lineArr).call(chart);
}

function resize() {
  if (d3.select("#chart svg").empty()) {
    return;
  }
  chart.width(+d3.select("#chart").style("width").replace(/(px)/g, ""));
  d3.select("#chart").call(chart);
}

function drawLineChart() {
  seedData();
  window.setInterval(updateData, 100);
  d3.select("#chart").datum(lineArr).call(chart);
  d3.select(window).on('resize', resize);
}