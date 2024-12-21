import {
  ConnectionMessageSchema,
  EventType,
  MoveMessageSchema,
  TBaseMessage,
  TConnectionMessage,
  TMoveMessage,
} from './models.js';
import { z } from 'zod';
import dgram from 'dgram';
import { startPublishingState } from './network/publisher.js';

const eventSchemas = new Map<EventType, z.ZodSchema<any>>([
  [EventType.CONNECTION, ConnectionMessageSchema],
  [EventType.MOVE, MoveMessageSchema],
]);

const connectionHandler = (
  message: TConnectionMessage,
  rinfo: dgram.RemoteInfo
) => {
  startPublishingState(message.userId, rinfo);
};

const moveHandler = (message: TMoveMessage, rinfo: dgram.RemoteInfo) => {};

const eventHandlers = new Map<
  EventType,
  (message: any, rinfo: dgram.RemoteInfo) => void
>([
  [EventType.CONNECTION, connectionHandler],
  [EventType.MOVE, moveHandler],
]);

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
  handler(parsedMessage, rinfo);
};
