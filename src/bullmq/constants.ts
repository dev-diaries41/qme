export enum JobErrors {
    INVALID_JOB_ID= 'Missing jobId' ,
    JOB_NOT_FOUND=  'Job not found' ,
    JOB_NOT_ADDED= 'Job not added error',
    MISSING_JOB_NAME='Missing job name',
  }

export const BackgroundJobs = {
    REMOVE_EXPIRED_JOBS: 'remove-expired-jobs',
    MANAGE_LOGS: 'manage-logs'
}

  