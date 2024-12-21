import { z } from 'zod';

export const BaseMessageSchema = z.object({
  userId: z.string().nonempty(),
  contents: z.any(),
  event: z.string().nonempty(),
  hmac: z.string().nonempty(),
});

export type TBaseMessage = z.infer<typeof BaseMessageSchema>;

export const ConnectionMessageSchema = BaseMessageSchema.extend({
  event: z.literal('connection'),
  contents: z.literal('Hello!'),
});

export type TConnectionMessage = z.infer<typeof ConnectionMessageSchema>;
