/** base64 PCM16 조각을 디코딩한다. 조각 경계가 샘플 중간에서 끊겨도 다음 조각과 이어 붙인다. */
export class PcmDecoder {
  private oddByte: number | null = null;

  decode(b64: string): Int16Array {
    let bytes: Uint8Array = Buffer.from(b64, "base64");
    if (this.oddByte !== null) {
      const joined = new Uint8Array(bytes.length + 1);
      joined[0] = this.oddByte;
      joined.set(bytes, 1);
      bytes = joined;
      this.oddByte = null;
    }
    if (bytes.length % 2 === 1) {
      this.oddByte = bytes[bytes.length - 1];
      bytes = bytes.subarray(0, bytes.length - 1);
    }
    const copy = new Uint8Array(bytes);
    return new Int16Array(copy.buffer, 0, copy.length / 2);
  }

  reset(): void {
    this.oddByte = null;
  }
}
