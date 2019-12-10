import React, { 
  Component 
} from 'react';
import 'webrtc-adapter'
import io from 'socket.io-client';
import {
  hasUserMedia
} from './Utils'

class Chat extends Component {

  constructor (props) {
    super(props)
    this.state = {
      local_track_id: null,
      message: '',
      name: 'Anonymous',
      messages: [],
    }

    this.socket = null;
    this.webRTCConnection = null;
    this.handleLeavePage = this.handleLeavePage.bind(this);
  }

  componentDidMount() {
    this.setSocketEvents();
    window.addEventListener('beforeunload', this.handleLeavePage);
  }

  UNSAFE_componentWillUnmount() {
    window.removeEventListener('beforeunload', this.handleLeavePage);
  }

  handleLeavePage() {
    const { match: { params } } = this.props;

    this.socket.emit('left', {
      room: params.room,
      trackid: this.state.local_track_id
    });
    return true;
  }

  setSocketEvents() {
    const { match: { params } } = this.props;

    let url = null;

    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
      url = 'http://localhost:5000';
    } else {
      url = window.location.protocol + '//' + window.location.hostname;
    }

    this.socket = io(url);

    this.socket.on('connect', () => {
      console.log('connect on room '+params.room);
      this.socket.emit('join-room', params.room);
      this.setUpWebRTC();
    });

    this.socket.on('message', data => {
      console.log(data);
      this.setState({
        messages: [
          ...this.state.messages, 
          data
        ]
      });
    });

    this.socket.on('candidate', data => {
      console.log('candidate');
      console.log(data);
      this.onCandidate(data.candidate);
    });

    this.socket.on('offer', data => {
      console.log('offer');
      console.log(data);
      this.onOffer(data.offer);
    });

    this.socket.on('answer', data => {
      console.log('answer');
      console.log(data);
      this.onAnswer(data.answer);
    });

    this.socket.on('left', data => {
      console.log('left');
      console.log(data);
      this.onLeft(data.trackid);
    });

    this.socket.on('event', data => {
      console.log('event');
      console.log(data);
    });

