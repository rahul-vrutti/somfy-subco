import { SerialPortConnectionService } from "./serialport.connection.service";

export class CommandSenderService {

    constructor(
        private SerialConnection: SerialPortConnectionService,
    ) {
    }

    public sendCommandToPort(command: string) {
        const command_frame = Buffer.from(command, 'hex');
        this.SerialConnection.getSerialPort()?.write(command_frame, (error) => {
            if (error) {
                console.error('Error in sending Frame to Port', error);
            } else {
                console.log("Frame sent: ", command_frame);
            }
        });
    }

}