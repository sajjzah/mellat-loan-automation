import morgan, { StreamOptions } from 'morgan';

import Logger from '../lib/logger.js';

// Custom stream method to use Logger instead of console.log
const stream: StreamOptions = {
  write: (message) => Logger.http(message.trim()), // trim message to remove extra newline
};

// Build the morgan middleware with the skip logic directly in the options
const morganMiddleware = morgan('tiny', {
  skip: () => false, // process.env.NODE_ENV !== 'development', // Skip logging in non-development environments
  stream,
});

export default morganMiddleware;
