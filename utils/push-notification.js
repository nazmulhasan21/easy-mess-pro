const admin = require('firebase-admin');
var serviceAccount = require('./easy-mess-1de2a-firebase-adminsdk-9jr1e-56b251d8b2.json');
const { result } = require('lodash');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

exports.pushNotification = async (title, body, token) => {
  try {
    title = title || 'No Title';
    body = body || 'No body';
    const result = await admin.messaging().send({
      data: { title, body },
      notification: { title, body },
      android: {
        notification: {
          //  imageUrl: image,
          clickAction: '',
          sound: 'default',
        },

        priority: 'high',
      },

      token,
    });
    // console.log(result);
    return result;
  } catch (error) {
    // console.log(error);
    return error;
  }
};

exports.pushNotificationMultiple = async (title, body, tokens) => {
  try {
    title = title || 'No Title';
    body = body || 'No body';
    const result = await admin.messaging().sendMulticast({
      data: { title, body },
      notification: {
        title,
        body,
      },
      android: {
        notification: {
          imageUrl:
            'https://res.cloudinary.com/messmanager/image/upload/v1680824555/WhatsApp_Image_2022-12-04_at_4.42.26_PM_z9esnc.jpg',
          clickAction: '',
          sound: 'default',
          // sound: '../public/notification.mp3',
        },
        priority: 'high',
      },
      tokens,
    });
    // console.log(result);
    return result;
  } catch (error) {
    // console.log(error);
    return error;
  }
};
