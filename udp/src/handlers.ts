import {
  EventType,
  HelloMessageSchema,
  MarkMessageSchema,
  MoveMessageSchema,
  StatusMessageSchema,
  TBaseMessage,
  TConnectionMessage,
  TMarkMessage,
  TMoveMessage,
  TStatusMessage,
} from './models.js';
import { z } from 'zod';
import dgram from 'dgram';
import { publishState, stopStatePublish } from './network/publisher.js';
import { issueMove } from './game/positioning.js';
import { changeStatus, issueMark } from './game/status.js';

const lastActivity = new Map<string, number>();

const eventSchemas = new Map<EventType, z.ZodSchema<any>>([
  [EventType.HELLO, HelloMessageSchema],
  [EventType.MOVE, MoveMessageSchema],
  [EventType.STATUS, StatusMessageSchema],
  [EventType.MARK, MarkMessageSchema],
]);

const helloHandler = (message: TConnectionMessage, rinfo: dgram.RemoteInfo) => {
  publishState(message.userId, message.contents, rinfo);
};

const moveHandler = (message: TMoveMessage, rinfo: dgram.RemoteInfo) => {
  issueMove(message.userId, {
    latitude: message.contents.latitude,
    longitude: message.contents.longitude,
  });
};

const statusHandler = (message: TStatusMessage, rinfo: dgram.RemoteInfo) => {
  changeStatus(message.userId, message.contents);
};

const markHandler = (message: TMarkMessage, rinfo: dgram.RemoteInfo) => {
  issueMark(message.userId, message.contents);
};

const eventHandlers = new Map<
  EventType,
  (message: any, rinfo: dgram.RemoteInfo) => void
>([
  [EventType.HELLO, helloHandler],
  [EventType.MOVE, moveHandler],
  [EventType.STATUS, statusHandler],
  [EventType.MARK, markHandler],
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
