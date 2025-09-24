import { SerialPortConnectionService } from "./serialport.connection.service";
import { sleep } from "../helpers/util";
import { eventBroker } from "../helpers/event";
import { CommandParserOutput } from "../interface/command.interface";
import { CommandSenderService } from "./command.sender.service";
import { CommandBuilderService } from "./command.builder.service";
import { MotorFound } from "../interface/motor.interface";

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

        let FOUNDED_MOTORS: MotorFound[] = [];
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
                                !FOUNDED_MOTORS.some((motor: MotorFound) => motor.address === record.source_add)
                        )
                        .forEach((record: CommandParserOutput) => {
                            const new_motor: MotorFound = {
                                address: record.source_add,
                                node_type: record.source_node_type,
                                is_discover_conf_send: false
                            };
                            // io.emit('motor_discovered', record);
                            console.log("New Motor Found: ", new_motor);
                            FOUNDED_MOTORS.push(new_motor);
                        });
                }
            });

            await sleep(6000);

            for (const motor of FOUNDED_MOTORS) {
                if (!motor.is_discover_conf_send) {
                    const command = {
                        command_name: 'SET_NODE_DISCOVERY',
                        data: {
                            discovery_mode: 0x01
                        },
                        is_ack: true,
                        ack_timeout: 1500,
                        max_retry_count: 3,
                        priority: 'low' as 'low',
                        dest_node_type: motor.node_type,
                        sub_node_type: motor.node_type == 2 ? 5063313 : undefined,
                        source_add: "010000",
                        destination_add: motor.address,
                        event_timeout: 1500
                    };
                    motor.is_discover_conf_send = true;
                    // Wrap in a promise to wait for ACK before continuing
                    await new Promise<void>((resolve) => {
                        let ackReceived = false;
                        const onParsedCommand = (response: any[]) => {
                            const ack = response.find(
                                (cmd: any) =>
                                    cmd.command_name === 'ACK' &&
                                    cmd.destination_add === motor.address
                            );
                            if (ack) {
                                ackReceived = true;
                                eventBroker.removeListener('parsed_command', onParsedCommand);
                                clearTimeout(timeout);
                                resolve();
                            }
                        };
                        // Start timeout immediately after sending command
                        const timeout = setTimeout(() => {
                            if (!ackReceived) {
                                eventBroker.removeListener('parsed_command', onParsedCommand);
                                resolve();
                            }
                        }, 1500); // 1.5 seconds timeout
                        eventBroker.on('parsed_command', onParsedCommand);
                        this.commandSender.addCommand(command);
                    });

                    await sleep(100);
                }
            }
        }

        this.commandSender.addCommand({
            command_name: "SET_NETWORK_CONFIG",
            data: {
                brodcast_mode: 2,
                brodcast_random_value: 255,
                supervision_active: 2,
                supervision_timeperiod: 255,
                deaf_mode: 0,
                upload_requested: 2
            },
            is_ack: false,
            ack_timeout: 70,
            max_retry_count: 3,
            priority: 'low',
            dest_node_type: 0,
            source_add: "010000",
            destination_add: "FFFFFF",
            event_timeout: 1500
        })

        await sleep(200);

        this.commandSender.addCommand({
            command_name: "SET_NODE_DISCOVERY",
            data: {
                discovery_mode: 0
            },
            is_ack: false,
            ack_timeout: 70,
            max_retry_count: 3,
            priority: 'low',
            dest_node_type: 0,
            source_add: "010000",
            destination_add: "FFFFFF",
            event_timeout: 1500
        })

        await sleep(2000);

        let consecutiveRuns = 0;
        const maxConsecutiveRuns = 3;

        while (consecutiveRuns < maxConsecutiveRuns) {
            const initialMotorCount = FOUNDED_MOTORS.length;

            await getNewMotor();
            consecutiveRuns++;

            if (FOUNDED_MOTORS.length > initialMotorCount) {
                console.log(`New motor found! Resetting discovery cycle. Found ${FOUNDED_MOTORS.length - initialMotorCount} new motor(s).`);
                consecutiveRuns = 0;
            }

            console.log(`Discovery cycle ${consecutiveRuns}/${maxConsecutiveRuns} completed. Total motors found: ${FOUNDED_MOTORS.length}`);
        }

        // for (const motor of FOUNDED_MOTORS) {
        //     const command = {
        //         command_name: 'GET_MOTOR_LIMITS',
        //         data: {},
        //         is_ack: true,
        //         ack_timeout: 70,
        //         max_retry_count: 3,
        //         priority: 'low' as 'low',
        //         dest_node_type: motor.source_node_type,
        //         sub_node_type: motor.source_node_type == 2 ? 5063313 : undefined,
        //         source_add: "010000",
        //         destination_add: motor.source_add,
        //         event_timeout: 1500
        //     };
        //     this.commandSender.addCommand(command);
        //     eventBroker.once('parsed_command', (response) => {
        //         if (response) {
        //             const foundMotor = FOUNDED_MOTORS.find((motor: any) => motor.source_add === command.destination_add);
        //             if (foundMotor) {
        //                 foundMotor.limit = response[0]?.data;
        //             }
        //         }
        //     });

        //     await sleep(100);
        // }

        // for (const motor of FOUNDED_MOTORS) {
        //     const command = {
        //         command_name: 'GET_NODE_LABEL',
        //         data: {},
        //         is_ack: true,
        //         ack_timeout: 70,
        //         max_retry_count: 3,
        //         priority: 'low' as 'low',
        //         dest_node_type: motor.source_node_type,
        //         sub_node_type: motor.source_node_type == 2 ? 5063313 : undefined,
        //         source_add: "010000",
        //         destination_add: motor.source_add,
        //         event_timeout: 1500
        //     };
        //     this.commandSender.addCommand(command);
        //     eventBroker.once('parsed_command', (response) => {
        //         if (response) {
        //             const foundMotor = FOUNDED_MOTORS.find((motor: any) => motor.source_add === command.destination_add);
        //             if (foundMotor) {
        //                 foundMotor.label = response[0]?.data?.label;
        //             }
        //         }
        //     });

        //     await sleep(100);
        // }

        isDiscovering = false;

        console.log('discoverMotors: Completed');
        console.log('FOUNDED_MOTORS: ', FOUNDED_MOTORS);

        return true;
    }
}