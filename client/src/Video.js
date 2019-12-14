import React, { 
  Component 
} from 'react';

class Video extends Component {

  static defaultProps = {
    stream: null,
    id: null,
    className: null
  };

  render() {
    const { stream, id, className } = this.props;

    return (
      <div id={id} className={className}>
        {stream.video && stream.audio &&
          <React.Fragment>
            {stream.video && (
              <video 
                playsInline
                autoPlay
                ref={video => {
                  if (video) {
                     video.srcObject = stream.video[0]
                  }
                }}
              />
            )}
            {stream.audio && (
              <audio 
                ref={audio => { 
                  if (audio) {
                    audio.srcObject = stream.audio[0]
                  }
                }} 
                autoPlay
              />
            )}
        </React.Fragment>}
      </div>
    );
  }
}

export default Video;