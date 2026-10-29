
'use strict';

const { Worker } = require('bullmq');
const { connection } = require('./queue');
const transporter = require('./email');

const worker = new Worker(
  'email',
  async (job) => {
    if (job.name === 'otp') {
      await transporter.sendMail({
        to: job.data.to,
        subject: 'Your verification code',
        text: 'Your OTP is ' + job.data.otp,
      });
    } else {
      throw new Error('Unknown job type: ' + job.name);
    }
  },
  {
    connection,
  }
);

worker.on('completed', (job) => {
  console.log('job ' + job.id + ' completed');
});

worker.on('failed', (job, err) => {
  console.error(
    'job ' + job?.id + ' failed: ' + err.message
  );
});

module.exports = worker;
