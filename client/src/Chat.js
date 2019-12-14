import React, { 
  Component 
} from 'react';
import 'webrtc-adapter'
import io from 'socket.io-client';
import {
  Container,
  Row,
  Col,
  Modal,
  Button,
  Nav,
  NavItem
} from 'react-bootstrap';
import Video from './Video';

const peerConfig = {
  'iceServers': [
    {'urls': 'stun:stun.services.mozilla.com'},
    {'urls': 'stun:stun.l.google.com:19302'},
  ]
};

class Chat extends Component {

  constructor (props) {
    super(props)
    this.state = {
      video: true,
      audio: true,
      remotes: {},
      name: 'Anonymous',
      message: '',
      messages: [],
      messages_visibility: true
    }

    this.socket = null;
    this.socketId = null;
    this.localStream = null;
    this.clientsCount = 0;
    this.webRTCConnection = {};
    this.handleLeavePage = this.handleLeavePage.bind(this);
  }

  componentDidMount() {
    this.setMediaDevices();
    window.addEventListener('beforeunload', this.handleLeavePage);
  }

  UNSAFE_componentWillUnmount() {
    window.removeEventListener('beforeunload', this.handleLeavePage);
  }

  handleLeavePage() {
    return true;
  }

  setMediaDevices() {
    navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true
    })
    .then(stream => {
      console.log(stream);
      this.setLocalStream(stream);
      this.setSocketEvents();
    })
    .catch(e => console.log('getUserMedia() error: ', e));
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
      this.socketId = this.socket.id;

      this.socket.emit('join-room', params.room);

      this.socket.on('joined', data => {
        console.log('joined');
        console.log(data);
        this.setUpWebRTC(data);
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

      this.socket.on('signal', data => {
        switch(data.type) {
          case 'candidate':
            this.onCandidate(data);
            break;
          case 'offer':
            this.onOffer(data);
            break;
          case 'answer':
            this.onAnswer(data);
            break;
          default:
            // code block
        }
      });

      this.socket.on('left', data => {
        console.log('left');
        console.log(data);
        this.onLeft(data);
      });

      this.socket.on('disconnect', () => {
        console.log('disconnect');
      });


    });
  }

  setUpWebRTC(data) {
    console.log('setUpWebRTC()');
    this.clientsCount = data.clients_count;

    data.clients.map(client => {
      if (!this.webRTCConnection[client]) {
        console.log('triggered');
        this.webRTCConnection[client] = new RTCPeerConnection(peerConfig);
        this.webRTCConnection[client].onicecandidate = event => this.onIceCandidate(event);
        this.webRTCConnection[client].ontrack = event => this.onTrack(event, client);
        this.webRTCConnection[client].onnegotiationneeded = event => this.onNegotiationNeeded(event);
        this.webRTCConnection[client].onremovetrack = event => this.onRemoveTrack(event);
        this.webRTCConnection[client].oniceconnectionstatechange = event => this.onIceConnectionStateChange(event);
        this.webRTCConnection[client].onicegatheringstatechange = event => this.onIceGatheringStateChange(event);
        this.webRTCConnection[client].onsignalingstatechange = event => this.onSignalingStateChange(event);
        this.localStream.getTracks().forEach(track => {
          this.webRTCConnection[client].addTrack(track, this.localStream);
        });
      }

      return this.webRTCConnection[client];
    });

    if(data.clients_count >= 2) {
      this.createOffer(data.socket_id);
    }
  }

  setLocalStream(stream) {
    console.log('setLocalStream(stream)');
    console.log(stream);
    this.localStream = stream;
    this.localStream.getVideoTracks()[0].enabled = this.state.video;
    this.localStream.getAudioTracks()[0].enabled = this.state.audio;
    const video = document.getElementById('selfview');
    video.srcObject = stream;
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.onloadedmetadata = async error => {
      console.log('onloadedmetadata');
      console.log(error);
      await video.play();
    };

    return video;
  }


  createOffer(socket_id) {
    const { match: { params } } = this.props;
  
    // Create an Offer
    this.webRTCConnection[socket_id].createOffer(offer => { 
      this.socket.emit('signal', {
        room: params.room,
        type: 'offer',
        socket_id: this.socketId,
        offer: offer
      });
      this.webRTCConnection[socket_id].setLocalDescription(offer); 
    }, error => { 
      console.log('An error has occurred.', error);
    }, {
      offerToReceiveAudio: 1,
      offerToReceiveVideo: 1
    });
  }

  createAnswer(data) {
    const { match: { params } } = this.props;
  
    // Create an Answer
    this.webRTCConnection[data.socket_id].setRemoteDescription(new RTCSessionDescription(data.offer));
    this.webRTCConnection[data.socket_id].createAnswer(answer => {
      this.socket.emit('signal', {
        room: params.room,
        type: 'answer',
        socket_id: this.socketId,
        answer: answer
      });
      this.webRTCConnection[data.socket_id].setLocalDescription(answer);
    }, error => { 
      console.log('An error has occurred.', error);
    });
  }

  onAnswer(data) {
    this.webRTCConnection[data.socket_id].setRemoteDescription(new RTCSessionDescription(data.answer));
  }

  onLeft(socket_id) {
    console.log('onLeft(socket_id)');
    let remotes = this.state.remotes;
    delete remotes[socket_id];
    this.setState({
      remotes: remotes
    });
  }

  onCandidate(data) {
    this.webRTCConnection[data.socket_id].addIceCandidate(new RTCIceCandidate(data.candidate));
  }

  onIceCandidate(event) {
    const { match: { params } } = this.props;

    if (event.candidate) {
      this.socket.emit('signal', {
        room: params.room,
        type: 'candidate',
        socket_id: this.socketId,
        candidate: event.candidate
      });
    }
  }

  onTrack(event, client) {
    console.log('ontrack');
    console.log(event);
    console.log(this.clientsCount);
    let remotes = this.state.remotes;
    if (!remotes[client]) {
      remotes[client] = {};
    }
    remotes[client][event.track.kind] = event.streams;
    this.setState({
      remotes: {...this.state.remotes, ...remotes}
    });
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
    console.log(event);
  }

  onIceGatheringStateChange(event) {
    console.log('onIceGatheringStateChange(event)');
    console.log(event);
  }

  onSignalingStateChange(event) {
    console.log('onSignalingStateChange(event)');
    console.log(event);
  }

  onOffer(data) {
    this.createAnswer(data);
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
    const { messages_visibility } = this.state;
    console.log(params.room);

    return (
      <div id="wrapper" className={messages_visibility ? 'show' : ''}>
        <div id="messages">
          <div>
            {this.state.messages.map(data => {
              return (
                <div key={Math.random().toString(36).substring(7)}>
                  {data.name} : {data.message}
                </div>
              )
            })}
          </div>
          <div id="input">
            <form
              onSubmit={event => {this.sendMessage(event)}}>
              <input 
                type="text"
                name="message"
                value={this.state.message}
                onChange={event => this.handleChange(event)}
              />
            </form>
          </div>
        </div>
        <div id="videos-container">
          <button
            onClick={() => {
              this.setState(prevState => ({
                messages_visibility: !prevState.messages_visibility
              }));
            }}>
            Messages
          </button>

          <div className="local-video">
            <video 
              id="selfview"
              playsInline
              autoPlay
              muted
            />
            <div>
              <button
                onClick={() => {
                  const video = this.localStream.getVideoTracks()[0].enabled = !this.state.video;
                  this.setState({
                    video: video
                  });
                }}>
                Video
              </button>
              <button
                onClick={() => {
                  const audio = this.localStream.getAudioTracks()[0].enabled = !this.state.audio;
                  this.setState({
                    audio: audio
                  });
                }}>
                Audio
              </button>
              <button
                onClick={() => {
                  this.webRTCConnection[this.socketId].close();
                }}>
                End Call
              </button>
            </div>
          </div>
          {Object.keys(this.state.remotes).map(key => {
            let stream = this.state.remotes[key];
            let className = (Object.keys(this.state.remotes).length === 1) ? 'full-screen-video' : 'remote-video';
            return (
              <Video 
                id={key} 
                key={key} 
                stream={stream}
                className={className}
              />
            );
          })}
        </div>
      </div>
    );
  }
}

export default Chat;