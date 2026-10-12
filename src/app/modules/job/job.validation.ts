import { start } from "repl";
import { z } from "zod";

const jobValidationSchema = z.object({
  title: z.string(),
  description: z.string(),
  skill: z.string(),
  address: z.string(),
  street: z.string(),
  postal: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),

});
const jobUpdateValidationSchema = z.object({
  jobId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  skill: z.string().optional(),
  address: z.string().optional(),
  street: z.string().optional(),
  postal: z.string().optional(),
  date: z.string().optional(), 
  startTime: z.string().optional(),
  endTime: z.string().optional(), 
});

const acceptJobApplicationSchema = z.object({
  jobId: z.string(),
  applicationId: z.string()

});

export const jobSchema = {
  jobValidationSchema,
  jobUpdateValidationSchema,
  acceptJobApplicationSchema,
};
