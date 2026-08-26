type StoredZipEntry = {
  filename: string;
  size: number;
  open: () => Promise<ReadableStream<Uint8Array> | null>;
};

type CentralEntry = {
  filename: Uint8Array;
  crc: number;
  size: number;
  offset: number;
  dosDate: number;
  dosTime: number;
};

const encoder = new TextEncoder();
const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function write16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function write32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

function dosTimestamp(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

function localHeader(filename: Uint8Array, dosDate: number, dosTime: number) {
  const bytes = new Uint8Array(30 + filename.length);
  const view = new DataView(bytes.buffer);
  write32(view, 0, 0x04034b50);
  write16(view, 4, 20);
  write16(view, 6, 0x08);
  write16(view, 8, 0);
  write16(view, 10, dosTime);
  write16(view, 12, dosDate);
  write16(view, 26, filename.length);
  bytes.set(filename, 30);
  return bytes;
}

function dataDescriptor(crc: number, size: number) {
  const bytes = new Uint8Array(16);
  const view = new DataView(bytes.buffer);
  write32(view, 0, 0x08074b50);
  write32(view, 4, crc);
  write32(view, 8, size);
  write32(view, 12, size);
  return bytes;
}

function centralHeader(entry: CentralEntry) {
  const bytes = new Uint8Array(46 + entry.filename.length);
  const view = new DataView(bytes.buffer);
  write32(view, 0, 0x02014b50);
  write16(view, 4, 20);
  write16(view, 6, 20);
  write16(view, 8, 0x08);
  write16(view, 10, 0);
  write16(view, 12, entry.dosTime);
  write16(view, 14, entry.dosDate);
  write32(view, 16, entry.crc);
  write32(view, 20, entry.size);
  write32(view, 24, entry.size);
  write16(view, 28, entry.filename.length);
  write32(view, 42, entry.offset);
  bytes.set(entry.filename, 46);
  return bytes;
}

function endOfCentralDirectory(entries: number, size: number, offset: number) {
  const bytes = new Uint8Array(22);
  const view = new DataView(bytes.buffer);
  write32(view, 0, 0x06054b50);
  write16(view, 8, entries);
  write16(view, 10, entries);
  write32(view, 12, size);
  write32(view, 16, offset);
  return bytes;
}

function updateCrc(crc: number, chunk: Uint8Array) {
  let value = crc;
  for (const byte of chunk) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return value;
}

export function createStoredZipStream(entries: StoredZipEntry[]) {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const central: CentralEntry[] = [];
        let offset = 0;
        for (const entry of entries) {
          const filename = encoder.encode(entry.filename);
          const timestamp = dosTimestamp();
          const localOffset = offset;
          const header = localHeader(filename, timestamp.date, timestamp.time);
          controller.enqueue(header);
          offset += header.length;

          const stream = await entry.open();
          if (!stream) throw new Error(`Arquivo ausente: ${entry.filename}`);
          const reader = stream.getReader();
          let crc = 0xffffffff;
          let size = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;
            crc = updateCrc(crc, value);
            size += value.byteLength;
            controller.enqueue(value);
          }
          if (size !== entry.size || size > 0xffffffff) {
            throw new Error(`Tamanho inválido para ${entry.filename}`);
          }
          crc = (crc ^ 0xffffffff) >>> 0;
          const descriptor = dataDescriptor(crc, size);
          controller.enqueue(descriptor);
          offset += size + descriptor.length;
          central.push({
            filename,
            crc,
            size,
            offset: localOffset,
            dosDate: timestamp.date,
            dosTime: timestamp.time,
          });
        }

        const centralOffset = offset;
        let centralSize = 0;
        for (const entry of central) {
          const header = centralHeader(entry);
          controller.enqueue(header);
          centralSize += header.length;
        }
        controller.enqueue(endOfCentralDirectory(central.length, centralSize, centralOffset));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
