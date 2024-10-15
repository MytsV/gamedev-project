import dgram from 'dgram';
import crypto from 'crypto';

const client = dgram.createSocket('udp4');

const calculateHmac = (message: string, secretKey: string): string => {
  return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
};

const userId = '4';
const secretKey =
  '8bfcdd2380d7285a80d29c298975b13c783734562d757abfa3066c67a65913fb';

const message = 'Hello, this is a test message!';

const hmac = calculateHmac(message, secretKey);

const data = {
  user_id: userId,
  message: message,
  hmac: hmac,
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
