const express = require("express");
const admin = require("firebase-admin");
const cron = require("node-cron");
const FormData = require("form-data");
const serviceAccount = require("./tida_firebase_key.json");
const certpath = admin.credential.cert(serviceAccount);
const winston = require('winston');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logfile.log' }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});

admin.initializeApp({
  credential: certpath,
});

const server = express();
const axios = require("axios");

server.post("/partner_notification", express.json(), async (req, res) => {
  const { userid } = req.body;
  try {
    const form = new FormData();
    form.append("userid", userid);
    const response = await axios.post(
      "https://tidasports.com/secure/api/notification/find_fcm_token",
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
      }
    );
    const fcmToken = response.data.data.fcm_token;
    // console.log(fcmToken);
    const message = {
      token: fcmToken,
      notification: {
        title: "Payment Update",
        body: "You have recevied a payment from a Tida customer ",
      },
    };

    await admin.messaging().send(message).then((responseFCM) => {
      // Response is a message ID string.
      // console.log("FCM notification sent successfully:", responseFCM);
      logger.info(responseFCM);
      res.status(200).json({ message: "FCM notification sent successfully" });
    }).catch((error) => {
        // console.error("Error sending FCM notification:", error);
        logger.error({
          "error": error,
          "response_from_fcm": responseFCM,
          "response_from_server": response
        })
        res.status(500).json({ error: "Error sending FCM notification", "details": error });
      });
  } catch (error) {
    // console.error("An error occurred while making the API request:", error);
    logger.error({
      "error": error
    });
    res
      .status(500)
      .json({ error: "An error occurred while making the API request" });
  }
});

cron.schedule("* * * * *", async () => {
  try {
    const response = await axios.post(
      "https://tidasports.com/secure/api/notification/get_booking_details",
      {}
    );
    // console.log("Response from API:", response.data);
    logger.info("Response from API:", response.data);
    const bookingDetails = response.data.data;
    const currentTime = new Date();

    if (bookingDetails && Array.isArray(bookingDetails)) {
      for (const bookingData of bookingDetails) {
        const startTime = new Date(
          bookingData.date + " " + bookingData.slot_start_time
        );
        const timeDifference = (startTime - currentTime) / 60000;
        if (timeDifference === 5) {
          // If the booking time is exactly 5 minutes before the slot start time,
          // make the additional API request and send a notification
          const fcmResponse = await axios.post(
            "https://tidasports.com/secure/api/notification/find_fcm_token",
            { user_id: bookingData.user_id }
          );
          const fcmToken = fcmResponse.data.fcm_token;
          const message = {
            token: fcmToken,
            notification: {
              title: "Slot Booking Alert",
              body: "Your booking slot is going to start in 5min",
            },
          };
          admin.messaging().send(message, (err, res) => {
            if (err) {
              // console.error("Error sending FCM notification:", err);
              logger.error({
                "error": err,
                "response_from_fcm": res,
                "response_from_server": response
              });
              res.status(500).json({ error: "Error sending FCM notification" });
            } else {
              logger.info(response);
              console.log("FCM notification sent successfully:", response);
              res
                .status(200)
                .json({ message: "FCM notification sent successfully" });
            }
          });
        }
      }
    }
  } catch (error) {
    logger.error(error);
    // console.error("An error occurred while making the API request:", error);
  }
});

server.listen(5001, () => {
  // console.log("Server is running on port 5001");
  logger.info("Server is running on port 5001");
});
