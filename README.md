A markdown table can definitely make the documentation more organized and easier to scan, especially for quickly understanding the purpose of each method and seeing code examples side-by-side with descriptions. Here's how it could look if we use a table to present the methods:

---

# QueueManager Documentation

## Overview

The `QueueManager` class simplifies job management within a Redis-backed queue using BullMQ. It provides easy-to-use methods for adding single and batch jobs, handling recurring jobs, managing job results, canceling jobs, and scheduling background job removals.

---

## How to Install

*(Installation instructions go here)*

---

## How to Use

Below is a table listing the key public methods in the `QueueManager` class, along with usage examples.

| Method                              | Description                                                                                              | Example Usage                                                                                                                            |
|-------------------------------------|----------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| **Initialize QueueManager**         | Initialize `QueueManager` with a service name, Redis instance, and logger.                               | ```typescript const queueManager = new QueueManager('myServiceQueue', redis, logger);```                                              |
| `addToQueue`                        | Add a single job to the queue. Returns a job receipt with job details.                                   | ```typescript const jobReceipt = await queueManager.addToQueue({ name: 'processData', data: { userId: '123', payload: 'dataToProcess' }, opts: { delay: 1000 }});``` |
| `addBatchToQueue`                   | Add multiple jobs at once to the queue. Returns an array of job receipts.                                | ```typescript const jobReceipts = await queueManager.addBatchToQueue([{ name: 'task1', data: { userId: '123' } }, { name: 'task2', data: { userId: '456' }}]);``` |
| `addRecurringJob`                   | Add a recurring job to the queue with a cron pattern.                                                    | ```typescript await queueManager.addRecurringJob('dailyReport', { reportType: 'daily' }, '0 0 * * *');```                            |
| `findJobByName`                     | Find a job by name in the queue, checking pending and completed jobs.                                    | ```typescript const job = await queueManager.findJobByName('dailyReport');```                                                         |
| `getResults`                        | Retrieve the results of a specific job by its ID.                                                        | ```typescript const jobResult = await queueManager.getResults('jobId123');```                                                         |
| `cancelJob`                         | Cancel a specific job in the queue by its ID.                                                            | ```typescript await queueManager.cancelJob('jobId123');```                                                                            |
| `cancelJobByName`                   | Cancel any pending job with the specified name.                                                          | ```typescript await queueManager.cancelJobByName('dailyReport');```                                                                   |
| `getJobCompletionTime`              | Get the completion time of a job by its ID, if available.                                                | ```typescript const completionTime = await queueManager.getJobCompletionTime('jobId123');```                                         |
| `removeCompletedJob`                | Remove a completed job from the queue, freeing up space.                                                 | ```typescript await queueManager.removeCompletedJob('jobId123');```                                                                   |
| **Static Methods**                  |                                                                                                          |                                                                                                                                           |
| `removeExpiredJob` (Static)         | Schedule a job for removal after a specified TTL (time-to-live) period.                                 | ```typescript await QueueManager.removeExpiredJob(job, queueManager, 5000);```                                                        |
| `cancelPendingBackgroundJob` (Static)| Cancel any pending background job that matches the specified job's background job name pattern.          | ```typescript await QueueManager.cancelPendingBackgroundJob(job, queueManager);```                                                    |

---