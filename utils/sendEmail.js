const Sib = require('sib-api-v3-sdk');

/**
 *
 * @param {array} to this is a email recver arrayobject [{}]
 * @param {emailSubject} subject this is a email subject
 * @param {htmlContent} html this is a email html content
 * @param {objectParams} params this is email object params
 */

exports.sendEmail = (to, subject, html, params) => {
  const client = Sib.ApiClient.instance;
  // 1. Configure API key authoriaztion : api-key

  const apiKey = client.authentications['api-key'];
  apiKey.apiKey = process.env.SENDINBLUE_API_KEY;

  const apiInstance = new Sib.TransactionalEmailsApi();

  var sendSmtpEmail = new Sib.SendSmtpEmail();

  sendSmtpEmail = {
    sender: {
      email: 'messmanagerapp22@gmail.com',
      name: 'Mess Manager App',
    },
    to: to,
    subject,
    htmlContent: html,
    params: params,
  };

  apiInstance.sendTransacEmail(sendSmtpEmail).then(
    (data) => {
      console.log(`API called successfully.data is ${data}`);
    },
    (error) => {
      console.log(error);
    }
  );
};
