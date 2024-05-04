

export default async function (req, res) {
    const { userid, order_id } = req.body;
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

        let fcm_token = response.data.data.fcm_token;

        if (!Array.isArray(fcm_token)) {
            fcm_token = [fcm_token];
        }

        for (let partner_token of fcm_token) {
            const message = {
                token: partner_token,
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
                            "response_from_server": response
                        })
                        res.status(500).json({ error: "Error sending FCM notification", "details": error.message });
                    });
            } catch (e) {
                console.log(e.message);
                res.status(500).json({ error: "Error sending FCM notification", "details": error });
            }
        }
    } catch (error) {
        console.error("An error occurred while making the API request:", error);
        logger.error({
            "error": error
        });
    }
}
