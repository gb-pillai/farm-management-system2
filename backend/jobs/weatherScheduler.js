const cron = require("node-cron");
const Fertilizer = require("../models/Fertilizer");

const {
  getForecast,
  isWeatherSuitable,
  getForecastForDate
} = require("../utils/weatherCheck");

cron.schedule("0 6 * * *", async () => {

  console.log("Running daily fertilizer weather check...");

  const fertilizers = await Fertilizer.find({
    nextDueDate: { $ne: null }
  });

  const today = new Date();

  for (let fert of fertilizers) {

    const diffDays =
      (new Date(fert.nextDueDate) - today) / (1000 * 60 * 60 * 24);

    if (diffDays <= 5 && diffDays >= 0) {

      const forecast = await getForecast(fert.location);

      const forecastItem = getForecastForDate(
        forecast,
        fert.nextDueDate.toISOString().split("T")[0]
      );

      if (forecastItem) {

        const result = isWeatherSuitable(forecastItem);

        if (!result.ok) {

          const newDate = new Date(fert.nextDueDate);
          newDate.setDate(newDate.getDate() + 1);

          fert.nextDueDate = newDate;

          await fert.save();

          console.log(
            `Adjusted fertilizer date for ${fert.fertilizerName}`
          );

        }

      }

    }

  }

});