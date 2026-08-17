import { gzipSync } from "node:zlib";
import { compareSkillPaths, type PublicSkillBundle } from "./skill-bundle.server";

const TAR_BLOCK_SIZE = 512;
const archiveCache = new Map<string, Buffer>();

function writeString(header: Buffer, value: string, offset: number, length: number) {
  const encoded = Buffer.from(value, "utf8");
  if (encoded.length > length) {
    throw new Error(`Skill archive path is too long: ${value}`);
  }
  encoded.copy(header, offset);
}

function writeOctal(header: Buffer, value: number, offset: number, length: number) {
  const encoded = value.toString(8).padStart(length - 1, "0");
  if (encoded.length > length - 1) {
    throw new Error(`Skill archive value does not fit in a tar header: ${value}`);
  }
  writeString(header, `${encoded}\0`, offset, length);
}

function tarHeader(path: string, size: number): Buffer {
  const header = Buffer.alloc(TAR_BLOCK_SIZE);
  writeString(header, path, 0, 100);
  writeOctal(header, 0o644, 100, 8);
  writeOctal(header, 0, 108, 8);
  writeOctal(header, 0, 116, 8);
  writeOctal(header, size, 124, 12);
  writeOctal(header, 0, 136, 12);
  header.fill(0x20, 148, 156);
  header[156] = "0".charCodeAt(0);
  writeString(header, "ustar", 257, 6);
  writeString(header, "00", 263, 2);
  writeString(header, "pontx", 265, 32);
  writeString(header, "pontx", 297, 32);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeString(header, `${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8);
  return header;
}

export function createSkillTar(bundle: PublicSkillBundle): Buffer {
  const blocks: Buffer[] = [];
  for (const file of [...bundle.files].sort((left, right) => compareSkillPaths(left.path, right.path))) {
    const content = Buffer.from(file.content, "utf8");
    blocks.push(tarHeader(file.path, content.length), content);
    const remainder = content.length % TAR_BLOCK_SIZE;
    if (remainder !== 0) blocks.push(Buffer.alloc(TAR_BLOCK_SIZE - remainder));
  }
  blocks.push(Buffer.alloc(TAR_BLOCK_SIZE * 2));
  return Buffer.concat(blocks);
}

export function getSkillArchive(bundle: PublicSkillBundle): Buffer {
  const key = `${bundle.name}:${bundle.contentHash}`;
  const cached = archiveCache.get(key);
  if (cached) return cached;
  const archive = gzipSync(createSkillTar(bundle), { level: 9 });
  archiveCache.set(key, archive);
  return archive;
}
