import React, { 
  Component 
} from 'react';
import './App.css';
import Home from './Home';
import Chat from './Chat';
import {
  BrowserRouter as Router,
  Switch,
  Route
} from 'react-router-dom';

class App extends Component {
  render() {
    return (
      <Router>
        <div>
          <Switch>
            <Route 
              path="/chat/r/:room" 
              render={props => <Chat key={props.match.params.room} {...props} />} 
            />
            <Route  path="/" component={Home} />
          </Switch>
        </div>
      </Router>
    );
  }
}

export default App;
