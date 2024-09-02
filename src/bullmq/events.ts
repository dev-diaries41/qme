import { Job } from "bullmq";
import { jobLogger } from "../logger";
import { WorkerEventHandlers } from "../types";
import { QueueManager } from "../bullmq/queues";

export async function onComplete(job: Job){
    jobLogger.info({message: 'Job completed', jobName: job.name, jobId: job.id});
}

export async function onCompleteRemoveJobTTL(job: Job, backgroundJobQM: QueueManager, ttl: number = 30 * 1000 * 60){
    try {
        await onComplete(job);
        await QueueManager.removeExpiredJob(job, backgroundJobQM, ttl)
    } catch (error: any) {
        jobLogger.error({message: "Error in onCompleteRemoveJobTTL", details: error.message})
    }
}

export async function onFail (job: Job | undefined, err: Error){
    jobLogger.error({message: "Job failed", jobId: job?.id, name: job?.name});
}

export async function onActive(job: Job){
    jobLogger.info({message: "Job active", jobId: job?.id, name: job?.name});
}

export async function onProgress(job: Job, timestamp: number | object){
    jobLogger.info({message: "Job in progress", jobId: job?.id, name: job?.name});
}

export async function onDrained(){
    jobLogger.info({message: `Worker has completed all jobs, no jobs left.`});
}

export function onQueueError(error: Error, queueName: string){
    jobLogger.error({message: 'Queue error', queue: queueName});
}

export const DefaultHandlers: WorkerEventHandlers = {
    onComplete,
    onFail,
    onActive,
    onProgress,
    onDrained,
}