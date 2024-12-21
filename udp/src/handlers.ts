import {
  HelloMessageSchema,
  EventType,
  MoveMessageSchema,
  TBaseMessage,
  TConnectionMessage,
  TMoveMessage,
} from './models.js';
import { z } from 'zod';
import dgram from 'dgram';
import { publishState, stopStatePublish } from './network/publisher.js';
import { issueMove } from './game/positioning.js';

const lastActivity = new Map<string, number>();

const eventSchemas = new Map<EventType, z.ZodSchema<any>>([
  [EventType.HELLO, HelloMessageSchema],
  [EventType.MOVE, MoveMessageSchema],
]);

const helloHandler = (message: TConnectionMessage, rinfo: dgram.RemoteInfo) => {
  publishState(message.userId, rinfo);
};

const moveHandler = (message: TMoveMessage, rinfo: dgram.RemoteInfo) => {
  issueMove(message.userId, {
    latitude: message.contents.latitude,
    longitude: message.contents.longitude,
  });
};

const eventHandlers = new Map<
  EventType,
  (message: any, rinfo: dgram.RemoteInfo) => void
>([
  [EventType.HELLO, helloHandler],
  [EventType.MOVE, moveHandler],
]);

const ACTIVITY_TIMEOUT = 5000;

export const handleMessage = (
  message: TBaseMessage,
  rinfo: dgram.RemoteInfo
) => {
  const schema = eventSchemas.get(message.event as EventType);
  if (!schema) {
    throw Error('Unknown event');
  }

  const handler = eventHandlers.get(message.event as EventType);
  if (!handler) {
    throw Error('Unknown event');
  }

  const parsedMessage = schema.parse(message);

  lastActivity.set(parsedMessage.userId, Date.now());

  handler(parsedMessage, rinfo);
};

setInterval(() => {
  const currentTime = Date.now();
  for (const [userId, lastTime] of lastActivity) {
    if (currentTime - lastTime > ACTIVITY_TIMEOUT) {
      lastActivity.delete(userId);
      stopStatePublish(userId);
    }
  }
}, ACTIVITY_TIMEOUT);
