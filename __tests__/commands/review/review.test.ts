import { describe, expect, test, vi } from "vitest";
import { reviewApprove } from "../../../src/commands/review/approve.js";
import { registerReviewCommands } from "../../../src/commands/review/index.js";
import { reviewList } from "../../../src/commands/review/list.js";
import { reviewReject } from "../../../src/commands/review/reject.js";
import type { CommandContext } from "../../../src/core/command.js";

const ITEM_ID = "d5c4b3a2-f6e5-4b7a-9d8c-1f0e2a3b4c5d";

function mockContext(overrides?: { getResult?: unknown; postResult?: unknown }): CommandContext {
	return {
		client: {
			get: vi.fn().mockResolvedValue(overrides?.getResult ?? {}),
			post: vi.fn().mockResolvedValue(overrides?.postResult ?? {}),
			patch: vi.fn().mockResolvedValue({}),
			put: vi.fn().mockResolvedValue({}),
			del: vi.fn().mockResolvedValue(undefined),
		} as unknown as CommandContext["client"],
		profileName: "default",
		mode: "cli",
		output: { format: "json", compact: false },
	};
}

describe("review.list", () => {
	test("is read-only and defaults to pending", async () => {
		expect(reviewList.annotations?.readOnlyHint).toBe(true);
		const ctx = mockContext({ getResult: [] });
		await reviewList.execute({ status: "pending" }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("kb_review_items", { queryParams: { status: "pending" } });
	});

	test("'all' maps to an empty status filter", async () => {
		const ctx = mockContext({ getResult: [] });
		await reviewList.execute({ status: "all" }, ctx);
		expect(ctx.client.get).toHaveBeenCalledWith("kb_review_items", { queryParams: { status: "" } });
	});
});

describe("review.approve", () => {
	test("POSTs the approve endpoint", async () => {
		const ctx = mockContext({ postResult: { id: ITEM_ID } });
		await reviewApprove.execute({ itemId: ITEM_ID }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("kb_review_approve", {}, { pathParams: { id: ITEM_ID } });
	});
});

describe("review.reject", () => {
	test("POSTs the reject endpoint", async () => {
		const ctx = mockContext({ postResult: { id: ITEM_ID } });
		await reviewReject.execute({ itemId: ITEM_ID }, ctx);
		expect(ctx.client.post).toHaveBeenCalledWith("kb_review_reject", {}, { pathParams: { id: ITEM_ID } });
	});
});

describe("registerReviewCommands", () => {
	test("returns all 3 review commands in the review group", () => {
		const commands = registerReviewCommands();
		expect(commands).toHaveLength(3);
		for (const cmd of commands) {
			expect(cmd.group).toBe("review");
			expect(cmd.name).toMatch(/^review\./);
		}
	});
});
