import { eventBroker } from "../helpers/event";
import { Command, CommandParserOutput, stateType } from "../interface/command.interface";
import { CommandBuilderService } from "./command.builder.service";
import { SerialPortConnectionService } from "./serialport.connection.service";

export class CommandSenderService {

    private commandQueue: Command[] = [];
    private isProcessing: boolean = false;
    private state: stateType = 'ready';

    constructor(
        private SerialConnection: SerialPortConnectionService,
        private CommandBuilder: CommandBuilderService
    ) {
    }

    // Add a command to the queue
    public addCommand(command: Command): void {
        // console.log('addCommand: called');

        const port = this.SerialConnection.getConnectedPort();
        if (!port) {
            return console.error('Connect to Port first');
        };

        if (command.priority === 'high') {
            let insertIndex = this.commandQueue.findIndex(c => c.priority === 'low');
            if (insertIndex === -1) {
                this.commandQueue.push(command);
            } else {
                this.commandQueue.splice(insertIndex, 0, command);
            }
        } else {
            command.priority = 'low';
            this.commandQueue.push(command);
        }

        if (!this.isProcessing && this.state === 'ready') {
            this.processNextCommand();
        } else if (!this.isProcessing && this.state !== 'ready') {
            setTimeout(() => {
                this.processNextCommand();
            }, 1);
        }
    }

    // Process the next command in the queue
    private async processNextCommand() {
        // console.log('processNextCommand called ',);
        if (this.commandQueue.length === 0) {
            this.isProcessing = false;
            this.state = 'ready';
            // console.log('There is no any command in queue to process. Thats why process terminate',);
            return;
        }

        this.isProcessing = true;
        const command = this.commandQueue.shift()!;

        try {
            // await this.processCurrentCommand(command);
            this.processCurrentCommand(command);
        } catch (error) {
            this.state = 'error';
            console.error(`Error in processNextCommand: ${error}`);
        }

        setTimeout(() => {
            this.state = 'ready';
            this.processNextCommand();
        }, 20);
    }

    // Send a command and handle retries and ACKs 
    private async processCurrentCommand(command: Command) {
        // console.log('processCurrentCommand: called');
        for (let attempt = 0; attempt < command.max_retry_count; attempt++) {
            // console.log(`Attempt ${attempt + 1} start for command - ${command.command_name}`);
            try {
                this.sendCommandToPort(command);
                let result: CommandParserOutput[] = [];

                if (command.is_ack) {
                    this.state = 'wait_for_ack';

                    if (command.dest_node_type == 0 || command.destination_add == 'FFFFFF') {
                        /**  If the dest_node_type is 0 or dest_add is FFFFFF, 
                         then the command will support multiple responses */
                        result = await new Promise((resolve) => {
                            const responses: CommandParserOutput[] = [];
                            let timeout: any;
                            const onDataReceived = (data: CommandParserOutput) => {
                                responses.push(data);

                                clearTimeout(timeout);
                                timeout = setTimeout(() => {
                                    eventBroker.removeListener('command', onDataReceived);
                                    resolve(responses);
                                }, command.event_timeout);
                            };
                            timeout = setTimeout(() => {
                                eventBroker.removeListener('command', onDataReceived);
                                resolve(responses);
                            }, command.event_timeout);
                            eventBroker.on('command', onDataReceived);
                        });

                    } else {
                        result = await new Promise((resolve) => {
                            const timeout = setTimeout(() => {
                                eventBroker.removeListener('command', onDataReceived);
                                resolve([]);
                            }, command.ack_timeout);
                            const onDataReceived = (data: CommandParserOutput) => {
                                clearTimeout(timeout);
                                eventBroker.removeListener('command', onDataReceived);
                                resolve([data]);
                            };
                            eventBroker.once('command', onDataReceived);
                        });
                    };

                    if (result.length > 0) {
                        this.state = 'reply_processing';
                        eventBroker.emit('parsed_command', result);
                        break;
                    } else {
                        if (attempt === command.max_retry_count - 1) {
                            this.state = 'timeout';
                            eventBroker.emit('parsed_command', []);
                            break;
                        }
                        continue;
                    }
                } else {
                    result = await new Promise((resolve) => {
                        let timeout: any;
                        const onDataReceived = (data: CommandParserOutput) => {
                            /**
                             * We will not push data to result array because,
                             * we are not waiting for ACK
                             */
                            clearTimeout(timeout);
                            timeout = setTimeout(() => {
                                eventBroker.removeListener('command', onDataReceived);
                                resolve([]);
                            }, command.event_timeout);
                        };
                        timeout = setTimeout(() => {
                            eventBroker.removeListener('command', onDataReceived);
                            resolve([]);
                        }, command.event_timeout);
                        eventBroker.on('command', onDataReceived);
                    })
                    // console.log("Command does not require ACK");
                    this.state = 'completed';
                    eventBroker.emit('parsed_command', result);
                    break;
                }
            } catch (error) {
                this.state = 'error';
                console.error(`Error in processCurrentCommand: ${error}`);
                const res = await new Promise((resolve) => {
                    resolve([]);
                });
                eventBroker.emit('parsed_command', res);
                break;
            }
        };
    }


    private sendCommandToPort(command: Command) {
        const command_frame = this.CommandBuilder.Cmd_Bldr_BuildCommandFrame(command);
        this.SerialConnection.getSerialPort()?.write(command_frame, (error) => {
            if (error) {
                console.error('Error in sending Frame to Port', error);
            } else {
                console.log("Frame sent: ", command_frame);
            }
        });
    }
}