import dgram from 'dgram';
import crypto from 'crypto';

const client = dgram.createSocket('udp4');

const calculateHmac = (message: string, secretKey: string): string => {
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
};

const userId = '10';
const secretKey =
  '9f634268a6feac5460a6ee678e9261206c35d61bce4a71948ce797e77b7517de';

const contents = 'Hello!';

const hmac = calculateHmac(JSON.stringify(contents), secretKey);

const data = {
  userId: userId,
  contents: contents,
  hmac: hmac,
  event: 'connection',
};

const messageBuffer = Buffer.from(JSON.stringify(data));

const SERVER_PORT = 8503;
const SERVER_ADDRESS = 'localhost'; // Change this if your server is on a different address

client.send(messageBuffer, SERVER_PORT, SERVER_ADDRESS, (error) => {
  if (error) {
    console.error('Error sending message:', error);
  } else {
    console.log('Message sent:', data);
  }

  client.close();
});
