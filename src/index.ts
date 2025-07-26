import express, { Request, Response } from 'express';

import { writeToFile } from './lib/io.js';
import Logger from './lib/logger.js';
import morganMiddleware from './middleware/morganMiddleware.js';
import runAutomation from './service/automation.js';

const app = express();
const port = process.env.PORT ?? '9001';

app.use(morganMiddleware);
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  return res.send('Hello World!');
});

app.post('/', async (req: Request, res: Response) => {
  try {
    const { message } = req.body as { message: string };

    // Validate message type
    if (typeof message !== 'string') {
      return res.status(400).json({ message: '"message" must be a string.' });
    }

    // Extract the 7-digit code
    const match = /\b\d{7}\b/.exec(message);
    const code = match ? match[0] : null;

    // If no code is found, return error
    if (!code) {
      return res.status(400).json({
        message: 'Invalid input. A 7-digit code must be present in "message".',
      });
    }

    // Prepare the data to save
    const output = {
      code,
      time: new Date().toISOString(),
    };

    // Write to the file
    await writeToFile(output);

    return res.status(200).json({
      message: 'Data saved successfully.',
      saved: output,
    });
  } catch (err) {
    Logger.error('Error processing request: ', err);
    return res.status(500).json({ message: 'Internal Server Error.' });
  }
});

// Start the server and run automation
app.listen(port, () => {
  Logger.info(`App listening on port ${port}`);

  // Run automation in the background
  void runAutomation().catch((err: unknown) =>
    Logger.error('Error in automation:', err),
  );
});
