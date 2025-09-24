import { eventBroker } from "../helpers/event";
import { CommandParserService } from "./command.parser.service";
import { SerialPortConnectionService } from "./serialport.connection.service";

let isProcessing = false;
export class CommandReceiverService {
    private postDataFound = Buffer.alloc(0);
    private invalidCommand = Buffer.alloc(0);
    private CommandParser = new CommandParserService();

    constructor(
        private SerialConn: SerialPortConnectionService,
    ) {
    }

    public init = () => {
        this.SerialConn.getSerialPort()?.on('data', (data) => {
            this.postDataFound = Buffer.concat([this.postDataFound, data]);
            if (!isProcessing) {
                this.processReceivedFrame();
            }
        });
    }

    private isValidCommand = (buffer: Buffer): Boolean => {
        if (buffer.length < 2) {
            return false;
        }
        let sum = 0;
        for (let i = 0; i < buffer.length - 2; i++) {
            sum += buffer[i];
        }
        const checksum = buffer.readUInt16BE(buffer.length - 2);
        return sum == checksum;
    }

    private processReceivedFrame = () => {
        isProcessing = true;
        while (this.postDataFound.length > 2) {
            let cmdLen = 255 - this.postDataFound.readInt8(1) & 0x3f;

            if (cmdLen == 0 && this.postDataFound.length == 0) break;

            if (this.postDataFound.length < cmdLen) break;

            const current_cmd = this.postDataFound.subarray(0, cmdLen);

            const isValid = this.isValidCommand(current_cmd);

            if (isValid) {
                if (this.invalidCommand.length > 0) {
                    console.error("Invalid Frame received: ", this.invalidCommand);
                    this.invalidCommand = Buffer.alloc(0);
                }
                try {
                    // console.log("Valid Frame received: ", current_cmd);
                    const cmd_data = this.CommandParser.decodeFrame(current_cmd);
                    eventBroker.emit('command', cmd_data);
                } catch (error) {
                    console.error('Error in command decoding ', error);
                }

                this.postDataFound = this.postDataFound.subarray(cmdLen);
            } else {
                const shiftedValue = this.postDataFound.subarray(0, 1);
                this.invalidCommand = Buffer.concat([this.invalidCommand, shiftedValue]);
                this.postDataFound = this.postDataFound.subarray(1);
            }
        }
        isProcessing = false;
    };
}