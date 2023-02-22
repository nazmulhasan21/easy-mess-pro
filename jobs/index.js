const schedule = require('node-schedule');
const { updateMeal } = require('./updateManager');

// schedule jobs
schedule.scheduleJob(`00     15   10    *    *    *`, async () => {
  // update every mess active month
  await updateMeal();
});
