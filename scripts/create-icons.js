import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

function createPng(width, height, colorR, colorG, colorB) {
  // Simple uncompressed or deflated PNG generator
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData.writeUInt8(8, 8) // bit depth: 8
  ihdrData.writeUInt8(6, 9) // color type: 6 (RGBA)
  ihdrData.writeUInt8(0, 10) // compression
  ihdrData.writeUInt8(0, 11) // filter
  ihdrData.writeUInt8(0, 12) // interlace

  const ihdr = makeChunk('IHDR', ihdrData)

  // Scanlines: each row has 1 filter byte (0) + width * 4 bytes
  const rowBytes = 1 + width * 4
  const rawData = Buffer.alloc(height * rowBytes)

  const cx = width / 2
  const cy = height / 2
  const crossThickness = Math.floor(width * 0.14)
  const crossLength = Math.floor(width * 0.6)

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes
    rawData[rowOffset] = 0 // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4

      const inVerticalBar =
        x >= cx - crossThickness / 2 &&
        x <= cx + crossThickness / 2 &&
        y >= cy - crossLength / 2 &&
        y <= cy + crossLength / 2

      const inHorizontalBar =
        y >= cy - crossThickness / 2 &&
        y <= cy + crossThickness / 2 &&
        x >= cx - crossLength / 2 &&
        x <= cx + crossLength / 2

      if (inVerticalBar || inHorizontalBar) {
        // White cross
        rawData[pixelOffset] = 255
        rawData[pixelOffset + 1] = 255
        rawData[pixelOffset + 2] = 255
        rawData[pixelOffset + 3] = 255
      } else {
        // Teal/Blue background (#0284c7)
        rawData[pixelOffset] = colorR
        rawData[pixelOffset + 1] = colorG
        rawData[pixelOffset + 2] = colorB
        rawData[pixelOffset + 3] = 255
      }
    }
  }

  const deflated = zlib.deflateSync(rawData)
  const idat = makeChunk('IDAT', deflated)
  const iend = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

function makeChunk(type, data) {
  const len = data.length
  const header = Buffer.alloc(4)
  header.writeUInt32BE(len, 0)

  const typeBuf = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBuf, data])
  const crc = crc32(crcData)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc >>> 0, 0)

  return Buffer.concat([header, typeBuf, data, crcBuf])
}

// Standard CRC32 table
const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[n] = c
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return crc ^ 0xffffffff
}

const iconsDir = path.join(process.cwd(), 'public', 'icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPng(192, 192, 2, 132, 199))
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPng(512, 512, 2, 132, 199))
console.log('✓ Generated icon-192.png and icon-512.png successfully!')
