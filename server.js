const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 5000;
const server = require('http').createServer(app);
const io = require('socket.io')(server);

io.on('connection', socket => {
  console.log('Connection to socket established');

  socket.on('join-room', room => {
    console.log('someone is connected on room '+room);
    socket.join(room);
  });

  socket.on('message', data => {
    io.sockets.in(data.room).emit('message', data);
  });

  socket.on('candidate', data => {
    socket.broadcast.to(data.room).emit('candidate', data);
  });

  socket.on('offer', data => {
    socket.broadcast.to(data.room).emit('offer', data);
  });

  socket.on('answer', data => {
    socket.broadcast.to(data.room).emit('answer', data);
  });

  socket.on('left', data => {
    socket.broadcast.to(data.room).emit('left', data);
  });

  socket.on('event', event => {
    console.log('Received message from socket!', event);
  });

  socket.on('disconnect', () => {
    console.log('Server has disconnected');
  });
});

// console.log that your server is up and running
server.listen(port, () => console.log(`Listening on port ${port}`));

// create a GET route
app.use(express.static(path.join(__dirname, 'client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname+'/client/build/index.html'));
});