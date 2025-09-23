import { MASTER_COMMAND_LIST } from "../common/command.list";
import { busFrameToRawFrame } from "../helpers/parser";
import { CommandParserOutput } from "../interface/command.interface";

export class CommandParserService {

    private Cmd_Prsr_GetCommandName(buffer: Buffer): string {
        const command = MASTER_COMMAND_LIST.find((element: any) => {
            return element.cmd_id == buffer.readUInt8(0);
        });
        return command?.name ?? 'UNKNOWN_COMMAND';
    }

    private Cmd_Prsr_GetSourceAddress(buffer: Buffer): string {
        const src = buffer.readUIntLE(3, 3);
        let hex = src.toString(16);
        while (hex.length < 6) {
            hex = "0" + hex;
        }
        return hex.toUpperCase();
    }

    private Cmd_Prsr_GetDestinationAddress(buffer: Buffer): string {
        const dest = buffer.readUIntLE(6, 3);
        let hex = dest.toString(16);
        while (hex.length < 6) {
            hex = "0" + hex;
        }
        return hex.toUpperCase();
    }

    private Cmd_Prsr_GetSourceNodeType(buffer: Buffer): number {
        return (buffer.readUInt8(2) & 0xF0) >> 4;
    }

    private Cmd_Prsr_GetDestinationNodeType(buffer: Buffer): number {
        return buffer.readUInt8(2) & 0x0F;
    }

    private Cmd_Prsr_BufferToJsonData(command_name: string, node_type: number, buffer: Buffer, sub_node_type?: number): any {
        let data: any = {};
        return data;
    }


    public decodeFrame = (frame: Buffer, sub_node_type?: number): CommandParserOutput => {
        const raw_frame: Buffer = busFrameToRawFrame(frame);
        const frame_length: number = raw_frame.length;

        const command_name: string = this.Cmd_Prsr_GetCommandName(raw_frame);
        const source_add: string = this.Cmd_Prsr_GetSourceAddress(raw_frame);
        const destination_add: string = this.Cmd_Prsr_GetDestinationAddress(raw_frame);
        const source_node_type: number = this.Cmd_Prsr_GetSourceNodeType(raw_frame);
        const dest_node_type: number = this.Cmd_Prsr_GetDestinationNodeType(raw_frame);

        let data = {};

        if (raw_frame.length > 11) {
            const dataBuffer: Buffer = raw_frame.subarray(9, frame_length - 2);
            data = this.Cmd_Prsr_BufferToJsonData(command_name, source_node_type, dataBuffer, sub_node_type);
        }

        return {
            command_name,
            source_add,
            destination_add,
            source_node_type,
            dest_node_type,
            data
        };
    }
}