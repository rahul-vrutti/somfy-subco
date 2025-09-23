import express, { Request, Response } from 'express';
import { SerialPortConnectionService } from './service/serialport.connection.service';

import dotenv from 'dotenv';
import { CommandSenderService } from './service/command.sender.service';
dotenv.config();

const app = express();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const SERIAL_PORT = process.env.SERIAL_PORT || 'COM3';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response) => {
    return res.json({
        message: 'Welcome to Somfy Subco API',
        status: 'Server is running successfully!!',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, async () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);

    const serialService = new SerialPortConnectionService();
    const commandSender = new CommandSenderService(serialService);

    try {
        const result = await serialService.connectPort(SERIAL_PORT);
        if (result) {
            setTimeout(() => {
                // GET_NODE_ADDRESS
                commandSender.sendCommandToPort("BF740FFFFFFE000000043E");
            }, 5000);
        } else {
            console.log("Shutting down server...");
            process.exit(1);
        }
    } catch (error) {
        console.log("Error: ", error);
    }
});