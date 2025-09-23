import { MASTER_COMMAND_LIST } from "../common/command.list";
import { CommandBuilderInput, MasterCommand } from "../interface/command.interface";

export class CommandBuilderService {

    private Cmd_Bldr_BuildDataFrame(command_name: string, node_type: number, data: any, sub_node_type?: number): Buffer {
        return Buffer.alloc(0);
    };


    private Cmd_Bldr_GetCommandIDByName(command_name: string): number {
        const command = MASTER_COMMAND_LIST.find((element: MasterCommand) => {
            return element.name === command_name;
        })
        return command?.cmd_id ?? 0;
    };

    public Cmd_Bldr_BuildCommandFrame = (CommandData: CommandBuilderInput): Buffer => {

        if (CommandData.dest_node_type == 2 && !CommandData.sub_node_type) {
            throw new Error('sub_node_type is required for node_type 2');
        }

        let dataFrame: Buffer = Buffer.alloc(0);

        if (Object.values(CommandData.data).length > 0) {
            dataFrame = this.Cmd_Bldr_BuildDataFrame(CommandData.command_name, CommandData.dest_node_type, CommandData.data, CommandData.sub_node_type);
        }

        // Calculate frame length
        const frameLength = 11 + (dataFrame.length || 0);
        let frame = Buffer.alloc(frameLength);

        // Set message id
        frame.writeUInt8(this.Cmd_Bldr_GetCommandIDByName(CommandData.command_name), 0);

        // Set node type
        frame.writeUInt8(CommandData.dest_node_type | 0xF0, 2);

        let source_add = `010000`;
        if (CommandData.source_add) {
            source_add = CommandData.source_add;
        }

        // Set source address
        const src = parseInt(source_add, 16);
        frame.writeUIntLE(src, 3, 3);

        // Set destination address
        const dest = parseInt(CommandData.destination_add, 16);
        frame.writeUIntLE(dest, 6, 3);

        // Set data
        let i = 9;
        if (dataFrame.length > 0) {
            dataFrame.forEach((value: number) => {
                frame.writeUInt8(value, i);
                i += 1;
            });
        }

        // Set data length
        let dataLengthField = i + 2;
        if (CommandData.is_ack) {
            dataLengthField = 0x80 | dataLengthField;
        }
        frame.writeUInt8(dataLengthField, 1);

        // 2's complement of each byte of frame
        for (let j = 0; j < i; j++) {
            frame[j] = 255 - frame[j];
        }

        // Write checksum
        let checksum = 0;
        for (let j = 0; j < i; j++) {
            checksum += frame[j];
        }
        frame.writeUInt16BE(checksum, i);

        return frame;
    }

}