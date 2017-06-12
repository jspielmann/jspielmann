
class AudioMixer {
  constructor() {
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.actx = new AudioContext();
      this.audioBuffer = null;
      this.masterPan = this.createPanner();
      this.masterGainNode = this.actx.createGain();
      this.splitterNode = this.actx.createChannelSplitter(2);
      this.masterAnalyserLeft = this.actx.createAnalyser()
      this.masterAnalyserLeft.smoothingTimeConstant = 0.3;
      this.masterAnalyserLeft.fftSize = 2048;

      this.masterAnalyserRight = this.actx.createAnalyser();
      this.masterAnalyserRight.smoothingTimeConstant = 0.3;
      this.masterAnalyserRight.fftSize = 2048;

      this.updateNode = this.actx.createScriptProcessor(2048, 1, 1);
      this.updateNode.onaudioprocess = this.drawUpdateTarget.bind(this);
      this.gain = 1;

    } catch (e) {
      alert("Your browser does not support this application. Use firefox, chrome or edge.");
      console.log("no audio context support");
    }
  }

  onError(e) {
    console.log(e);
  }

  createPanner() {
    if(this.actx.createStereoPanner) {
      console.log("error");
      return this.actx.createStereoPanner();
    } else {
      // webkit
      this.multiChannelPanner = true;
      let pannerNode = this.actx.createPanner();
			pannerNode.panningModel = 'equalpower';
      return pannerNode;
    }
  }

  loadSounds(url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // Decode asynchronously
    request.onload = () => {
      this.actx.decodeAudioData(request.response, (buffer) => {
        this.audioBuffer = buffer;
        this.connect();
        this.play();
      }, this.onError);
    }
    request.send();
  }

  play() {
    this.source.start(0);
  }

  connect() {
    this.updateNode.connect(this.actx.destination);

    this.source = this.actx.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.masterPan);
    this.masterPan.connect(this.masterGainNode);

    this.masterGainNode.connect(this.actx.destination);
    this.masterGainNode.connect(this.splitterNode);
    this.splitterNode.connect(this.masterAnalyserLeft, 0, 0);
    this.splitterNode.connect(this.masterAnalyserRight, 1, 0);

    this.masterAnalyserLeft.connect(this.updateNode);
  }

  setMaster(gain) {
    this.gain = gain;
    this.masterGainNode.gain.value = gain;
  }

  setPan(pan) {
    if(!this.multiChannelPanner) {
      this.masterPan.pan.value = pan;
    } else {
      let q = 1 - Math.abs(pan);
			this.masterPan.setPosition(pan, 0, q);
    }
  }

  mute() {
    if (this.masterGainNode.gain.value === 0) {
      this.masterGainNode.gain.value = this.gain;
    } else {
      this.masterGainNode.gain.value = 0;
    }
  }

  setUpdateCallback(cb1, cb2) {
    this.drawTargetLeft = cb1;
    this.drawTargetRight = cb2;
  }

  drawUpdateTarget() {
    let array = new Uint8Array(this.masterAnalyserLeft.frequencyBinCount);
    this.masterAnalyserLeft.getByteFrequencyData(array);
    let average = this.getAverageVolume(array)

    let array2 = new Uint8Array(this.masterAnalyserRight.frequencyBinCount);
    this.masterAnalyserRight.getByteFrequencyData(array2);
    let average2 = this.getAverageVolume(array2);

    this.drawTargetLeft(average);
    this.drawTargetRight(average2);
  }

  getAverageVolume(array) {
    var values = 0;
    var average;

    var length = array.length;

    // get all the frequency amplitudes
    for (var i = 0; i < length; i++) {
      values += array[i];
    }

    average = values / length;
    return average;
  }
}