import { SerialPort } from "serialport";
// import { CommandReceiver } from "./command.receiver.service";

let connected_port_name: string | undefined = undefined;
let serialPortObject: SerialPort | undefined;

export class SerialPortConnectionService {
    // private CommandReceiver = new CommandReceiver(this);

    public getConnectedPort(): string | undefined {
        return connected_port_name;
    }

    public getSerialPort(): SerialPort | undefined {
        return serialPortObject;
    }

    public connectPort = (port: string): Promise<Boolean> => {
        return new Promise((resolve, reject) => {
            if (connected_port_name == port) {
                console.log(`${port} is allready connected`);
                return resolve(true);
            }

            if (serialPortObject && connected_port_name) {
                serialPortObject.close((err: any) => {
                    if (err) {
                        console.error(`Error closing port ${connected_port_name}:`, err);
                        return reject(err);
                    }
                    console.log(`Port ${connected_port_name} closed successfully.`);
                    connected_port_name = undefined;
                });
            }

            serialPortObject = new SerialPort({
                path: port,
                baudRate: 4800,
                dataBits: 8,
                parity: 'odd',
                stopBits: 1
            });

            serialPortObject.on('open', () => {
                console.log(`Port ${port} connected successfully.`);
                connected_port_name = port
                // this.CommandReceiver.init();
                return resolve(true);
            });

            serialPortObject.on('error', (err: any) => {
                console.error(`Error connecting to port ${port}:`, err);
                return resolve(false);
            });
        });
    };

    public disconnectePort = (): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (!serialPortObject || !connected_port_name) {
                return resolve('No port connected');
            }

            serialPortObject.removeAllListeners('data');
            serialPortObject.close((err) => {
                if (err) {
                    console.error(`Error closing port ${connected_port_name}:`, err);
                    return reject(err);
                }
                console.log(`Port ${connected_port_name} closed successfully.`);
                const disconeectPort = connected_port_name;
                connected_port_name = undefined;
                return resolve(`Port ${disconeectPort} closed successfully.`);
            });
        });
    }
}