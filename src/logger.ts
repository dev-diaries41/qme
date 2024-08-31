import { createLogger, format, transports } from 'winston';


const jobstransporter = new transports.File({
  filename: './logs/job.log',
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.metadata(),
    format.json()
  ),
});

export const jobLogger = createLogger({
  transports: [jobstransporter],
});


