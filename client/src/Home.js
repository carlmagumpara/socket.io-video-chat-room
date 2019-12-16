import React, { 
  Component 
} from 'react';
import {
  Row,
  Col,
  Form,
  Button
} from 'react-bootstrap';
import {
  toastNotification,
  stringingToSlug
} from './Utils';

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

    toastNotification('success', 'Joined');
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
      <div className="d-flex justify-content-center align-items-center vh-100 vw-100">
        <div className="text-center" style={{ width: 350 }}>
          <h1 className="mb-3">Zane RTC</h1>
          <Form onSubmit={event => {this.joinRoom(event)}}>
            <Form.Group>
              <Form.Control
                type="text"
                name="room"
                value={this.state.room}
                placeholder="Room Name"
                onChange={event => this.handleChange(event)}
              />
            </Form.Group>
            <Button className="m-2" variant="primary" type="submit">
              Join Room
            </Button>
            <Button className="m-2" variant="danger" type="submit">
              Go Live
            </Button>
          </Form>
        </div>
      </div>
    );
  }
}

export default Home;