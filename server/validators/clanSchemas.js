const { z } = require('zod');

const objectIdSchema = z.string().trim().length(24);

const clanIdParamsSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

const clanUserParamsSchema = {
  params: z.object({
    id: objectIdSchema,
    userId: objectIdSchema,
  }),
};

const clanNoticeIndexParamsSchema = {
  params: z.object({
    id: objectIdSchema,
    index: z.coerce.number().int().min(0),
  }),
};

const clanCreateSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(32),
    tag: z.string().trim().min(2).max(5),
    description: z.string().trim().max(256).optional().default(''),
  }),
};

const clanUpdateSchema = {
  body: z
    .object({
      name: z.string().trim().min(2).max(32).optional(),
      tag: z.string().trim().min(2).max(5).optional(),
      description: z.string().trim().max(256).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, 'At least one field is required'),
};

const clanAssignChiefSchema = {
  body: z.object({
    userId: objectIdSchema,
  }),
};

const clanAddMemberSchema = {
  body: z.object({
    userId: objectIdSchema,
  }),
};

const clanNoticeCreateSchema = {
  body: z.object({
    notice: z.string().trim().min(1).max(1000),
  }),
};

const clanLeaderboardQuerySchema = {
  query: z.object({
    status: z.enum(['active', 'archived', 'all']).default('active'),
    window: z.enum(['all', '7d', '30d']).default('all'),
  }),
};

module.exports = {
  clanIdParamsSchema,
  clanUserParamsSchema,
  clanNoticeIndexParamsSchema,
  clanCreateSchema,
  clanUpdateSchema,
  clanAssignChiefSchema,
  clanAddMemberSchema,
  clanNoticeCreateSchema,
  clanLeaderboardQuerySchema,
};
