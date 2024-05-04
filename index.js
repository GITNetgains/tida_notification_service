const express = require("express");
const admin = require("firebase-admin");
const cron = require("node-cron");
const FormData = require("form-data");
const serviceAccount = require("./tida_firebase_key.json");
const certpath = admin.credential.cert(serviceAccount);
const winston = require('winston');
const { getDatabase } = require('firebase-admin/database');

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
  databaseURL: "https://tidasports-60eaa-default-rtdb.firebaseio.com/",
});

const server = express();
const axios = require("axios");
var db = admin.database();
const notificationRef = db.ref('/notifications');

server.get("/", (req, res) => {
  res.status(200).json({ "message": "Server is working" });
})

server.post("/check", (req, res) => {
  console.log(req.body);
})

server.post("/partner_notification", express.json(), async (req, res) => {
  const { userid, fcmToken, order_id, customerUserId } = req.body;
  try {
    const form = new FormData();
    form.append("userid", userid);
    const response = await axios.post(
      "https://tidasports.com/wp-json/tida/v1/notification/find_fcm_token",
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
      }
    );

    const replaceAll  =(s="",f="",r="")=>  s.replace(new RegExp(f.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), r)

    let fcm_token = response.data.data.fcm_token;

    notificationRef.push().set(JSON.parse(replaceAll(JSON.stringify({
      tida_server_response: response.data,
      request: req.body,
      fcm_token: fcm_token
    }),"undefined","null")));
    
    
    if(!Array.isArray(fcm_token)) {
      fcm_token = [fcm_token];
    }

    /* for(let partner_token of fcm_token) {
    } */
      const message = {
        token: fcm_token[0],
        notification: {
          title: "Payment Update",
          body: "You have received a payment from a Tida customer ",
        },
        data: {
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          sound: "default",
          order_id: order_id.toString()
        }
      };
  
      console.log(message);
  
      try {
        await admin.messaging().send(message)
          .then((responseFCM) => {
            // Response is a message ID string.
            // console.log("FCM notification sent successfully:", responseFCM);
            logger.info(responseFCM);
            // res.status(200).json({ message: "FCM notification sent successfully" });
          }).catch((error) => {
            console.error("Error sending FCM notification:", error.message);
            logger.error({
              "error": error.message,
              // "response_from_fcm": responseFCM,
              // "response_from_server": response
            })
            // res.status(500).json({ error: "Error sending FCM notification", "details": error.message });
          });
      } catch (e) {
        console.log(e.message);
        // res.status(500).json({ error: "Error sending FCM notification", "details": e.message });
      }

    // const customerForm = new FormData();
    // form.append("userid", customerUserId);
    // const customerResponse = await axios.post(
    //   "https://tidasports.com/secure/api/notification/find_fcm_token",
    //   customerForm,
    //   {
    //     headers: {
    //       ...form.getHeaders(),
    //     },
    //   }
    // );

    // let customer_fcm_token = customerResponse.data.data.fcm_token;
    
    // if(!Array.isArray(customer_fcm_token)) {
    //   customer_fcm_token = [customer_fcm_token];
    // }

    // for(let customer_token of customer_fcm_token) {
    //   let message = {
    //     token: customer_token,
    //     notification: {
    //       title: "Payment Update",
    //       body: "You booking was successful ",
    //     },
    //     data: {
    //       click_action: "FLUTTER_NOTIFICATION_CLICK",
    //       sound: "default",
    //       order_id: order_id.toString()
    //     }
    //   };
  
    //   console.log(message);
  
    //   try {
    //     await admin.messaging().send(message)
    //       .then((responseFCM) => {
    //         // Response is a message ID string.
    //         // console.log("FCM notification sent successfully:", responseFCM);
    //         logger.info(responseFCM.message);
    //         // res.status(200).json({ message: "FCM notification sent successfully" });
    //       }).catch((error) => {
    //         console.error("Error sending FCM notification:", error.message);
    //         logger.error({
    //           "error": error.message,
    //           // "response_from_fcm": responseFCM,
    //           // "response_from_server": response
    //         })
    //       });
    //   } catch (e) {
    //     console.log(e.message);
    //     // res.status(500).json({ error: "Error sending FCM notification", "details": error });
    //   }
    // }

    const message1 = {
      token: fcmToken,
      notification: {
        title: "Payment Update",
        body: "You booking was successful ",
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        sound: "default",
        order_id: order_id.toString()
      }
    };

    // console.log(message1);

    try {
      await admin.messaging().send(message1).then((responseFCM) => {
        // Response is a message ID string.
        // console.log("FCM notification sent successfully:", responseFCM);
        logger.info(responseFCM);
        // res.status(200).json({ message: "FCM notification sent successfully" });
      }).catch((error) => {
        // console.error("Error sending FCM notification:", error);
        logger.error({
          "error": error.message,
          // "response_from_fcm": responseFCM,
          // "response_from_server": response
        })
        // res.status(500).json({ error: "Error sending FCM notification", "details": error });
      });
    } catch (e) {
      console.log(e.message);
      // res.status(500).json({ error: "Error sending FCM notification", "details": e });
    }

  } catch (error) {
    console.error("An error occurred while making the API request:", error.message);
    logger.error({
      "error": error.message
    });
    res
      .status(500)
      .json({ error: "An error occurred while making the API request" });
  }
  res.status(200).json({ message: "FCM notification sent successfully" });
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
    logger.error(error.message);
    // console.error("An error occurred while making the API request:", error);
  }
});

server.listen(5001, () => {
  // console.log("Server is running on port 5001");
  logger.info("Server is running on port 5001");
});
