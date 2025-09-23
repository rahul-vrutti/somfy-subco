export function busFrameToRawFrame(bus_frame: Buffer): Buffer {
    const frame_length = bus_frame.length;
    let raw_frame: Buffer = Buffer.alloc(frame_length);

    for (let i = 0; i < frame_length - 2; i++) {
        raw_frame.writeUInt8(255 - bus_frame[i], i);
    }
    return raw_frame;
}