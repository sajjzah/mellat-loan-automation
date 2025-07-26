import axios from 'axios';

import Logger from './logger';

const sendMessage = async (message: string, silent = false): Promise<void> => {
  if (!process.env.TELEGRAM_WORKER_ENDPOINT) {
    Logger.warn('Missing required environment variables. Skipping...');
    return;
  }

  try {
    await axios.post(process.env.TELEGRAM_WORKER_ENDPOINT, {
      message,
      silent,
    });
  } catch (e) {
    Logger.error(e);
  }
};

export { sendMessage };