    this.socket.on('disconnect', () => {
      console.log('disconnect');
    });
  }

  setUpWebRTC() {
    if (hasUserMedia()) {
        navigator.getUserMedia = navigator.getUserMedia || navigator.mediaDevices.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        navigator.getUserMedia({ 
          video: true, 
          audio: true 
        }, stream => {
          this.setLocalStream(stream);
          this.connection();
          this.addTracks(stream);
          this.createOffer();
       }, error => {
          console.log(error);
          alert('Error. WebRTC is not supported!'); 
       });
    } else {
      alert('Error. WebRTC is not supported!'); 
    }
  }

  setLocalStream(stream) {
    console.log('setLocalStream(stream)');
    console.log(stream);
    const video = document.getElementById('selfview');
    if ('srcObject' in video) {
      video.srcObject = stream;
    } else {
      video.src = URL.createObjectURL(stream);
    }
    this.setState({
      local_track_id: stream.id
    });
    video.setAttribute('trackid', stream.id);
    video.setAttribute('playsinline', 'playsinline');
    video.setAttribute('webkit-playsinline', 'webkit-playsinline');
    video.onloadedmetadata = error => {
      console.log('onloadedmetadata');
      console.log(error);
      video.play();
    };

    return video;
  }

  connection() {
    console.log('connection()');

    this.webRTCConnection = new RTCPeerConnection({
      iceServers: [{ 
        urls: 'stun:stun.1.google.com:19302' 
      }]
    });

    this.webRTCConnection.onicecandidate = event => this.onIceCandidate(event);
    this.webRTCConnection.ontrack = event => this.onTrack(event);
    this.webRTCConnection.onnegotiationneeded = event => this.onNegotiationNeeded(event);
    this.webRTCConnection.onremovetrack = event => this.onRemoveTrack(event);
    this.webRTCConnection.oniceconnectionstatechange = event => this.onIceConnectionStateChange(event);
    this.webRTCConnection.onicegatheringstatechange = event => this.onIceGatheringStateChange(event);
    this.webRTCConnection.onsignalingstatechange = event => this.onSignalingStateChange(event);
  }

  createOffer() {
    const { match: { params } } = this.props;
  
    // Create an Offer
    this.webRTCConnection.createOffer(offer => { 
      this.socket.emit('offer', {
        room: params.room,
        offer: offer
      });
      this.webRTCConnection.setLocalDescription(offer); 
    }, error => { 
      alert('An error has occurred.'); 
    });
  }

  createAnswer(offer) {
    const { match: { params } } = this.props;
  
    // Create an Answer
    this.webRTCConnection.setRemoteDescription(new RTCSessionDescription(offer));
    this.webRTCConnection.createAnswer(answer => {
      this.socket.emit('answer', {
        room: params.room,
        answer: answer
      });
      this.webRTCConnection.setLocalDescription(answer);
    }, error => { 
      alert('An error has occurred.'); 
    });
  }

  onAnswer(answer) { 
    this.webRTCConnection.setRemoteDescription(new RTCSessionDescription(answer)); 
  }

  onLeft(trackid) {
    console.log('onLeft(trackid)');
    document.getElementById(trackid).remove();
  }

  onCandidate(candidate) {
    this.webRTCConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  onIceCandidate(event) {
    const { match: { params } } = this.props;

    console.log('onicecandidate');
    if (event.candidate) {
      this.socket.emit('candidate', {
        room: params.room,
        candidate: event.candidate
      });
    }
  }

  addTracks(stream) {
    stream.getTracks().forEach(track => {
      this.webRTCConnection.addTrack(track, stream);
    });
  }

  onTrack(event) {
    console.log('ontrack');
    console.log(event);
    let videoContainer = document.getElementById('remoteview');
    if (!document.getElementById(event.streams[0].id)) {
      let _div = document.createElement('div');
      _div.id = event.streams[0].id;
      videoContainer.appendChild(_div);
    }
    let streamContainer = document.getElementById(event.streams[0].id);
    if (event.track.kind === 'video') {
      let _video = document.createElement('video');
      if ('srcObject' in _video) {
        _video.srcObject = event.streams[0];
      } else {
        _video.src = URL.createObjectURL(event.streams[0]);
      }
      _video.autoplay = true;
      _video.style.height = '240px';
      _video.style.width = '320px';
      _video.id = event.track.id;
      _video.onloadedmetadata = error => {
        _video.play();
      };
      _video.setAttribute('webkit-playsinline', 'webkit-playsinline');
      streamContainer.appendChild(_video);
    } else {
      let _audio = document.createElement('audio');
      _audio.id = event.track.id;
      streamContainer.appendChild(_audio);
    }
    
    return 'x';
  }

  onNegotiationNeeded(event) {
    console.log('onNegotiationNeeded(event)');
    console.log(event);
  }

  onRemoveTrack(event) {
    console.log('onRemoveTrack(event)');
    console.log(event);
  }

  onIceConnectionStateChange(event) {
    console.log('onIceConnectionStateChange(event)');
    if (this.webRTCConnection.iceConnectionState === "failed" ||
        this.webRTCConnection.iceConnectionState === "disconnected" ||
        this.webRTCConnection.iceConnectionState === "closed") {
    }
  }

  onIceGatheringStateChange(event) {
    console.log('onIceGatheringStateChange(event)');
    console.log(event);
  }

  onSignalingStateChange(event) {
    console.log('onSignalingStateChange(event)');
    console.log(event);
  }

  onOffer(offer) {
    if (hasUserMedia()) {
        navigator.getUserMedia = navigator.getUserMedia || navigator.mediaDevices.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        navigator.getUserMedia({ 
          video: true, 
          audio: true 
        }, stream => {
          this.setLocalStream(stream);
          this.connection();
          this.addTracks(stream);
          this.createAnswer(offer);
       }, error => {
          console.log(error);
          alert('Error. WebRTC is not supported!'); 
       });
    } else {
      alert('Error. WebRTC is not supported!'); 
    }
  }

  sendMessage(event) {
    event.preventDefault();

    const { match: { params } } = this.props;
    const { name, message } = this.state;

    if (!message) return;

    this.socket.emit('message', {
      room: params.room,
      name,
      message
    });

    this.setState({
      message: ''
    });
  }

  handleChange(event) {
    event.persist();
    
    let value = null;

    if (event.target.type === 'file') {
      value = event.target.files[0];
    } else if (event.target.type === 'checkbox') {
      value = event.target.checked
    } else {
      value = event.target.value;
    }

    this.setState({
      [event.target.name]: value
    });
  }

  render() {
    const { match: { params } } = this.props;

    return (
      <div>
        <h1>You are on {params.room} channel</h1>
        <video 
          id="selfview"
          style={{
            width: 320,
            height: 240
          }}
          playsInline 
          autoPlay 
          muted>
        </video>
        <div id="remoteview">
        </div>
        <form
          onSubmit={event => {this.sendMessage(event)}}>
          <input 
            type="text"
            name="message"
            value={this.state.message}
            onChange={event => this.handleChange(event)}
          />
          <button
            type="submit">
            Send
          </button>
        </form>
        <div>
          {this.state.messages.map(data => {
            return (
              <div key={Math.random().toString(36).substring(7)}>
                {data.name} : {data.message}
              </div>
            )
          })}
        </div>
      </div>
    );
  }
}

export default Chat;