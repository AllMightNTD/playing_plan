import { describe, it, expect } from "vitest";
import { createQueryClient, QueryProvider } from "./QueryProvider";

describe("QueryProvider & createQueryClient", () => {
  it("khởi tạo QueryClient với staleTime 5 phút và gcTime 30 phút", () => {
    const client = createQueryClient();
    const defaultOptions = client.getDefaultOptions();

    expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000);
    expect(defaultOptions.queries?.gcTime).toBe(30 * 60 * 1000);
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaultOptions.queries?.retry).toBe(1);
  });

  it("export component QueryProvider hợp lệ", () => {
    expect(QueryProvider).toBeDefined();
    expect(typeof QueryProvider).toBe("function");
  });
});
