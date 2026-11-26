import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useLanguageCheckStore } from "./languageCheck";

// Topic saves in the store. A CREATE mirrors the returned topic into the list
// and is done. An EDIT also re-syncs the list with the server: an admin's edit
// can drop the topic out of the caller's own library (making another user's
// class topic personal) or change where it sorts — neither of which the
// optimistic mirror can know. A failed re-sync must leave that mirror intact.

const fetchMock = vi.fn();

const SHARED: LanguageCheckTopic = {
  id: "t1",
  title: "Shared task",
  topic: "P",
  essayType: "dse-part-a",
  hasQuestionImage: false,
  userId: "someone-else",
  classId: "c1",
  className: "S5 · English · Gp1",
  creatorName: "Ms Chan",
  createdAt: 0,
  updatedAt: 0,
  questionImage: "",
};

const summary = (t: LanguageCheckTopic): LanguageCheckTopicSummary => {
  const { questionImage: _image, ...rest } = t;
  return rest;
};

const ok = (value: unknown) =>
  ({ ok: true, status: 200, json: async () => value }) as Response;

const failed = () =>
  ({ ok: false, status: 500, json: async () => ({ error: "boom" }) }) as Response;

const DATA = {
  title: "Shared task",
  topic: "P",
  essayType: "dse-part-a" as const,
  questionImage: "",
  classId: "c1",
};

const state = () => useLanguageCheckStore.getState();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  useLanguageCheckStore.setState({
    topics: [summary(SHARED)],
    topicsLoaded: true,
    topicsLoading: false,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("languageCheck store — saveTopic", () => {
  it("create: POSTs once and mirrors the new topic, with no list re-fetch", async () => {
    fetchMock.mockResolvedValueOnce(
      ok({ ...SHARED, id: "new", userId: "me", creatorName: null }),
    );
    const saved = await state().saveTopic(DATA);
    expect(saved.id).toBe("new");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/writing-assessment/topics");
    expect(init.method).toBe("POST");
    expect(state().topics.map((t) => t.id)).toEqual(["new", "t1"]);
  });

  it("edit: PUTs, then re-syncs the list with the server", async () => {
    // The PUT saves; the server's list no longer shows t1 (it has just left
    // the caller's library).
    fetchMock.mockResolvedValueOnce(ok({ ...SHARED, classId: null }));
    fetchMock.mockResolvedValueOnce(ok([]));
    await state().saveTopic({ ...DATA, classId: null }, "t1");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("PUT");
    await vi.waitFor(() => expect(state().topics).toEqual([]));
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit?];
    expect(url).toBe("/api/writing-assessment/topics");
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("edit: keeps the optimistic mirror when the re-sync fails", async () => {
    fetchMock.mockResolvedValueOnce(ok({ ...SHARED, title: "Fixed" }));
    fetchMock.mockResolvedValueOnce(failed());
    await state().saveTopic({ ...DATA, title: "Fixed" }, "t1");
    await vi.waitFor(() => {
      // The re-sync ran and released the loading flag …
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(state().topicsLoading).toBe(false);
    });
    // … and the mirror of the saved topic is what remains.
    expect(state().topics.map((t) => t.title)).toEqual(["Fixed"]);
    expect(state().topicsLoaded).toBe(true);
  });
});
