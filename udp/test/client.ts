import dgram from 'dgram';
import crypto from 'crypto';

const client = dgram.createSocket('udp4');

const calculateHmac = (message: string, secretKey: string): string => {
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
};

const userId = process.argv[2];
const secretKey = process.argv[3];

const contents = '1';

const hmac = calculateHmac(JSON.stringify(contents), secretKey);

const data = {
  userId: userId,
  contents: contents,
  hmac: hmac,
  event: 'hello',
};

const messageBuffer = Buffer.from(JSON.stringify(data));

const SERVER_PORT = 8503;
const SERVER_ADDRESS = 'localhost'; // Change this if your server is on a different address

setInterval(() => {
  client.send(messageBuffer, SERVER_PORT, SERVER_ADDRESS, (error) => {
    if (error) {
      console.error('Error sending message:', error);
    }
  });
}, 1000);

// setTimeout(() => {
//   const contents = {
//     latitude: 10,
//     longitude: 5,
//   };
//
//   const hmac = calculateHmac(JSON.stringify(contents), secretKey);
//
//   const data = {
//     userId: userId,
//     contents: contents,
//     hmac: hmac,
//     event: 'move',
//   };
//
//   const messageBuffer = Buffer.from(JSON.stringify(data));
//
//   client.send(messageBuffer, SERVER_PORT, SERVER_ADDRESS);
// }, 5000);

client.on('message', (msg, rinfo) => {
  console.log(msg.toString());
});
