export default function (req, res) {
    try {
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
                res.status(200).json({ message: "FCM notification sent successfully" });
            }).catch((error) => {
                // console.error("Error sending FCM notification:", error);
                logger.error({
                    "error": error.message,
                    // "response_from_fcm": responseFCM,
                    // "response_from_server": response
                })
                res.status(500).json({ error: "Error sending FCM notification", "details": error });
            });
        } catch (e) {
            console.log(e.message);
            res.status(500).json({ error: "Error sending FCM notification", "details": e });
        }
    } catch (error) {
        
    }
}