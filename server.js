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
    let clients = [...new Set(Object.keys(io.sockets.adapter.rooms[room].sockets))];
    io.sockets.in(room).emit('joined', { 
      socket_id: socket.id, 
      clients, 
      clients_count: clients.length  
    });
  });

  socket.on('message', data => {
    io.sockets.in(data.room).emit('message', data);
  });

  socket.on('signal', data => {
    socket.broadcast.to(data.room).emit('signal', data);
  });

  socket.on('disconnect', () => {
    console.log('Server has disconnected');
    let rooms = io.sockets.adapter.rooms;
    console.log(rooms);
    io.sockets.emit('left', socket.id);
  });
});

// console.log that your server is up and running
server.listen(port, () => console.log(`Listening on port ${port}`));

// create a GET route
app.use(express.static(path.join(__dirname, 'client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname+'/client/build/index.html'));
});