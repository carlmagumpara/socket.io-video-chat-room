import React, { 
  Component 
} from 'react';
import {
  stringingToSlug
} from './Utils'

class Home extends Component {

  constructor (props) {
    super(props)
    this.state = {
      room: ''
    }
  }

  joinRoom(event) {
    event.preventDefault();
    const { room } = this.state;

    if (room === '') return false;

    this.props.history.push('/chat/r/'+stringingToSlug(room));
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
    return (
      <div>
        <form
          onSubmit={event => {this.joinRoom(event)}}>
          <label>Room Name</label>
          <input 
            type="text"
            name="room"
            value={this.state.room}
            onChange={event => this.handleChange(event)}
          />
          <button
            type="submit">
            Join
          </button>
        </form>
      </div>
    );
  }
}

export default Home;