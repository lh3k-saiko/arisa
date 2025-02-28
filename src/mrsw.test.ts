import { MultiReaderSingleWriter as Mrsw } from "./mrsw.ts"
import { assertEquals } from "jsr:@std/assert";
import { delay } from "jsr:@std/async";

Deno.test("Multi-reader single-writer mutex", async () => {
  const mutex = new Mrsw();

  let s = "";
  let readCount = 0;
  await Promise.all([
    (async() => {
      await delay(200);
      await mutex.read(async () => {
        assertEquals(s, "");
        assertEquals(readCount, 0);
        readCount += 1;
        await delay(500);
        readCount -= 1;
      });
    })(),
    (async() => {
      await delay(300);
      await mutex.read(async () => {
        assertEquals(s, "");
        assertEquals(readCount, 1);
        readCount += 1;
        await delay(500);
        readCount -= 1;
      });
    })(),
    (async() => {
      await delay(400);
      await mutex.write(async () => {
        assertEquals(s, "");
        assertEquals(readCount, 0);
        s += "Hello"
        await delay(100);
      });
    })(),
    (async() => {
      await delay(500);
      await mutex.write(async () => {
        assertEquals(s, "Hello");
        assertEquals(readCount, 0);
        s += ", world";
        await delay(100);
      });
    })(),
    (async() => {
      await delay(600);
      await mutex.write(async () => {
        assertEquals(s, "Hello, world");
        assertEquals(readCount, 0);
        s += "!";
        await delay(100);
      });
    })(),
    (async() => {
      await delay(500);
      await mutex.read(async () => {
        assertEquals(s, "Hello, world!");
        assertEquals(readCount, 0);
        readCount += 1;
        await delay(100);
        readCount -= 1;
      });
    })(),
  ]);
})
