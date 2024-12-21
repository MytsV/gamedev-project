import { BaseMessageSchema, TBaseMessage } from './models.js';
import { validateMessage } from './auth.js';
import { handleMessage } from './handlers.js';
import { server } from './network/server.js';

server.on('message', async (msg, rinfo) => {
  try {
    const parsedMessage: TBaseMessage = BaseMessageSchema.parse(
      JSON.parse(msg.toString())
    );
    const isMessageValid = await validateMessage(parsedMessage);

    if (!isMessageValid) {
      throw Error(`Invalid HMAC for ${parsedMessage.userId}`);
    }

    console.log(
      `Valid message from user_id: ${parsedMessage.userId}: ${parsedMessage.contents}`
    );
    handleMessage(parsedMessage, rinfo);
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

const PORT = parseInt(process.env.PORT!);
server.bind(PORT, () => {
  console.log(`UDP server is listening on port ${PORT}`);
});
