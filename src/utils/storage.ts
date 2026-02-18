import localforage from "localforage";

export const readingStore = localforage.createInstance({
  name: "ReadingAssistant",
  storeName: "readingStore",
  description: "Stores the history and results of reading sessions.",
});
