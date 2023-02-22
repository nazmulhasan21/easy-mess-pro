const schedule = require('node-schedule');
const { updateMeal } = require('./updateManager');

// schedule jobs
schedule.scheduleJob(`00     10   2    *    *    *`, async () => {
  // update every mess active month
  await updateMeal();
});
