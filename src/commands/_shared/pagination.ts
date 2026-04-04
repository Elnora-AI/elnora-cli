import { z } from "zod";

export const paginationInput = {
	page: z.number().int().min(1).default(1).describe("Page number"),
	pageSize: z.number().int().min(1).max(100).default(25).describe("Results per page"),
};
