import { z } from 'zod';

export enum EventType {
  CONNECTION = 'connection',
  MOVE = 'move'
}

export const BaseMessageSchema = z.object({
  userId: z.string().nonempty(),
  contents: z.any(),
  event: z.string().nonempty(),
  hmac: z.string().nonempty(),
});

export type TBaseMessage = z.infer<typeof BaseMessageSchema>;

export const ConnectionMessageSchema = BaseMessageSchema.extend({
  event: z.literal(EventType.CONNECTION),
  contents: z.literal('Hello!'),
});

export type TConnectionMessage = z.infer<typeof ConnectionMessageSchema>;

export const MoveMessageSchema = BaseMessageSchema.extend({
  event: z.literal(EventType.MOVE),
  contents: z.object({
    latitude: z.number(),
    longitude: z.number()
  }),
});

export type TMoveMessage = z.infer<typeof MoveMessageSchema>;
