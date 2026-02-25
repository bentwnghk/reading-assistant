import localforage from "localforage";

export const readingStore = localforage.createInstance({
  name: "ReadingAssistant",
  storeName: "readingStore",
  description: "Stores the history and results of reading sessions.",
});

export const readingImagesStore = localforage.createInstance({
  name: "ReadingAssistant",
  storeName: "readingImages",
  description: "Stores original images as base64 data.",
});
