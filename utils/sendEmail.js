const Sib = require('sib-api-v3-sdk');

/**
 *
 * @param {array} to this is a email receiver arrayObject [{}]
 * @param {emailSubject} subject this is a email subject
 * @param {htmlContent} html this is a email html content
 * @param {objectParams} params this is email object params
 */

exports.sendEmail = async (to, subject, html, params) => {
  const client = Sib.ApiClient.instance;
  // 1. Configure API key authentications : api-key

  const apiKey = client.authentications['api-key'];
  apiKey.apiKey = process.env.SENDINBLUE_API_KEY;

  const apiInstance = new Sib.TransactionalEmailsApi();

  var sendSmtpEmail = new Sib.SendSmtpEmail();

  sendSmtpEmail = {
    sender: {
      email: 'messmanagerapp22@gmail.com',
      name: 'Easy Mess App',
    },
    to: to,
    subject,
    htmlContent: html,
    params: params,
  };

  const send = await apiInstance.sendTransacEmail(sendSmtpEmail);
  if (send.messageId) {
    return true;
  }
};
