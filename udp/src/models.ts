import { z } from 'zod';

export enum EventType {
  HELLO = 'hello',
  MOVE = 'move',
}

export const BaseMessageSchema = z.object({
  userId: z.string().nonempty(),
  contents: z.any(),
  event: z.string().nonempty(),
  hmac: z.string().nonempty(),
});

export type TBaseMessage = z.infer<typeof BaseMessageSchema>;

export const HelloMessageSchema = BaseMessageSchema.extend({
  event: z.literal(EventType.HELLO),
  contents: z.literal('Hello!'),
});

export type TConnectionMessage = z.infer<typeof HelloMessageSchema>;

export const MoveMessageSchema = BaseMessageSchema.extend({
  event: z.literal(EventType.MOVE),
  contents: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

export type TMoveMessage = z.infer<typeof MoveMessageSchema>;

export const PlayerStateSchema = z.object({
  userId: z.string().nonempty(),
  username: z.string().nonempty(),
  latitude: z.number(),
  longitude: z.number(),
  isMain: z.boolean(),
});

export type TPlayerState = z.infer<typeof PlayerStateSchema>;

export const SongStateSchema = z.object({
  id: z.string().nonempty(),
  title: z.string().nonempty(),
  bpm: z.number(),
  onset: z.number(),
});

export type TSongState = z.infer<typeof SongStateSchema>;

export const GameStateSchema = z.object({
  players: z.array(PlayerStateSchema),
  song: SongStateSchema.optional(),
});

export type TGameState = z.infer<typeof GameStateSchema>;
