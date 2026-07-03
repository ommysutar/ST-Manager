import { z } from "zod";

const isoDateTime = z.string().datetime({ message: "Invalid ISO datetime" });

export const reportsDateRangeQuerySchema = z
  .object({
    from: isoDateTime,
    to: isoDateTime,
  })
  .refine((value) => Date.parse(value.from) < Date.parse(value.to), {
    message: "from must be before to",
    path: ["to"],
  });

export type ReportsDateRangeQueryInput = z.infer<typeof reportsDateRangeQuerySchema>;
