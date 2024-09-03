import { Redis } from "ioredis";
import { Job, JobsOptions, Queue } from "bullmq";
import { JobResult, NewJob, ServiceJobData, jobReceipt } from '../types'
import { JobErrors , BackgroundJobs} from "./constants";
import { Logger } from "winston";


export class QueueManager {
  public readonly queue: Queue;
  private readonly jobOptions: JobsOptions;
  private readonly jobLogger: Logger; 

  static readonly DefaultJobOpts: JobsOptions = {
      attempts: 1,
      removeOnFail: { age: 3600 },
      removeOnComplete: true,
  }

  constructor(serviceName: string, redis: Redis, logger: Logger, jobOptions?: JobsOptions) {
      this.jobOptions = { ...QueueManager.DefaultJobOpts, ...jobOptions };
      this.queue = new Queue(serviceName, { connection: redis });
      this.jobLogger = logger;
      this.queue.on('error', (error) => {
        console.error({message: 'Queue error', queue: this.queue.name, details: error.message});
      }); 
  }

  private async addJob(newJob: NewJob): Promise<Job> {
    const { name, data, opts = {} } = newJob;
    return await this.queue.add(name, data, {...this.jobOptions,  ...opts });
  }

  private async addBatchJobs(newJobs: NewJob[]): Promise<Job[]> {
    const formattedJobs = newJobs.map(job => ({...job, opts: {...this.jobOptions, ...(job.opts||{})}}))
    return await this.queue.addBulk(formattedJobs);
  }
  
  private async getJobReceipt(job: Job): Promise<jobReceipt> {
    const status = await job.getState();
    return { jobId: job.id, delay: job.opts.delay!, status, queue: await this.queue.count(), when: job.timestamp, jobName: job.name };
  }

  private async getJobReceipts(jobs: Job[]): Promise<jobReceipt[]> {
   return await Promise.all(jobs.map(job => this.getJobReceipt(job)));
  }

  public async addToQueue(newJob: NewJob): Promise<jobReceipt> {
      try {
          const job = await this.addJob(newJob);
          return await this.getJobReceipt(job);
      } catch (error: any) {
          this.jobLogger.error({message: JobErrors.JOB_NOT_ADDED, details: error.message});
          throw new Error(JobErrors.JOB_NOT_ADDED);
      }
  }

  public async addBatchToQueue(newJobs: NewJob[]): Promise<jobReceipt[]> {
    try {
        const jobs = await this.addBatchJobs(newJobs);
        return await this.getJobReceipts(jobs);
    } catch (error: any) {
        this.jobLogger.error({message: JobErrors.JOB_NOT_ADDED, details: error.message});
        throw new Error(JobErrors.JOB_NOT_ADDED);
    }
}

  public async removeCompletedJob(jobId: string): Promise<void> {
      const job = await this.queue.getJob(jobId);
      if (job && job.finishedOn !== undefined) {
        return await job.remove();
      } 
  }

  // Must use a unique job name
  public async addRecurringJob(name: string, jobData: Record<string, any> = {}, pattern = '0 0 * * * *'): Promise<void> {
      const existingBackgroundJob = await this.findJobByName(name);
      if(!existingBackgroundJob){    
          await this.queue.add(name, jobData, {repeat: {pattern}});
          this.jobLogger.info({message: `Added recurring job`, name});
      } else {
          this.jobLogger.info({message: `Recurring job already exists.`, name});
      }
  }

  public async findJobByName(name: string): Promise<Job<any> | null> {
    // Check 'delayed', 'wait', and 'active' jobs first since primary use case for cancelling jobs
    const pendingJobs = await this.queue.getJobs(['delayed', 'wait', 'active']);
    const job = pendingJobs?.find(job => job.name === name);
    if (job) return job;

    const finishedJobs = await this.queue.getJobs(['completed', 'failed']);
    return finishedJobs?.find(job => job.name === name) || null;
}

  public async getResults(jobId: string, backgroundQueue?: QueueManager): Promise<JobResult>{
      const job = await this.queue.getJob(jobId);
      if(!job) throw new Error(JobErrors.JOB_NOT_FOUND);
      const status = await job.getState();
      if(status === 'completed'){
        await this.handleCompletedJob(jobId, job, backgroundQueue);
      }  
      return { data: this.filterJobReturnValue(job.returnvalue), status};
  }

  private async handleCompletedJob(jobId: string, job: Job, backgroundQueue?: QueueManager): Promise<void> {
    await this.removeCompletedJob(jobId);
    if (backgroundQueue) {
        await QueueManager.cancelPendingBackgroundJob(job, backgroundQueue);
    }
}

  private filterJobReturnValue(returnValue: object & Partial<ServiceJobData>): Partial<ServiceJobData> {
    const { initiatedBy, userId, ...filteredData } = returnValue;
    return filteredData;
  }
  
  public async cancelJob(jobId: string): Promise<void> {
    try {
      const job = await this.queue.getJob(jobId);
      if (!job) throw new Error(JobErrors.JOB_NOT_FOUND);
      await job.remove();
      this.jobLogger.info({ message: `Cancelled job`, jobId, jobName: job.name});
    } catch (error: any) {
      this.jobLogger.error({ message: `Error cancelling job`, jobId, details: error.message });
    }
  }

  public async cancelJobByName(name: string): Promise<void> {
    try {
      const job = await this.findJobByName(name);
      if (!job) throw new Error(JobErrors.JOB_NOT_FOUND);
      await job.remove();
      this.jobLogger.info({ message: `Cancelled job`, jobName: name});
    } catch (error: any) {
      this.jobLogger.error({ message: `Error cancelling job`, jobName: name, details: error.message });
    }
  }

  public async getJobCompletionTime(jobId: string): Promise<number | null> {
    const job = await this.queue.getJob(jobId);
    return (!job || !job.finishedOn)? null: job.finishedOn - job.timestamp; 
  }


  public getBackgroundJobName(job: Job, backgroundJobsNames: Record<string, string> = BackgroundJobs): string{
    return `${backgroundJobsNames.REMOVE_EXPIRED_JOBS}-${job.id}-${job.queueName}`
  }

  public static async removeExpiredJob(job: Job, backgroundJobQM: QueueManager, ttl: number){
    const newJob: NewJob = {name: backgroundJobQM.getBackgroundJobName(job), data: {jobId: job.id}, opts: {delay: ttl}};
    await backgroundJobQM.addToQueue(newJob);
  }
  
  public static async cancelPendingBackgroundJob(job: Job, backgroundJobQM: QueueManager): Promise<void>{
    const backgroundJob = await backgroundJobQM.findJobByName(backgroundJobQM.getBackgroundJobName(job));
    if(backgroundJob && backgroundJob.id){
        await backgroundJobQM.cancelJob(backgroundJob.id);
    }
  }
}