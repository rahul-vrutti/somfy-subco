import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { SerialPortConnectionService } from './service/serialport.connection.service';
import { MotorDiscoveryService } from './service/motor.discovery.service';
dotenv.config();

const app = express();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const SERIAL_PORT = process.env.SERIAL_PORT || 'COM3';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const serialService = new SerialPortConnectionService();
const motorDiscovery = new MotorDiscoveryService();

app.get('/discover', async (req: Request, res: Response) => {
    motorDiscovery.discoverMotors();
    return res.json({
        status: true,
        message: 'Ok'
    });
});

app.listen(PORT, async () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);

    try {
        const result = await serialService.connectPort(SERIAL_PORT);
        if (result) {
            setTimeout(() => {
                motorDiscovery.discoverMotors();
            }, 5000);
        } else {
            console.log("Shutting down server...");
            process.exit(1);
        }
    } catch (error) {
        console.log("Error: ", error);
    }
});

app.use((req: Request, res: Response) => {
    return res.json({
        status: true,
        message: 'Welcome to Somfy Subco',
        timestamp: new Date().toISOString()
    });
});