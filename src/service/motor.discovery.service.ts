import { SerialPortConnectionService } from "./serialport.connection.service";
import { sleep } from "../helpers/util";
import { eventBroker } from "../helpers/event";
import { CommandParserOutput } from "../interface/command.interface";
import { CommandSenderService } from "./command.sender.service";
import { CommandBuilderService } from "./command.builder.service";

let isDiscovering = false;

export class MotorDiscoveryService {

    private SerialpPortConnection = new SerialPortConnectionService();
    private commandBuilder = new CommandBuilderService();
    private commandSender = new CommandSenderService(this.SerialpPortConnection, this.commandBuilder);

    public async discoverMotors() {
        const port = this.SerialpPortConnection.getConnectedPort();
        if (!port) {
            console.error('No serial port connected');
            return false;
        }

        if (isDiscovering) {
            console.error('Motor discovery is already in progress');
            return false;
        };

        console.log('discoverMotors: Started');

        let FOUNDED_MOTORS: any[] = [];
        isDiscovering = true;

        const getNewMotor = async () => {
            this.commandSender.addCommand({
                command_name: 'GET_NODE_ADDR',
                data: {},
                is_ack: true,
                ack_timeout: 70,
                max_retry_count: 1,
                priority: 'low',
                dest_node_type: 0,
                source_add: "010000",
                destination_add: "FFFFFF",
                event_timeout: 1500
            })

            eventBroker.once('parsed_command', (response) => {
                if (response.length > 0) {
                    response
                        .filter(
                            (record: CommandParserOutput) =>
                                record.command_name === 'POST_NODE_ADDR' &&
                                !FOUNDED_MOTORS.some((motor: CommandParserOutput) => motor.source_add === record.source_add)
                        )
                        .forEach((record: CommandParserOutput) => {
                            // io.emit('motor_discovered', record);
                            console.log("New Motor Found: ", record.source_add);
                            FOUNDED_MOTORS.push({ ...record, ack_cmd_send: false });
                        });
                }
            });

            await sleep(6000);
        }

        await getNewMotor();
        await getNewMotor();
        await getNewMotor();

        isDiscovering = false;

        console.log('discoverMotors: Completed');

        return true;
    }
}